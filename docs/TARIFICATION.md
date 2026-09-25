# Étude de prix : Histoires du Soir

*Septembre 2026. Les prix concurrents et les coûts fournisseurs doivent être revérifiés avant le lancement.*

## Recommandation

| Offre | Prix mensuel | Prix annuel | Contenu |
|---|---|---|---|
| **Découverte** | Gratuit | – | 3 histoires offertes (une seule fois), 1 profil enfant, durées courte et moyenne |
| **Conteur** | **6,99 €** | **59,99 €** (≈ 5 €/mois, −28 %) | 15 histoires/mois, 2 profils, jusqu'à 6 min |
| **Famille** ⭐ | **11,99 €** | **99,99 €** (≈ 8,33 €/mois, −31 %) | 30 crédits/mois (une histoire par soir), 5 profils, histoires longues de 10 min (2 crédits) |

L'offre annuelle est présélectionnée sur l'écran d'abonnement, et l'offre Famille est mise en avant comme « Le plus choisi ». Ces valeurs se modifient dans `supabase/functions/_shared/catalog.ts`, qui fait foi pour l'application et le serveur, et dans les stores.

## 1. Marché : ce que paient déjà les parents

| Service | Type | Prix |
|---|---|---|
| La Boîte à Rêves | Histoires audio, avec un générateur IA « Le Magicien » | dès 1 €/mois, 7 jours d'essai |
| Sybel | Catalogue audio enfants | dès 3,99 €/mois |
| Capitaine Aventure | Application d'apprentissage de la lecture | ≈ 5 €/mois, tarif famille disponible |
| **Lunii+** | Catalogue audio illimité (référence du marché français) | **9,90 €/mois**, 11,90 € avec la conteuse |
| Applications IA d'histoires personnalisées (comparatif 2026) | Personnalisation et illustrations | **10 à 30 $/mois** |
| Oscar Stories | Histoires IA narrées, 11 langues | abonnement « illimité » ou packs de pièces (1 pièce = 1 histoire) |

**Ce qu'on en retient :**
- Pour un catalogue audio non personnalisé, les parents français paient entre 4 et 10 €/mois. Lunii+ à 9,90 € sert d'ancre de prix.
- La personnalisation par l'IA justifie de se placer au niveau de Lunii ou au-dessus. Les concurrents IA se situent à 10 $/mois et plus.
- **Conteur à 6,99 €** reste abordable, au-dessus de Sybel et sous Lunii+. **Famille à 11,99 €** se compare à Lunii+, avec en plus l'argument d'une histoire unique chaque soir, dont l'enfant est le héros.

## 2. Coût de revient d'une histoire

Hypothèses : lecture posée à environ 115 mots/min et environ 6 caractères par mot en français (espaces compris), soit 1 $ ≈ 0,90 €.

**Texte (Claude Opus 5, 5 $ par million de tokens en entrée, 25 $ en sortie) :** environ 1 200 tokens en entrée (le prompt système est mis en cache), et 1 000 à 3 000 tokens en sortie, raisonnement compris (effort `medium`). Cela revient à **0,04 à 0,09 $** par histoire.

**Voix (ElevenLabs Flash v2.5, environ 0,05 $ pour 1 000 caractères au tarif API public) :**

| Durée | Mots | Caractères | Voix | Texte | **Total** | Crédits | **Coût par crédit** |
|---|---|---|---|---|---|---|---|
| Courte (3 min) | 350 | ≈ 2 100 | 0,11 $ | 0,04 $ | **≈ 0,14 €** | 1 | 0,14 € |
| Moyenne (6 min) | 700 | ≈ 4 200 | 0,21 $ | 0,06 $ | **≈ 0,25 €** | 1 | 0,25 € |
| Longue (10 min) | 1 150 | ≈ 6 900 | 0,35 $ | 0,09 $ | **≈ 0,40 €** | 2 | 0,20 € |

> Avec **Multilingual v2** (voix plus expressive, environ 0,10 $ pour 1 000 caractères), le coût de la voix double et une histoire moyenne revient à environ 0,43 €. Ce n'est rentable qu'avec un forfait ElevenLabs à volume, qui fait baisser le prix au caractère. Le modèle se change avec la variable `ELEVENLABS_MODEL`.

