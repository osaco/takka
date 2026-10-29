import {
  EconomyStateSchema,
  IslandStateSchema,
  createInitialEconomyState,
  createInitialIslandState,
  grantFirstMastery,
  type EconomyState,
  type IslandState,
} from '@domain/island';
import { TakkaDatabase } from './dexie-repository';

/**
 * مخزن حالة الجزيرة والاقتصاد — صف واحد لكل ملف رمزي، يُكتبان معاً في معاملة واحدة.
 *
 * لماذا صفّان في معاملة واحدة: الترقية تخصم موارد وتغيّر مستوى البرج في اللحظة نفسها.
 * كتابة أحدهما دون الآخر تعني طفلاً فقد نجومه أو كبر برجه مجاناً. المعاملة تمنع ذلك.
 *
 * الاقتصاد يُخزَّن كحالة لا يُشتق من سجل الأدلة، لأن الاشتقاق لا يعرف ما أُنفق.
 * وعند غياب الصف أو تلفه يُعاد بناؤه من المهارات المتقنة — شفاء ذاتي بلا فقد مكافآت.
 */

export type IslandSource = 'stored' | 'fallback';
export type EconomySource = 'stored' | 'rebuilt';

export interface IslandSnapshot {
  island: IslandState;
  economy: EconomyState;
}

export interface IslandLoadResult extends IslandSnapshot {
  islandSource: IslandSource;
  economySource: EconomySource;
  errors: string[];
}

export interface IslandStore {
  read(profileId: string): Promise<unknown>;
  write(profileId: string, value: unknown): Promise<void>;
  remove(profileId: string): Promise<void>;
}

export interface IslandRow {
  profileId: string;
  island: unknown;
  economy: unknown;
  updatedAt: number;
}

function parseIsland(raw: unknown): IslandState | null {
  const parsed = IslandStateSchema.safeParse(raw);
  if (!parsed.success) return null;

  // تماسك إلزامي: الأرض 12 فقط مع HQ3، و10 مع HQ1/HQ2.
  const expectedLand = parsed.data.hqLevel === 3 ? 12 : 10;
  if (parsed.data.unlockedLand !== expectedLand) return null;

  return parsed.data;
}

/** إعادة بناء الاقتصاد من المهارات المتقنة — تُمنح كل مهارة مرة واحدة فقط. */
export function rebuildEconomyFromMastery(
  masteredSkillIds: readonly string[],
): EconomyState {
  return [...masteredSkillIds]
    .sort()
    .reduce<EconomyState>((state, skillId) => grantFirstMastery(state, skillId), createInitialEconomyState());
}

/** يضيف المكافآت الناقصة فقط؛ لا يكرر ولا يحذف مهارة مسجلة. */
export function reconcileEconomy(
  economy: EconomyState,
  masteredSkillIds: readonly string[],
): EconomyState {
  return [...masteredSkillIds]
    .sort()
    .reduce<EconomyState>((state, skillId) => grantFirstMastery(state, skillId), economy);
}

export async function loadIslandSnapshot(
  store: IslandStore,
  profileId: string,
  masteredSkillIds: readonly string[] = [],
): Promise<IslandLoadResult> {
  const errors: string[] = [];
  let raw: unknown = null;

  try {
    raw = await store.read(profileId);
  } catch {
    errors.push('STORAGE_UNAVAILABLE');
  }

  const record =
    raw !== null && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as { island?: unknown; economy?: unknown })
      : {};

  let island = parseIsland(record.island);
  let islandSource: IslandSource = 'stored';
  if (!island) {
    island = createInitialIslandState();
    islandSource = 'fallback';
    if (raw !== null) errors.push('INVALID_ISLAND');
  }

  const parsedEconomy = EconomyStateSchema.safeParse(record.economy);
  let economy: EconomyState;
  let economySource: EconomySource;

  if (parsedEconomy.success) {
    economy = parsedEconomy.data;
    economySource = 'stored';
  } else {
    economy = rebuildEconomyFromMastery(masteredSkillIds);
    economySource = 'rebuilt';
    if (raw !== null) errors.push('INVALID_ECONOMY');
  }

  const reconciled = reconcileEconomy(economy, masteredSkillIds);
  if (reconciled !== economy) {
    economy = reconciled;
    economySource = 'rebuilt';
  }

  return { island, economy, islandSource, economySource, errors };
}

export async function saveIslandSnapshot(
  store: IslandStore,
  profileId: string,
  snapshot: IslandSnapshot,
): Promise<{ ok: boolean; errors: string[] }> {
  const island = parseIsland(snapshot.island);
  if (!island) return { ok: false, errors: ['INVALID_ISLAND'] };

  const economy = EconomyStateSchema.safeParse(snapshot.economy);
  if (!economy.success) return { ok: false, errors: ['INVALID_ECONOMY'] };

  await store.write(profileId, { island, economy: economy.data });
  return { ok: true, errors: [] };
}

/** تنفيذ في الذاكرة — للاختبارات وللمعاينة عند غياب IndexedDB. */
export class MemoryIslandStore implements IslandStore {
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

/** تنفيذ Dexie — الصفّان يُكتبان ويُحذفان معاً، فلا حالة نصف محفوظة. */
export class DexieIslandStore implements IslandStore {
  private db: TakkaDatabase;

  constructor(db = new TakkaDatabase()) {
    this.db = db;
  }

  async read(profileId: string): Promise<unknown> {
    const [islandRow, economyRow] = await Promise.all([
      this.db.island.get(profileId),
      this.db.economy.get(profileId),
    ]);

    if (!islandRow && !economyRow) return null;

    return {
      island: islandRow?.value ?? null,
      economy: economyRow?.value ?? null,
    };
  }

  async write(profileId: string, value: unknown): Promise<void> {
    const record = value as { island: unknown; economy: unknown };
    const updatedAt = Date.now();

    await this.db.transaction('rw', this.db.island, this.db.economy, async () => {
      await this.db.island.put({ profileId, value: record.island, updatedAt });
      await this.db.economy.put({ profileId, value: record.economy, updatedAt });
    });
  }

  async remove(profileId: string): Promise<void> {
    await this.db.transaction('rw', this.db.island, this.db.economy, async () => {
      await this.db.island.delete(profileId);
      await this.db.economy.delete(profileId);
    });
  }
}
