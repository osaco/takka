import type { BuildingKey } from "@/lib/types";
import {
  getLoadedActivities,
  getLoadedActivitiesForBuilding,
  getLoadedActivityById,
  getLoadedSkillById,
  getLoadedSkills,
} from "./content-loader";
import type { Activity, Skill } from "./types";

export interface BuildingDefinition {
  key: BuildingKey;
  title: string;
  subject: string;
  description: string;
  icon: string;
  theme: "green" | "apricot" | "blue";
  shortLabel: string;
}

export const BUILDINGS_CATALOG: BuildingDefinition[] = [
  {
    key: "letters",
    title: "بيت الحروف",
    subject: "حروف وكلمات",
    description: "نكتشف الأصوات والحروف خطوة خطوة.",
    icon: "ب",
    theme: "green",
    shortLabel: "الحروف",
  },
  {
    key: "numbers",
    title: "بيت الأعداد",
    subject: "عدّ وأنماط",
    description: "نلاحظ، نعدّ، ونجرّب أفكاراً جديدة.",
    icon: "٤",
    theme: "apricot",
    shortLabel: "الأعداد",
  },
  {
    key: "stories",
    title: "مكتبة الحكايات",
    subject: "فهم وتسلسل",
    description: "نرتّب الأحداث ونفهم ما تقوله الحكاية.",
    icon: "✦",
    theme: "blue",
    shortLabel: "الحكايات",
  },
];

/**
 * المهارات والأنشطة التأسيسية المحملة من حزمة JSON الموثقة والمحققة عبر أنبوب المحتوى
 * المصدر الوحيد لتعريفها هو content/packs/g1-foundational-sample-pack.json
 */
export const STARTER_SKILLS: Skill[] = getLoadedSkills();
export const STARTER_ACTIVITIES: Activity[] = getLoadedActivities();

export function getActivityById(id: string): Activity | undefined {
  return getLoadedActivityById(id);
}

export function getSkillById(id: string): Skill | undefined {
  return getLoadedSkillById(id);
}

export function getActivitiesForBuilding(buildingKey: BuildingKey): Activity[] {
  return getLoadedActivitiesForBuilding(buildingKey);
}
