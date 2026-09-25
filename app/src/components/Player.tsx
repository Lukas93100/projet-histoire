import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chip, ChipGroup, Label } from "@/components/ui";
import { formatClock } from "@/lib/format";
import { colors, radius, spacing } from "@/lib/theme";

const SLEEP_OPTIONS = [0, 5, 10, 20, 30]; // minutes, 0 = désactivé

export function Player({ url, title }: { url: string; title: string }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [sleepEndsAt, setSleepEndsAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Contrôles sur l'écran verrouillé.
  useEffect(() => {
    player.setActiveForLockScreen(true, { title, artist: "Histoires du Soir" });
    return () => player.setActiveForLockScreen(false);
  }, [player, title]);

  // Minuteur de sommeil : met la lecture en pause après N minutes.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!sleepMinutes) {
      setSleepEndsAt(null);
      return;
    }
    const ms = sleepMinutes * 60_000;
    setSleepEndsAt(Date.now() + ms);
    timer.current = setTimeout(() => {
      player.pause();
      setSleepMinutes(0);
    }, ms);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [sleepMinutes, player]);

  // À la fin de l'histoire, revenir au début pour une réécoute.
  useEffect(() => {
    if (status.didJustFinish) player.seekTo(0);
  }, [status.didJustFinish, player]);

  const duration = status.duration || 0;
  const progress = duration ? Math.min(1, status.currentTime / duration) : 0;
  const skip = (delta: number) => player.seekTo(Math.max(0, Math.min(duration, status.currentTime + delta)));

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.times}>
        <Text style={styles.time}>{formatClock(status.currentTime)}</Text>
        <Text style={styles.time}>{duration ? formatClock(duration) : "--:--"}</Text>
      </View>

      <View style={styles.controls}>
        <RoundButton label="↺ 15" onPress={() => skip(-15)} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={status.playing ? "Pause" : "Lecture"}
          onPress={() => (status.playing ? player.pause() : player.play())}
          disabled={!status.isLoaded}
          style={[styles.play, !status.isLoaded && { opacity: 0.5 }]}
        >
          <Text style={styles.playIcon}>{status.playing ? "❚❚" : "▶"}</Text>
        </Pressable>
        <RoundButton label="15 ↻" onPress={() => skip(15)} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Label>
          Minuteur de sommeil
          {sleepEndsAt ? ` · arrêt à ${new Date(sleepEndsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
        </Label>
        <ChipGroup>
          {SLEEP_OPTIONS.map((m) => (
            <Chip key={m} label={m ? `${m} min` : "Désactivé"} selected={m === sleepMinutes} onPress={() => setSleepMinutes(m)} />
          ))}
        </ChipGroup>
      </View>
    </View>
  );
}

function RoundButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.round}>
      <Text style={styles.roundText}>{label}</Text>
    </Pressable>
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
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceRaised, overflow: "hidden" },
  fill: { height: 6, backgroundColor: colors.primary },
  times: { flexDirection: "row", justifyContent: "space-between" },
  time: { color: colors.textMuted, fontVariant: ["tabular-nums"] },
  controls: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.xl },
  play: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: { color: colors.primaryText, fontSize: 26, fontWeight: "800" },
  round: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  roundText: { color: colors.text, fontWeight: "700" },
});
