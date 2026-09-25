import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { DURATIONS, type DurationId, LIMITS, MORALS, THEMES } from "@shared/catalog";
import { Body, Button, Card, Chip, ChipGroup, ErrorText, Field, Label, Screen, Title } from "@/components/ui";
import { ApiError, createStory, getUsage, listChildren, summarizeUsage } from "@/lib/api";
import { colors, spacing } from "@/lib/theme";
import { useFocusData } from "@/lib/useAsync";

export default function CreateStory() {
  const { data, error, loading, reload } = useFocusData(async () => {
    const [children, usage] = await Promise.all([listChildren(), getUsage()]);
    return { children, usage: summarizeUsage(usage) };
  });

  const [childId, setChildId] = useState<string | null>(null);
  const [theme, setTheme] = useState<string>(THEMES[0].id);
  const [moral, setMoral] = useState<string | null>(null);
  const [duration, setDuration] = useState<DurationId>("moyen");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sélectionne le premier enfant par défaut (ou corrige une sélection supprimée).
  useEffect(() => {
    if (!data) return;
    if (!childId || !data.children.some((c) => c.id === childId)) setChildId(data.children[0]?.id ?? null);
  }, [data, childId]);

  if (!data) {
    return (
      <Screen refreshing={loading} onRefresh={reload}>
        {error ? <ErrorText>{error}</ErrorText> : null}
      </Screen>
    );
  }

  const { children, usage } = data;
  const cost = DURATIONS[duration].credits;
  const allowed = usage.plan.durations.includes(duration);
  const enoughCredits = usage.remaining >= cost;

  const submit = async () => {
    if (!childId) return;
    if (!allowed || !enoughCredits) {
      router.push("/paywall");
      return;
    }
    setSubmitting(true);
    try {
      const id = await createStory({ child_id: childId, theme, moral, duration, details: details.trim() || null });
      setDetails("");
      router.push({ pathname: "/story/[id]", params: { id } });
    } catch (err) {
      if (err instanceof ApiError && (err.code === "quota_exceeded" || err.code === "duration_not_allowed")) {
        router.push("/paywall");
      } else {
        Alert.alert("Oups", err instanceof Error ? err.message : "Une erreur est survenue");
      }
    } finally {
      setSubmitting(false);
      reload();
    }
  };

  if (children.length === 0) {
    return (
      <Screen>
        <Title>Bienvenue ! 🌙</Title>
        <Body>Pour commencer, créez le profil de votre enfant : son prénom, son âge et ce qu'il ou elle adore.</Body>
        <Button title="Créer un profil enfant" onPress={() => router.push({ pathname: "/child/[id]", params: { id: "new" } })} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <Card style={styles.usage}>
        <Text style={styles.usageText}>
          Offre {usage.plan.name} · {usage.remaining} crédit{usage.remaining > 1 ? "s" : ""} restant
          {usage.remaining > 1 ? "s" : ""}
          {usage.plan.period === "month" ? " ce mois-ci" : ""}
        </Text>
        {usage.plan.id !== "famille" ? (
          <Text style={styles.upgrade} onPress={() => router.push("/paywall")}>
            Plus d'histoires →
          </Text>
        ) : null}
      </Card>

      <View style={styles.section}>
        <Label>Pour qui ?</Label>
        <ChipGroup>
          {children.map((c) => (
            <Chip key={c.id} label={c.first_name} selected={c.id === childId} onPress={() => setChildId(c.id)} />
          ))}
        </ChipGroup>
      </View>

      <View style={styles.section}>
        <Label>Dans quel univers ?</Label>
        <ChipGroup>
          {THEMES.map((t) => (
            <Chip key={t.id} label={`${t.emoji} ${t.label}`} selected={t.id === theme} onPress={() => setTheme(t.id)} />
          ))}
        </ChipGroup>
      </View>

      <View style={styles.section}>
        <Label>Une morale ? (facultatif)</Label>
        <ChipGroup>
          {MORALS.map((m) => (
            <Chip
              key={m.id}
              label={`${m.emoji} ${m.label}`}
              selected={m.id === moral}
              onPress={() => setMoral(m.id === moral ? null : m.id)}
            />
          ))}
        </ChipGroup>
      </View>

      <View style={styles.section}>
        <Label>Durée</Label>
        <ChipGroup>
          {Object.values(DURATIONS).map((d) => {
            const locked = !usage.plan.durations.includes(d.id);
            return (
              <Chip
                key={d.id}
                label={`${locked ? "🔒 " : ""}${d.label}`}
                selected={d.id === duration}
                onPress={() => (locked ? router.push("/paywall") : setDuration(d.id))}
              />
            );
          })}
        </ChipGroup>
      </View>

      <Field
        label="Un détail à ajouter ? (facultatif)"
        value={details}
        onChangeText={setDetails}
        placeholder="Ex. : Mamie vient dîner demain, il a perdu sa première dent…"
        multiline
        maxLength={LIMITS.detailsMax}
        style={styles.details}
      />

      <Button
        title={
          enoughCredits
            ? `Créer l'histoire (${cost} crédit${cost > 1 ? "s" : ""})`
            : "Plus de crédits : voir les offres"
        }
        onPress={submit}
        loading={submitting}
        disabled={!childId}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  usage: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" },
  usageText: { color: colors.text, fontWeight: "600" },
  upgrade: { color: colors.primary, fontWeight: "700" },
  details: { minHeight: 80, textAlignVertical: "top" },
});
