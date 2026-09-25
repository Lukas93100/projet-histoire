import Anthropic from "npm:@anthropic-ai/sdk@0.128.0";
import { buildUserPrompt, type GeneratedStory, parseStory, STORY_JSON_SCHEMA, STORY_SYSTEM_PROMPT, type StoryRequest } from "./prompt.ts";

const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-5";

let client: Anthropic | null = null;

export class StoryRefusedError extends Error {}

/** Écrit l'histoire avec Claude (sortie JSON structurée). */
export async function writeStory(req: StoryRequest): Promise<GeneratedStory> {
  client ??= new Anthropic(); // lit ANTHROPIC_API_KEY
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    // Si le modèle décline la demande, l'API relance automatiquement sur le modèle de secours recommandé.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: STORY_JSON_SCHEMA },
    },
    // Le prompt système est identique pour toutes les requêtes : on le met en cache.
    system: [{ type: "text", text: STORY_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: buildUserPrompt(req) }],
  });

  if (response.stop_reason === "refusal") {
    throw new StoryRefusedError("Cette demande ne peut pas donner lieu à une histoire.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Histoire tronquée (max_tokens)");
  }
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("Réponse vide du modèle");
  return parseStory(text.text);
}
