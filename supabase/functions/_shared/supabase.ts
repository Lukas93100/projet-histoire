import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.117.1";
import { env } from "./http.ts";

/** Client service role : contourne la RLS, à n'utiliser que côté serveur. */
export function adminClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Utilisateur authentifié à partir de l'en-tête Authorization, ou null. */
export async function getUser(req: Request, admin: SupabaseClient): Promise<User | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error) return null;
  return data.user;
}
