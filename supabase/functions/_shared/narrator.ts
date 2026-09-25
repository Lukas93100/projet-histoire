import { env } from "./http.ts";

// Flash v2.5 : 2x moins cher que Multilingual v2, bonne qualité en français.
// Passer à "eleven_multilingual_v2" pour une voix plus expressive (voir docs/PRICING.md).
const MODEL = Deno.env.get("ELEVENLABS_MODEL") ?? "eleven_flash_v2_5";

/** Convertit le texte en MP3 (44,1 kHz, 64 kb/s : largement suffisant pour une voix) avec ElevenLabs. */
export async function narrate(text: string): Promise<Uint8Array> {
  const voiceId = env("ELEVENLABS_VOICE_ID");
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_64`,
    {
      method: "POST",
      headers: {
        "xi-api-key": env("ELEVENLABS_API_KEY"),
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        // Seuls les modèles v2.5 acceptent le forçage de langue (erreur sinon).
        ...(MODEL.includes("v2_5") ? { language_code: "fr" } : {}),
        voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.2, speed: 0.9 },
      }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 200)}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

/** Durée d'un MP3 CBR 64 kb/s. */
export function mp3Seconds(bytes: number): number {
  return Math.round((bytes * 8) / 64_000);
}
