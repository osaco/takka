/**
 * تكة — الصوت: تعليمات وتغذية راجعة بأصوات دافئة
 * القواعد: اختياري دائماً، لا معلومة حصراً بالصوت، لا تشغيل تلقائي.
 * Web Audio محلي بلا مكتبة — Howler تُضاف عند الحاجة الفعلية فقط.
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** نغمة خشبية دافئة قصيرة — نجاح. */
export function playSuccess(enabled: boolean): void {
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  for (const [i, f] of [523.25, 659.25, 783.99].entries()) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.0001, t + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.25, t + i * 0.12 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.35);
    osc.connect(gain).connect(ac.destination);
    osc.start(t + i * 0.12);
    osc.stop(t + i * 0.12 + 0.4);
  }
}

/** همسة تشجيع — إعادة المحاولة بلا صوت خطأ. */
export function playRetry(enabled: boolean): void {
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(392, t);
  osc.frequency.linearRampToValueAtTime(523.25, t + 0.18);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.18, t + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.35);
}
