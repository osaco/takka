/**
 * قياس أثر الإصبع على المسار — دوال نقية بلا DOM، مغطاة باختبارات.
 * المحتوى يستخدم M / L / C فقط، فلا حاجة إلى محلّل SVG كامل.
 */

export interface Point {
  x: number;
  y: number;
}

interface Token {
  cmd: string;
  nums: number[];
}

function tokenize(d: string): Token[] {
  const tokens: Token[] = [];
  const re = /([MLCmlcZz])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi;
  let match: RegExpExecArray | null;
  let current: Token | null = null;
  while ((match = re.exec(d)) !== null) {
    const [, cmd, num] = match;
    if (cmd) {
      current = { cmd: cmd.toUpperCase(), nums: [] };
      tokens.push(current);
    } else if (current && num !== undefined) {
      current.nums.push(Number(num));
    }
  }
  return tokens;
}

function cubicAt(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const e = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + e * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + e * p3.y,
  };
}

/** نقاط متساوية التقارب على طول المسار — لأخذ عيّنات قابلة للمقارنة. */
export function samplePath(d: string, perSegment = 16): Point[] {
  const tokens = tokenize(d);
  const points: Point[] = [];
  let cursor: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };

  for (const token of tokens) {
    const n = token.nums;
    if (token.cmd === 'M' && n.length >= 2) {
      cursor = { x: n[0] as number, y: n[1] as number };
      start = cursor;
      points.push(cursor);
    } else if (token.cmd === 'L' && n.length >= 2) {
      const to = { x: n[0] as number, y: n[1] as number };
      for (let i = 1; i <= perSegment; i += 1) {
        const t = i / perSegment;
        points.push({ x: cursor.x + (to.x - cursor.x) * t, y: cursor.y + (to.y - cursor.y) * t });
      }
      cursor = to;
    } else if (token.cmd === 'C' && n.length >= 6) {
      const p1 = { x: n[0] as number, y: n[1] as number };
      const p2 = { x: n[2] as number, y: n[3] as number };
      const p3 = { x: n[4] as number, y: n[5] as number };
      for (let i = 1; i <= perSegment; i += 1) {
        points.push(cubicAt(cursor, p1, p2, p3, i / perSegment));
      }
      cursor = p3;
    } else if (token.cmd === 'Z') {
      points.push(start);
      cursor = start;
    }
  }

  return points;
}

/** هل مرّ الإصبع قريباً من هذه النقطة؟ */
function near(a: Point, drawn: readonly Point[], tolerance: number): boolean {
  const t2 = tolerance * tolerance;
  for (const p of drawn) {
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    if (dx * dx + dy * dy <= t2) return true;
  }
  return false;
}

/**
 * نسبة تغطية المسار. الوثيقة 04 تشترط 70% على الأقل.
 * تُقاس على العيّنات لا على طول الإصبع، فالسرعة لا تُعاقب.
 */
export function coverageRatio(
  samples: readonly Point[],
  drawn: readonly Point[],
  tolerance: number,
): number {
  if (samples.length === 0) return 0;
  if (drawn.length === 0) return 0;
  let covered = 0;
  for (const sample of samples) {
    if (near(sample, drawn, tolerance)) covered += 1;
  }
  return covered / samples.length;
}

/** تبسيط الأثر: نُبقي نقطة كل مسافة دنيا، فلا نُثقّل الحساب بإصبع بطيء. */
export function thin(points: readonly Point[], minDistance = 4): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= minDistance) out.push(p);
  }
  return out;
}
