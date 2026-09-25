import type { DurationId, PlanId, Pronoun } from "@shared/catalog";

export interface Child {
  id: string;
  first_name: string;
  age: number;
  pronoun: Pronoun;
  interests: string[];
  companion: string | null;
  created_at: string;
}

export type StoryStatus = "pending" | "writing" | "narrating" | "ready" | "failed";

export interface Story {
  id: string;
  child_id: string | null;
  child_name: string;
  theme: string;
  moral: string | null;
  duration: DurationId;
  credits: number;
  status: StoryStatus;
  error: string | null;
  title: string | null;
  text: string | null;
  audio_path: string | null;
  audio_seconds: number | null;
  is_favorite: boolean;
  created_at: string;
}

export interface Usage {
  plan: PlanId;
  plan_expires_at: string | null;
  month_used: number;
  lifetime_used: number;
}
