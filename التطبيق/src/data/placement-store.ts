import {
  BUILDING_IDS,
  PlacementStateSchema,
  createDefaultPlacement,
  validatePlacement,
  type PlacementState,
} from '@domain/island';
import { TakkaDatabase } from './dexie-repository';

/**
 * مخزن مواضع المباني — طبقة رقيقة فوق IndexedDB، وكل المنطق في دالة نقية.
 * البيانات الفاسدة لا تصل إلى العارض أبداً: تُرفض وتُستبدل بالتوزيع الافتراضي.
 */

export type PlacementLoadSource = 'stored' | 'fallback';

export interface PlacementLoadResult {
  state: PlacementState;
  source: PlacementLoadSource;
  errors: string[];
}

export interface PlacementStore {
  read(profileId: string): Promise<unknown>;
  write(profileId: string, value: unknown): Promise<void>;
  remove(profileId: string): Promise<void>;
}

export interface PlacementRow {
  profileId: string;
  value: unknown;
  updatedAt: number;
}

/**
 * التحقق الصارم من مواضع محمّلة. أي خلل ← التوزيع الافتراضي كاملاً،
 * لا ترقيع جزئي ولا قصّ صامت للإحداثيات.
 */
export function sanitizePlacement(raw: unknown, unlockedLand: 10 | 12 = 10): PlacementLoadResult {
  if (raw === null || raw === undefined) {
    return { state: createDefaultPlacement(), source: 'fallback', errors: [] };
  }

  const parsed = PlacementStateSchema.safeParse(raw);
  if (!parsed.success) {
    return { state: createDefaultPlacement(), source: 'fallback', errors: ['INVALID_PLACEMENT'] };
  }

  const seen = new Set(parsed.data.buildings.map((entry) => entry.buildingId));
  if (seen.size !== BUILDING_IDS.length) {
    return { state: createDefaultPlacement(), source: 'fallback', errors: ['INCOMPLETE_PLACEMENT'] };
  }

  const validation = validatePlacement(parsed.data, unlockedLand);
  if (!validation.valid) {
    return {
      state: createDefaultPlacement(),
      source: 'fallback',
      errors: validation.errors,
    };
  }

  return { state: parsed.data, source: 'stored', errors: [] };
}

export async function loadPlacement(
  store: PlacementStore,
  profileId: string,
  unlockedLand: 10 | 12 = 10,
): Promise<PlacementLoadResult> {
  try {
    return sanitizePlacement(await store.read(profileId), unlockedLand);
  } catch {
    return { state: createDefaultPlacement(), source: 'fallback', errors: ['STORAGE_UNAVAILABLE'] };
  }
}

export async function savePlacement(
  store: PlacementStore,
  profileId: string,
  state: PlacementState,
  unlockedLand: 10 | 12 = 10,
): Promise<{ ok: boolean; errors: string[] }> {
  const sanitized = sanitizePlacement(state, unlockedLand);
  if (sanitized.source !== 'stored') {
    return { ok: false, errors: sanitized.errors };
  }

  await store.write(profileId, sanitized.state);
  return { ok: true, errors: [] };
}

/** تنفيذ في الذاكرة — للاختبارات وللمعاينة عند غياب IndexedDB. */
export class MemoryPlacementStore implements PlacementStore {
  private rows = new Map<string, unknown>();

  get size(): number {
    return this.rows.size;
  }

  async read(profileId: string): Promise<unknown> {
    return this.rows.get(profileId) ?? null;
  }

  async write(profileId: string, value: unknown): Promise<void> {
    this.rows.set(profileId, value);
  }

  async remove(profileId: string): Promise<void> {
    this.rows.delete(profileId);
  }
}

/** تنفيذ Dexie — صف واحد لكل ملف رمزي، فلا تكرار ممكن. */
export class DexiePlacementStore implements PlacementStore {
  private db: TakkaDatabase;

  constructor(db = new TakkaDatabase()) {
    this.db = db;
  }

  async read(profileId: string): Promise<unknown> {
    const row = await this.db.placements.get(profileId);
    return row?.value ?? null;
  }

  async write(profileId: string, value: unknown): Promise<void> {
    await this.db.placements.put({ profileId, value, updatedAt: Date.now() });
  }

  async remove(profileId: string): Promise<void> {
    await this.db.placements.delete(profileId);
  }
}
