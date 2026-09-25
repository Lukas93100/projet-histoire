import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { findOption, MORALS, THEMES } from "@shared/catalog";
import { Player } from "@/components/Player";
import { Body, Button, Card, ErrorText, Loading, Screen, Title } from "@/components/ui";
import { audioUrl, deleteStory, getStory, setFavorite } from "@/lib/api";
import { colors, spacing } from "@/lib/theme";
import type { Story, StoryStatus } from "@/lib/types";

const STEPS: { status: StoryStatus; label: string }[] = [
  { status: "writing", label: "Le conteur imagine l'histoire…" },
  { status: "narrating", label: "Enregistrement de la voix…" },
  { status: "ready", label: "C'est prêt !" },
];

const POLL_MS = 3000;

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);

  // Suit la génération jusqu'à ce que l'histoire soit prête (ou en échec).
  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const s = await getStory(id);
        if (cancelled) return;
        setStory(s);
        if (!s) setError("Histoire introuvable");
        else if (s.status !== "ready" && s.status !== "failed") timeout = setTimeout(poll, POLL_MS);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur");
          timeout = setTimeout(poll, POLL_MS * 2);
        }
      }
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [id]);

  useEffect(() => {
    if (story?.status === "ready" && story.audio_path && !url) {
      audioUrl(story.audio_path).then(setUrl).catch((err) => setError(err.message));
    }
  }, [story?.status, story?.audio_path, url]);

  if (!story) return error ? <Screen><ErrorText>{error}</ErrorText></Screen> : <Loading />;

  const theme = findOption(THEMES, story.theme);
  const moral = findOption(MORALS, story.moral);

  const toggleFavorite = async () => {
    const next = !story.is_favorite;
    setStory({ ...story, is_favorite: next });
    await setFavorite(story.id, next).catch(() => setStory({ ...story, is_favorite: !next }));
  };

  const remove = () =>
    Alert.alert("Supprimer cette histoire ?", "Elle disparaîtra définitivement de la bibliothèque.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          await deleteStory(story);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: story.child_name }} />
      <Text style={styles.emoji}>{theme?.emoji ?? "📖"}</Text>
      <Title>{story.title ?? `Une histoire pour ${story.child_name}`}</Title>
      <Body muted>
        {theme?.label}
        {moral ? ` · ${moral.label}` : ""}
      </Body>

      {story.status === "failed" ? (
        <Card>
          <ErrorText>{story.error ?? "La création a échoué."}</ErrorText>
          <Body muted>Le crédit utilisé vous a été rendu.</Body>
          <Button title="Réessayer" onPress={() => router.replace("/")} />
        </Card>
      ) : story.status !== "ready" ? (
        <Progress status={story.status} />
      ) : url ? (
        <Player url={url} title={story.title ?? "Histoire"} />
      ) : (
        <Loading />
      )}

      {story.text && story.status === "ready" ? (
        <>
          <Button
            title={showText ? "Masquer le texte" : "Lire le texte"}
            variant="secondary"
            onPress={() => setShowText(!showText)}
          />
          {showText ? <Body style={styles.text}>{story.text}</Body> : null}
        </>
      ) : null}

      {story.status === "ready" || story.status === "failed" ? (
        <View style={styles.actions}>
          {story.status === "ready" ? (
            <Button
              title={story.is_favorite ? "⭐ Dans les favoris" : "☆ Ajouter aux favoris"}
              variant="ghost"
              onPress={toggleFavorite}
            />
          ) : null}
          <Button title="Supprimer" variant="danger" onPress={remove} />
        </View>
      ) : null}
    </Screen>
  );
}

function Progress({ status }: { status: StoryStatus }) {
  const current = STEPS.findIndex((s) => s.status === status);
  return (
    <Card style={{ gap: spacing.md }}>
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current || (current === -1 && index === 0);
        return (
          <View key={step.status} style={styles.step}>
            {active ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.stepIcon}>{done ? "✅" : "⏳"}</Text>}
            <Text style={[styles.stepText, !done && !active && { color: colors.textMuted }]}>{step.label}</Text>
          </View>
        );
      })}
      <Body muted>Environ une minute. Vous pouvez quitter cet écran : l'histoire vous attendra dans la bibliothèque.</Body>
    </Card>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 56, textAlign: "center" },
  text: { fontSize: 17, lineHeight: 27 },
  actions: { gap: spacing.sm },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepIcon: { width: 20, textAlign: "center" },
  stepText: { color: colors.text, fontSize: 15, fontWeight: "600" },
});
