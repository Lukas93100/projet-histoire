import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { type PlanId, PLANS } from "@shared/catalog";
import { Body, Button, Chip, ChipGroup, ErrorText, Screen, Title } from "@/components/ui";
import { getUsage, summarizeUsage } from "@/lib/api";
import { loadPackages, type PlanPackage, purchase, purchasesEnabled, restorePurchases } from "@/lib/purchases";
import { colors, radius, spacing } from "@/lib/theme";

type PaidPlan = Exclude<PlanId, "free">;
type Period = "monthly" | "yearly";

const euro = (value: number | null) =>
  value === null ? "" : value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

const LEGAL_URL = process.env.EXPO_PUBLIC_LEGAL_URL;

export default function Paywall() {
  const [packages, setPackages] = useState<PlanPackage[]>([]);
  const [currentPlan, setCurrentPlan] = useState<PlanId>("free");
  const [period, setPeriod] = useState<Period>("yearly");
  const [selected, setSelected] = useState<PaidPlan>("famille");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUsage().then((u) => setCurrentPlan(summarizeUsage(u).plan.id)).catch(() => undefined);
    loadPackages().then(setPackages).catch(() => setError("Les offres ne sont pas disponibles pour le moment."));
  }, []);

  const find = (plan: PaidPlan, p: Period) => packages.find((pkg) => pkg.plan === plan && pkg.period === p);

  const priceLabel = (plan: PaidPlan) => {
    const pkg = find(plan, period);
    if (pkg) {
      return period === "yearly" && pkg.pricePerMonthString
        ? `${pkg.priceString} / an (soit ${pkg.pricePerMonthString} / mois)`
        : `${pkg.priceString} / ${period === "yearly" ? "an" : "mois"}`;
    }
    const p = PLANS[plan];
    return period === "yearly" ? `${euro(p.priceYearly)} / an` : `${euro(p.priceMonthly)} / mois`;
  };

  const subscribe = async () => {
    const pkg = find(selected, period);
    if (!pkg) {
      Alert.alert("Indisponible", "Les achats intégrés ne sont pas disponibles sur cet appareil.");
      return;
    }
    setBusy(true);
    try {
      if (await purchase(pkg.pkg)) {
        Alert.alert("Merci ! 🌙", `Votre offre ${PLANS[selected].name} est active.`);
        router.back();
      }
    } catch (err) {
      Alert.alert("Achat impossible", err instanceof Error ? err.message : "Réessayez plus tard.");
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      await restorePurchases();
      router.back();
    } catch {
      Alert.alert("Oups", "Aucun achat à restaurer.");
    } finally {
      setBusy(false);
    }
  };

  const yearlySaving = Math.round(
    (1 - (PLANS[selected].priceYearly ?? 0) / ((PLANS[selected].priceMonthly ?? 1) * 12)) * 100,
  );

  return (
    <Screen>
      <Title>Une histoire chaque soir ✨</Title>
      <Body muted>Des histoires uniques, écrites et racontées pour votre enfant. Sans engagement, résiliable à tout moment.</Body>

      <ChipGroup>
        <Chip label="Mensuel" selected={period === "monthly"} onPress={() => setPeriod("monthly")} />
        <Chip label={`Annuel · -${yearlySaving} %`} selected={period === "yearly"} onPress={() => setPeriod("yearly")} />
      </ChipGroup>

      {(["famille", "conteur"] as PaidPlan[]).map((id) => {
        const plan = PLANS[id];
        const isSelected = id === selected;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            onPress={() => setSelected(id)}
            style={[styles.plan, isSelected && styles.planSelected]}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{plan.name}</Text>
              {id === "famille" ? <Text style={styles.badge}>Le plus choisi</Text> : null}
              {id === currentPlan ? <Text style={styles.badge}>Offre actuelle</Text> : null}
            </View>
            <Text style={styles.price}>{priceLabel(id)}</Text>
            <Text style={styles.tagline}>{plan.tagline}</Text>
            {plan.features.map((f) => (
              <Text key={f} style={styles.feature}>
                ✓ {f}
              </Text>
            ))}
          </Pressable>
        );
      })}

      {error ? <ErrorText>{error}</ErrorText> : null}
      {!purchasesEnabled ? (
        <ErrorText>Achats désactivés : ajoutez les clés RevenueCat dans app/.env et utilisez une development build.</ErrorText>
      ) : null}

      <Button
        title={`S'abonner à ${PLANS[selected].name}`}
        onPress={subscribe}
        loading={busy}
      />
      {purchasesEnabled ? <Button title="Restaurer mes achats" variant="ghost" onPress={restore} disabled={busy} /> : null}

      <Body muted style={styles.legal}>
        L'abonnement est renouvelé automatiquement à la fin de chaque période au même tarif, sauf résiliation au moins
        24 h avant son terme depuis les réglages de votre compte App Store ou Google Play. Le paiement est débité sur
        votre compte à la confirmation de l'achat. Les crédits non utilisés ne sont pas reportés.
      </Body>
      {LEGAL_URL ? (
        <Text style={styles.link} onPress={() => WebBrowser.openBrowserAsync(LEGAL_URL)}>
          Conditions d'utilisation et politique de confidentialité
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  plan: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.border,
  },
  planSelected: { borderColor: colors.primary },
  planHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  planName: { color: colors.text, fontSize: 20, fontWeight: "800" },
  badge: {
    color: colors.primaryText,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
  },
  price: { color: colors.primary, fontSize: 17, fontWeight: "700" },
  tagline: { color: colors.textMuted, marginBottom: spacing.xs },
  feature: { color: colors.text, fontSize: 15 },
  legal: { fontSize: 12, lineHeight: 17 },
  link: { color: colors.accent, fontSize: 13, textAlign: "center", textDecorationLine: "underline" },
});
