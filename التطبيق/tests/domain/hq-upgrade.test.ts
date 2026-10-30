import { describe, expect, it } from 'vitest';
import {
  applyHqUpgrade,
  createInitialEconomyState,
  createInitialIslandState,
  grantFirstMastery,
  quoteHqUpgrade,
  type EconomyState,
  type IslandState,
} from '@domain/island';
import { buildStageView, revealedCount } from '@runtime/world/stage-view';
import { createDefaultPlacement } from '@domain/island';

function economyWith(
  mastered: number,
  overrides: Partial<EconomyState> = {},
): EconomyState {
  let state = createInitialEconomyState('2026-10-29');
  for (let index = 0; index < mastered; index += 1) {
    state = grantFirstMastery(state, `skill-${index}`);
  }
  return { ...state, ...overrides };
}

function hqAt(level: 2 | 3): IslandState {
  return {
    phase: 'single-island',
    hqLevel: level,
    unlockedLand: level === 3 ? 12 : 10,
  };
}

describe('ترقية برج تكّة — منطق نقي (Step 7)', () => {
  // 1. عرض الترقية الأولى: التكلفة وبوابة الإتقان من الجدول لا من أرقام مكتوبة
  it('1. عرض HQ1 يعطي تكلفة المستوى 2 وبوابة 8 مهارات', () => {
    const quote = quoteHqUpgrade(
      createInitialIslandState(),
      economyWith(8, { stars: 20, wood: 5, stone: 5, crystal: 5 }),
    );

    expect(quote).toMatchObject({
      currentLevel: 1,
      targetLevel: 2,
      cost: { stars: 14, wood: 2, stone: 2, crystal: 2 },
      masteryRequired: 8,
      masteredCount: 8,
      masteryMet: true,
      affordable: true,
    });
    expect(quote?.missing).toEqual({ stars: 0, wood: 0, stone: 0, crystal: 0 });
  });

  // 2. المسار السليم: خصم دقيق وترقية فورية
  it('2. HQ1 → HQ2 يخصم 14★ و2 من كل مادة ويبقي الأرض 10', () => {
    const outcome = applyHqUpgrade(
      createInitialIslandState(),
      economyWith(8, { stars: 30, wood: 5, stone: 5, crystal: 5 }),
    );

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.island).toMatchObject({ hqLevel: 2, unlockedLand: 10 });
    expect(outcome.economy).toMatchObject({ stars: 16, wood: 3, stone: 3, crystal: 3 });
    expect(outcome.economy.masteredSkills).toHaveLength(8);
  });

  // 3. HQ2 → HQ3 يفتح الأرض كاملة ويظهر المباني التسعة
  it('3. HQ2 → HQ3 يوسّع الأرض إلى 12 ويكشف المباني التسعة', () => {
    const outcome = applyHqUpgrade(
      hqAt(2),
      economyWith(14, { stars: 30, wood: 5, stone: 5, crystal: 5 }),
    );

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.island).toMatchObject({ hqLevel: 3, unlockedLand: 12 });
    expect(outcome.economy).toMatchObject({ stars: 8, wood: 1, stone: 1, crystal: 1 });

    const view = buildStageView(outcome.island.hqLevel, createDefaultPlacement());
    expect(revealedCount(view)).toBe(9);
  });

  // 4. أعلى مستوى: لا ترقية وهمية
  it('4. عند HQ3 يعيد MAX_LEVEL بلا عرض ترقية', () => {
    const outcome = applyHqUpgrade(hqAt(3), economyWith(17, { stars: 99 }));

    expect(outcome).toMatchObject({ ok: false, reason: 'MAX_LEVEL', quote: null });
    expect(quoteHqUpgrade(hqAt(3), economyWith(17))).toBeNull();
  });

  // 5. نقص النجوم: رفض بلا خصم مع تحديد النقص بدقة
  it('5. نقص النجوم يرفض الترقية ولا يخصم شيئاً', () => {
    const economy = economyWith(8, { stars: 13, wood: 5, stone: 5, crystal: 5 });
    const outcome = applyHqUpgrade(createInitialIslandState(), economy);

    expect(outcome).toMatchObject({ ok: false, reason: 'INSUFFICIENT_RESOURCES' });
    if (!outcome.ok) {
      expect(outcome.quote?.missing.stars).toBe(1);
      expect(outcome.quote?.missing.wood).toBe(0);
    }
    expect(economy.stars).toBe(13);
    expect(economy.wood).toBe(5);
  });

  // 6. بوابة الإتقان تسبق الموارد: لا يشتري الطفل الترقية بالنجوم وحدها
  it('6. سبع مهارات متقنة ترفض الترقية حتى لو كفت الموارد', () => {
    const economy = economyWith(7, { stars: 200, wood: 20, stone: 20, crystal: 20 });
    const outcome = applyHqUpgrade(createInitialIslandState(), economy);

    expect(outcome).toMatchObject({ ok: false, reason: 'MASTERY_GATE' });
    if (!outcome.ok) {
      expect(outcome.quote).toMatchObject({
        masteryRequired: 8,
        masteredCount: 7,
        masteryMet: false,
        affordable: true,
      });
    }
    expect(economy.stars).toBe(200);
  });

  // 7. النقاء: المدخلات لا تتغير، والمخرجات كائنات جديدة
  it('7. الترقية لا تعدّل الحالتين المُدخلتين وتعيد كائنات جديدة', () => {
    const island = Object.freeze(createInitialIslandState());
    const economy = Object.freeze(
      economyWith(8, { stars: 30, wood: 5, stone: 5, crystal: 5 }),
    );
    const before = JSON.stringify({ island, economy });

    const outcome = applyHqUpgrade(island, economy);
    expect(outcome.ok).toBe(true);
    expect(JSON.stringify({ island, economy })).toBe(before);

    if (outcome.ok) {
      expect(outcome.island).not.toBe(island);
      expect(outcome.economy).not.toBe(economy);
      expect(outcome.island.hqLevel).toBe(2);
      expect(island.hqLevel).toBe(1);
    }
  });

  // 8. التكامل مع العرض: الترقية تكشف الدفعة الثانية فوراً
  it('8. بعد HQ1 → HQ2 يكشف العرض ستة مبانٍ بالترتيب الكتالوجي', () => {
    const outcome = applyHqUpgrade(
      createInitialIslandState(),
      economyWith(8, { stars: 30, wood: 5, stone: 5, crystal: 5 }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const view = buildStageView(outcome.island.hqLevel, createDefaultPlacement());
    const revealed = view.buildings.filter((b) => b.revealed).map((b) => b.id);

    expect(revealed).toEqual([
      'hq',
      'letters',
      'numbers',
      'stories',
      'observatory',
      'national',
    ]);
  });
});
