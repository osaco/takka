import { canAfford, spend, type EconomyState, type ResourceCost } from './economy';
import { upgradeIslandHq, type IslandState } from './state';
import { getUpgradeSpec } from './upgrade-table';

/**
 * ترقية برج تكّة — دالة نقية تجمع جدول الترقيات والاقتصاد وحالة الجزيرة.
 * لا تعرف React ولا التخزين: تُحسب النتيجة كاملة قبل أي كتابة.
 */

export interface ResourceDeficit {
  stars: number;
  wood: number;
  stone: number;
  crystal: number;
}

export interface HqUpgradeQuote {
  currentLevel: 1 | 2;
  targetLevel: 2 | 3;
  cost: ResourceCost;
  masteryRequired: number;
  masteredCount: number;
  masteryMet: boolean;
  affordable: boolean;
  /** ما ينقص من كل مورد — صفر يعني مكفول. */
  missing: ResourceDeficit;
}

export type HqUpgradeFailureReason =
  | 'MAX_LEVEL'
  | 'MASTERY_GATE'
  | 'INSUFFICIENT_RESOURCES'
  | 'SAVE_FAILED'
  | 'NO_PROFILE';

export type HqUpgradeOutcome =
  | {
      ok: true;
      island: IslandState;
      economy: EconomyState;
      quote: HqUpgradeQuote;
    }
  | {
      ok: false;
      reason: HqUpgradeFailureReason;
      quote: HqUpgradeQuote | null;
    };

function deficit(required: number | undefined, owned: number): number {
  return Math.max(0, (required ?? 0) - owned);
}

/**
 * عرض الترقية القادمة: التكلفة، بوابة الإتقان، والنقص الحالي.
 * يعيد null عند أعلى مستوى — لا عرض وهمي لترقية غير موجودة.
 */
export function quoteHqUpgrade(
  island: IslandState,
  economy: EconomyState,
): HqUpgradeQuote | null {
  if (island.hqLevel === 3) return null;

  const targetLevel = (island.hqLevel + 1) as 2 | 3;
  const spec = getUpgradeSpec('hq', targetLevel);
  if (!spec) return null;

  const cost: ResourceCost = { ...spec.cost };
  const masteryRequired = spec.masteryGate?.count ?? 0;
  const masteredCount = economy.masteredSkills.length;

  return {
    currentLevel: island.hqLevel,
    targetLevel,
    cost,
    masteryRequired,
    masteredCount,
    masteryMet: masteredCount >= masteryRequired,
    affordable: canAfford(economy, cost),
    missing: {
      stars: deficit(cost.stars, economy.stars),
      wood: deficit(cost.wood, economy.wood),
      stone: deficit(cost.stone, economy.stone),
      crystal: deficit(cost.crystal, economy.crystal),
    },
  };
}

/**
 * تنفيذ الترقية: بوابة الإتقان أولاً، ثم الموارد، ثم الخصم والترقية معاً.
 * لا تُخصم موارد إن فشلت أي خطوة، والحالتان المُدخلتان لا تُعدّلان.
 */
export function applyHqUpgrade(
  island: IslandState,
  economy: EconomyState,
): HqUpgradeOutcome {
  const quote = quoteHqUpgrade(island, economy);
  if (!quote) {
    return { ok: false, reason: 'MAX_LEVEL', quote: null };
  }

  if (!quote.masteryMet) {
    return { ok: false, reason: 'MASTERY_GATE', quote };
  }

  if (!quote.affordable) {
    return { ok: false, reason: 'INSUFFICIENT_RESOURCES', quote };
  }

  const paid = spend(economy, quote.cost);
  if (!paid.ok) {
    // حارس أخير: لا يحدث بعد فحص canAfford، لكنه يمنع أي خصم جزئي.
    return { ok: false, reason: 'INSUFFICIENT_RESOURCES', quote };
  }

  const upgraded = upgradeIslandHq(island);
  if (!upgraded.ok) {
    return { ok: false, reason: 'MAX_LEVEL', quote };
  }

  return { ok: true, island: upgraded.state, economy: paid.state, quote };
}
