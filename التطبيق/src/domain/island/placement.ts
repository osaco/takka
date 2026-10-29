import { z } from 'zod';
import type { BuildingId } from './upgrade-table';

export const GRID_SIZE = 12;

export const PlacementEntrySchema = z.object({
  buildingId: z.enum([
    'hq',
    'letters',
    'numbers',
    'stories',
    'observatory',
    'national',
    'companions',
    'garden',
    'lighthouse',
  ]),
  x: z.number().int().min(0).max(GRID_SIZE - 1),
  y: z.number().int().min(0).max(GRID_SIZE - 1),
});

export type PlacementEntry = z.infer<typeof PlacementEntrySchema>;

export const PlacementStateSchema = z.object({
  buildings: z.array(PlacementEntrySchema),
});

export type PlacementState = z.infer<typeof PlacementStateSchema>;

/**
 * التوزيع الافتراضي الآمن لمباني الجزيرة على الشبكة.
 * برج تكة في المركز (5، 5)، وباقي المباني موزعة بأمان دون تداخل.
 */
export function createDefaultPlacement(): PlacementState {
  return {
    buildings: [
      { buildingId: 'hq', x: 5, y: 5 },
      { buildingId: 'letters', x: 3, y: 4 },
      { buildingId: 'numbers', x: 7, y: 4 },
      { buildingId: 'stories', x: 3, y: 6 },
      { buildingId: 'observatory', x: 7, y: 6 },
      { buildingId: 'national', x: 5, y: 7 },
      { buildingId: 'companions', x: 2, y: 5 },
      { buildingId: 'garden', x: 5, y: 3 },
      { buildingId: 'lighthouse', x: 8, y: 5 },
    ],
  };
}

export function safePlacementFallback(): PlacementState {
  return createDefaultPlacement();
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePlacement(
  state: PlacementState,
  unlockedLandSize: 10 | 12 = 10,
): ValidationResult {
  const errors: string[] = [];
  const parsed = PlacementStateSchema.safeParse(state);

  if (!parsed.success) {
    return { valid: false, errors: ['INVALID_SCHEMA'] };
  }

  const occupiedPositions = new Set<string>();
  const seenBuildings = new Set<BuildingId>();

  // حساب هامش البداية والنهاية للأرض المفتوحة على الشبكة
  // عند 10: من 1 إلى 10 (10x10)
  // عند 12: كامل الشبكة من 0 إلى 11 (12x12)
  const minCoord = unlockedLandSize === 10 ? 1 : 0;
  const maxCoord = unlockedLandSize === 10 ? 10 : 11;

  for (const b of state.buildings) {
    // منع تكرار المبنى الواحد
    if (seenBuildings.has(b.buildingId)) {
      errors.push(`DUPLICATE_BUILDING:${b.buildingId}`);
    }
    seenBuildings.add(b.buildingId);

    // التحقق من حدود الإحداثيات المسموحة للأرض
    if (b.x < minCoord || b.x > maxCoord || b.y < minCoord || b.y > maxCoord) {
      errors.push(`OUT_OF_BOUNDS:${b.buildingId}:(${b.x},${b.y})`);
    }

    // منع التداخل بين مبنيين في نفس الموضع
    const key = `${b.x},${b.y}`;
    if (occupiedPositions.has(key)) {
      errors.push(`POSITION_COLLISION:(${b.x},${b.y})`);
    }
    occupiedPositions.add(key);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export type PlaceBuildingResult =
  | { ok: true; state: PlacementState }
  | { ok: false; error: string };

export function placeBuilding(
  state: PlacementState,
  buildingId: BuildingId,
  x: number,
  y: number,
  unlockedLandSize: 10 | 12 = 10,
): PlaceBuildingResult {
  const minCoord = unlockedLandSize === 10 ? 1 : 0;
  const maxCoord = unlockedLandSize === 10 ? 10 : 11;

  if (x < minCoord || x > maxCoord || y < minCoord || y > maxCoord) {
    return { ok: false, error: 'OUT_OF_BOUNDS' };
  }

  // فحص هل الموضع المطلوب مشغول بمبنى آخر
  const isOccupied = state.buildings.some(
    (b) => b.x === x && b.y === y && b.buildingId !== buildingId,
  );

  if (isOccupied) {
    return { ok: false, error: 'POSITION_ALREADY_OCCUPIED' };
  }

  const existingIndex = state.buildings.findIndex((b) => b.buildingId === buildingId);

  if (existingIndex >= 0) {
    const updated = [...state.buildings];
    updated[existingIndex] = { buildingId, x, y };
    return {
      ok: true,
      state: { buildings: updated },
    };
  }

  return {
    ok: true,
    state: {
      buildings: [...state.buildings, { buildingId, x, y }],
    },
  };
}
