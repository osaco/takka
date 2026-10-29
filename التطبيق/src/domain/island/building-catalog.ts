import {
  BUILDING_NAMES_AR,
  UPGRADE_TABLE,
  type BuildingId,
  type UpgradeSpec,
} from './upgrade-table';

/**
 * كتالوج مباني الجزيرة — طبقة نقية مشتقة حتمياً من جدول الترقيات.
 * لا بيانات يدوية مكررة: maxLevel و opens وشرط الظهور كلها مستخرجة من UPGRADE_TABLE.
 */

export const BUILDING_IDS = [
  'hq',
  'letters',
  'numbers',
  'stories',
  'observatory',
  'national',
  'companions',
  'garden',
  'lighthouse',
] as const satisfies readonly BuildingId[];

export type BuildingMaxLevel = 1 | 2 | 3;
export type HqLevel = 1 | 2 | 3;

export interface MasteryGate {
  readonly count: number;
  readonly subject?: string;
}

export interface BuildingCatalogEntry {
  readonly id: BuildingId;
  readonly nameAr: string;
  readonly maxLevel: BuildingMaxLevel;
  /** الحد الأدنى من المهارات المتقنة لظهور المبنى — إتقان تعليمي فقط، لا وقت. */
  readonly masteryGate: MasteryGate;
  /** المباني التي يفتحها هذا المبنى عبر ترقياته. */
  readonly opens: readonly BuildingId[];
  /** مستوى برج تكة الذي يُظهر هذا المبنى. */
  readonly revealAtHqLevel: HqLevel;
}

const LEVELS: readonly BuildingMaxLevel[] = [1, 2, 3];

function specFor(id: BuildingId, level: BuildingMaxLevel): UpgradeSpec | undefined {
  return UPGRADE_TABLE[id]?.[level];
}

function deriveMaxLevel(id: BuildingId): BuildingMaxLevel {
  let max: BuildingMaxLevel = 1;
  for (const level of LEVELS) {
    if (specFor(id, level)) max = level;
  }
  return max;
}

function deriveOpens(id: BuildingId): BuildingId[] {
  const opened: BuildingId[] = [];
  for (const level of LEVELS) {
    for (const target of specFor(id, level)?.opens ?? []) {
      if (!opened.includes(target)) opened.push(target);
    }
  }
  return opened;
}

function deriveRevealLevels(): Record<BuildingId, HqLevel> {
  const reveal: Partial<Record<BuildingId, HqLevel>> = { hq: 1 };

  for (const level of LEVELS) {
    for (const target of specFor('hq', level)?.opens ?? []) {
      if (reveal[target] === undefined) reveal[target] = level;
    }
  }

  for (const id of BUILDING_IDS) {
    if (reveal[id] === undefined) {
      throw new Error(`BUILDING_NOT_REVEALED: ${id}`);
    }
  }

  return reveal as Record<BuildingId, HqLevel>;
}

const REVEAL_LEVELS = deriveRevealLevels();

function deriveMasteryGate(revealAtHqLevel: HqLevel): MasteryGate {
  const gate = specFor('hq', revealAtHqLevel)?.masteryGate;
  if (!gate) return Object.freeze({ count: 0 });
  return Object.freeze(
    gate.subject === undefined
      ? { count: gate.count }
      : { count: gate.count, subject: gate.subject },
  );
}

function buildEntry(id: BuildingId): BuildingCatalogEntry {
  const revealAtHqLevel = REVEAL_LEVELS[id];
  return Object.freeze({
    id,
    nameAr: BUILDING_NAMES_AR[id],
    maxLevel: deriveMaxLevel(id),
    masteryGate: deriveMasteryGate(revealAtHqLevel),
    opens: Object.freeze(deriveOpens(id)),
    revealAtHqLevel,
  });
}

export const BUILDING_CATALOG: Readonly<Record<BuildingId, BuildingCatalogEntry>> = Object.freeze(
  BUILDING_IDS.reduce(
    (acc, id) => {
      acc[id] = buildEntry(id);
      return acc;
    },
    {} as Record<BuildingId, BuildingCatalogEntry>,
  ),
);

export function getBuildingCatalogEntry(id: BuildingId): BuildingCatalogEntry | null {
  return BUILDING_CATALOG[id] ?? null;
}

/**
 * الكشف التدريجي الحتمي: يعيد المباني الظاهرة عند مستوى برج تكة المعطى.
 * HQ1 → 3، HQ2 → 6، HQ3 → 9، وبترتيب كتالوجي ثابت.
 */
export function revealedBuildings(hqLevel: HqLevel): BuildingId[] {
  return BUILDING_IDS.filter((id) => REVEAL_LEVELS[id] <= hqLevel);
}

export function isBuildingRevealed(id: BuildingId, hqLevel: HqLevel): boolean {
  return REVEAL_LEVELS[id] <= hqLevel;
}
