# 🌙 Histoires du Soir

Application mobile (iOS et Android) qui crée des **histoires audio personnalisées pour les enfants**. Le parent crée le profil de son enfant (prénom, âge, goûts, doudou), puis choisit un univers, une morale et une durée. En une minute environ, l'application écrit une histoire dont l'enfant est le héros et la fait lire par une voix naturelle.

- **Écriture** : Claude (Anthropic)
- **Voix** : ElevenLabs
- **Application** : Expo / React Native (Expo Router)
- **Backend** : Supabase (authentification par code e-mail, Postgres avec RLS, stockage audio, Edge Functions)
- **Abonnements** : App Store et Google Play, gérés via RevenueCat

L'étude de prix complète se trouve dans [`docs/TARIFICATION.md`](docs/TARIFICATION.md). En résumé :

| Offre | Prix | Contenu |
|---|---|---|
| Découverte | Gratuit | 3 histoires offertes |
| Conteur | 6,99 €/mois ou 59,99 €/an | 15 histoires/mois, 2 enfants |
| Famille | 11,99 €/mois ou 99,99 €/an | 30 crédits/mois (une histoire par soir), 5 enfants, histoires de 10 min |

## Fonctionnalités

- 🧒 **Profils enfants** : prénom, âge (2 à 12 ans), fille, garçon ou neutre (pour les accords en français), centres d'intérêt, doudou
- ✨ **Création d'histoire** : 10 univers, 10 morales facultatives, 3 durées, et un détail libre (« Mamie vient dîner demain »)
- 📚 **Bibliothèque** : toutes les histoires, avec filtres par enfant et favoris, réécoute illimitée et gratuite
- 🎧 **Lecteur** : lecture en arrière-plan et écran verrouillé, avance et retour de 15 s, **minuteur de sommeil**, texte affichable
- 💳 **Abonnements** : écran d'offres, restauration des achats, gestion de l'abonnement, crédits remboursés si une génération échoue
- 🔒 **Sécurité et vie privée** : RLS sur toutes les tables, audio privé (URL signées), règles de contenu adapté aux enfants dans le prompt, détails du parent isolés contre l'injection de consignes, suppression du compte dans l'application (exigée par Apple)

## Architecture

```
app/                          Application Expo (TypeScript)
  src/app/                    Écrans (Expo Router)
    sign-in.tsx               Connexion par code e-mail
    (tabs)/index.tsx          Créer une histoire
    (tabs)/library.tsx        Bibliothèque
    (tabs)/children.tsx       Profils enfants
    (tabs)/account.tsx        Compte, abonnement, suppression du compte
    child/[id].tsx            Formulaire d'un profil enfant
    story/[id].tsx            Suivi de la génération et lecteur
    paywall.tsx               Offres d'abonnement
  src/lib/                    Client Supabase, API, RevenueCat, session
  src/components/             Composants d'interface et lecteur audio
supabase/
  migrations/                 Schéma SQL, RLS, quotas atomiques, bucket audio
  functions/
    _shared/catalog.ts        ⭐ Offres, durées, thèmes, morales (partagé avec l'app)
    _shared/prompt.ts         Prompt de génération (règles de contenu enfant)
    _shared/storyteller.ts    Appel à Claude (sortie JSON structurée)
    _shared/narrator.ts       Synthèse vocale ElevenLabs
    generate-story/           Réserve les crédits, puis écrit, enregistre et stocke l'histoire
    sync-subscription/        Synchronise l'offre après un achat
    revenuecat-webhook/       Renouvellements, résiliations, expirations
    delete-account/           Suppression définitive du compte
tests/                        Tests unitaires (vitest)
docs/TARIFICATION.md          Étude de prix et rentabilité
```

**Déroulé d'une génération**
1. L'application appelle `generate-story`.
2. La fonction vérifie l'offre et appelle la fonction SQL `reserve_story`, qui verrouille le compte, compte les crédits du mois et crée l'histoire en statut `pending`. Cette étape est **atomique**, ce qui empêche de dépasser le quota avec des requêtes simultanées.
3. La fonction répond tout de suite `202 { id }`, puis poursuit en arrière-plan : `writing` (Claude), `narrating` (ElevenLabs), envoi du MP3, puis `ready`.
4. L'application interroge le statut toutes les 3 s et affiche la progression.
5. En cas d'erreur, l'histoire passe en `failed` et **n'est plus décomptée**. Une génération bloquée depuis plus de 10 minutes est marquée `failed` automatiquement.

## 🎮 Tester tout de suite (mode démo)

Le mode démo fonctionne **sans Supabase, sans clé API et sans compte store**. Les données restent sur le téléphone et sont effacées au redémarrage. Les histoires sont des exemples construits à partir du prénom, de l'univers et de la morale choisis, et sont lues par la voix du téléphone. Les abonnements sont simulés et aucun paiement n'est demandé.

