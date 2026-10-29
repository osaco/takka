import type { ResourceCost } from './economy';

export type BuildingId =
  | 'hq'
  | 'letters'
  | 'numbers'
  | 'stories'
  | 'observatory'
  | 'national'
  | 'companions'
  | 'garden'
  | 'lighthouse';

export interface UpgradeSpec {
  cost: ResourceCost;
  masteryGate?: {
    count: number;
    subject?: string;
  };
  opens: BuildingId[];
}

export const BUILDING_NAMES_AR: Record<BuildingId, string> = {
  hq: 'برج تكّة',
  letters: 'بيت الحروف',
  numbers: 'بيت الأعداد',
  stories: 'مكتبة الحكايا',
  observatory: 'مرصد الاكتشاف',
  national: 'ساحة الوطن',
  companions: 'بيت الرفاق',
  garden: 'البستان',
  lighthouse: 'المنارة',
};

/**
 * جدول الترقيات — الأسعار مُعاد تسعيرها لتُطابق الدخل الفعلي (القانون 12).
 *
 * الحساب المُثبت في `tests/domain/economy-balance.test.ts`:
 *   17 مهارة معتمدة × (+10★ +1🪵 +1🪨 +1💎) = 170★ / 17🪵 / 17🪨 / 17💎
 *   إجمالي الإنفاق = 143★ / 14🪵 / 14🪨 / 14💎
 *   الفائض = 18.9% للنجوم و 21.4% للمواد (تقريب الأعداد الصحيحة حول هدف 19%).
 *
 * قاعدة الإحساس: المواد تُدفع عند البناء (المستوى 1) وعند ترقيتي البرج فقط؛
 * ترقيات المباني التخصصية تُدفع نجوماً، لأن النجوم هي عملة التقدّم اليومية.
 */
export const UPGRADE_TABLE: Record<BuildingId, Partial<Record<1 | 2 | 3, UpgradeSpec>>> = {
  hq: {
    1: {
      cost: { stars: 0, wood: 0, stone: 0, crystal: 0 },
      opens: ['letters', 'numbers'],
    },
    2: {
      cost: { stars: 14, wood: 2, stone: 2, crystal: 2 },
      masteryGate: { count: 8 },
      opens: ['stories', 'observatory', 'national'],
    },
    3: {
      cost: { stars: 22, wood: 4, stone: 4, crystal: 4 },
      masteryGate: { count: 14 },
      opens: ['companions', 'garden', 'lighthouse'],
    },
  },
  letters: {
    1: {
      cost: { stars: 8, wood: 1, stone: 1, crystal: 1 },
      opens: [],
    },
    2: {
      cost: { stars: 9, wood: 0, stone: 0, crystal: 0 },
      masteryGate: { count: 4, subject: 'arabic' },
      opens: [],
    },
    3: {
      cost: { stars: 10, wood: 0, stone: 0, crystal: 0 },
      masteryGate: { count: 8, subject: 'arabic' },
      opens: [],
    },
  },
  numbers: {
    1: {
      cost: { stars: 8, wood: 1, stone: 1, crystal: 1 },
      opens: [],
    },
    2: {
      cost: { stars: 9, wood: 0, stone: 0, crystal: 0 },
      masteryGate: { count: 4, subject: 'math' },
      opens: [],
    },
    3: {
      cost: { stars: 10, wood: 0, stone: 0, crystal: 0 },
      masteryGate: { count: 8, subject: 'math' },
      opens: [],
    },
  },
  stories: {
    1: {
      cost: { stars: 6, wood: 1, stone: 1, crystal: 1 },
      opens: [],
    },
    2: {
      cost: { stars: 6, wood: 0, stone: 0, crystal: 0 },
      opens: [],
    },
  },
  observatory: {
    1: {
      cost: { stars: 6, wood: 1, stone: 1, crystal: 1 },
      opens: [],
    },
    2: {
      cost: { stars: 6, wood: 0, stone: 0, crystal: 0 },
      opens: [],
    },
  },
  national: {
    1: {
      cost: { stars: 6, wood: 1, stone: 1, crystal: 1 },
      opens: [],
    },
    2: {
      cost: { stars: 6, wood: 0, stone: 0, crystal: 0 },
      opens: [],
    },
  },
  companions: {
    1: {
      cost: { stars: 5, wood: 1, stone: 1, crystal: 1 },
      opens: [],
    },
  },
  garden: {
    1: {
      cost: { stars: 5, wood: 1, stone: 1, crystal: 1 },
      opens: [],
    },
  },
  lighthouse: {
    1: {
      cost: { stars: 7, wood: 1, stone: 1, crystal: 1 },
      opens: [],
    },
  },
};

export function getUpgradeSpec(
  buildingId: BuildingId,
  targetLevel: 1 | 2 | 3,
): UpgradeSpec | null {
  return UPGRADE_TABLE[buildingId]?.[targetLevel] ?? null;
}

// جدول الكشف التدريجي مشتق في building-catalog.ts من حقل opens أعلاه،
// منعاً لأي ازدواجية بين بيانات الترقيات وبيانات الظهور.
