import type {
  ActivityCompletionInput,
  ActivityQuestion,
  LearningEvidence,
} from "./types";

export interface ActivityDraftState {
  activityId: string;
  childId: string;
  step: number;
  helpUsed: boolean;
  startedAt: string;
  answers: string[];
  attemptsPerStep: number[];
  selectedChoice: string | null;
  updatedAt: string;
}

/**
 * مفتاح تخزين مسودة النشاط المحلي
 */
export function buildDraftStorageKey(childId: string, activityId: string): string {
  return `takka.draft.v1.${childId}.${activityId}`;
}

/**
 * المفتاح القديم للمسودات لضمان التوافق
 */
export function buildLegacyDraftKey(childId: string): string {
  return `takka.draft.v1.${childId}`;
}

/**
 * تحديد تلميح السقالة المناسب بناءً على عدد المحاولات غير الصحيحة
 * وفق درجات السقالات:
 * - 0 أو 1 خطأ: التلميح الأولي / توجيه بصري
 * - خطآن: تلميح نصي بالخطوة التالية
 * - 3 أخطاء فأكثر: تبسيط الفكرة
 */
export function resolveScaffoldHint(
  question: ActivityQuestion,
  wrongAttemptsCount = 0,
): string {
  if (question.scaffolds && question.scaffolds.length > 0) {
    if (wrongAttemptsCount >= 3) {
      const simplify = question.scaffolds.find((s) => s.type === "simplify");
      if (simplify) return simplify.text;
    }
    if (wrongAttemptsCount >= 2) {
      const verbal = question.scaffolds.find((s) => s.type === "verbal_hint");
      if (verbal) return verbal.text;
    }
    const cue = question.scaffolds.find((s) => s.type === "visual_cue" || s.type === "model");
    if (cue) return cue.text;
  }

  return question.hint ?? "لاحظ المثال بهدوء، ثم جرّب على راحتك.";
}

/**
 * إنشاء دليل التعلم من محاولة مكتملة
 */
export function createLearningEvidenceFromCompletion(
  input: ActivityCompletionInput,
): LearningEvidence {
  const totalAttempts = input.stepAttempts.reduce((sum, count) => sum + count, 0);
  const startedTime = new Date(input.startedAt).getTime();
  const completedTime = new Date(input.completedAt).getTime();
  const durationMs = Math.max(0, completedTime - startedTime);

  // معرّف فريد لجلسة الاستخدام الفعلية، لا يشتق من مجرد تاريخ اليوم
  const sessionId =
    input.sessionId ??
    `session-auto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    skillId: input.skillId,
    activityId: input.activityId,
    timestamp: input.completedAt,
    kind: input.helpUsed ? "with_help" : "independent",
    attemptsCount: Math.max(input.stepAttempts.length, totalAttempts),
    helpUsed: input.helpUsed,
    durationMs,
    sessionId,
  };
}
