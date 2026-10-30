import { describe, expect, it } from 'vitest';
import {
  FIRST_MASTERY_REWARDS,
  UPGRADE_TABLE,
  getUpgradeSpec,
  type BuildingId,
} from '@domain/island';

/**
 * إثبات توازن اقتصاد الجزيرة — شرط بوابة G1 الرابع (القانون 12).
 * كل الأرقام مشتقة من الجداول الفعلية، ولا رقم مكتوب يدوياً في الحساب.
 */

const APPROVED_SKILL_COUNT = 17;

const RESOURCES = ['stars', 'wood', 'stone', 'crystal'] as const;
type Resource = (typeof RESOURCES)[number];

const LEVELS = [1, 2, 3] as const;

function totalSpend(): Record<Resource, number> {
  const total: Record<Resource, number> = { stars: 0, wood: 0, stone: 0, crystal: 0 };

  for (const buildingId of Object.keys(UPGRADE_TABLE) as BuildingId[]) {
    for (const level of LEVELS) {
      const spec = getUpgradeSpec(buildingId, level);
      if (!spec) continue;
      for (const resource of RESOURCES) {
        total[resource] += spec.cost[resource] ?? 0;
      }
    }
  }

  return total;
}

function totalIncome(skillCount: number): Record<Resource, number> {
  return {
    stars: skillCount * FIRST_MASTERY_REWARDS.stars,
    wood: skillCount * FIRST_MASTERY_REWARDS.wood,
    stone: skillCount * FIRST_MASTERY_REWARDS.stone,
    crystal: skillCount * FIRST_MASTERY_REWARDS.crystal,
  };
}

function surplus(spend: number, income: number): number {
  return (income - spend) / spend;
}

describe('توازن اقتصاد الجزيرة — إثبات رياضي (G1)', () => {
  // 1. الملاءة: كل مورد يغطي إنفاقه الكامل
  it('1. دخل 17 مهارة يغطي كامل إنفاق الترقيات في كل مورد دون أي عجز', () => {
    const spend = totalSpend();
    const income = totalIncome(APPROVED_SKILL_COUNT);

    for (const resource of RESOURCES) {
      expect(income[resource]).toBeGreaterThan(spend[resource]);
    }

    expect(spend).toEqual({ stars: 143, wood: 14, stone: 14, crystal: 14 });
    expect(income).toEqual({ stars: 170, wood: 17, stone: 17, crystal: 17 });
  });

  // 2. الفائض: النجوم عند الهدف، والمواد ضمن نطاق تقريب الأعداد الصحيحة
  it('2. فائض النجوم 18.9% (هدف 19% ±2) وفائض المواد 21.4% داخل 15–25%', () => {
    const spend = totalSpend();
    const income = totalIncome(APPROVED_SKILL_COUNT);

    const starsSurplus = surplus(spend.stars, income.stars);
    expect(Math.abs(starsSurplus - 0.19)).toBeLessThan(0.02);

    for (const resource of ['wood', 'stone', 'crystal'] as const) {
      const ratio = surplus(spend[resource], income[resource]);
      expect(ratio).toBeGreaterThanOrEqual(0.15);
      expect(ratio).toBeLessThanOrEqual(0.25);
    }
  });

  // 3. تماسك الأسعار: أعداد صحيحة، البرج مجاني في L1، والنجوم لا تنقص مع المستوى
  it('3. كل تكلفة عدد صحيح غير سالب، وبرج البداية مجاني، وتكلفة النجوم لا تنقص مع المستوى', () => {
    const hqStart = getUpgradeSpec('hq', 1);
    expect(hqStart?.cost).toEqual({ stars: 0, wood: 0, stone: 0, crystal: 0 });

    for (const buildingId of Object.keys(UPGRADE_TABLE) as BuildingId[]) {
      expect(getUpgradeSpec(buildingId, 1)).not.toBeNull();

      let previousStars: number | null = null;
      for (const level of LEVELS) {
        const spec = getUpgradeSpec(buildingId, level);
        if (!spec) continue;

        for (const resource of RESOURCES) {
          const value = spec.cost[resource] ?? 0;
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
        }

        const stars = spec.cost.stars ?? 0;
        if (previousStars !== null) expect(stars).toBeGreaterThanOrEqual(previousStars);
        previousStars = stars;
      }
    }

    // المواد تُدفع عند البناء، وترقية البرج وحدها تطلب مواد إضافية متزايدة
    expect(getUpgradeSpec('hq', 2)?.cost.wood).toBe(2);
    expect(getUpgradeSpec('hq', 3)?.cost.wood).toBe(4);
    expect(getUpgradeSpec('letters', 2)?.cost.wood).toBe(0);
  });

  // 4. كل بوابة إتقان قابلة للتحقيق بعدد المهارات المعتمد
  it('4. كل بوابة إتقان قابلة للتحقيق (≤17) ومرتبطة بمادة تعليمية لا بزمن', () => {
    for (const buildingId of Object.keys(UPGRADE_TABLE) as BuildingId[]) {
      for (const level of LEVELS) {
        const gate = getUpgradeSpec(buildingId, level)?.masteryGate;
        if (!gate) continue;

        expect(Number.isInteger(gate.count)).toBe(true);
        expect(gate.count).toBeGreaterThanOrEqual(0);
        expect(gate.count).toBeLessThanOrEqual(APPROVED_SKILL_COUNT);

        if (gate.subject !== undefined) {
          expect(['arabic', 'math']).toContain(gate.subject);
        }
      }
    }

    expect(getUpgradeSpec('letters', 2)?.masteryGate).toEqual({ count: 4, subject: 'arabic' });
    expect(getUpgradeSpec('numbers', 3)?.masteryGate).toEqual({ count: 8, subject: 'math' });
    expect(getUpgradeSpec('hq', 3)?.masteryGate).toEqual({ count: 14 });
  });
});
