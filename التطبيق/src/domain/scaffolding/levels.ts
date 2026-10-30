import type { EvidenceKind } from '../types';

/**
 * درجات السقالات الأربع (قرار الوثيقة 10 §6.3، والوثيقة 11 §7.4).
 * 0 = بلا سقالة (تحقق مستقل).
 */
export type ScaffoldLevel = 0 | 1 | 2 | 3 | 4;

export const SCAFFOLD_LABELS: Record<ScaffoldLevel, string> = {
  0: 'بلا مساعدة',
  1: 'نمذجة كاملة',
  2: 'توجيه بصري',
  3: 'تلميح نصي',
  4: 'تبسيط المهمة',
};

export interface ScaffoldState {
  level: ScaffoldLevel;
  wrongStreak: number;
  successStreak: number;
  /** هل هذا أول لقاء بالمهارة؟ */
  firstEncounter: boolean;
}

export function createScaffold(firstEncounter = false): ScaffoldState {
  return {
    level: firstEncounter ? 1 : 0,
    wrongStreak: 0,
    successStreak: 0,
    firstEncounter,
  };
}

const clampLevel = (n: number): ScaffoldLevel =>
  Math.max(0, Math.min(4, n)) as ScaffoldLevel;

/**
 * خطأ واحد ← توجيه بصري (2)، خطآن ← تلميح (3)، ثلاثة ← تبسيط (4).
 * لا نمنع المحاولة، ولا ننقص شيئاً، ولا نُظهر «فشلاً».
 */
export function registerWrong(state: ScaffoldState): ScaffoldState {
  const wrongStreak = state.wrongStreak + 1;
  return {
    ...state,
    wrongStreak,
    successStreak: 0,
    level: clampLevel(Math.max(state.level, 1 + wrongStreak)),
  };
}

/**
 * التلاشي: نجاحان مستقلان متتاليان يخفضان درجة واحدة.
 * النجاح بمساعدة لا يخفض الدرجة (يحافظ على الدعم).
 */
export function registerCorrect(
  state: ScaffoldState,
  independent: boolean,
): ScaffoldState {
  if (!independent) {
    return { ...state, wrongStreak: 0, successStreak: 0 };
  }
  const successStreak = state.successStreak + 1;
  const level =
    successStreak >= 2 ? clampLevel(state.level - 1) : state.level;
  return {
    ...state,
    wrongStreak: 0,
    successStreak: successStreak >= 2 ? 0 : successStreak,
    level,
  };
}

/**
 * نوع الدليل يُشتق من درجة السقالة الفعلية عند لحظة النجاح.
 * درجة 0 = مستقل. 1–2 = بتلميح. 3–4 = بسقالة.
 */
export function evidenceKindFor(level: ScaffoldLevel): EvidenceKind {
  if (level === 0) return 'independent';
  if (level <= 2) return 'with_hint';
  return 'with_scaffold';
}

/** هل يُسمح بعرض زر التلميح في هذه المرحلة؟ */
export function hintAllowed(phaseAllowsHints: boolean, level: ScaffoldLevel): boolean {
  return phaseAllowsHints && level < 4;
}
