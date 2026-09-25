import type { SupabaseClient } from "npm:@supabase/supabase-js@2.117.1";
import { ENTITLEMENT_PRIORITY, type PlanId } from "./catalog.ts";
import { env } from "./http.ts";

interface Entitlement {
  expires_date: string | null;
}

interface SubscriberResponse {
  subscriber: { entitlements: Record<string, Entitlement> };
}

export interface PlanState {
  plan: PlanId;
  expiresAt: string | null;
}

/** Déduit l'offre active à partir des entitlements RevenueCat. */
export function planFromEntitlements(entitlements: Record<string, Entitlement>, now = new Date()): PlanState {
  for (const id of ENTITLEMENT_PRIORITY) {
    const ent = entitlements[id];
    if (!ent) continue;
    if (ent.expires_date === null || new Date(ent.expires_date).getTime() > now.getTime()) {
      return { plan: id, expiresAt: ent.expires_date };
    }
  }
  return { plan: "free", expiresAt: null };
}

/**
 * Interroge RevenueCat (source de vérité) et met à jour le compte.
 * Recommandé par RevenueCat plutôt que d'interpréter chaque événement de webhook.
 */
export async function syncSubscription(admin: SupabaseClient, userId: string): Promise<PlanState> {
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${env("REVENUECAT_SECRET_API_KEY")}` },
  });
  if (!res.ok) throw new Error(`RevenueCat ${res.status}`);
  const body = (await res.json()) as SubscriberResponse;
  const state = planFromEntitlements(body.subscriber.entitlements ?? {});
  const { error } = await admin
    .from("accounts")
    .upsert({ id: userId, plan: state.plan, plan_expires_at: state.expiresAt });
  if (error) throw error;
  return state;
}
