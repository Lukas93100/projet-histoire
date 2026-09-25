// Source unique de vérité pour les offres, durées, thèmes et morales.
// Ce fichier est importé à la fois par les Edge Functions (Deno) et par
// l'application Expo (via metro.config.js) : il ne doit avoir AUCUN import.

export type PlanId = "free" | "conteur" | "famille";
export type DurationId = "court" | "moyen" | "long";
export type Pronoun = "il" | "elle" | "neutre";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** Crédits disponibles par période. */
  credits: number;
  /** "month" = remis à zéro le 1er du mois (heure de Paris), "lifetime" = une seule fois. */
  period: "month" | "lifetime";
  maxChildren: number;
  durations: DurationId[];
  /** Prix de référence TTC en euros, affichés si le store n'est pas joignable. */
  priceMonthly: number | null;
  priceYearly: number | null;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Découverte",
    tagline: "Pour essayer",
    credits: 3,
    period: "lifetime",
    maxChildren: 1,
    durations: ["court", "moyen"],
    priceMonthly: null,
    priceYearly: null,
    features: ["3 histoires offertes", "1 profil enfant", "Histoires courtes et moyennes"],
  },
  conteur: {
    id: "conteur",
    name: "Conteur",
    tagline: "Quelques histoires par semaine",
    credits: 15,
    period: "month",
    maxChildren: 2,
    durations: ["court", "moyen"],
    priceMonthly: 6.99,
    priceYearly: 59.99,
    features: [
      "15 histoires par mois",
      "2 profils enfants",
      "Histoires de 3 à 6 minutes",
      "Bibliothèque illimitée",
    ],
  },
  famille: {
    id: "famille",
    name: "Famille",
    tagline: "Une histoire chaque soir",
    credits: 30,
    period: "month",
    maxChildren: 5,
    durations: ["court", "moyen", "long"],
    priceMonthly: 11.99,
    priceYearly: 99.99,
    features: [
      "30 crédits par mois (une histoire par soir)",
      "5 profils enfants",
      "Histoires longues (10 min, 2 crédits)",
      "Bibliothèque illimitée",
    ],
  },
};

/** Identifiants des produits dans App Store Connect / Google Play (et RevenueCat). */
export const PRODUCT_IDS = {
  conteur: { monthly: "conteur_monthly", yearly: "conteur_yearly" },
  famille: { monthly: "famille_monthly", yearly: "famille_yearly" },
} as const;

/** Identifiants des entitlements RevenueCat, du plus fort au plus faible. */
export const ENTITLEMENT_PRIORITY: PlanId[] = ["famille", "conteur"];

export interface Duration {
  id: DurationId;
  label: string;
  minutes: number;
  /** Nombre de mots visé (lecture posée ≈ 115 mots/min). */
  targetWords: number;
  credits: number;
}

export const DURATIONS: Record<DurationId, Duration> = {
  court: { id: "court", label: "Courte (~3 min)", minutes: 3, targetWords: 350, credits: 1 },
  moyen: { id: "moyen", label: "Moyenne (~6 min)", minutes: 6, targetWords: 700, credits: 1 },
  long: { id: "long", label: "Longue (~10 min)", minutes: 10, targetWords: 1150, credits: 2 },
};

export interface Option {
  id: string;
  label: string;
  emoji: string;
  /** Consigne transmise au modèle. */
  prompt: string;
}

export const THEMES: Option[] = [
  { id: "foret", label: "Forêt enchantée", emoji: "🌳", prompt: "une forêt enchantée peuplée d'animaux qui parlent" },
  { id: "espace", label: "Voyage dans l'espace", emoji: "🚀", prompt: "un voyage en fusée entre les planètes et les étoiles" },
  { id: "ocean", label: "Fond de l'océan", emoji: "🐠", prompt: "une exploration sous-marine avec des créatures marines" },
  { id: "dinosaures", label: "Dinosaures", emoji: "🦕", prompt: "une vallée où vivent des dinosaures gentils" },
  { id: "chateau", label: "Château et chevaliers", emoji: "🏰", prompt: "un château avec des chevaliers, des princesses et des dragons amicaux" },
  { id: "pirates", label: "Pirates", emoji: "🏴‍☠️", prompt: "une chasse au trésor sur un bateau de pirates sympathiques" },
  { id: "magie", label: "École de magie", emoji: "🪄", prompt: "une école où l'on apprend la magie" },
  { id: "ferme", label: "À la ferme", emoji: "🐮", prompt: "une journée à la ferme avec les animaux" },
  { id: "super-heros", label: "Super-héros", emoji: "🦸", prompt: "une aventure où l'enfant découvre un super-pouvoir doux et utile" },
  { id: "nuit", label: "Le pays des rêves", emoji: "🌙", prompt: "un voyage paisible au pays des rêves, parfait pour s'endormir" },
];

export const MORALS: Option[] = [
  { id: "courage", label: "Le courage", emoji: "🦁", prompt: "le courage : on peut avoir peur et agir quand même" },
  { id: "partage", label: "Le partage", emoji: "🤝", prompt: "le plaisir de partager" },
  { id: "amitie", label: "L'amitié", emoji: "💛", prompt: "la valeur de l'amitié et de l'entraide" },
  { id: "peur-du-noir", label: "La peur du noir", emoji: "🔦", prompt: "apprivoiser la peur du noir, la nuit est rassurante" },
  { id: "confiance", label: "La confiance en soi", emoji: "⭐", prompt: "croire en soi et en ses capacités" },
  { id: "differences", label: "Accepter les différences", emoji: "🌈", prompt: "nos différences font notre richesse" },
  { id: "colere", label: "Gérer sa colère", emoji: "🌋", prompt: "reconnaître sa colère et apprendre à se calmer" },
  { id: "patience", label: "La patience", emoji: "🐢", prompt: "la patience et la persévérance" },
  { id: "ecologie", label: "Protéger la nature", emoji: "🌍", prompt: "prendre soin de la nature et des animaux" },
  { id: "fratrie", label: "Frères et sœurs", emoji: "👫", prompt: "bien s'entendre avec ses frères et sœurs, accueillir un bébé" },
];

export const LIMITS = {
  childNameMax: 40,
  interestsMax: 5,
  interestMax: 40,
  companionMax: 60,
  detailsMax: 300,
  minAge: 2,
  maxAge: 12,
} as const;

/** Offre effective : un abonnement expiré retombe sur l'offre gratuite. */
export function effectivePlan(plan: string | null | undefined, expiresAt: string | null | undefined, now = new Date()): PlanId {
  if (plan !== "conteur" && plan !== "famille") return "free";
  if (expiresAt && new Date(expiresAt).getTime() <= now.getTime()) return "free";
  return plan;
}

export type QuotaCheck =
  | { ok: true; credits: number; remaining: number }
  | { ok: false; reason: "duration_not_allowed" | "quota_exceeded"; credits: number; remaining: number };

/** Vérifie qu'une histoire peut être créée (la vérification atomique est refaite en SQL). */
export function checkQuota(planId: PlanId, duration: DurationId, used: number): QuotaCheck {
  const plan = PLANS[planId];
  const credits = DURATIONS[duration].credits;
  const remaining = Math.max(0, plan.credits - used);
  if (!plan.durations.includes(duration)) return { ok: false, reason: "duration_not_allowed", credits, remaining };
  if (credits > remaining) return { ok: false, reason: "quota_exceeded", credits, remaining };
  return { ok: true, credits, remaining: remaining - credits };
}

export function findOption(list: Option[], id: string | null | undefined): Option | undefined {
  return id ? list.find((o) => o.id === id) : undefined;
}