```bash
git clone https://github.com/Lukas93100/projet-histoire.git
cd projet-histoire/app
npm install
npx expo start
```
Installe **Expo Go** sur ton téléphone (App Store ou Play Store) et scanne le QR code. Sans fichier `.env`, l'app démarre directement en mode démo. Appuie sur « Découvrir la démo » : un profil (Léa) et une histoire d'exemple sont déjà créés.

Pour forcer le mode démo alors que Supabase est configuré, mets `EXPO_PUBLIC_DEMO_MODE=1` dans `app/.env`.

## Mise en route

### Prérequis
- Node.js 20 ou plus récent, [Supabase CLI](https://supabase.com/docs/guides/cli), [EAS CLI](https://docs.expo.dev/eas/) (`npx eas-cli@latest`)
- Des comptes : Supabase, Anthropic (clé API), ElevenLabs (clé API et une voix française), RevenueCat, Apple Developer, Google Play Console

### 1. Supabase
```bash
supabase link --project-ref <votre-projet>
supabase db push                      # applique supabase/migrations
supabase secrets set \
  ANTHROPIC_API_KEY=sk-ant-... \
  ELEVENLABS_API_KEY=... \
  ELEVENLABS_VOICE_ID=<id d'une voix française douce> \
  REVENUECAT_SECRET_API_KEY=sk_... \
  REVENUECAT_WEBHOOK_AUTH="Bearer <un-long-secret-aléatoire>"
supabase functions deploy generate-story
supabase functions deploy sync-subscription
supabase functions deploy delete-account
supabase functions deploy revenuecat-webhook --no-verify-jwt
```
Variables facultatives : `ANTHROPIC_MODEL` (par défaut `claude-opus-5`) et `ELEVENLABS_MODEL` (par défaut `eleven_flash_v2_5`, ou `eleven_multilingual_v2` pour une voix plus expressive mais deux fois plus chère).

Dans **Authentication → Email templates → Magic Link**, remplacez le lien par le code `{{ .Token }}` : l'application se connecte avec un code à 6 chiffres.

### 2. Voix ElevenLabs
Choisissez dans la *Voice Library* une voix française chaleureuse, au débit lent (filtre « Narration » ou « Children's stories »). Ajoutez-la à votre compte et copiez son identifiant dans `ELEVENLABS_VOICE_ID`.

### 3. Abonnements (App Store, Google Play, RevenueCat)
1. Dans **App Store Connect** et la **Google Play Console**, créez 4 abonnements auto-renouvelables dans un même groupe :
   `conteur_monthly` (6,99 €), `conteur_yearly` (59,99 €), `famille_monthly` (11,99 €), `famille_yearly` (99,99 €).
   L'application reconnaît l'offre par le **préfixe** de l'identifiant produit (`conteur…` / `famille…`). Sur Google Play, `conteur_monthly:base` fonctionne aussi.
2. Inscrivez-vous à l'**Apple Small Business Program** : la commission passe de 30 % à 15 %.
3. Dans **RevenueCat** :
   - créez les entitlements `conteur` et `famille` et rattachez-y les produits correspondants ;
   - créez une offering *current* avec des packages Monthly et Annual pour chaque produit ;
   - dans **Integrations → Webhooks**, indiquez l'URL `https://<projet>.supabase.co/functions/v1/revenuecat-webhook` et, comme valeur d'en-tête `Authorization`, la même valeur que `REVENUECAT_WEBHOOK_AUTH`.

### 4. Application
```bash
cd app
cp .env.example .env        # URL et clé anon Supabase, clés publiques RevenueCat, URL des CGU
npm install
npx expo run:ios            # ou run:android. RevenueCat demande une development build (pas Expo Go)
```
Pour publier : `npx eas-cli@latest build --platform all` puis `eas submit`.

## Tests et vérifications
```bash
npm install && npm test                          # tests unitaires : catalogue, quotas, prompt, RevenueCat
cd supabase/functions && deno check */index.ts   # typage des Edge Functions
cd app && npx tsc --noEmit                       # typage de l'application
```
La migration SQL a été testée sur PostgreSQL 16 : quotas, remboursement en cas d'échec, nettoyage des générations bloquées, isolation RLS entre utilisateurs et interdiction pour le client de modifier son offre ou d'appeler `reserve_story`.

## Avant la publication
- [ ] Rédiger les CGU et la politique de confidentialité (RGPD : données de mineurs réduites au prénom, à l'âge et aux goûts ; sous-traitants Anthropic, ElevenLabs, Supabase, RevenueCat) et renseigner `EXPO_PUBLIC_LEGAL_URL`
- [ ] Créer l'icône et l'écran de lancement (`app/assets`)
- [ ] Écouter une dizaine d'histoires par tranche d'âge pour valider la qualité et le ton, puis ajuster `STORY_SYSTEM_PROMPT` si besoin
- [ ] Configurer l'envoi d'e-mails de Supabase (SMTP personnalisé) pour la production
- [ ] Surveiller les coûts réels par histoire (tableaux de bord Anthropic et ElevenLabs) et les comparer à `docs/TARIFICATION.md`
