import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Body, Button, Chip, ChipGroup, Label } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";

const SLEEP_OPTIONS = [0, 5, 10, 20];

// Lecteur du mode démo : l'histoire est lue par la synthèse vocale du téléphone
// (en production, c'est un MP3 ElevenLabs lu par <Player />).
export function DemoPlayer({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void Speech.stop(), []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!sleepMinutes) return;
    timer.current = setTimeout(() => {
      Speech.stop();
      setSleepMinutes(0);
    }, sleepMinutes * 60_000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [sleepMinutes]);

  const toggle = () => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(text, {
      language: "fr-FR",
      rate: 0.9,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>Mode démo · voix du téléphone</Text>
      <Button title={speaking ? "■ Arrêter" : "▶ Écouter l'histoire"} onPress={toggle} />
      <Body muted>Dans la version complète, l'histoire est racontée par une voix ElevenLabs bien plus naturelle.</Body>
      <View style={{ gap: spacing.sm }}>
        <Label>Minuteur de sommeil</Label>
        <ChipGroup>
          {SLEEP_OPTIONS.map((m) => (
            <Chip key={m} label={m ? `${m} min` : "Désactivé"} selected={m === sleepMinutes} onPress={() => setSleepMinutes(m)} />
          ))}
        </ChipGroup>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: { color: colors.accent, fontWeight: "700", textAlign: "center" },
});
