// POST /functions/v1/revenuecat-webhook (déployée avec --no-verify-jwt)
// Configurer dans RevenueCat : URL de cette fonction + en-tête Authorization
// égal au secret REVENUECAT_WEBHOOK_AUTH.
import { env, errorResponse, json } from "../_shared/http.ts";
import { syncSubscription } from "../_shared/revenuecat.ts";
import { adminClient } from "../_shared/supabase.ts";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method !== "POST") return errorResponse("method_not_allowed", "POST uniquement", 405);
  if (!timingSafeEqual(req.headers.get("Authorization") ?? "", env("REVENUECAT_WEBHOOK_AUTH"))) {
    return errorResponse("unauthorized", "Secret invalide", 401);
  }

  const payload = await req.json().catch(() => null) as
    | { event?: { type?: string; app_user_id?: string; transferred_to?: string[] } }
    | null;
  const event = payload?.event;
  if (!event) return errorResponse("invalid_request", "Événement manquant", 400);

  // Les app_user_id RevenueCat sont les UUID Supabase (Purchases.logIn).
  // Les identifiants anonymes ($RCAnonymousID:…) sont ignorés.
  const userIds = new Set<string>();
  if (event.app_user_id) userIds.add(event.app_user_id);
  for (const id of event.transferred_to ?? []) userIds.add(id);

  const admin = adminClient();
  for (const userId of userIds) {
    if (!UUID.test(userId)) continue;
    try {
      await syncSubscription(admin, userId);
    } catch (err) {
      console.error("revenuecat-webhook", event.type, userId, err);
      // 500 => RevenueCat réessaiera plus tard.
      return errorResponse("server_error", "Synchronisation impossible", 500);
    }
  }
  return json({ ok: true });
});
