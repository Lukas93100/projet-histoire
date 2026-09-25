import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { LIMITS, type Pronoun } from "@shared/catalog";
import { Button, Chip, ChipGroup, ErrorText, Field, Label, Loading, Screen } from "@/components/ui";
import { deleteChild, getChild, saveChild } from "@/lib/api";
import { spacing } from "@/lib/theme";

const AGES = Array.from({ length: LIMITS.maxAge - LIMITS.minAge + 1 }, (_, i) => LIMITS.minAge + i);
const PRONOUNS: { id: Pronoun; label: string }[] = [
  { id: "elle", label: "Une fille" },
  { id: "il", label: "Un garçon" },
  { id: "neutre", label: "Ne pas préciser" },
];

export default function ChildForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";

  const [loaded, setLoaded] = useState(isNew);
  const [firstName, setFirstName] = useState("");
  const [age, setAge] = useState(5);
  const [pronoun, setPronoun] = useState<Pronoun>("neutre");
  const [interests, setInterests] = useState("");
  const [companion, setCompanion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    getChild(id)
      .then((child) => {
        if (child) {
          setFirstName(child.first_name);
          setAge(child.age);
          setPronoun(child.pronoun);
          setInterests(child.interests.join(", "));
          setCompanion(child.companion ?? "");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
  }, [id, isNew]);

  if (!loaded) return <Loading />;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveChild(isNew ? null : id, {
        first_name: firstName.trim(),
        age,
        pronoun,
        interests: interests
          .split(",")
          .map((i) => i.trim().slice(0, LIMITS.interestMax))
          .filter(Boolean)
          .slice(0, LIMITS.interestsMax),
        companion: companion.trim() || null,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const remove = () =>
    Alert.alert("Supprimer ce profil ?", "Les histoires déjà créées restent dans la bibliothèque.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          await deleteChild(id);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? "Nouveau profil" : firstName || "Profil enfant" }} />
      <Field
        label="Prénom"
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Léa"
        maxLength={LIMITS.childNameMax}
        autoCapitalize="words"
      />
      <View style={{ gap: spacing.sm }}>
        <Label>Âge</Label>
        <ChipGroup>
          {AGES.map((a) => (
            <Chip key={a} label={`${a} ans`} selected={a === age} onPress={() => setAge(a)} />
          ))}
        </ChipGroup>
      </View>
      <View style={{ gap: spacing.sm }}>
        <Label>Dans l'histoire, c'est…</Label>
        <ChipGroup>
          {PRONOUNS.map((p) => (
            <Chip key={p.id} label={p.label} selected={p.id === pronoun} onPress={() => setPronoun(p.id)} />
          ))}
        </ChipGroup>
      </View>
      <Field
        label="Ce qu'il ou elle adore"
        hint={`Séparés par des virgules (${LIMITS.interestsMax} maximum)`}
        value={interests}
        onChangeText={setInterests}
        placeholder="les licornes, le foot, les crêpes"
      />
      <Field
        label="Doudou ou compagnon (facultatif)"
        value={companion}
        onChangeText={setCompanion}
        placeholder="Pompon, le lapin bleu"
        maxLength={LIMITS.companionMax}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button title="Enregistrer" onPress={save} loading={saving} disabled={!firstName.trim()} />
      {!isNew ? <Button title="Supprimer ce profil" variant="danger" onPress={remove} /> : null}
    </Screen>
  );
}
