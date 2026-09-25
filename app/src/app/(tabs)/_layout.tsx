import { Tabs } from "expo-router/js-tabs";
import { Text } from "react-native";
import { isDemo } from "@/lib/config";
import { colors } from "@/lib/theme";

const icon = (emoji: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerRight: isDemo
          ? () => <Text style={{ color: colors.accent, fontWeight: "800", marginRight: 16 }}>DÉMO</Text>
          : undefined,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Créer", tabBarIcon: icon("✨") }} />
      <Tabs.Screen name="library" options={{ title: "Bibliothèque", tabBarIcon: icon("📚") }} />
      <Tabs.Screen name="children" options={{ title: "Enfants", tabBarIcon: icon("🧒") }} />
      <Tabs.Screen name="account" options={{ title: "Compte", tabBarIcon: icon("⚙️") }} />
    </Tabs>
  );
}
