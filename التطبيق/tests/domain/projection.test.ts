import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CAMERA,
  clampDpr,
  depthOf,
  hitTest,
  project,
  sortByDepth,
  unproject,
} from '@runtime/world/projection';

const W = 800;
const H = 600;

describe('الإسقاط الأيزومتري', () => {
  it('الأصل يقع في منتصف العرض وأصل الارتفاع', () => {
    const p = project({ x: 0, y: 0 }, W, H);
    expect(p.x).toBe(W / 2);
    expect(p.y).toBeCloseTo(H * DEFAULT_CAMERA.originY);
  });

  it('يعكس الإسقاط على مستوى الأرض', () => {
    for (const point of [
      { x: 0, y: 0 },
      { x: 3, y: 1 },
      { x: -2, y: 4 },
      { x: 1.5, y: -0.75 },
    ]) {
      const back = unproject(project(point, W, H), W, H);
      expect(back.x).toBeCloseTo(point.x, 6);
      expect(back.y).toBeCloseTo(point.y, 6);
    }
  });

  it('الارتفاع يرفع النقطة على الشاشة', () => {
    const ground = project({ x: 1, y: 1, z: 0 }, W, H);
    const raised = project({ x: 1, y: 1, z: 2 }, W, H);
    expect(raised.y).toBeLessThan(ground.y);
    expect(raised.x).toBe(ground.x);
  });

  it('الأبعد يُرسم أولاً', () => {
    const near = { x: 0, y: 0 };
    const far = { x: 5, y: 5 };
    expect(depthOf(far)).toBeGreaterThan(depthOf(near));
    expect(sortByDepth([near, far])[0]).toEqual(far);
  });
});

describe('الالتقاط', () => {
  const islands = [
    { id: 'a', x: 0, y: 0, radius: 40 },
    { id: 'b', x: 2, y: 0, radius: 40 },
    { id: 'c', x: 0, y: 2, radius: 40 },
  ];

  it('يلتقط مركز الجزيرة', () => {
    const c = project({ x: 2, y: 0 }, W, H);
    expect(hitTest(c, islands, W, H)).toBe('b');
  });

  it('يتجاهل النقر البعيد', () => {
    expect(hitTest({ x: 5, y: 5 }, islands, W, H)).toBeNull();
  });

  it('يفضّل الأقرب عند التداخل', () => {
    const overlapping = [
      { id: 'back', x: 0, y: 0, radius: 80 },
      { id: 'front', x: 0.4, y: 0.4, radius: 80 },
    ];
    const p = project({ x: 0.4, y: 0.4 }, W, H);
    expect(hitTest(p, overlapping, W, H)).toBe('front');
  });

  it('سقف DPR = 2', () => {
    expect(clampDpr(1)).toBe(1);
    expect(clampDpr(3.5)).toBe(2);
    expect(clampDpr(0.5)).toBe(1);
  });
});
