import type { BuildingKey, Lesson, LocalProgress } from "@/lib/types";

export const BUILDINGS: Array<{
  key: BuildingKey;
  title: string;
  subject: string;
  description: string;
  icon: string;
  theme: "green" | "apricot" | "blue";
  shortLabel: string;
}> = [
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

export const LESSONS: Lesson[] = [
  {
    id: "starter-letter-b",
    activityId: "40000000-0000-4000-8000-000000000001",
    skillId: "30000000-0000-4000-8000-000000000001",
    building: "letters",
    title: "صوت حرف ب",
    subtitle: "اسمع الكلمة، وانتبه إلى بدايتها.",
    icon: "ب",
    theme: "green",
    questions: [
      { prompt: "أي حرف نسمع في بداية كلمة «بيت»؟", choices: ["ب", "ت", "ث"], answer: "ب", hint: "ابدأ الصوت مع الشفتين وهما تلتقيان." },
      { prompt: "اختر الكلمة التي تبدأ بصوت «ب».", choices: ["قمر", "باب", "ورد"], answer: "باب", hint: "قل الكلمات بهدوء، أيها يبدأ بـ«بـ»؟" },
    ],
    reward: { stars: 5, planks: 1, itemKey: "flower-patch", itemId: "70000000-0000-4000-8000-000000000001" },
  },
  {
    id: "starter-count-four",
    activityId: "40000000-0000-4000-8000-000000000002",
    skillId: "30000000-0000-4000-8000-000000000002",
    building: "numbers",
    title: "نعدّ حتى أربعة",
    subtitle: "نعدّ كل شكل مرة واحدة.",
    icon: "٤",
    theme: "apricot",
    questions: [
      { prompt: "كم حبّة برتقال في السلة؟", choices: ["٣", "٤", "٥"], answer: "٤", object: "🍊 🍊 🍊 🍊", hint: "المس كل حبّة وعدّها بصوتك." },
      { prompt: "أي مجموعة فيها أربع نجوم؟", choices: ["★ ★ ★", "★ ★ ★ ★", "★ ★ ★ ★ ★"], answer: "★ ★ ★ ★", hint: "ابدأ من الأولى، ثم عدّ إلى الرابعة." },
    ],
    reward: { stars: 5, planks: 1, itemKey: "stone-path", itemId: "70000000-0000-4000-8000-000000000002" },
  },
  {
    id: "starter-story-order",
    activityId: "40000000-0000-4000-8000-000000000003",
    skillId: "30000000-0000-4000-8000-000000000003",
    building: "stories",
    title: "حكاية البذرة",
    subtitle: "نفهم ما حدث أولاً في حكاية قصيرة.",
    icon: "✦",
    theme: "blue",
    questions: [
      { prompt: "وجدت ليلى بذرة، ثم وضعتها في التراب وسقتها. ماذا فعلت أولاً؟", choices: ["سقتها", "وجدت بذرة", "ظهرت النبتة"], answer: "وجدت بذرة", hint: "ابحث عن أول فعل في الحكاية." },
      { prompt: "بعد أن وضعت ليلى البذرة في التراب، ماذا فعلت؟", choices: ["سقتها", "قطفت زهرة", "عادت إلى البيت"], answer: "سقتها", hint: "تذكّر الجملة التي جاءت بعد التراب." },
    ],
    reward: { stars: 5, planks: 1, itemKey: "tiny-lantern", itemId: "70000000-0000-4000-8000-000000000003" },
  },
];

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
  };
}

export function getLessonForBuilding(key: BuildingKey, completedIds: string[]) {
  return LESSONS.find((lesson) => lesson.building === key && !completedIds.includes(lesson.id))
    ?? LESSONS.find((lesson) => lesson.building === key)!;
}

export function completedLessonsFor(progress: LocalProgress) {
  return LESSONS.filter((lesson) => progress.completedLessonIds.includes(lesson.id));
}
