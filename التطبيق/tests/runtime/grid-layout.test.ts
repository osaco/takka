import { describe, expect, it } from 'vitest';
import {
  GRID_CELLS,
  MIN_TOUCH_TARGET,
  allCells,
  buildingAtPoint,
  cellCenter,
  computeGridMetrics,
  motionProfile,
  type GridBuilding,
} from '@runtime/world/grid-layout';

const SIZES: ReadonlyArray<[number, number]> = [
  [320, 400],
  [360, 480],
  [414, 560],
  [640, 420],
];

describe('شبكة الجزيرة 12×12 — تخطيط نقي (Step 5)', () => {
  // 1. لا فيض أفقي على أضيق شاشة
  it('1. 144 مربعاً تدخل في عرض 320dp دون أي فيض أفقي', () => {
    const metrics = computeGridMetrics(320, 400);
    const cells = allCells(metrics);

    expect(cells).toHaveLength(GRID_CELLS);
    expect(metrics.cellSize).toBe(23);
    expect(metrics.originX).toBeGreaterThanOrEqual(0);
    expect(metrics.originX + metrics.contentWidth).toBeLessThanOrEqual(320);

    for (const cell of cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.x + cell.size).toBeLessThanOrEqual(320);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.y + cell.size).toBeLessThanOrEqual(400);
    }
  });

  // 2. الشبكة تبقى مربعة ومتمركزة ومحتواة على كل الأحجام
  it('2. الشبكة مربعة ومتمركزة ومحتواة بالكامل على أربعة أحجام شاشات', () => {
    for (const [width, height] of SIZES) {
      const metrics = computeGridMetrics(width, height);

      expect(allCells(metrics)).toHaveLength(GRID_CELLS);
      expect(metrics.contentWidth).toBe(metrics.contentHeight);
      expect(metrics.originX).toBe(Math.round((width - metrics.contentWidth) / 2));
      expect(metrics.originY).toBe(Math.round((height - metrics.contentHeight) / 2));
      expect(metrics.contentWidth).toBeLessThanOrEqual(width);
      expect(metrics.contentHeight).toBeLessThanOrEqual(height);
    }
  });

  // 3. تقليل الحركة يوقف كل حركة وكل طبقة زخرفية
  it('3. prefers-reduced-motion يوقف الحركة والمدة والزخرفة الخلفية', () => {
    expect(motionProfile(true)).toEqual({
      animate: false,
      durationMs: 0,
      idleAnimation: false,
    });

    const normal = motionProfile(false);
    expect(normal.animate).toBe(true);
    expect(normal.durationMs).toBeGreaterThan(0);
    expect(normal.idleAnimation).toBe(true);
  });

  // 4. الشبكة لا تُعكس، والالتقاط يحترم حد اللمس
  it('4. الشبكة فيزيائية غير معكوسة، ونصف قطر الالتقاط لا يقل عن 28dp', () => {
    const metrics = computeGridMetrics(320, 400);

    expect(cellCenter(0, 0, metrics).x).toBeLessThan(cellCenter(11, 0, metrics).x);
    expect(cellCenter(0, 0, metrics).y).toBeLessThan(cellCenter(0, 11, metrics).y);
    expect(metrics.hitRadius).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET / 2);

    const buildings: GridBuilding[] = [
      { id: 'hq', x: 5, y: 5 },
      { id: 'letters', x: 3, y: 4 },
    ];

    const center = cellCenter(5, 5, metrics);
    expect(buildingAtPoint(center, buildings, metrics)?.id).toBe('hq');
    expect(buildingAtPoint({ x: 1, y: 1 }, buildings, metrics)).toBeNull();
  });
});
