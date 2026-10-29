import { z } from 'zod';

export const RESOURCE_CAP = 9999;
export const RESOURCE_WARN_THRESHOLD = 5000;
export const MAX_DAILY_REVIEWS = 6;

export const FIRST_MASTERY_REWARDS = {
  stars: 10,
  wood: 1,
  stone: 1,
  crystal: 1,
} as const;

export const REVIEW_REWARD_STARS = 3;

export const EconomyStateSchema = z.object({
  stars: z.number().int().min(0).max(RESOURCE_CAP),
  wood: z.number().int().min(0).max(RESOURCE_CAP),
  stone: z.number().int().min(0).max(RESOURCE_CAP),
  crystal: z.number().int().min(0).max(RESOURCE_CAP),
  masteredSkills: z.array(z.string()),
  dailyReview: z.object({
    count: z.number().int().min(0).max(MAX_DAILY_REVIEWS),
    dayKey: z.string(),
  }),
});

export type EconomyState = z.infer<typeof EconomyStateSchema>;

export interface ResourceCost {
  stars?: number;
  wood?: number;
  stone?: number;
  crystal?: number;
}

export function getTodayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function createInitialEconomyState(dayKey: string = getTodayKey()): EconomyState {
  return {
    stars: 0,
    wood: 0,
    stone: 0,
    crystal: 0,
    masteredSkills: [],
    dailyReview: {
      count: 0,
      dayKey,
    },
  };
}

function clampResource(val: number): number {
  return Math.min(RESOURCE_CAP, Math.max(0, val));
}

/**
 * منح مكافأة أول إتقان لمهارة تعليمية.
 * Idempotent: إذا كانت المهارة مسجلة مسبقاً، تُعاد الحالة كما هي دون أي زيادة.
 */
export function grantFirstMastery(state: EconomyState, skillId: string): EconomyState {
  if (state.masteredSkills.includes(skillId)) {
    return state;
  }

  return {
    ...state,
    stars: clampResource(state.stars + FIRST_MASTERY_REWARDS.stars),
    wood: clampResource(state.wood + FIRST_MASTERY_REWARDS.wood),
    stone: clampResource(state.stone + FIRST_MASTERY_REWARDS.stone),
    crystal: clampResource(state.crystal + FIRST_MASTERY_REWARDS.crystal),
    masteredSkills: [...state.masteredSkills, skillId],
  };
}

/**
 * منح مكافأة مراجعة مهارة.
 * محكومة بسقف 6 مراجعات لليوم الواحد، مع تصفير تلقائي عند تغيّر التاريخ.
 */
export function grantReview(state: EconomyState, dayKey: string): EconomyState {
  // إذا تغير اليوم، يتم تصفير العدّاد أولاً
  if (state.dailyReview.dayKey !== dayKey) {
    return {
      ...state,
      stars: clampResource(state.stars + REVIEW_REWARD_STARS),
      dailyReview: {
        count: 1,
        dayKey,
      },
    };
  }

  // إذا وصلنا للسقف اليومي (6 مراجعات)
  if (state.dailyReview.count >= MAX_DAILY_REVIEWS) {
    return state;
  }

  return {
    ...state,
    stars: clampResource(state.stars + REVIEW_REWARD_STARS),
    dailyReview: {
      count: state.dailyReview.count + 1,
      dayKey,
    },
  };
}

export function canAfford(state: EconomyState, cost: ResourceCost): boolean {
  if (cost.stars && state.stars < cost.stars) return false;
  if (cost.wood && state.wood < cost.wood) return false;
  if (cost.stone && state.stone < cost.stone) return false;
  if (cost.crystal && state.crystal < cost.crystal) return false;
  return true;
}

export type SpendResult =
  | { ok: true; state: EconomyState }
  | { ok: false; error: string };

export function spend(state: EconomyState, cost: ResourceCost): SpendResult {
  // التحقق من القيم السالبة المرفوضة
  if (
    (cost.stars && cost.stars < 0) ||
    (cost.wood && cost.wood < 0) ||
    (cost.stone && cost.stone < 0) ||
    (cost.crystal && cost.crystal < 0)
  ) {
    return { ok: false, error: 'NEGATIVE_COST_NOT_ALLOWED' };
  }

  if (!canAfford(state, cost)) {
    return { ok: false, error: 'INSUFFICIENT_RESOURCES' };
  }

  return {
    ok: true,
    state: {
      ...state,
      stars: clampResource(state.stars - (cost.stars ?? 0)),
      wood: clampResource(state.wood - (cost.wood ?? 0)),
      stone: clampResource(state.stone - (cost.stone ?? 0)),
      crystal: clampResource(state.crystal - (cost.crystal ?? 0)),
    },
  };
}
