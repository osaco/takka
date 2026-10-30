import { describe, expect, it } from 'vitest';
import {
  MemoryIslandStore,
  loadIslandSnapshot,
  saveIslandSnapshot,
} from '@data/island-store';
import {
  createInitialEconomyState,
  createInitialIslandState,
  grantFirstMastery,
  type EconomyState,
  type IslandState,
} from '@domain/island';

const DAY = '2026-10-29';

function economyWith(mastered: string[], overrides: Partial<EconomyState> = {}): EconomyState {
  let state = createInitialEconomyState(DAY);
  for (const skillId of mastered) state = grantFirstMastery(state, skillId);
  return { ...state, ...overrides };
}

const HQ2: IslandState = {
  phase: 'single-island',
  hqLevel: 2,
  unlockedLand: 10,
};

describe('مخزن الجزيرة والاقتصاد (Step 7)', () => {
  // 1. حفظ وقراءة كاملان يعيدان نفس الحالة
  it('1. الحفظ والقراءة يعيدان الجزيرة والاقتصاد كما هما', async () => {
    const store = new MemoryIslandStore();
    const economy = economyWith(['s1'], { stars: 7 });

    const saved = await saveIslandSnapshot(store, 'p1', { island: HQ2, economy });
    expect(saved.ok).toBe(true);

    const loaded = await loadIslandSnapshot(store, 'p1', ['s1']);
    expect(loaded.island).toEqual(HQ2);
    expect(loaded.economy).toEqual(economy);
    expect(loaded.islandSource).toBe('stored');
    expect(loaded.economySource).toBe('stored');
    expect(loaded.errors).toEqual([]);
  });

  // 2. أول تشغيل: لا صف ← جزيرة ابتدائية واقتصاد مبني من الإتقان
  it('2. غياب الصف يعيد جزيرة ابتدائية واقتصاداً مبنياً من المهارات المتقنة', async () => {
    const store = new MemoryIslandStore();
    const loaded = await loadIslandSnapshot(store, 'new-profile', ['b', 'a']);

    expect(loaded.island).toEqual(createInitialIslandState());
    expect(loaded.islandSource).toBe('fallback');
    expect(loaded.economySource).toBe('rebuilt');
    expect(loaded.economy.stars).toBe(20);
    expect(loaded.economy.masteredSkills).toEqual(['a', 'b']);
  });

  // 3. بيانات فاسدة أو غير متسقة ← رجوع آمن بلا رمي
  it('3. الجزيرة الفاسدة أو غير المتسقة تُستبدل بالابتدائية والاقتصاد يُعاد بناؤه', async () => {
    const store = new MemoryIslandStore();
    await store.write('p2', {
      island: { phase: 'single-island', hqLevel: 9, unlockedLand: 12 },
      economy: { stars: -5, wood: 'كثير' },
    });

    const loaded = await loadIslandSnapshot(store, 'p2', []);
    expect(loaded.island).toEqual(createInitialIslandState());
    expect(loaded.islandSource).toBe('fallback');
    expect(loaded.economySource).toBe('rebuilt');
    expect(loaded.economy.stars).toBe(0);
    expect(loaded.errors).toContain('INVALID_ISLAND');
    expect(loaded.errors).toContain('INVALID_ECONOMY');

    await store.write('p3', {
      island: { phase: 'single-island', hqLevel: 2, unlockedLand: 12 },
      economy: createInitialEconomyState(DAY),
    });
    const inconsistent = await loadIslandSnapshot(store, 'p3', []);
    expect(inconsistent.islandSource).toBe('fallback');
    expect(inconsistent.island).toEqual(createInitialIslandState());
  });

  // 4. المصالحة تمنح الناقص مرة واحدة ثم تصبح مخزّنة بلا تغيير
  it('4. مصالحة الاقتصاد مع الإتقان تُمنح مرة واحدة ولا تتكرر عند إعادة القراءة', async () => {
    const store = new MemoryIslandStore();
    await store.write('p4', {
      island: createInitialIslandState(),
      economy: economyWith(['a']),
    });

    const first = await loadIslandSnapshot(store, 'p4', ['a', 'b']);
    expect(first.economySource).toBe('rebuilt');
    expect(first.economy.stars).toBe(20);

    await saveIslandSnapshot(store, 'p4', first);
    const second = await loadIslandSnapshot(store, 'p4', ['a', 'b']);
    expect(second.economySource).toBe('stored');
    expect(second.economy.stars).toBe(20);

    const third = await loadIslandSnapshot(store, 'p4', ['a', 'b', 'c']);
    expect(third.economySource).toBe('rebuilt');
    expect(third.economy.stars).toBe(30);
  });
});
