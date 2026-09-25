// POST /functions/v1/generate-story
// Corps : { child_id, theme, moral?, duration, details? }
// Réserve les crédits, répond immédiatement { id }, puis écrit et enregistre
// l'histoire en arrière-plan. L'application suit l'avancement via stories.status.
import { z } from "npm:zod@4.6.5";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.117.1";
import { checkQuota, DURATIONS, effectivePlan, findOption, LIMITS, MORALS, PLANS, THEMES } from "../_shared/catalog.ts";
import { corsHeaders, errorResponse, json } from "../_shared/http.ts";
import { estimateSeconds, type StoryRequest } from "../_shared/prompt.ts";
import { mp3Seconds, narrate } from "../_shared/narrator.ts";
import { StoryRefusedError, writeStory } from "../_shared/storyteller.ts";
import { adminClient, getUser } from "../_shared/supabase.ts";

// Fourni par le runtime Supabase Edge.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const Body = z.object({
  child_id: z.uuid(),
  theme: z.string(),
  moral: z.string().nullish(),
  duration: z.enum(["court", "moyen", "long"]),
  details: z.string().max(LIMITS.detailsMax).nullish(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("method_not_allowed", "POST uniquement", 405);

  const admin = adminClient();
  const user = await getUser(req, admin);
  if (!user) return errorResponse("unauthorized", "Connexion requise", 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorResponse("invalid_request", "Paramètres invalides", 400);
  const body = parsed.data;

  const theme = findOption(THEMES, body.theme);
  if (!theme) return errorResponse("invalid_request", "Thème inconnu", 400);
  const moral = findOption(MORALS, body.moral) ?? null;
  if (body.moral && !moral) return errorResponse("invalid_request", "Morale inconnue", 400);

  const { data: child } = await admin
    .from("children")
    .select("id, first_name, age, pronoun, interests, companion")
    .eq("id", body.child_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!child) return errorResponse("not_found", "Profil enfant introuvable", 404);

  const { data: account } = await admin
    .from("accounts")
    .select("plan, plan_expires_at")
    .eq("id", user.id)
    .maybeSingle();
  const planId = effectivePlan(account?.plan, account?.plan_expires_at);
  const plan = PLANS[planId];

  // Pré-vérification lisible (la vérification qui fait foi est atomique, en SQL).
  const check = checkQuota(planId, body.duration, 0);
  if (!check.ok && check.reason === "duration_not_allowed") {
    return errorResponse("duration_not_allowed", "Cette durée nécessite l'offre Famille", 402);
  }

  const details = body.details?.trim() || null;
  const { data: storyId, error: reserveError } = await admin.rpc("reserve_story", {
    p_user: user.id,
    p_child: child.id,
    p_child_name: child.first_name,
    p_theme: theme.id,
    p_moral: moral?.id ?? null,
    p_duration: body.duration,
    p_details: details,
    p_credits: DURATIONS[body.duration].credits,
    p_limit: plan.credits,
    p_period: plan.period,
  });
  if (reserveError) {
    if (reserveError.message.includes("quota_exceeded")) {
      return errorResponse("quota_exceeded", "Plus de crédits disponibles sur cette période", 402);
    }
    console.error("reserve_story", reserveError);
    return errorResponse("server_error", "Impossible de créer l'histoire", 500);
  }

  const storyRequest: StoryRequest = {
    child: {
      firstName: child.first_name,
      age: child.age,
      pronoun: child.pronoun,
      interests: child.interests ?? [],
      companion: child.companion,
    },
    theme,
    moral,
    duration: body.duration,
    details,
  };

  // La génération (~30 à 60 s) continue après la réponse HTTP.
  EdgeRuntime.waitUntil(generate(admin, user.id, storyId as string, storyRequest));
  return json({ id: storyId }, 202);
});

async function generate(admin: SupabaseClient, userId: string, storyId: string, request: StoryRequest) {
  const update = (fields: Record<string, unknown>) => admin.from("stories").update(fields).eq("id", storyId);
  try {
    await update({ status: "writing" });
    const story = await writeStory(request);
    await update({ status: "narrating", title: story.title, text: story.text, audio_seconds: estimateSeconds(story.text) });

    const audio = await narrate(story.text);
    const path = `${userId}/${storyId}.mp3`;
    const { error: uploadError } = await admin.storage
      .from("story-audio")
      .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
    if (uploadError) throw uploadError;

    await update({ status: "ready", audio_path: path, audio_seconds: mp3Seconds(audio.byteLength) });
  } catch (err) {
    console.error("generate-story", storyId, err);
    const message = err instanceof StoryRefusedError
      ? err.message
      : "La création de l'histoire a échoué. Votre crédit a été rendu.";
    // Statut « failed » : les crédits ne sont plus comptés (remboursement automatique).
    await update({ status: "failed", error: message });
  }
}
