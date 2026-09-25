import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Body, Button, ErrorText, Screen } from "@/components/ui";
import { getUsage, listChildren, summarizeUsage } from "@/lib/api";
import { colors, radius, spacing } from "@/lib/theme";
import { useFocusData } from "@/lib/useAsync";

export default function Children() {
  const { data, error, loading, reload } = useFocusData(async () => {
    const [children, usage] = await Promise.all([listChildren(), getUsage()]);
    return { children, plan: summarizeUsage(usage).plan };
  });

  const children = data?.children ?? [];
  const canAdd = data ? children.length < data.plan.maxChildren : false;

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {children.map((child) => (
        <Pressable
          key={child.id}
          onPress={() => router.push({ pathname: "/child/[id]", params: { id: child.id } })}
          style={({ pressed }) => [styles.item, pressed && { opacity: 0.8 }]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{child.first_name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{child.first_name}</Text>
            <Text style={styles.meta}>
              {child.age} ans{child.companion ? ` · avec ${child.companion}` : ""}
            </Text>
          </View>
          <Text style={styles.meta}>›</Text>
        </Pressable>
      ))}
      {data ? (
        canAdd ? (
          <Button
            title="Ajouter un enfant"
            variant="secondary"
            onPress={() => router.push({ pathname: "/child/[id]", params: { id: "new" } })}
          />
        ) : (
          <>
            <Body muted>
              L'offre {data.plan.name} permet {data.plan.maxChildren} profil{data.plan.maxChildren > 1 ? "s" : ""} enfant
              {data.plan.maxChildren > 1 ? "s" : ""}.
            </Body>
            <Button title="Voir les offres" variant="secondary" onPress={() => router.push("/paywall")} />
          </>
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.text, fontSize: 20, fontWeight: "800" },
  name: { color: colors.text, fontSize: 17, fontWeight: "700" },
  meta: { color: colors.textMuted, fontSize: 14 },
});
