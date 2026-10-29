import type { BuildingKey } from "@/lib/types";
import type { Activity } from "./types";

export const THREE_STATIONS_MILESTONE_KEY = "three-stations";
export const BUILDING_UPGRADE_PLANK_COST = 2;
export const MAX_BUILDING_LEVEL = 3;

export interface RewardEvaluationResult {
  isFirstCompletion: boolean;
  starsEarned: number;
  planksEarned: number;
  newPlacedItemKeys: string[];
  completesMilestone: boolean;
  milestoneKeyClaimed: string | null;
  message: {
    title: string;
    description: string;
    tokens: string[];
    isMilestoneChest: boolean;
  };
}

export interface ItemDefinition {
  key: string;
  id: string;
  name: string;
  icon: string;
  defaultPosition: "shore" | "garden" | "near-homes";
}

export const KNOWN_ITEMS: Record<string, ItemDefinition> = {
  "flower-patch": {
    key: "flower-patch",
    id: "70000000-0000-4000-8000-000000000001",
    name: "رقعة زهور",
    icon: "🌼",
    defaultPosition: "shore",
  },
  "stone-path": {
    key: "stone-path",
    id: "70000000-0000-4000-8000-000000000002",
    name: "ممر حجري",
    icon: "🪨",
    defaultPosition: "shore",
  },
  "tiny-lantern": {
    key: "tiny-lantern",
    id: "70000000-0000-4000-8000-000000000003",
    name: "فانوس الحكاية",
    icon: "🏮",
    defaultPosition: "shore",
  },
  "sea-lantern": {
    key: "sea-lantern",
    id: "70000000-0000-4000-8000-000000000004",
    name: "فانوس البحر",
    icon: "🪸",
    defaultPosition: "shore",
  },
};

/**
 * حساب نتيجة المكافأة بشكل قطعي وثابت، مع منع تكرار المكافأة عند إعادة المحطة
 */
export function evaluateActivityRewards(
  activity: Activity,
  completedActivityIds: string[],
  milestonesClaimed: string[],
): RewardEvaluationResult {
  const isFirstCompletion = !completedActivityIds.includes(activity.id);

  if (!isFirstCompletion) {
    // النشاط مراجع سابقاً: لا تُمنح مكافآت جديدة لمنع تضخم الموارد
    return {
      isFirstCompletion: false,
      starsEarned: 0,
      planksEarned: 0,
      newPlacedItemKeys: [],
      completesMilestone: false,
      milestoneKeyClaimed: null,
      message: {
        title: "مراجعة طيبة وخطوة إضافية!",
        description: "راجعت هذه المحطة بنجاح وثبّتت الفكرة في عقلك. إنجازاتك ومكافآتك السابقة محفوظة.",
        tokens: ["🔄 مراجعة مكتملة", `📚 ${activity.title}`],
        isMilestoneChest: false,
      },
    };
  }

  // إكمال للمرة الأولى
  const nextCompletedIds = [...completedActivityIds, activity.id];
  const completesMilestone =
    nextCompletedIds.length >= 3 && !milestonesClaimed.includes(THREE_STATIONS_MILESTONE_KEY);

  const starsEarned = activity.reward.stars;
  const planksEarned = activity.reward.planks + (completesMilestone ? 3 : 0);
  const newPlacedItemKeys = [activity.reward.itemKey];
  if (completesMilestone) {
    newPlacedItemKeys.push("sea-lantern");
  }

  const itemMeta = KNOWN_ITEMS[activity.reward.itemKey];
  const tokens = [
    `⭐ ${starsEarned} نجوم`,
    `🪵 ${planksEarned} ألواح`,
    `${itemMeta?.icon ?? "✨"} ${itemMeta?.name ?? "زينة"}`,
  ];
  if (completesMilestone) {
    tokens.push("🪸 فانوس البحر");
  }

  return {
    isFirstCompletion: true,
    starsEarned,
    planksEarned,
    newPlacedItemKeys,
    completesMilestone,
    milestoneKeyClaimed: completesMilestone ? THREE_STATIONS_MILESTONE_KEY : null,
    message: {
      title: completesMilestone ? "وصلت إلى صندوق محطاتك الثلاث!" : "أضفت شيئاً جميلاً لجزيرتك",
      description: completesMilestone
        ? "مكافأته ثابتة ومعلومة: ثلاثة ألواح وفانوس بحر خاص. شفت كيف كبرت الجزيرة بالمحاولة؟"
        : "كل محطة تعلم تضيف أثراً صغيراً تقدر تشوفه على جزيرتك.",
      tokens,
      isMilestoneChest: completesMilestone,
    },
  };
}

/**
 * تقييم إمكانية ترقية مبنى على الجزيرة
 */
export function evaluateBuildingUpgrade(
  buildingKey: BuildingKey,
  currentLevel: number,
  availablePlanks: number,
): { canUpgrade: boolean; reason?: string; nextLevel: number; remainingPlanks: number } {
  if (currentLevel >= MAX_BUILDING_LEVEL) {
    return {
      canUpgrade: false,
      reason: "وصل هذا المبنى إلى مرحلته الحالية الأخيرة.",
      nextLevel: currentLevel,
      remainingPlanks: availablePlanks,
    };
  }

  if (availablePlanks < BUILDING_UPGRADE_PLANK_COST) {
    return {
      canUpgrade: false,
      reason: `تحتاج إلى ${BUILDING_UPGRADE_PLANK_COST} ألواح خشبية لتطوير هذا البيت.`,
      nextLevel: currentLevel,
      remainingPlanks: availablePlanks,
    };
  }

  return {
    canUpgrade: true,
    nextLevel: currentLevel + 1,
    remainingPlanks: availablePlanks - BUILDING_UPGRADE_PLANK_COST,
  };
}
