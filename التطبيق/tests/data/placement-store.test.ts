import { describe, expect, it } from 'vitest';
import {
  MemoryPlacementStore,
  loadPlacement,
  sanitizePlacement,
  savePlacement,
} from '@data/placement-store';
import {
  createDefaultPlacement,
  placeBuilding,
  type PlacementState,
} from '@domain/island';

const PROFILE = 'star-001';

describe('مخزن مواضع المباني — الخطوة 4', () => {
  // 1. دورة حفظ وقراءة كاملة
  it('1. الحفظ ثم القراءة يعيدان نفس المواضع مع مصدر stored', async () => {
    const store = new MemoryPlacementStore();
    const state = createDefaultPlacement();

    const saved = await savePlacement(store, PROFILE, state);
    expect(saved.ok).toBe(true);
    expect(saved.errors).toEqual([]);

    const loaded = await loadPlacement(store, PROFILE);
    expect(loaded.source).toBe('stored');
    expect(loaded.errors).toEqual([]);
    expect(loaded.state).toEqual(state);
  });

  // 2. أول تشغيل: لا صف ← التوزيع الافتراضي بلا تحذير
  it('2. ملف بلا مواضع محفوظة يعطي التوزيع الافتراضي بهدوء', async () => {
    const store = new MemoryPlacementStore();
    const loaded = await loadPlacement(store, PROFILE);

    expect(loaded.source).toBe('fallback');
    expect(loaded.errors).toEqual([]);
    expect(loaded.state).toEqual(createDefaultPlacement());
  });

  // 3. بيانات فاسدة البنية تُرفض كاملة
  it('3. بيانات فاسدة البنية تُرفض وتُستبدل بالتوزيع الافتراضي دون رمي', async () => {
    const store = new MemoryPlacementStore();
    await store.write(PROFILE, { buildings: [{ buildingId: 'hq', x: 'خمسة', y: null }] });

    const loaded = await loadPlacement(store, PROFILE);
    expect(loaded.source).toBe('fallback');
    expect(loaded.errors).toContain('INVALID_PLACEMENT');
    expect(loaded.state).toEqual(createDefaultPlacement());
  });

  // 4. تكرار مبنى وتصادم موضع
  it('4. تكرار المبنى والتصادم على نفس المربع يُرفضان معاً', async () => {
    const duplicated = createDefaultPlacement();
    const letters = duplicated.buildings.find((b) => b.buildingId === 'letters');
    expect(letters).toBeDefined();

    const corrupted: PlacementState = {
      buildings: [...duplicated.buildings, { ...letters! }],
    };

    const result = sanitizePlacement(corrupted, 10);
    expect(result.source).toBe('fallback');
    expect(result.errors).toContain('DUPLICATE_BUILDING:letters');
    expect(result.errors).toContain('POSITION_COLLISION:(3,4)');
    expect(result.state).toEqual(createDefaultPlacement());
  });

  // 5. الحدود مرتبطة بحجم الأرض المفتوحة
  it('5. موضع خارج أرض 10x10 يُرفض، ونفس الموضع صالح عند 12x12', () => {
    const base = createDefaultPlacement();
    const moved = placeBuilding(base, 'letters', 0, 0, 12);
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;

    const small = sanitizePlacement(moved.state, 10);
    expect(small.source).toBe('fallback');
    expect(small.errors).toContain('OUT_OF_BOUNDS:letters:(0,0)');

    const large = sanitizePlacement(moved.state, 12);
    expect(large.source).toBe('stored');
    expect(large.errors).toEqual([]);
  });

  // 6. صف واحد لكل ملف، والحفظ الفاسد لا يطمس السليم
  it('6. الحفظ لا يكرر الصفوف، والحفظ غير الصالح لا يمسّ المحفوظ السليم', async () => {
    const store = new MemoryPlacementStore();
    const state = createDefaultPlacement();

    await savePlacement(store, PROFILE, state);
    await savePlacement(store, PROFILE, state);
    expect(store.size).toBe(1);

    const moved = placeBuilding(state, 'letters', 2, 2, 10);
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    await savePlacement(store, PROFILE, moved.state);

    const corrupted = await savePlacement(store, PROFILE, {
      buildings: [{ buildingId: 'hq', x: 99, y: 99 }],
    } as PlacementState);
    expect(corrupted.ok).toBe(false);
    expect(corrupted.errors.length).toBeGreaterThan(0);

    const loaded = await loadPlacement(store, PROFILE);
    expect(loaded.source).toBe('stored');
    expect(loaded.state.buildings.find((b) => b.buildingId === 'letters')).toEqual({
      buildingId: 'letters',
      x: 2,
      y: 2,
    });
    expect(store.size).toBe(1);
  });
});
