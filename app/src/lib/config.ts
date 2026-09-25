/**
 * Mode démo : l'application fonctionne sans Supabase ni clés API, avec des
 * données locales et des histoires d'exemple lues par la voix du téléphone.
 * Actif si EXPO_PUBLIC_DEMO_MODE=1 ou si Supabase n'est pas configuré.
 */
export const isDemo =
  process.env.EXPO_PUBLIC_DEMO_MODE === "1" ||
  !process.env.EXPO_PUBLIC_SUPABASE_URL ||
  !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