Le **stockage** est négligeable : une histoire moyenne pèse environ 2,9 Mo en MP3 64 kb/s. Les réécoutes ne coûtent que de la bande passante Supabase (250 Go inclus dans l'offre Pro). **Réécouter une histoire ne consomme aucun crédit**, ce qui compte beaucoup puisque les enfants redemandent souvent la même histoire.

## 3. Marge par abonné

Revenu net = prix TTC ÷ 1,20 (TVA française) × 0,85 (commission App Store / Google Play de 15 %, avec l'Apple Small Business Program ; les abonnements Google Play sont à 15 % dès le premier jour).

| Offre | Revenu net / mois | Coût si 100 % des crédits (histoires moyennes) | Marge au pire | Coût à 50 % d'utilisation (cas typique) | Marge typique |
|---|---|---|---|---|---|
| Conteur mensuel | 4,95 € | 3,75 € | +1,20 € (24 %) | 1,90 € | **+3,05 € (62 %)** |
| Famille mensuel | 8,49 € | 7,50 € | +0,99 € (12 %) | 3,75 € | **+4,74 € (56 %)** |
| Conteur annuel | 3,54 € | 3,75 € | −0,21 € | 1,90 € | **+1,64 € (46 %)** |
| Famille annuel | 5,90 € | 7,50 € | −1,60 € | 3,75 € | **+2,15 € (36 %)** |

- Les offres **mensuelles restent rentables même si tous les crédits sont utilisés**.
- Les offres **annuelles** perdent un peu d'argent seulement si tous les crédits sont consommés chaque mois pendant un an, ce qui est rare : l'usage baisse avec le temps. Elles améliorent nettement la rétention et la trésorerie.
- Frais fixes : Supabase Pro 25 $/mois et Apple Developer 99 $/an. RevenueCat est gratuit jusqu'à 2 500 $ de revenu mensuel suivi, puis prend 1 %.
- **L'offre gratuite** coûte au maximum 3 × 0,25 € = 0,75 € par inscription. C'est un coût d'acquisition raisonnable pour faire découvrir le produit.

## 4. Pourquoi des crédits plutôt qu'un accès illimité ?

Chaque histoire a un coût réel (IA et voix). Un accès illimité à 10 € serait déficitaire dès 40 histoires par mois, et exposé aux abus. Les crédits :
- rendent le coût prévisible, avec une marge positive sur les offres mensuelles ;
- restent simples à comprendre (« une histoire par soir » = 30 crédits) ;
- sont remboursés automatiquement si une génération échoue.

## 5. Leviers d'optimisation, par ordre d'impact

1. **Voix** : négocier un forfait ElevenLabs à volume, ou garder Flash v2.5 (déjà par défaut).
2. **Texte** : Claude Opus 5 à l'effort `medium` est un bon compromis. Pour réduire les coûts, essayer l'effort `low` après avoir comparé la qualité des histoires sur un échantillon.
3. **Tarifs** : tester avec RevenueCat Experiments (A/B) 7,99 € contre 6,99 € pour Conteur, et un essai gratuit de 7 jours sur l'annuel.
4. **Packs ponctuels** (par exemple 5 histoires pour 2,99 €) pour les parents qui ne veulent pas s'abonner. C'est une extension possible.

## Sources
- [Top 5 des applications d'histoires pour enfants en 2026, La Boîte à Rêves](https://boite-a-reves.fr/2026/08/17/top-5-application-histoires-enfants/)
- [Comparatif des applications de lecture 2026, Capitaine Aventure](https://capitaineaventure.com/blog/meilleure-application-lecture-enfant.html)
- [Générateurs d'histoires IA pour enfants, Jenova (mai 2026)](https://www.jenova.ai/fr/resources/ai-bedtime-story-generator)
- [Abonnement Lunii+](https://lunii.com/fr-fr/lunii-abonnement)
- [Oscar Stories, tarifs](https://app.oscarstories.com/pricing)
- [ElevenLabs API Pricing (juin 2026), Puter](https://developer.puter.com/tutorials/elevenlabs-api-pricing/)
- [ElevenLabs pricing](https://elevenlabs.io/pricing)
- [The 15% App Store Fee, RevenueCat](https://www.revenuecat.com/blog/engineering/small-business-program)
- [App Store Small Business Program, Adapty](https://adapty.io/blog/app-store-small-business-program/)
- Tarifs de l'API Claude : [platform.claude.com](https://platform.claude.com/docs/en/about-claude/pricing)
