import { FunctionsHttpError } from "@supabase/supabase-js";
import type { DurationId } from "@shared/catalog";
import { effectivePlan, PLANS } from "@shared/catalog";
import { supabase } from "./supabase";
import type { Child, Story, Usage } from "./types";

export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

/** Appelle une Edge Function et convertit ses erreurs JSON en ApiError. */
async function invoke<T>(name: string, body?: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      throw new ApiError(payload?.error ?? "server_error", payload?.message ?? "Une erreur est survenue");
    }
    throw new ApiError("network_error", "Connexion impossible. Vérifie ton réseau.");
  }
  return data as T;
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new ApiError("db_error", result.error.message);
  return result.data as T;
}

// --- Enfants ---------------------------------------------------------------

const CHILD_COLUMNS = "id, first_name, age, pronoun, interests, companion, created_at";

export async function listChildren(): Promise<Child[]> {
  return unwrap(await supabase.from("children").select(CHILD_COLUMNS).order("created_at"));
}

export async function getChild(id: string): Promise<Child | null> {
  return unwrap(await supabase.from("children").select(CHILD_COLUMNS).eq("id", id).maybeSingle());
}

export type ChildInput = Omit<Child, "id" | "created_at">;

export async function saveChild(id: string | null, input: ChildInput): Promise<void> {
  if (id) unwrap(await supabase.from("children").update(input).eq("id", id));
  else unwrap(await supabase.from("children").insert(input));
}

export async function deleteChild(id: string): Promise<void> {
  unwrap(await supabase.from("children").delete().eq("id", id));
}

// --- Histoires -------------------------------------------------------------

const STORY_COLUMNS =
  "id, child_id, child_name, theme, moral, duration, credits, status, error, title, text, audio_path, audio_seconds, is_favorite, created_at";

export async function listStories(): Promise<Story[]> {
  return unwrap(await supabase.from("stories").select(STORY_COLUMNS).order("created_at", { ascending: false }));
}

export async function getStory(id: string): Promise<Story | null> {
  return unwrap(await supabase.from("stories").select(STORY_COLUMNS).eq("id", id).maybeSingle());
}

export async function setFavorite(id: string, isFavorite: boolean): Promise<void> {
  unwrap(await supabase.from("stories").update({ is_favorite: isFavorite }).eq("id", id));
}

export async function deleteStory(story: Story): Promise<void> {
  if (story.audio_path) await supabase.storage.from("story-audio").remove([story.audio_path]);
  unwrap(await supabase.from("stories").delete().eq("id", story.id));
}

export async function audioUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("story-audio").createSignedUrl(path, 60 * 60);
  if (error || !data) throw new ApiError("storage_error", "Audio indisponible");
  return data.signedUrl;
}

export interface CreateStoryInput {
  child_id: string;
  theme: string;
  moral: string | null;
  duration: DurationId;
  details: string | null;
}

export async function createStory(input: CreateStoryInput): Promise<string> {
  const { id } = await invoke<{ id: string }>("generate-story", input);
  return id;
}

// --- Compte ----------------------------------------------------------------

export async function getUsage(): Promise<Usage> {
  return unwrap(await supabase.rpc("my_usage")) as Usage;
}

/** Offre effective et crédits restants sur la période en cours. */
export function summarizeUsage(usage: Usage) {
  const plan = PLANS[effectivePlan(usage.plan, usage.plan_expires_at)];
  const used = plan.period === "month" ? usage.month_used : usage.lifetime_used;
  return { plan, used, remaining: Math.max(0, plan.credits - used) };
}

export async function syncSubscription(): Promise<void> {
  await invoke("sync-subscription");
}

export async function deleteAccount(): Promise<void> {
  await invoke("delete-account");
  await supabase.auth.signOut();
}
