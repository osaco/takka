/**
 * إسقاط أيزومتري ثابت — دوال نقية فقط، مغطاة باختبارات.
 * لا DOM ولا Canvas هنا. (الوثيقة 10 §8.2)
 */

export interface IsoCamera {
  tileW: number;
  tileH: number;
  heightUnit: number;
  /** نسبة أصل العالم من ارتفاع الشاشة. */
  originY: number;
}

export const DEFAULT_CAMERA: IsoCamera = {
  tileW: 132,
  tileH: 66,
  heightUnit: 30,
  originY: 0.34,
};

export interface GridPoint {
  x: number;
  y: number;
  /** الارتفاع فوق مستوى الأرض. */
  z?: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export function project(
  p: GridPoint,
  width: number,
  height: number,
  camera: IsoCamera = DEFAULT_CAMERA,
): ScreenPoint {
  const z = p.z ?? 0;
  return {
    x: width / 2 + ((p.x - p.y) * camera.tileW) / 2,
    y: height * camera.originY + ((p.x + p.y) * camera.tileH) / 2 - z * camera.heightUnit,
  };
}

/** عكس الإسقاط على مستوى الأرض (z=0) — للالتقاط والاختبار. */
export function unproject(
  s: ScreenPoint,
  width: number,
  height: number,
  camera: IsoCamera = DEFAULT_CAMERA,
): GridPoint {
  const dx = (s.x - width / 2) / (camera.tileW / 2);
  const dy = (s.y - height * camera.originY) / (camera.tileH / 2);
  return {
    x: (dx + dy) / 2,
    y: (dy - dx) / 2,
  };
}

/** ترتيب الرسم: الأبعد (x+y أكبر) يُرسم أولاً، ثم الأقرب فوقه. */
export function depthOf(p: GridPoint): number {
  return p.x + p.y + (p.z ?? 0) * 0.001;
}

export function sortByDepth<T extends GridPoint>(items: readonly T[]): T[] {
  return items.slice().sort((a, b) => depthOf(b) - depthOf(a));
}

export interface IslandAnchor extends GridPoint {
  id: string;
  /** نصف قطر الالتقاط بالبكسل على الشاشة. */
  radius: number;
}

/**
 * التقاط بترتيب العمق: الأقرب للكاميرا يُفحص أولاً.
 * مساحة النقر تُحسب مرة عند تغيير الحجم، لا في كل إطار.
 */
export function hitTest(
  point: ScreenPoint,
  islands: readonly IslandAnchor[],
  width: number,
  height: number,
  camera: IsoCamera = DEFAULT_CAMERA,
): string | null {
  const ordered = sortByDepth(islands);
  for (const island of ordered) {
    const c = project(island, width, height, camera);
    const dx = point.x - c.x;
    const dy = point.y - c.y;
    if (dx * dx + dy * dy <= island.radius * island.radius) return island.id;
  }
  return null;
}

export function clampDpr(dpr: number, max = 2): number {
  return Math.min(Math.max(1, dpr), max);
}
