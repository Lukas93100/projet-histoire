import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { Body, Button, Card, ErrorText, Label, Screen } from "@/components/ui";
import { deleteAccount, getUsage, summarizeUsage } from "@/lib/api";
import { manageSubscription, purchasesEnabled, restorePurchases } from "@/lib/purchases";
import { isDemo } from "@/lib/config";
import { useSession } from "@/lib/session";
import { useFocusData } from "@/lib/useAsync";

const LEGAL_URL = process.env.EXPO_PUBLIC_LEGAL_URL;

export default function Account() {
  const { session, signOut } = useSession();
  const { data, error, loading, reload } = useFocusData(async () => summarizeUsage(await getUsage()));
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    try {
      await action();
      await reload();
    } catch (err) {
      Alert.alert("Oups", err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = () =>
    Alert.alert(
      "Supprimer le compte ?",
      "Vos profils enfants et toutes vos histoires seront définitivement supprimés. Pensez à résilier votre abonnement depuis l'App Store ou Google Play.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => run("delete", async () => { await deleteAccount(); await signOut(); }) },
      ],
    );

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Card>
        <Label>Connecté en tant que</Label>
        <Body muted>{session?.user.email}</Body>
      </Card>

      {data ? (
        <Card>
          <Label>Offre {data.plan.name}</Label>
          <Body muted>
            {data.remaining} crédit{data.remaining > 1 ? "s" : ""} restant{data.remaining > 1 ? "s" : ""} sur {data.plan.credits}
            {data.plan.period === "month" ? " ce mois-ci (remise à zéro le 1er du mois)" : ""}.
          </Body>
          <Button
            title={data.plan.id === "free" ? "Découvrir les offres" : "Changer d'offre"}
            onPress={() => router.push("/paywall")}
          />
          {data.plan.id !== "free" && purchasesEnabled ? (
            <Button
              title="Gérer mon abonnement"
              variant="secondary"
              loading={busy === "manage"}
              onPress={() => run("manage", manageSubscription)}
            />
          ) : null}
          {purchasesEnabled ? (
            <Button
              title="Restaurer mes achats"
              variant="ghost"
              loading={busy === "restore"}
              onPress={() => run("restore", restorePurchases)}
            />
          ) : null}
        </Card>
      ) : null}

      {LEGAL_URL ? (
        <Button title="Confidentialité et CGU" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(LEGAL_URL)} />
      ) : null}
      <Button title={isDemo ? "Quitter la démo" : "Se déconnecter"} variant="secondary" onPress={signOut} />
      <Button title={isDemo ? "Réinitialiser la démo" : "Supprimer mon compte"} variant="danger" loading={busy === "delete"} onPress={confirmDelete} />
    </Screen>
  );
}
