import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { isDemo } from "./config";

const client: SupabaseClient | null = isDemo
  ? null
  : createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

/** Client Supabase. Ne jamais appeler en mode démo. */
export function db(): SupabaseClient {
  if (!client) throw new Error("Supabase n'est pas configuré (mode démo)");
  return client;
}

// Rafraîchit le jeton seulement quand l'application est au premier plan.
if (client && Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });
}
