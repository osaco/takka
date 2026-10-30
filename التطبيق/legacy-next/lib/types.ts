import type { Activity, ActivityQuestion, LearningEvidence, ScaffoldStep, SkillProgressRecord } from "@/lib/core/types";

export type BuildingKey = "letters" | "numbers" | "stories";

export type LessonQuestion = ActivityQuestion;
export type Lesson = Activity;
export type { ScaffoldStep };

export type ChildProfile = {
  id: string;
  guardian_id?: string;
  nickname: string;
  avatar_key: string;
  grade: number;
  audio_enabled: boolean;
};

export type LocalProgress = {
  version: 1;
  childId: string;
  childName: string;
  completedLessonIds: string[];
  masteredSkillIds: string[];
  assistedLessonIds: string[];
  buildingLevels: Record<BuildingKey, number>;
  stars: number;
  planks: number;
  placedItems: string[];
  itemPlacements: Record<string, "shore" | "garden" | "near-homes">;
  milestonesClaimed: string[];
  audioEnabled: boolean;
  updatedAt: string;
  evidences?: LearningEvidence[];
  skillsProgress?: Record<string, SkillProgressRecord>;
};

export type PendingAttempt = {
  id: string;
  child_id: string;
  activity_id: string;
  skill_id: string;
  answers: string[];
  outcome: "completed";
  help_used: boolean;
  started_at: string;
  completed_at: string;
  first_completion: boolean;
  building_key: BuildingKey;
  stars_earned: number;
  planks_earned: number;
  item_id: string;
};

export type AuthPanelMode = "sign-in" | "sign-up" | "forgot";

export type AuthUser = {
  id: string;
  email: string;
};
