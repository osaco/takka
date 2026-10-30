import { describe, expect, it } from 'vitest';
import { coverageRatio, samplePath, thin } from '../../src/runtime/templates/measure';

/** مسار حرف الراء المستخدم في حزمة العربية. */
const RA_PATH = 'M 158 58 C 158 104 136 140 86 152';

describe('samplePath', () => {
  it('يبدأ من نقطة M نفسها', () => {
    const points = samplePath('M 10 20 C 10 40 30 50 50 60', 4);
    expect(points[0]).toEqual({ x: 10, y: 20 });
  });

  it('ينتهي عند نقطة نهاية المنحنى', () => {
    const points = samplePath('M 0 0 C 0 10 10 10 20 20', 4);
    expect(points[points.length - 1]).toEqual({ x: 20, y: 20 });
  });

  it('يدعم الخطوط المستقيمة أيضاً', () => {
    const points = samplePath('M 0 0 L 10 0', 10);
    expect(points.length).toBe(11);
    expect(points[points.length - 1]).toEqual({ x: 10, y: 0 });
  });

  it('يعطي عيّنات على المسار الحقيقي لا خارجه', () => {
    const points = samplePath(RA_PATH, 12);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(86);
      expect(p.x).toBeLessThanOrEqual(158);
      expect(p.y).toBeGreaterThanOrEqual(58);
      expect(p.y).toBeLessThanOrEqual(152);
    }
  });
});

describe('coverageRatio', () => {
  it('صفر عند عدم الرسم', () => {
    const samples = samplePath(RA_PATH);
    expect(coverageRatio(samples, [], 30)).toBe(0);
    expect(coverageRatio([], [{ x: 1, y: 1 }], 30)).toBe(0);
  });

  it('واحد عند المرور على كل العيّنات داخل التسامح', () => {
    const samples = samplePath(RA_PATH, 20);
    const ratio = coverageRatio(samples, samples, 0.5);
    expect(ratio).toBe(1);
  });

  it('يقيّم المسار الناقص جزئياً — لا يُقبل ولا يُرفض اعتباطاً', () => {
    const samples = samplePath(RA_PATH, 30);
    const half = samples.slice(0, Math.floor(samples.length / 2));
    const ratio = coverageRatio(samples, half, 10);

    // النصف الأول مغطّى والنصف الآخر لا — نتحقق من حدّ واضح.
    expect(ratio).toBeGreaterThanOrEqual(0.4);
    expect(ratio).toBeLessThanOrEqual(0.6);
  });

  it('التسامح الأوسع لا يُنقص النسبة أبداً ويصل إلى القبول', () => {
    const samples = samplePath(RA_PATH, 24);
    const wobbling = samples.map((p) => ({ x: p.x + 18, y: p.y - 14 }));
    const strict = coverageRatio(samples, wobbling, 12);
    const wide = coverageRatio(samples, wobbling, 30);
    expect(wide).toBeGreaterThanOrEqual(strict);
    expect(wide).toBe(1);
    expect(strict).toBeLessThan(1);
  });
});

describe('thin', () => {
  it('يدمج النقاط المتراكمة ويُبقي النقاط المتباعدة', () => {
    const dense = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 40, y: 0 },
    ];
    const out = thin(dense, 5);
    expect(out).toEqual([
      { x: 0, y: 0 },
      { x: 40, y: 0 },
    ]);
  });

  it('لا يفقد نقطة البداية أبداً', () => {
    const out = thin([{ x: 5, y: 5 }], 10);
    expect(out).toEqual([{ x: 5, y: 5 }]);
  });
});
