import {
  DEFAULT_MASTERY_RULES,
  type LearningEvidence,
  type MasteryRulesConfig,
  type Skill,
  type SkillProgressRecord,
  type SkillState,
} from "./types";

/**
 * حساب حالة المهارة الوصفية الحالية بناءً على سجل الأدلة
 * الحالات الأربع المعتمدة في دستور تكة:
 * - not_reached: لم يصل إليها بعد (لا توجد أدلة)
 * - tried: جرّب وغادر أو محاولة غير مكتملة
 * - with_help: أكمل بمساعدة تلميح
 * - independent: أظهر إتقاناً مستقلاً
 */
export function computeSkillState(
  evidences: LearningEvidence[],
): SkillState {
  if (!evidences || evidences.length === 0) {
    return "not_reached";
  }

  // فرز الأدلة زمنياً
  const sorted = [...evidences].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const lastEvidence = sorted[sorted.length - 1];

  // إذا كان آخر دليل مستقلاً
  if (lastEvidence.kind === "independent") {
    return "independent";
  }

  // إذا كان آخر دليل بمساعدة
  if (lastEvidence.kind === "with_help") {
    return "with_help";
  }

  // إذا كانت محاولة مجرد تجربة
  return "tried";
}

/**
 * تقييم إتقان المهارة التراكمي وفق معيار تكة التجريبي (فرضية عمل تحتاج اعتماداً تربوياً):
 * «تُقدّر المهارة متقنة إذا ظهرت مستقلة 3 مرات، في جلستين مختلفتين على الأقل، وبفاصل زمني لا يقل عن يوم واحد دون تلميح»
 */
export function evaluateMastery(
  evidences: LearningEvidence[],
  config: MasteryRulesConfig = DEFAULT_MASTERY_RULES,
): {
  isMastered: boolean;
  independentCount: number;
  uniqueSessions: number;
  maxGapDays: number;
} {
  const independentEvidences = evidences
    .filter((e) => e.kind === "independent")
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const independentCount = independentEvidences.length;

  if (independentCount < config.independentThreshold) {
    return {
      isMastered: false,
      independentCount,
      uniqueSessions: new Set(independentEvidences.map((e) => e.sessionId)).size,
      maxGapDays: 0,
    };
  }

  // حساب عدد الجلسات الفريدة
  const sessionIds = new Set(independentEvidences.map((e) => e.sessionId));
  const uniqueSessions = sessionIds.size;

  if (uniqueSessions < config.minSessions) {
    return {
      isMastered: false,
      independentCount,
      uniqueSessions,
      maxGapDays: 0,
    };
  }

  // حساب الفاصل الزمني بالأيام بين أول وآخر إثبات مستقل
  // يتطلب فاصلًا زمنيًا حقيقيًا لا يقل عن يوم (24 ساعة، أو يومين تقويميين بفاصل زمني معتبر ≥ 18 ساعة لمنع الإتقان الزائف عبر حدود منتصف الليل)
  const firstTime = new Date(independentEvidences[0].timestamp).getTime();
  const lastTime = new Date(independentEvidences[independentEvidences.length - 1].timestamp).getTime();
  const diffMs = Math.max(0, lastTime - firstTime);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const firstDateStr = independentEvidences[0].timestamp.slice(0, 10);
  const lastDateStr = independentEvidences[independentEvidences.length - 1].timestamp.slice(0, 10);
  const isDifferentCalendarDay = firstDateStr !== lastDateStr;
  const hasSubstantialGap = diffMs >= 18 * 60 * 60 * 1000;

  const meetsTimeGap = diffDays >= config.minGapDays || (config.minGapDays <= 1 && isDifferentCalendarDay && hasSubstantialGap);
  const isMastered = meetsTimeGap;

  return {
    isMastered,
    independentCount,
    uniqueSessions,
    maxGapDays: meetsTimeGap ? Math.max(1, diffDays) : diffDays,
  };
}

/**
 * فحص الانحدار الزمني (Decay):
 * معيار تجريبي (فرضية عمل): إذا مر 21 يوماً دون إثبات مستقل لمهارة متقنة، تقترح للمراجعة الدافئة
 */
export function checkSkillDecay(
  lastIndependentAt: string | null,
  isMastered: boolean,
  currentTimestamp = new Date().toISOString(),
  config: MasteryRulesConfig = DEFAULT_MASTERY_RULES,
): { needsReview: boolean; daysSinceLastIndependent: number; reason: string } {
  if (!lastIndependentAt || !isMastered) {
    return { needsReview: false, daysSinceLastIndependent: 0, reason: "not_mastered_yet" };
  }

  const lastTime = new Date(lastIndependentAt).getTime();
  const nowTime = new Date(currentTimestamp).getTime();
  const daysSince = Math.floor((nowTime - lastTime) / (1000 * 60 * 60 * 24));

  if (daysSince >= config.decayDays) {
    return {
      needsReview: true,
      daysSinceLastIndependent: daysSince,
      reason: `مرّت ${daysSince} يوماً على آخر تطبيق مستقل للمهارة، يفضّل مراجعة دافئة.`,
    };
  }

  return { needsReview: false, daysSinceLastIndependent: daysSince, reason: "fresh" };
}

/**
 * تلخيص تقدم مهارة واحدة
 */
export function summarizeSkillProgress(
  skillId: string,
  allEvidences: LearningEvidence[],
  config: MasteryRulesConfig = DEFAULT_MASTERY_RULES,
): SkillProgressRecord {
  const skillEvidences = allEvidences.filter((e) => e.skillId === skillId);

  if (skillEvidences.length === 0) {
    return {
      skillId,
      state: "not_reached",
      isMastered: false,
      independentCount: 0,
      assistedCount: 0,
      totalAttempts: 0,
      lastAttemptAt: "",
      lastIndependentAt: null,
      needsReview: false,
    };
  }

  const sorted = [...skillEvidences].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const state = computeSkillState(sorted);
  const mastery = evaluateMastery(sorted, config);

  const independentEvidences = sorted.filter((e) => e.kind === "independent");
  const lastIndependent = independentEvidences.length > 0
    ? independentEvidences[independentEvidences.length - 1].timestamp
    : null;

  const decay = checkSkillDecay(lastIndependent, mastery.isMastered, new Date().toISOString(), config);

  return {
    skillId,
    state,
    isMastered: mastery.isMastered,
    independentCount: mastery.independentCount,
    assistedCount: sorted.filter((e) => e.kind === "with_help").length,
    totalAttempts: sorted.length,
    lastAttemptAt: sorted[sorted.length - 1].timestamp,
    lastIndependentAt: lastIndependent,
    needsReview: decay.needsReview,
  };
}

/**
 * تلخيص تقدم كافة المهارات
 */
export function summarizeAllSkills(
  skills: Skill[],
  allEvidences: LearningEvidence[],
  config: MasteryRulesConfig = DEFAULT_MASTERY_RULES,
): Record<string, SkillProgressRecord> {
  const summary: Record<string, SkillProgressRecord> = {};
  for (const skill of skills) {
    summary[skill.id] = summarizeSkillProgress(skill.id, allEvidences, config);
  }
  return summary;
}
