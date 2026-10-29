import { z } from 'zod';

export type IslandPhase = 'single-island';
export type IslandHqLevel = 1 | 2 | 3;
export type UnlockedLand = 10 | 12;

export const IslandStateSchema = z.object({
  phase: z.literal('single-island'),
  hqLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  unlockedLand: z.union([z.literal(10), z.literal(12)]),
});

export type IslandState = z.infer<typeof IslandStateSchema>;

export function createInitialIslandState(): IslandState {
  return {
    phase: 'single-island',
    hqLevel: 1,
    unlockedLand: 10,
  };
}

export type UpgradeHqResult =
  | { ok: true; state: IslandState }
  | { ok: false; error: string };

export function upgradeIslandHq(state: IslandState): UpgradeHqResult {
  const parsed = IslandStateSchema.safeParse(state);
  if (!parsed.success) {
    return { ok: false, error: 'INVALID_ISLAND_STATE' };
  }

  if (state.hqLevel === 1) {
    return {
      ok: true,
      state: {
        ...state,
        hqLevel: 2,
        unlockedLand: 10,
      },
    };
  }

  if (state.hqLevel === 2) {
    return {
      ok: true,
      state: {
        ...state,
        hqLevel: 3,
        unlockedLand: 12,
      },
    };
  }

  return { ok: false, error: 'MAX_LEVEL_REACHED' };
}
