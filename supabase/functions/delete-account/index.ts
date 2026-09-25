// POST /functions/v1/delete-account
// Suppression définitive du compte (obligatoire sur l'App Store) :
// fichiers audio, puis utilisateur (les tables sont supprimées en cascade).
import { corsHeaders, errorResponse, json } from "../_shared/http.ts";
import { adminClient, getUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = adminClient();
  const user = await getUser(req, admin);
  if (!user) return errorResponse("unauthorized", "Connexion requise", 401);

  const bucket = admin.storage.from("story-audio");
  while (true) {
    const { data: files, error } = await bucket.list(user.id, { limit: 100 });
    if (error) return errorResponse("server_error", "Suppression des fichiers impossible", 500);
    if (!files.length) break;
    const { error: removeError } = await bucket.remove(files.map((f) => `${user.id}/${f.name}`));
    if (removeError) return errorResponse("server_error", "Suppression des fichiers impossible", 500);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return errorResponse("server_error", "Suppression du compte impossible", 500);
  return json({ ok: true });
});
