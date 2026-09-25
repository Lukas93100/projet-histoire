import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { findOption, THEMES } from "@shared/catalog";
import { Body, Chip, ChipGroup, ErrorText, Screen } from "@/components/ui";
import { listStories } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import { colors, radius, spacing } from "@/lib/theme";
import type { Story } from "@/lib/types";
import { useFocusData } from "@/lib/useAsync";

const STATUS_LABEL: Record<Story["status"], string> = {
  pending: "En préparation…",
  writing: "Écriture…",
  narrating: "Enregistrement…",
  ready: "",
  failed: "Échec",
};

export default function Library() {
  const { data, error, loading, reload } = useFocusData(listStories);
  const [filter, setFilter] = useState<string | "favorites" | null>(null);

  const stories = data ?? [];
  const names = [...new Set(stories.map((s) => s.child_name))];
  const visible = stories.filter((s) =>
    filter === null ? true : filter === "favorites" ? s.is_favorite : s.child_name === filter,
  );

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {stories.length > 0 ? (
        <ChipGroup>
          <Chip label="Toutes" selected={filter === null} onPress={() => setFilter(null)} />
          <Chip label="⭐ Favoris" selected={filter === "favorites"} onPress={() => setFilter("favorites")} />
          {names.length > 1
            ? names.map((n) => <Chip key={n} label={n} selected={filter === n} onPress={() => setFilter(n)} />)
            : null}
        </ChipGroup>
      ) : null}

      {!loading && stories.length === 0 ? (
        <Body muted>Aucune histoire pour l'instant. Créez la première depuis l'onglet « Créer » ✨</Body>
      ) : null}

      {visible.map((story) => {
        const theme = findOption(THEMES, story.theme);
        return (
          <Pressable
            key={story.id}
            onPress={() => router.push({ pathname: "/story/[id]", params: { id: story.id } })}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.emoji}>{theme?.emoji ?? "📖"}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.title} numberOfLines={2}>
                {story.title ?? "Nouvelle histoire"}
              </Text>
              <Text style={styles.meta}>
                {story.child_name} · {new Date(story.created_at).toLocaleDateString("fr-FR")}
                {story.status === "ready" ? ` · ${formatDuration(story.audio_seconds)}` : ""}
              </Text>
              {story.status !== "ready" ? (
                <Text style={[styles.meta, story.status === "failed" && { color: colors.danger }]}>
                  {STATUS_LABEL[story.status]}
                </Text>
              ) : null}
            </View>
            {story.is_favorite ? <Text>⭐</Text> : null}
          </Pressable>
        );
      })}
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
  emoji: { fontSize: 32 },
  title: { color: colors.text, fontSize: 16, fontWeight: "700" },
  meta: { color: colors.textMuted, fontSize: 13 },
});
