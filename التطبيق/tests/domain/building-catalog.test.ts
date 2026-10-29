import { describe, expect, it } from 'vitest';
import {
  BUILDING_CATALOG,
  BUILDING_IDS,
  getBuildingCatalogEntry,
  isBuildingRevealed,
  revealedBuildings,
  type BuildingId,
} from '@domain/island';

const EXPECTED_MAX_LEVEL: Record<BuildingId, 1 | 2 | 3> = {
  hq: 3,
  letters: 3,
  numbers: 3,
  stories: 2,
  observatory: 2,
  national: 2,
  companions: 1,
  garden: 1,
  lighthouse: 1,
};

const EXPECTED_REVEAL: Record<BuildingId, 1 | 2 | 3> = {
  hq: 1,
  letters: 1,
  numbers: 1,
  stories: 2,
  observatory: 2,
  national: 2,
  companions: 3,
  garden: 3,
  lighthouse: 3,
};

const TIME_LIKE_KEY = /time|timer|day|date|hour|minute|cooldown|clock/i;

describe('كتالوج المباني — الكشف التدريجي الحتمي (Step 2)', () => {
  // 1. اكتمال الكتالوج وتماسك بيانات كل مبنى
  it('1. الكتالوج يضم المباني التسعة بالضبط ولكل مبنى اسم عربي ومستوى أقصى صالح', () => {
    expect(BUILDING_IDS.length).toBe(9);
    expect(Object.keys(BUILDING_CATALOG).sort()).toEqual([...BUILDING_IDS].sort());

    for (const id of BUILDING_IDS) {
      const entry = BUILDING_CATALOG[id];
      expect(entry.id).toBe(id);
      expect(entry.nameAr.trim().length).toBeGreaterThan(0);
      expect([1, 2, 3]).toContain(entry.maxLevel);
      expect(new Set(entry.opens).size).toBe(entry.opens.length);
    }
  });

  // 2. المستوى الأقصى مشتق من جدول الترقيات لا مكتوب يدوياً
  it('2. maxLevel لكل مبنى مطابق لأعلى مستوى معرّف في جدول الترقيات', () => {
    for (const id of BUILDING_IDS) {
      expect(BUILDING_CATALOG[id].maxLevel).toBe(EXPECTED_MAX_LEVEL[id]);
    }
  });

  // 3. حقل opens مشتق من جدول الترقيات
  it('3. برج تكة وحده يفتح المباني الثمانية والباقي لا يفتح شيئاً', () => {
    expect([...BUILDING_CATALOG.hq.opens]).toEqual([
      'letters',
      'numbers',
      'stories',
      'observatory',
      'national',
      'companions',
      'garden',
      'lighthouse',
    ]);

    for (const id of BUILDING_IDS) {
      if (id === 'hq') continue;
      expect(BUILDING_CATALOG[id].opens).toEqual([]);
    }
  });

  // 4. مستوى الظهور لكل مبنى
  it('4. مستوى ظهور كل مبنى مطابق لدستور الكشف التدريجي (3 ثم 3 ثم 3)', () => {
    for (const id of BUILDING_IDS) {
      expect(BUILDING_CATALOG[id].revealAtHqLevel).toBe(EXPECTED_REVEAL[id]);
    }
  });

  // 5. مخرجات الكشف التدريجي وترتيبها الرتيب
  it('5. revealedBuildings يعيد 3 ثم 6 ثم 9 بترتيب كتالوجي وبتوسّع رتيب', () => {
    const hq1 = revealedBuildings(1);
    const hq2 = revealedBuildings(2);
    const hq3 = revealedBuildings(3);

    expect(hq1).toEqual(['hq', 'letters', 'numbers']);
    expect(hq2).toEqual(['hq', 'letters', 'numbers', 'stories', 'observatory', 'national']);
    expect(hq3).toEqual([...BUILDING_IDS]);

    expect(hq1.length).toBe(3);
    expect(hq2.length).toBe(6);
    expect(hq3.length).toBe(9);

    for (const id of hq1) expect(hq2).toContain(id);
    for (const id of hq2) expect(hq3).toContain(id);
  });

  // 6. الفتح تعليمي بحت: لا أثر لأي شرط زمني
  it('6. كل شروط الفتح تعليمية خالصة وخالية من أي حقل زمني', () => {
    for (const id of BUILDING_IDS) {
      const entry = BUILDING_CATALOG[id];

      expect(Number.isInteger(entry.masteryGate.count)).toBe(true);
      expect(entry.masteryGate.count).toBeGreaterThanOrEqual(0);

      for (const key of Object.keys(entry)) {
        expect(key).not.toMatch(TIME_LIKE_KEY);
      }
      for (const key of Object.keys(entry.masteryGate)) {
        expect(key).not.toMatch(TIME_LIKE_KEY);
      }
    }
  });

  // 7. بوابة الإتقان مشتقة من بوابة ترقية البرج
  it('7. بوابة الإتقان مشتقة من ترقية البرج: صفر ثم 8 ثم 14 مهارة', () => {
    expect(BUILDING_CATALOG.hq.masteryGate).toEqual({ count: 0 });
    expect(BUILDING_CATALOG.letters.masteryGate).toEqual({ count: 0 });
    expect(BUILDING_CATALOG.numbers.masteryGate).toEqual({ count: 0 });

    for (const id of ['stories', 'observatory', 'national'] as const) {
      expect(BUILDING_CATALOG[id].masteryGate).toEqual({ count: 8 });
    }

    for (const id of ['companions', 'garden', 'lighthouse'] as const) {
      expect(BUILDING_CATALOG[id].masteryGate).toEqual({ count: 14 });
    }
  });

  // 8. الحتمية والجمود والاستعلام الآمن
  it('8. الكتالوج مجمّد وحتمي، والاستعلام عن معرف غير معروف يعيد null بأمان', () => {
    expect(Object.isFrozen(BUILDING_CATALOG)).toBe(true);
    expect(Object.isFrozen(BUILDING_CATALOG.hq)).toBe(true);
    expect(Object.isFrozen(BUILDING_CATALOG.hq.opens)).toBe(true);

    expect(revealedBuildings(2)).toEqual(revealedBuildings(2));

    expect(getBuildingCatalogEntry('hq')).toBe(BUILDING_CATALOG.hq);
    expect(getBuildingCatalogEntry('unknown' as BuildingId)).toBeNull();

    expect(isBuildingRevealed('lighthouse', 2)).toBe(false);
    expect(isBuildingRevealed('lighthouse', 3)).toBe(true);
    expect(isBuildingRevealed('letters', 1)).toBe(true);
  });
});
