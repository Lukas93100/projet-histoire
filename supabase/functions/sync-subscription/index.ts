// POST /functions/v1/sync-subscription
// Appelée par l'application juste après un achat ou une restauration, pour
// ne pas attendre le webhook RevenueCat.
import { corsHeaders, errorResponse, json } from "../_shared/http.ts";
import { syncSubscription } from "../_shared/revenuecat.ts";
import { adminClient, getUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = adminClient();
  const user = await getUser(req, admin);
  if (!user) return errorResponse("unauthorized", "Connexion requise", 401);
  try {
    return json(await syncSubscription(admin, user.id));
  } catch (err) {
    console.error("sync-subscription", err);
    return errorResponse("server_error", "Synchronisation impossible", 502);
  }
});
