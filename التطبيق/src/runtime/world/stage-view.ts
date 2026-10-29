import {
  BUILDING_CATALOG,
  BUILDING_IDS,
  createDefaultPlacement,
  validatePlacement,
  type BuildingId,
  type HqLevel,
  type PlacementState,
} from '@domain/island';

/**
 * نموذج عرض الجزيرة — قراءة فقط، بلا Canvas ولا React.
 * يدمج كتالوج المباني مع المواضع المحفوظة ويحسم حالات النقص بأمان.
 */

export interface StageBuildingView {
  id: BuildingId;
  nameAr: string;
  x: number;
  y: number;
  revealed: boolean;
  /** عدد المهارات المطلوبة لفتح المبنى — صفر يعني يُفتح بترقية البرج. */
  masteryGate: number;
  unlockHint: string;
}

export interface StageView {
  hqLevel: HqLevel;
  buildings: StageBuildingView[];
  /** true إذا اعتمدنا التوزيع الافتراضي كلياً أو جزئياً. */
  usedFallback: boolean;
}

export function unlockedLandFor(hqLevel: HqLevel): 10 | 12 {
  return hqLevel === 3 ? 12 : 10;
}

function isComplete(state: PlacementState): boolean {
  const ids = new Set(state.buildings.map((entry) => entry.buildingId));
  return ids.size === BUILDING_IDS.length;
}

/**
 * مواضع آمنة للعرض: أي خلل ← افتراضي كامل، ونقص جزئي ← استكمال من الافتراضي.
 * لا يُحذف مبنى من العرض أبداً بسبب بيانات ناقصة.
 */
export function resolveStagePlacement(
  placement: PlacementState | null | undefined,
  unlockedLand: 10 | 12,
): { state: PlacementState; usedFallback: boolean } {
  const fallback = createDefaultPlacement();

  if (!placement) {
    return { state: fallback, usedFallback: true };
  }

  const validation = validatePlacement(placement, unlockedLand);
  if (!validation.valid) {
    return { state: fallback, usedFallback: true };
  }

  if (isComplete(placement)) {
    return { state: placement, usedFallback: false };
  }

  const stored = new Map(placement.buildings.map((entry) => [entry.buildingId, entry]));
  const merged = fallback.buildings.map((entry) => stored.get(entry.buildingId) ?? entry);
  return { state: { buildings: merged }, usedFallback: true };
}

function hintFor(masteryGate: number): string {
  if (masteryGate <= 0) return 'يُفتح مع ترقية برج تكّة';
  return `يُفتح بعد إتقان ${masteryGate} مهارة`;
}

export function buildStageView(
  hqLevel: HqLevel,
  placement: PlacementState | null | undefined,
): StageView {
  const unlockedLand = unlockedLandFor(hqLevel);
  const resolved = resolveStagePlacement(placement, unlockedLand);
  const positions = new Map(
    resolved.state.buildings.map((entry) => [entry.buildingId, { x: entry.x, y: entry.y }]),
  );

  const buildings = BUILDING_IDS.map((id) => {
    const entry = BUILDING_CATALOG[id];
    const position = positions.get(id) ?? { x: 5, y: 5 };
    const revealed = entry.revealAtHqLevel <= hqLevel;

    return {
      id,
      nameAr: entry.nameAr,
      x: position.x,
      y: position.y,
      revealed,
      masteryGate: entry.masteryGate.count,
      unlockHint: hintFor(entry.masteryGate.count),
    };
  });

  return { hqLevel, buildings, usedFallback: resolved.usedFallback };
}

/** عدد المباني الظاهرة فعلاً عند مستوى برج معيّن. */
export function revealedCount(view: StageView): number {
  return view.buildings.filter((building) => building.revealed).length;
}
