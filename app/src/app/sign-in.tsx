import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { Body, Button, ErrorText, Field, Screen } from "@/components/ui";
import { isDemo } from "@/lib/config";
import { useSession } from "@/lib/session";
import { db } from "@/lib/supabase";
import { colors, spacing } from "@/lib/theme";

// Connexion sans mot de passe : un code à 6 chiffres est envoyé par e-mail.
export default function SignIn() {
  const { enterDemo } = useSession();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setLoading(true);
    setError(null);
    const { error } = await db().auth.signInWithOtp({ email: email.trim().toLowerCase() });
    setLoading(false);
    if (error) setError("Impossible d'envoyer le code. Vérifie l'adresse e-mail.");
    else setStep("code");
  };

  const verify = async () => {
    setLoading(true);
    setError(null);
    const { error } = await db().auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    setLoading(false);
    if (error) setError("Code invalide ou expiré.");
    // En cas de succès, la navigation bascule automatiquement (Stack.Protected).
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.moon}>🌙</Text>
          <Text style={styles.brand}>Histoires du Soir</Text>
          <Body muted style={{ textAlign: "center" }}>
            Des histoires audio uniques, où votre enfant est le héros.
          </Body>
        </View>

        {isDemo ? (
          <>
            <Body style={{ textAlign: "center" }}>
              Mode démo : les histoires sont des exemples lus par la voix du téléphone. Aucune donnée n'est envoyée
              et aucun paiement n'est possible.
            </Body>
            <Button title="Découvrir la démo" onPress={enterDemo} />
          </>
        ) : step === "email" ? (
          <>
            <Field
              label="Adresse e-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="parent@exemple.fr"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <Button title="Recevoir un code" onPress={sendCode} loading={loading} disabled={!email.includes("@")} />
          </>
        ) : (
          <>
            <Body muted>Nous avons envoyé un code à {email}.</Body>
            <Field
              label="Code reçu par e-mail"
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
            />
            <Button title="Se connecter" onPress={verify} loading={loading} disabled={code.trim().length < 6} />
            <Button title="Changer d'adresse" variant="ghost" onPress={() => setStep("email")} />
          </>
        )}
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Body muted style={styles.legal}>
          Application destinée aux parents. Nous ne conservons que le prénom, l'âge et les goûts de vos enfants pour
          écrire leurs histoires.
        </Body>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: spacing.sm, marginTop: spacing.xxl * 2, marginBottom: spacing.xl },
  moon: { fontSize: 64 },
  brand: { color: colors.primary, fontSize: 30, fontWeight: "800" },
  legal: { fontSize: 12, textAlign: "center", marginTop: spacing.xl },
});
