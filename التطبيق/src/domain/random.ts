/** مولّد أرقام شبه عشوائي قابل للتكرار — بلا Math.random داخل النطاق. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/** معرّف محلي بلا اعتماد على مكتبة خارجية. */
export function makeId(prefix: string, seed: number, at: number): string {
  return `${prefix}_${at.toString(36)}_${(seed >>> 0).toString(36)}`;
}
