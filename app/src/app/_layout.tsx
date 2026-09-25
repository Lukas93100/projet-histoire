import { setAudioModeAsync } from "expo-audio";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Loading } from "@/components/ui";
import { SessionProvider, useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.background, card: colors.background, primary: colors.primary, text: colors.text, border: colors.border },
};

export default function RootLayout() {
  useEffect(() => {
    // Lecture en arrière-plan et même en mode silencieux : indispensable pour une histoire du soir.
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }).catch(
      () => undefined,
    );
  }, []);

  return (
    <ThemeProvider value={theme}>
      <SessionProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </SessionProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { session, loading } = useSession();
  if (loading) return <Loading />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="child/[id]" options={{ title: "Profil enfant" }} />
        <Stack.Screen name="story/[id]" options={{ title: "" }} />
        <Stack.Screen name="paywall" options={{ presentation: "modal", title: "Nos offres" }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
