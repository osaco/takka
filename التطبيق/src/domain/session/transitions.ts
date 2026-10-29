import type { SessionPhase, SessionPhaseSpec, SessionPlan } from '../types';

/**
 * الانتقالات مسموحة دائماً، بما فيها الخروج.
 * لا يوجد «فشل» في أي انتقال؛ الخروج في أي لحظة سلوك مقبول.
 */
export function nextIndex(plan: SessionPlan, current: number): number {
  return Math.min(current + 1, plan.phases.length - 1);
}

export function canAdvance(phase: SessionPhaseSpec): boolean {
  return phase.phase !== 'close';
}

export function nextPhaseOf(
  plan: SessionPlan,
  currentPhase: SessionPhase,
): SessionPhase | null {
  const idx = plan.phases.findIndex((p) => p.phase === currentPhase);
  if (idx < 0) return null;
  return plan.phases[idx + 1]?.phase ?? null;
}

/** تسمية قصيرة تُعرض في شريط الحالة، بلا أرقام مخيفة. */
export function progressLabel(plan: SessionPlan, index: number): string {
  return `خطوة ${index + 1} من ${plan.phases.length}`;
}
