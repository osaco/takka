import type { EvidenceKind } from '../types';
import {
  createScaffold,
  evidenceKindFor,
  registerCorrect,
  registerWrong,
  type ScaffoldLevel,
  type ScaffoldState,
} from './levels';

export interface AttemptOutcome {
  scaffold: ScaffoldState;
  /** نوع الدليل الذي يُسجَّل عند النجاح. */
  evidenceKind: EvidenceKind;
  /** هل نال الطفل مساعدة في هذه المحاولة؟ */
  helped: boolean;
}

/**
 * آلة حالة المحاولة: تُستدعى من الواجهة، لكنها نقية وقابلة للاختبار.
 */
export function beginAttempt(firstEncounter = false): AttemptOutcome {
  return {
    scaffold: createScaffold(firstEncounter),
    evidenceKind: 'exposed_only',
    helped: firstEncounter,
  };
}

export function submitAttempt(
  scaffold: ScaffoldState,
  correct: boolean,
  opts: { requestedHint?: boolean } = {},
): AttemptOutcome {
  if (!correct) {
    const next = registerWrong(scaffold);
    return { scaffold: next, evidenceKind: 'exposed_only', helped: true };
  }

  const requestedHint = opts.requestedHint === true;
  const effectiveLevel = (requestedHint
    ? Math.max(2, scaffold.level)
    : scaffold.level) as ScaffoldLevel;

  const kind = evidenceKindFor(effectiveLevel);
  const next = registerCorrect(scaffold, kind === 'independent');

  return { scaffold: next, evidenceKind: kind, helped: kind !== 'independent' };
}

/** تلميح الطلب اليدوي لا يزيد الدرجة، لكنه يمنع وسم النجاح «مستقلاً». */
export function markHintRequested(scaffold: ScaffoldState): ScaffoldState {
  return { ...scaffold, level: Math.max(2, scaffold.level) as ScaffoldLevel };
}
