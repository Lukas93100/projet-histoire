// Faux backend du mode démo : données en mémoire (remises à zéro au
// redémarrage de l'app) et histoires générées à partir de modèles, sans IA.
import {
  checkQuota,
  DURATIONS,
  type DurationId,
  findOption,
  MORALS,
  type Option,
  type PlanId,
  PLANS,
  type Pronoun,
  THEMES,
} from "@shared/catalog";
import type { ChildInput, CreateStoryInput } from "./api";
import { ApiError } from "./errors";
import type { Child, Story, Usage } from "./types";

const now = () => new Date().toISOString();
const uid = () => `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const LEA: Child = {
  id: "demo-lea",
  first_name: "Léa",
  age: 5,
  pronoun: "elle",
  interests: ["les licornes", "les crêpes"],
  companion: "Pompon le lapin",
  created_at: now(),
};

let plan: PlanId = "free";
let children: Child[] = [];
let stories: Story[] = [];

export function reset(): void {
  plan = "free";
  children = [{ ...LEA }];
  const text = writeStory(LEA, THEMES[0], findOption(MORALS, "amitie") ?? null, "court");
  stories = [
    {
      id: "demo-exemple",
      child_id: LEA.id,
      child_name: LEA.first_name,
      theme: THEMES[0].id,
      moral: "amitie",
      duration: "court",
      credits: 1,
      status: "ready",
      error: null,
      title: text.title,
      text: text.text,
      audio_path: null,
      audio_seconds: estimate(text.text),
      is_favorite: true,
      created_at: now(),
    },
  ];
}

// --- Enfants ---------------------------------------------------------------

export async function listChildren(): Promise<Child[]> {
  return [...children];
}

export async function getChild(id: string): Promise<Child | null> {
  return children.find((c) => c.id === id) ?? null;
}

export async function saveChild(id: string | null, input: ChildInput): Promise<void> {
  if (id) children = children.map((c) => (c.id === id ? { ...c, ...input } : c));
  else children.push({ ...input, id: uid(), created_at: now() });
}

export async function deleteChild(id: string): Promise<void> {
  children = children.filter((c) => c.id !== id);
  stories = stories.map((s) => (s.child_id === id ? { ...s, child_id: null } : s));
}

// --- Histoires -------------------------------------------------------------

export async function listStories(): Promise<Story[]> {
  return [...stories].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getStory(id: string): Promise<Story | null> {
  const story = stories.find((s) => s.id === id);
  return story ? { ...story } : null;
}

export async function setFavorite(id: string, isFavorite: boolean): Promise<void> {
  update(id, { is_favorite: isFavorite });
}

export async function deleteStory(id: string): Promise<void> {
  stories = stories.filter((s) => s.id !== id);
}

/** Simule la génération : pending → writing → narrating → ready (≈ 6 s). */
export async function createStory(input: CreateStoryInput): Promise<string> {
  const child = children.find((c) => c.id === input.child_id);
  if (!child) throw new ApiError("not_found", "Profil enfant introuvable");
  const check = checkQuota(plan, input.duration, used());
  if (!check.ok) throw new ApiError(check.reason, "Plus de crédits disponibles");

  const theme = findOption(THEMES, input.theme) ?? THEMES[0];
  const moral = findOption(MORALS, input.moral) ?? null;
  const id = uid();
  stories.push({
    id,
    child_id: child.id,
    child_name: child.first_name,
    theme: theme.id,
    moral: moral?.id ?? null,
    duration: input.duration,
    credits: DURATIONS[input.duration].credits,
    status: "pending",
    error: null,
    title: null,
    text: null,
    audio_path: null,
    audio_seconds: null,
    is_favorite: false,
    created_at: now(),
  });

  const story = writeStory(child, theme, moral, input.duration, input.details);
  setTimeout(() => update(id, { status: "writing" }), 1000);
  setTimeout(() => update(id, { status: "narrating", title: story.title, text: story.text }), 3500);
  setTimeout(() => update(id, { status: "ready", audio_seconds: estimate(story.text) }), 6000);
  return id;
}

function update(id: string, fields: Partial<Story>) {
  stories = stories.map((s) => (s.id === id ? { ...s, ...fields } : s));
}

// --- Compte ----------------------------------------------------------------

function used(): number {
  const period = PLANS[plan].period;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return stories
    .filter((s) => s.id !== "demo-exemple" && s.status !== "failed")
    .filter((s) => period === "lifetime" || new Date(s.created_at) >= monthStart)
    .reduce((sum, s) => sum + s.credits, 0);
}

export async function getUsage(): Promise<Usage> {
  const u = used();
  return { plan, plan_expires_at: null, month_used: u, lifetime_used: u };
}

/** « Achat » simulé depuis l'écran des offres. */
export async function subscribe(next: PlanId): Promise<void> {
  plan = next;
}

// --- Modèles d'histoires ---------------------------------------------------

function estimate(text: string): number {
  return Math.round((text.split(/\s+/).length / 115) * 60);
}

function grammar(pronoun: Pronoun, name: string) {
  if (pronoun === "il") return { sub: "il", Sub: "Il", e: "", petit: "petit garçon", murmured: "murmura-t-il" };
  if (pronoun === "elle") return { sub: "elle", Sub: "Elle", e: "e", petit: "petite fille", murmured: "murmura-t-elle" };
  return { sub: name, Sub: name, e: "", petit: "enfant", murmured: `murmura ${name}` };
}

interface Place {
  place: string;
  /** Présentation du guide, et son prénom pour les répliques (évite les accords il/elle). */
  guide: string;
  name: string;
  wonder: string;
}

const PLACES: Record<string, Place> = {
  foret: { place: "une forêt aux arbres immenses", guide: "Hulotte, un hibou aux lunettes rondes", name: "Hulotte", wonder: "des champignons qui brillaient comme des lanternes" },
  espace: { place: "une petite fusée argentée", guide: "Bip, un robot tout rond", name: "Bip", wonder: "une planète couverte de guimauve" },
  ocean: { place: "le fond de l'océan bleu turquoise", guide: "Mamie Coquille, une tortue très âgée", name: "Mamie Coquille", wonder: "un jardin de coraux qui chantaient doucement" },
  dinosaures: { place: "une vallée verte au pied d'un volcan endormi", guide: "Trico, un bébé tricératops curieux", name: "Trico", wonder: "des œufs géants tachetés de toutes les couleurs" },
  chateau: { place: "un château aux tours pointues", guide: "Pif, un petit dragon qui éternuait des étincelles", name: "Pif", wonder: "une salle remplie de couronnes et de livres anciens" },
  pirates: { place: "un bateau pirate aux voiles rapiécées", guide: "Plume, une perroquette bavarde", name: "Plume", wonder: "une carte au trésor dessinée à la craie" },
  magie: { place: "une école de magie perchée sur un nuage", guide: "Monsieur Rime, un chat qui parlait en rimes", name: "Monsieur Rime", wonder: "une baguette qui faisait pousser des fleurs" },
  ferme: { place: "une ferme au bord d'une rivière", guide: "Marguerite, une vache qui adorait danser", name: "Marguerite", wonder: "un poussin qui venait juste de naître" },
  "super-heros": { place: "une ville où les lampadaires souriaient", guide: "Pois, une coccinelle masquée", name: "Pois", wonder: "une cape qui permettait de voler tout doucement" },
  nuit: { place: "le pays des rêves, tout en nuages moelleux", guide: "Scintille, une étoile filante un peu timide", name: "Scintille", wonder: "un lac où se reflétaient toutes les lunes du monde" },
};

type Grammar = ReturnType<typeof grammar>;

const EPISODES: ((n: string, g: Grammar, p: Place) => string)[] = [
  (n, g, p) =>
    `Au détour du chemin, ${n} découvrit ${p.wonder}. « Oh ! Regarde ! » ${g.murmured}, les yeux pétillants. ${p.name} sourit : « Ici, tout est possible pour qui ose rêver. »`,
  (n, g) =>
    `Soudain, un petit problème se présenta : le pont qui permettait de continuer était cassé. ${g.Sub} réfléchit longtemps, très longtemps. Puis ${n} eut une idée : rassembler des branches, des feuilles et beaucoup de bonne volonté. Pas à pas, le pont fut réparé.`,
  (n) =>
    `Plus loin, ils rencontrèrent un petit écureuil qui pleurait tout seul. ${n} s'approcha doucement, s'assit à côté de lui et lui demanda ce qui n'allait pas. Il avait perdu son chemin. « Viens avec nous », proposa ${n}. Et l'écureuil sécha ses larmes.`,
];

export function writeStory(
  child: Child,
  theme: Option,
  moral: Option | null,
  duration: DurationId,
  details?: string | null,
): { title: string; text: string } {
  const n = child.first_name;
  const g = grammar(child.pronoun, n);
  const p = PLACES[theme.id] ?? PLACES.foret;
  const companion = child.companion ?? "son fidèle doudou";
  const interest = child.interests[0];
  const episodes = duration === "court" ? 1 : duration === "moyen" ? 2 : 3;

  const paragraphs = [
    `Il était une fois un${g.e} ${g.petit} de ${child.age} ans qui s'appelait ${n}. Ce soir-là, alors que la lune se levait, ${n} serra fort ${companion} dans ses bras et ferma les yeux.`,
    `Quand ses yeux se rouvrirent, ${n} se trouvait dans ${p.place}. À ses côtés, ${companion} clignait des yeux, tout étonné. C'est alors qu'apparut ${p.guide}. « Bienvenue ! Nous t'attendions », dit ${p.name} gentiment.`,
    ...EPISODES.slice(0, episodes).map((episode) => episode(n, g, p)),
  ];
  if (interest) {
    paragraphs.push(`Pour fêter cette belle aventure, tout le monde se réunit, et devine quoi ? Il y avait ${interest} ! ${n} rit aux éclats.`);
  }
  if (details?.trim()) {
    paragraphs.push(`Et ${n} pensa aussi à une chose importante : ${details.trim().replace(/\.$/, "")}. Cela lui fit chaud au cœur.`);
  }
  if (moral) {
    // « le courage : on peut avoir peur… » → « on peut avoir peur… »
    const lesson = moral.prompt.includes(" : ") ? moral.prompt.split(" : ")[1] : moral.prompt;
    paragraphs.push(`Et ${n} garda précieusement cette leçon dans son cœur : ${lesson}.`);
  }
  paragraphs.push(
    `Le ciel se teinta de rose et d'or. ${p.name} raccompagna ${n} et ${companion} jusqu'au bord du rêve. « Reviens quand tu veux », chuchota ${p.name}. ${g.Sub} bâilla, se blottit sous sa couette et s'endormit, le sourire aux lèvres. Bonne nuit, ${n}.`,
  );

  return { title: `${n} et ${p.name}`, text: paragraphs.join("\n\n") };
}

// Données initiales (après la déclaration des modèles utilisés par reset()).
reset();
