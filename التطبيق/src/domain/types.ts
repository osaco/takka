/**
 * تكة — الأنواع الأساسية (Domain Types)
 *
 * هذا الملف نقيّ: لا يستورد React ولا Canvas ولا Dexie.
 * كل الطبقات الأخرى تعتمد على هذه الأنواع، ولا تعتمد هي على أي منها.
 */

// ---------------------------------------------------------------------------
// الهوية الأكاديمية
// ---------------------------------------------------------------------------

export type Grade = 1 | 2 | 3 | 4 | 5 | 6;

export type SubjectId = 'arabic' | 'math' | 'english' | 'civic' | 'science';

export const SUBJECT_LABELS: Record<SubjectId, string> = {
  arabic: 'العربية',
  math: 'الرياضيات',
  english: 'الإنجليزية',
  civic: 'الوطنية والحياتية',
  science: 'العلوم',
};

export type TemplateId = 'drag_match' | 'trace_path' | 'listen_identify' | 'balance';

/** المصيّر المسؤول عن كل قالب. Phaser مؤجّل حسب قرار الوثيقة 10. */
export type RendererKind = 'dom' | 'svg' | 'canvas2d' | 'phaser';

// ---------------------------------------------------------------------------
// المصدر والتدقيق — بوابة الجودة
// ---------------------------------------------------------------------------

export type SourceKind = 'pack' | 'curriculum-index' | 'foundational';

export interface SourceRef {
  kind: SourceKind;
  /** اسم الملف الرسمي كما هو، لا نسخة معاد تسميتها. */
  file?: string;
  unit?: string;
  page?: number;
  edition?: string;
  /** ملاحظة تدقيق شفافة، مثل: «الصفحة تُثبَّت بعد المراجعة البصرية». */
  note?: string;
}

export type AuditStatus = 'draft' | 'internal_reviewed' | 'expert_reviewed' | 'rejected';

export interface AuditRef {
  status: AuditStatus;
  reviewedAt: string;
  reviewer?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// المهارة والجزيرة
// ---------------------------------------------------------------------------

export interface Skill {
  /** معرّف ثابت لا يعتمد على ترقيم الدروس: g1.ar.letter.ra.recognize */
  id: string;
  grade: Grade;
  subject: SubjectId;
  islandId: string;
  title: string;
  /** رسم بياني، لا قائمة مسطّحة. */
  prerequisites: string[];
  sourceRef: SourceRef;
  /** ترتيب العرض داخل الجزيرة. */
  order?: number;
}

export interface Island {
  id: string;
  title: string;
  subject: SubjectId;
  description?: string;
}

export type IslandMood = 'sleeping' | 'awakening' | 'blooming';

// ---------------------------------------------------------------------------
// الأدلة والإتقان
// ---------------------------------------------------------------------------

export type EvidenceKind = 'independent' | 'with_hint' | 'with_scaffold' | 'exposed_only';

export type SkillState = 'not_reached' | 'tried' | 'with_help' | 'independent';

export const SKILL_STATE_LABELS: Record<SkillState, string> = {
  not_reached: 'لم نصل إليها بعد',
  tried: 'جرّب',
  with_help: 'أكمل بمساعدة',
  independent: 'أظهر إتقاناً مستقلاً',
};

export interface Evidence {
  id: string;
  profileId: string;
  skillId: string;
  sessionId: string;
  /** epoch ms — وقت محلي على الجهاز. */
  at: number;
  kind: EvidenceKind;
  templateId: TemplateId;
  itemId: string;
  attempts: number;
  durationMs: number;
}

export interface SkillMastery {
  skillId: string;
  /** أعلى دليل وصل إليه الطفل (وليس «درجة»). */
  state: SkillState;
  independentCount: number;
  independentSessions: number;
  independentDays: number;
  firstIndependentAt: number | null;
  lastIndependentAt: number | null;
  /** تحقق قاعدة الإتقان الثلاثية. */
  mastered: boolean;
  /** 21 يوماً بلا دليل مستقل ⇒ «تحتاج مراجعة» في الاقتراح فقط. */
  needsReview: boolean;
}

export interface MasteryRule {
  independentRequired: number;
  distinctSessionsRequired: number;
  distinctDaysRequired: number;
  minSpanMs: number;
  decayAfterMs: number;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_MASTERY_RULE: MasteryRule = {
  independentRequired: 3,
  distinctSessionsRequired: 2,
  distinctDaysRequired: 2,
  minSpanMs: DAY_MS,
  decayAfterMs: 21 * DAY_MS,
};

// ---------------------------------------------------------------------------
// الجلسة — «تكة واحدة»
// ---------------------------------------------------------------------------

export type SessionPhase =
  | 'activate'
  | 'model'
  | 'guided'
  | 'fluency'
  | 'transfer'
  | 'check'
  | 'feedback'
  | 'close';

export const PHASE_LABELS: Record<SessionPhase, string> = {
  activate: 'تنشيط',
  model: 'نشاهد معاً',
  guided: 'نجرّب معاً',
  fluency: 'جولة سريعة',
  transfer: 'نطبّق في الجزيرة',
  check: 'أنت وحدك',
  feedback: 'نفهم النتيجة',
  close: 'ننهي بهدوء',
};

export interface SessionPhaseSpec {
  phase: SessionPhase;
  minutes: number;
  interactions: number;
  skillId: string | null;
  allowHints: boolean;
}

export interface SessionPlan {
  id: string;
  profileId: string;
  grade: Grade;
  createdAt: number;
  targetSkillId: string | null;
  reviewSkillIds: string[];
  phases: SessionPhaseSpec[];
  totalMinutes: number;
  totalInteractions: number;
  seed: number;
}

export interface SessionRecord {
  id: string;
  profileId: string;
  grade: Grade;
  startedAt: number;
  endedAt: number;
  targetSkillId: string | null;
  phaseReached: SessionPhase;
  completed: boolean;
  /** خرَج بزر «نوقف هون» — نجاح، لا فشل. */
  stoppedByChild: boolean;
  attempts: number;
  correct: number;
  hints: number;
  durationMs: number;
  activityIds: string[];
}

// ---------------------------------------------------------------------------
// الملف الرمزي — بلا هوية
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  /** لقب رمزي محلي فقط. لا اسم حقيقي. */
  nickname: string;
  grade: Grade;
  audioEnabled: boolean;
  reducedMotion: boolean;
  createdAt: number;
  schemaVersion: number;
}

export const PROFILE_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// البلاغ المحلي
// ---------------------------------------------------------------------------

export interface LocalReport {
  id: string;
  profileId: string;
  activityId: string;
  message: string;
  createdAt: number;
  /** لا يُرسل تلقائياً. يبقى على الجهاز حتى يقرّر ولي الأمر تصديره. */
  exported: boolean;
}
