import type { SessionPhase, SessionRecord } from '../types';

export interface EndSessionInput {
  sessionId: string;
  profileId: string;
  grade: SessionRecord['grade'];
  startedAt: number;
  now: number;
  targetSkillId: string | null;
  phaseReached: SessionPhase;
  attempts: number;
  correct: number;
  hints: number;
  activityIds: string[];
  stoppedByChild: boolean;
}

/**
 * إنهاء الجلسة: يُسجَّل دائماً، سواء أكمل الطفل أو قال «نوقف هون».
 * الخروج ليس فشلاً؛ `completed` تصف المسار لا قيمة الطفل.
 */
export function endSession(input: EndSessionInput): SessionRecord {
  return {
    id: input.sessionId,
    profileId: input.profileId,
    grade: input.grade,
    startedAt: input.startedAt,
    endedAt: input.now,
    targetSkillId: input.targetSkillId,
    phaseReached: input.phaseReached,
    completed: input.phaseReached === 'close' || input.phaseReached === 'feedback',
    stoppedByChild: input.stoppedByChild,
    attempts: input.attempts,
    correct: input.correct,
    hints: input.hints,
    durationMs: Math.max(0, input.now - input.startedAt),
    activityIds: input.activityIds,
  };
}

/** جملة الإغلاق الآمن — بلا شرط ولا خسارة. */
export function closingMessage(stoppedByChild: boolean, masteredNow: number): string {
  if (stoppedByChild) return 'توقفنا بهدوء. كل ما تعلّمته محفوظ، والجزيرة تنتظرك.';
  if (masteredNow > 0) return 'أتقنت خطوة جديدة، والجزيرة ازدهرت قليلاً.';
  return 'أنهيت تكتك اليوم. الخطوة القادمة تكون عندما تحب.';
}
