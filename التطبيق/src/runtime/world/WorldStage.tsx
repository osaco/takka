import { useEffect, useRef } from 'react';
import { theme } from '../design/theme';
import { readDeviceCaps, shouldDegrade } from './degraded-mode';
import {
  allCells,
  buildingAtPoint,
  buildingCenter,
  computeGridMetrics,
  motionProfile,
  prefersReducedMotionNow,
  type GridBuilding,
} from './grid-layout';

export type WorldBuilding = GridBuilding;

interface Props {
  buildings: readonly WorldBuilding[];
  width?: number;
  height?: number;
  onPick?: (id: string) => void;
  onExplain?: (id: string) => void;
  degraded?: boolean;
  reducedMotion?: boolean;
}

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 10;

/**
 * مسرح الجزيرة — شبكة 12×12 هادئة على Canvas 2D.
 * المباني الآن مربعات رمادية مؤقتة بلا تفاعلات متقدمة؛
 * كل نص عربي يبقى في DOM فوق الـCanvas، والشبكة لا تُعكس تحت RTL.
 */
export function WorldStage({
  buildings,
  width = 640,
  height = 420,
  onPick,
  onExplain,
  degraded,
  reducedMotion,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pressRef = useRef<{ id: string; x: number; y: number; timer: number } | null>(null);
  const low = degraded ?? shouldDegrade(readDeviceCaps());
  const reduced = reducedMotion ?? prefersReducedMotionNow();

  const cancelPress = (): void => {
    if (!pressRef.current) return;
    window.clearTimeout(pressRef.current.timer);
    pressRef.current = null;
  };

  useEffect(() => cancelPress, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(Math.max(1, window.devicePixelRatio || 1), 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const metrics = computeGridMetrics(width, height);
    const motion = motionProfile(reduced || low);

    ctx.fillStyle = theme.color.paper;
    ctx.fillRect(0, 0, width, height);

    // أرض الجزيرة: مستطيل دافئ يحدّ الشبكة
    ctx.fillStyle = theme.color.sand;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(
      metrics.originX - metrics.padding,
      metrics.originY - metrics.padding,
      metrics.contentWidth + metrics.padding * 2,
      metrics.contentHeight + metrics.padding * 2,
    );
    ctx.globalAlpha = 1;

    // خطوط الشبكة — ساكنة تماماً، بلا حركة خلفية
    ctx.strokeStyle = 'rgba(23,63,56,0.10)';
    ctx.lineWidth = 1;
    for (const cell of allCells(metrics)) {
      ctx.strokeRect(cell.x + 0.5, cell.y + 0.5, cell.size, cell.size);
    }

    for (const building of buildings) {
      const locked = building.revealed === false;
      const center = buildingCenter(building, metrics);
      const size = Math.max(8, metrics.cellSize - 2);
      const x = center.x - size / 2;
      const y = center.y - size / 2;

      // هالة خضراء هادئة للمباني المفتوحة فقط — تُحذف عند تقليل الحركة
      if (motion.animate && !locked) {
        ctx.fillStyle = 'rgba(123,175,139,0.18)';
        ctx.beginPath();
        ctx.arc(center.x, center.y, size * 0.72, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = locked ? 0.4 : 1;
      ctx.fillStyle = locked ? theme.color.card : theme.color.fog;
      ctx.strokeStyle = theme.color.ink;
      ctx.lineWidth = 1.5;
      roundRect(ctx, x, y, size, size, Math.min(6, size / 4));
      ctx.fill();
      ctx.stroke();

      if (locked) {
        drawPadlock(ctx, center.x, center.y, size);
      } else {
        ctx.fillStyle = theme.color.journey;
        ctx.beginPath();
        ctx.arc(center.x, center.y, Math.max(1.5, size / 10), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }
  }, [buildings, width, height, low, reduced]);

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={ref}
        width={width}
        height={height}
        style={{ width: '100%', height: 'auto', borderRadius: 24, display: 'block', touchAction: 'manipulation' }}
        role="img"
        aria-label="جزيرة تكة — شبكة اثني عشر في اثني عشر"
        onPointerDown={(e) => {
          if (!onExplain) return;
          const hit = hitFromEvent(e);
          if (!hit || hit.revealed !== false) return;

          pressRef.current = {
            id: hit.id,
            x: e.clientX,
            y: e.clientY,
            timer: window.setTimeout(() => {
              pressRef.current = null;
              onExplain(hit.id);
            }, LONG_PRESS_MS),
          };
        }}
        onPointerMove={(e) => {
          const press = pressRef.current;
          if (!press) return;
          if (Math.abs(e.clientX - press.x) > MOVE_CANCEL_PX || Math.abs(e.clientY - press.y) > MOVE_CANCEL_PX) {
            window.clearTimeout(press.timer);
            pressRef.current = null;
          }
        }}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onClick={(e) => {
          if (!onPick) return;
          const hit = hitFromEvent(e);
          if (hit && hit.revealed !== false) onPick(hit.id);
        }}
      />
    </div>
  );

  function hitFromEvent(e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const py = ((e.clientY - rect.top) / rect.height) * height;
    const metrics = computeGridMetrics(width, height);
    return buildingAtPoint({ x: px, y: py }, buildings, metrics);
  }
}

function drawPadlock(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const bodyW = Math.max(6, size * 0.34);
  const bodyH = Math.max(5, size * 0.26);
  const x = cx - bodyW / 2;
  const y = cy - bodyH / 2 + size * 0.06;

  ctx.strokeStyle = theme.color.ink;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(cx, y, bodyW * 0.32, Math.PI, 0);
  ctx.stroke();

  ctx.fillStyle = theme.color.ink;
  roundRect(ctx, x, y, bodyW, bodyH, 1.5);
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
