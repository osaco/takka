import { BUILDINGS_CATALOG, STARTER_ACTIVITIES } from "@/lib/core/content";
import type { BuildingKey, Lesson, LocalProgress } from "@/lib/types";

export const BUILDINGS = BUILDINGS_CATALOG;
export const LESSONS: Lesson[] = STARTER_ACTIVITIES;

export const INITIAL_BUILDING_LEVELS: Record<BuildingKey, number> = {
  letters: 1,
  numbers: 0,
  stories: 0,
};

export function createInitialProgress(childId: string, childName: string, audioEnabled = true): LocalProgress {
  return {
    version: 1,
    childId,
    childName,
    completedLessonIds: [],
    masteredSkillIds: [],
    assistedLessonIds: [],
    buildingLevels: { ...INITIAL_BUILDING_LEVELS },
    stars: 0,
    planks: 0,
    placedItems: [],
    itemPlacements: {},
    milestonesClaimed: [],
    audioEnabled,
    updatedAt: new Date().toISOString(),
    evidences: [],
    skillsProgress: {},
  };
}

export function getLessonForBuilding(key: BuildingKey, completedIds: string[]) {
  return LESSONS.find((lesson) => lesson.building === key && !completedIds.includes(lesson.id))
    ?? LESSONS.find((lesson) => lesson.building === key)!;
}

export function completedLessonsFor(progress: LocalProgress) {
  return LESSONS.filter((lesson) => progress.completedLessonIds.includes(lesson.id));
}
