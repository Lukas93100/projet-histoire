import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MORALS, THEMES } from "../supabase/functions/_shared/catalog.ts";
import * as demo from "../app/src/lib/demo.ts";
import type { Child } from "../app/src/lib/types.ts";

const child = (pronoun: Child["pronoun"]): Child => ({
  id: "c",
  first_name: "Sam",
  age: 6,
  pronoun,
  interests: ["les dinosaures"],
  companion: null,
  created_at: new Date().toISOString(),
});

describe("modèles d'histoires de démo", () => {
  it("produit un texte complet pour chaque univers et chaque pronom", () => {
    for (const theme of THEMES) {
      for (const pronoun of ["il", "elle", "neutre"] as const) {
        const { title, text } = demo.writeStory(child(pronoun), theme, MORALS[0], "long", "Mamie vient dîner.");
        expect(title).toContain("Sam");
        expect(text).toContain("Sam");
        expect(text).toContain("les dinosaures");
        expect(text).toContain("Mamie vient dîner");
        expect(text).not.toMatch(/undefined|null|\$\{/);
      }
    }
  });

  it("allonge le texte avec la durée", () => {
    const len = (d: "court" | "moyen" | "long") => demo.writeStory(child("elle"), THEMES[0], null, d).text.length;
    expect(len("court")).toBeLessThan(len("moyen"));
    expect(len("moyen")).toBeLessThan(len("long"));
  });
});

describe("faux backend de démo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    demo.reset();
  });
  afterEach(() => vi.useRealTimers());

  it("simule la génération jusqu'à « ready »", async () => {
    const [lea] = await demo.listChildren();
    const id = await demo.createStory({ child_id: lea.id, theme: "espace", moral: null, duration: "court", details: null });
    expect((await demo.getStory(id))?.status).toBe("pending");
    vi.advanceTimersByTime(6000);
    const story = await demo.getStory(id);
    expect(story?.status).toBe("ready");
    expect(story?.text).toContain("Léa");
  });

  it("applique le quota gratuit puis l'offre simulée", async () => {
    const [lea] = await demo.listChildren();
    const input = { child_id: lea.id, theme: "foret", moral: null, duration: "court" as const, details: null };
    for (let i = 0; i < 3; i++) await demo.createStory(input);
    await expect(demo.createStory(input)).rejects.toMatchObject({ code: "quota_exceeded" });
    await expect(demo.createStory({ ...input, duration: "long" })).rejects.toMatchObject({ code: "duration_not_allowed" });
    await demo.subscribe("famille");
    await expect(demo.createStory({ ...input, duration: "long" })).resolves.toBeTypeOf("string");
    expect((await demo.getUsage()).plan).toBe("famille");
  });
});
