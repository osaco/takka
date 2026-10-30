import { describe, expect, it } from 'vitest';
import {
  buildStageView,
  revealedCount,
  resolveStagePlacement,
  unlockedLandFor,
} from '@runtime/world/stage-view';
import { createDefaultPlacement, type PlacementState } from '@domain/island';

const DEFAULT = createDefaultPlacement();

describe('نموذج عرض الجزيرة — ربط القراءة فقط (Step 6)', () => {
  // 1. HQ1: ثلاثة مبانٍ مفتوحة وستة مقفلة
  it('1. عند HQ1 تُفتح ثلاثة مبانٍ فقط والبرج في المركز', () => {
    const view = buildStageView(1, DEFAULT);
    const revealed = view.buildings.filter((b) => b.revealed).map((b) => b.id);

    expect(revealed).toEqual(['hq', 'letters', 'numbers']);
    expect(revealedCount(view)).toBe(3);
    expect(view.buildings).toHaveLength(9);

    const hq = view.buildings.find((b) => b.id === 'hq');
    expect(hq).toMatchObject({ x: 5, y: 5, revealed: true });
    expect(view.usedFallback).toBe(false);
  });

  // 2. HQ2: ستة مبانٍ
  it('2. عند HQ2 تُفتح ستة مبانٍ بالترتيب الكتالوجي', () => {
    const view = buildStageView(2, DEFAULT);
    const revealed = view.buildings.filter((b) => b.revealed).map((b) => b.id);

    expect(revealed).toEqual([
      'hq',
      'letters',
      'numbers',
      'stories',
      'observatory',
      'national',
    ]);
    expect(revealedCount(view)).toBe(6);
  });

  // 3. HQ3: تسعة مبانٍ
  it('3. عند HQ3 تُفتح المباني التسعة ولا يبقى مقفل', () => {
    const view = buildStageView(3, DEFAULT);
    expect(revealedCount(view)).toBe(9);
    expect(view.buildings.every((b) => b.revealed)).toBe(true);
    expect(unlockedLandFor(3)).toBe(12);
    expect(unlockedLandFor(1)).toBe(10);
  });

  // 4. مواضع ناقصة تُستكمل بأمان
  it('4. مواضع ناقصة تُستكمل من الافتراضي بلا فقد مبنى ولا تصادم', () => {
    const partial: PlacementState = {
      buildings: DEFAULT.buildings.filter(
        (b) => b.buildingId !== 'letters' && b.buildingId !== 'garden',
      ),
    };

    const resolved = resolveStagePlacement(partial, 10);
    expect(resolved.usedFallback).toBe(true);
    expect(resolved.state.buildings).toHaveLength(9);

    const positions = new Set(resolved.state.buildings.map((b) => `${b.x},${b.y}`));
    expect(positions.size).toBe(9);

    const view = buildStageView(1, partial);
    const letters = view.buildings.find((b) => b.id === 'letters');
    expect(letters).toMatchObject({ x: 3, y: 4 });
  });

  // 5. مواضع فاسدة تُستبدل كاملة
  it('5. مواضع فاسدة تُستبدل بالتوزيع الافتراضي كاملاً', () => {
    const corrupt = {
      buildings: DEFAULT.buildings.map((b) =>
        b.buildingId === 'letters' ? { ...b, x: 0, y: 0 } : b,
      ),
    } as PlacementState;

    const view = buildStageView(1, corrupt);
    expect(view.usedFallback).toBe(true);
    expect(view.buildings).toHaveLength(9);
    expect(view.buildings.find((b) => b.id === 'letters')).toMatchObject({ x: 3, y: 4 });

    const missing = buildStageView(1, null);
    expect(missing.usedFallback).toBe(true);
    expect(missing.buildings).toHaveLength(9);
  });

  // 6. شرح القفل مشتق من بوابة الإتقان
  it('6. كل مبنى مقفل يحمل شرط فتحه من الكتالوج بنص عربي صحيح', () => {
    const view = buildStageView(1, DEFAULT);

    const stories = view.buildings.find((b) => b.id === 'stories');
    expect(stories).toMatchObject({ revealed: false, masteryGate: 8 });
    expect(stories?.unlockHint).toBe('يُفتح بعد إتقان 8 مهارة');

    const lighthouse = view.buildings.find((b) => b.id === 'lighthouse');
    expect(lighthouse).toMatchObject({ revealed: false, masteryGate: 14 });

    const letters = view.buildings.find((b) => b.id === 'letters');
    expect(letters).toMatchObject({ revealed: true, masteryGate: 0 });
    expect(letters?.unlockHint).toBe('يُفتح مع ترقية برج تكّة');

    expect(view.buildings.every((b) => b.nameAr.trim().length > 0)).toBe(true);
  });
});
