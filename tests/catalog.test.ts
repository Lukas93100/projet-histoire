import { describe, expect, it } from "vitest";
import { checkQuota, DURATIONS, effectivePlan, findOption, MORALS, PLANS, THEMES } from "../supabase/functions/_shared/catalog.ts";
import { planFromEntitlements } from "../supabase/functions/_shared/revenuecat.ts";

describe("effectivePlan", () => {
  const now = new Date("2026-09-25T12:00:00Z");
  it("retombe sur free si l'offre est inconnue ou expirée", () => {
    expect(effectivePlan(null, null, now)).toBe("free");
    expect(effectivePlan("premium", null, now)).toBe("free");
    expect(effectivePlan("famille", "2026-09-01T00:00:00Z", now)).toBe("free");
  });
  it("garde une offre active", () => {
    expect(effectivePlan("conteur", "2026-10-25T00:00:00Z", now)).toBe("conteur");
    expect(effectivePlan("famille", null, now)).toBe("famille");
  });
});

describe("checkQuota", () => {
  it("refuse les histoires longues hors offre Famille", () => {
    expect(checkQuota("conteur", "long", 0)).toMatchObject({ ok: false, reason: "duration_not_allowed" });
    expect(checkQuota("famille", "long", 0)).toMatchObject({ ok: true, credits: 2 });
  });
  it("bloque quand les crédits sont épuisés", () => {
    expect(checkQuota("free", "court", 2)).toMatchObject({ ok: true, remaining: 0 });
    expect(checkQuota("free", "court", 3)).toMatchObject({ ok: false, reason: "quota_exceeded" });
    expect(checkQuota("famille", "long", 29)).toMatchObject({ ok: false, reason: "quota_exceeded", remaining: 1 });
  });
});

describe("catalogue", () => {
  it("a des identifiants uniques", () => {
    for (const list of [THEMES, MORALS]) {
      expect(new Set(list.map((o) => o.id)).size).toBe(list.length);
    }
  });
  it("n'autorise que des durées connues", () => {
    for (const plan of Object.values(PLANS)) {
      for (const d of plan.durations) expect(DURATIONS[d]).toBeDefined();
    }
  });
  it("findOption", () => {
    expect(findOption(THEMES, "espace")?.label).toBe("Voyage dans l'espace");
    expect(findOption(THEMES, "inconnu")).toBeUndefined();
    expect(findOption(MORALS, null)).toBeUndefined();
  });
});

describe("planFromEntitlements", () => {
  const now = new Date("2026-09-25T12:00:00Z");
  it("choisit l'offre la plus haute encore active", () => {
    expect(planFromEntitlements({
      conteur: { expires_date: "2026-10-01T00:00:00Z" },
      famille: { expires_date: "2026-10-20T00:00:00Z" },
    }, now)).toEqual({ plan: "famille", expiresAt: "2026-10-20T00:00:00Z" });
  });
  it("ignore les entitlements expirés", () => {
    expect(planFromEntitlements({
      famille: { expires_date: "2026-09-01T00:00:00Z" },
      conteur: { expires_date: "2026-10-01T00:00:00Z" },
    }, now).plan).toBe("conteur");
    expect(planFromEntitlements({}, now)).toEqual({ plan: "free", expiresAt: null });
  });
});
