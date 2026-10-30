/**
 * تخطيط شبكة الجزيرة 12×12 — دوال نقية بلا DOM ولا Canvas.
 * الشبكة ثابتة فيزيائياً: لا تُعكس تحت RTL، لأن انعكاسها يحرّك بيت الطفل
 * إلى الجهة الأخرى من الشاشة ويُفسد ذاكرته المكانية.
 */

export const GRID_COLUMNS = 12;
export const GRID_ROWS = 12;
export const GRID_CELLS = GRID_COLUMNS * GRID_ROWS;

/** حد اللمس الموصى به — يُطبَّق على التقاط المباني لا على حجم المربع المرئي. */
export const MIN_TOUCH_TARGET = 56;

const PADDING = 8;
const GAP = 2;

export interface GridMetrics {
  width: number;
  height: number;
  cellSize: number;
  gap: number;
  padding: number;
  contentWidth: number;
  contentHeight: number;
  originX: number;
  originY: number;
  /** نصف قطر التقاط المبنى — لا يقل عن نصف حد اللمس حتى لو صغر المربع. */
  hitRadius: number;
}

export interface GridCell {
  col: number;
  row: number;
  x: number;
  y: number;
  size: number;
}

export interface GridScreenPoint {
  x: number;
  y: number;
}

export interface GridBuilding {
  id: string;
  x: number;
  y: number;
  label?: string;
  revealed?: boolean;
}

function fitCell(width: number, height: number): number {
  const byWidth = Math.floor((width - 2 * PADDING - (GRID_COLUMNS - 1) * GAP) / GRID_COLUMNS);
  const byHeight = Math.floor((height - 2 * PADDING - (GRID_ROWS - 1) * GAP) / GRID_ROWS);
  return Math.max(4, Math.min(byWidth, byHeight));
}

export function computeGridMetrics(width: number, height: number): GridMetrics {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const cellSize = fitCell(safeWidth, safeHeight);
  const contentWidth = GRID_COLUMNS * cellSize + (GRID_COLUMNS - 1) * GAP;
  const contentHeight = GRID_ROWS * cellSize + (GRID_ROWS - 1) * GAP;

  return {
    width: safeWidth,
    height: safeHeight,
    cellSize,
    gap: GAP,
    padding: PADDING,
    contentWidth,
    contentHeight,
    originX: Math.round((safeWidth - contentWidth) / 2),
    originY: Math.round((safeHeight - contentHeight) / 2),
    hitRadius: Math.max(MIN_TOUCH_TARGET / 2, cellSize / 2),
  };
}

export function cellAt(index: number, metrics: GridMetrics): GridCell {
  const col = index % GRID_COLUMNS;
  const row = Math.floor(index / GRID_COLUMNS);
  return {
    col,
    row,
    x: metrics.originX + col * (metrics.cellSize + metrics.gap),
    y: metrics.originY + row * (metrics.cellSize + metrics.gap),
    size: metrics.cellSize,
  };
}

export function allCells(metrics: GridMetrics): GridCell[] {
  const cells: GridCell[] = [];
  for (let index = 0; index < GRID_CELLS; index += 1) cells.push(cellAt(index, metrics));
  return cells;
}

export function cellCenter(col: number, row: number, metrics: GridMetrics): GridScreenPoint {
  const step = metrics.cellSize + metrics.gap;
  return {
    x: metrics.originX + col * step + metrics.cellSize / 2,
    y: metrics.originY + row * step + metrics.cellSize / 2,
  };
}

/** مركز المبنى على الشاشة من إحداثياته في الشبكة. */
export function buildingCenter(building: GridBuilding, metrics: GridMetrics): GridScreenPoint {
  return cellCenter(building.x, building.y, metrics);
}

/** المبنى الأقرب لنقطة لمس، ضمن نصف قطر الالتقاط — أو null. */
export function buildingAtPoint(
  point: GridScreenPoint,
  buildings: readonly GridBuilding[],
  metrics: GridMetrics,
): GridBuilding | null {
  let best: GridBuilding | null = null;
  let bestDistance = Infinity;

  for (const building of buildings) {
    const center = buildingCenter(building, metrics);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const distance = dx * dx + dy * dy;
    if (distance <= metrics.hitRadius * metrics.hitRadius && distance < bestDistance) {
      best = building;
      bestDistance = distance;
    }
  }

  return best;
}

export interface MotionProfile {
  animate: boolean;
  durationMs: number;
  idleAnimation: boolean;
}

/**
 * تقليل الحركة: لا حركة دخول، لا موج، لا نبض — الشبكة ساكنة تماماً.
 */
export function motionProfile(prefersReducedMotion: boolean): MotionProfile {
  if (prefersReducedMotion) {
    return { animate: false, durationMs: 0, idleAnimation: false };
  }
  return { animate: true, durationMs: 240, idleAnimation: true };
}

export function prefersReducedMotionNow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
