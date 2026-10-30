import type { BuildingKey } from "@/lib/types";
export type { BuildingKey };

/**
 * معرفات المباحث في تكة
 */
export type SubjectId = "arabic" | "math" | "stories" | "science" | "civic";

/**
 * مستويات الصفوف (1-6)
 */
export type Grade = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * مرجع التوثيق للمحتوى (رزم غزة / تأسيس محايد)
 */
export interface SourceRef {
  kind: "pack" | "foundational_neutral" | "curriculum_index";
  file?: string;
  page?: number;
  unit?: string;
  edition?: string;
  note?: string;
}

/**
 * تعريف المهارة التعليمية المستقلة
 */
export interface Skill {
  id: string;
  grade: Grade;
  subject: SubjectId;
  title: string;
  description: string;
  prerequisites: string[];
  sourceRef: SourceRef;
  createdAt: string;
}

/**
 * حالات تقدم المهارة الأربع المعتمدة في دستور تكة
 * 1. not_reached: لم يصل إليها بعد
 * 2. tried: جرّب (تفاعل مع النشاط أو خرج دون إكماله)
 * 3. with_help: أكمل بمساعدة (استعان بتلميح أو سقالة من فطين)
 * 4. independent: أظهر إتقاناً مستقلاً في المحاولة
 */
export type SkillState = "not_reached" | "tried" | "with_help" | "independent";

/**
 * نوع الدليل التعليمي الناتج عن محاولة النشاط
 */
export type EvidenceKind = "independent" | "with_help" | "abandoned";

/**
 * سجل دليل تعلّم مستقل
 */
export interface LearningEvidence {
  id: string;
  skillId: string;
  activityId: string;
  timestamp: string;
  kind: EvidenceKind;
  attemptsCount: number;
  helpUsed: boolean;
  durationMs: number;
  sessionId: string;
}

/**
 * حالة المهارة التراكمية لدى الطفل
 */
export interface SkillProgressRecord {
  skillId: string;
  state: SkillState;
  isMastered: boolean;
  independentCount: number;
  assistedCount: number;
  totalAttempts: number;
  lastAttemptAt: string;
  lastIndependentAt: string | null;
  needsReview: boolean;
}

/**
 * درجات السقالات الأربع المعتمدة
 */
export type ScaffoldLevel = 1 | 2 | 3 | 4;

export interface ScaffoldStep {
  level: ScaffoldLevel;
  type: "model" | "visual_cue" | "verbal_hint" | "simplify";
  text: string;
}

/**
 * بنية سؤال النشاط
 */
export interface ActivityQuestion {
  prompt: string;
  choices: string[];
  answer: string;
  object?: string;
  hint?: string;
  scaffolds?: ScaffoldStep[];
}

/**
 * مكافأة النشاط الثابتة
 */
export interface ActivityReward {
  stars: number;
  planks: number;
  itemKey: string;
  itemId: string;
}

/**
 * أنواع قوالب الأنشطة التعليمية المعتمدة في تكة (المرحلة P3)
 */
export type ActivityTemplateType =
  | "multiple_choice"
  | "drag_match"
  | "trace_path"
  | "listen_identify";

/**
 * إعدادات قالب سحب ومطابقة (DragMatch)
 */
export interface DragMatchPair {
  draggable: {
    id: string;
    label: string;
    char?: string;
    image?: string;
  };
  target: {
    id: string;
    label: string;
    char?: string;
    image?: string;
  };
}

export interface DragMatchConfig {
  prompt: string;
  pairs: DragMatchPair[];
  shuffleTargets?: boolean;
  hint?: string;
  scaffolds?: ScaffoldStep[];
}

/**
 * إعدادات قالب تتبع المسارات (TracePath)
 */
export interface TraceCheckpoint {
  x: number;
  y: number;
  label?: string;
}

export interface TracePathConfig {
  prompt: string;
  character: string;
  strokePath: string; // صيغة مسار SVG d
  checkpoints: TraceCheckpoint[];
  guideOpacity?: number;
  minStrokeLength?: number;
  hint?: string;
  scaffolds?: ScaffoldStep[];
}

/**
 * إعدادات قالب الاستماع والتمييز (ListenIdentify)
 */
export interface ListenOption {
  id: string;
  label: string;
  char?: string;
  image?: string;
  correct: boolean;
}

export interface ListenIdentifyConfig {
  prompt: string;
  audioText: string;
  audioFile?: string;
  options: ListenOption[];
  hint?: string;
  scaffolds?: ScaffoldStep[];
}

/**
 * الحقول المشتركة لجميع الأنشطة
 */
export interface BaseActivity {
  id: string;
  activityId: string;
  skillId: string;
  buildingKey: BuildingKey;
  building: BuildingKey;
  title: string;
  subtitle: string;
  icon: string;
  theme: "green" | "apricot" | "blue";
  questions: ActivityQuestion[];
  reward: ActivityReward;
  sourceRef: SourceRef;
  version: number;
  template?: ActivityTemplateType;
}

export interface MultipleChoiceActivity extends BaseActivity {
  template?: "multiple_choice";
}

export interface DragMatchActivity extends BaseActivity {
  template: "drag_match";
  config: DragMatchConfig;
}

export interface TracePathActivity extends BaseActivity {
  template: "trace_path";
  config: TracePathConfig;
}

export interface ListenIdentifyActivity extends BaseActivity {
  template: "listen_identify";
  config: ListenIdentifyConfig;
}

/**
 * تعريف النشاط التعليمي بنمط discriminated union
 */
export type Activity =
  | MultipleChoiceActivity
  | DragMatchActivity
  | TracePathActivity
  | ListenIdentifyActivity;

/**
 * حالة مراجعة حزمة المحتوى
 * - unreviewed_neutral_sample: عينة محايدة أولية غير خاضعة لمراجعة تربوية بشرية
 * - pending_review: قيد المراجعة التربوية البشرية
 * - pedagogical_reviewed: خضعت لمراجعة بشرية متخصصة وموثقة
 */
export type ContentPackReviewStatus =
  | "unreviewed_neutral_sample"
  | "pending_review"
  | "pedagogical_reviewed";

/**
 * حزمة محتوى تكة المتكاملة
 */
export interface ContentPack {
  id: string;
  version: string;
  grade: Grade;
  title: string;
  description: string;
  reviewStatus: ContentPackReviewStatus;
  reviewNotes?: string;
  isMultiSubject: boolean;
  subjects: SubjectId[];
  skills: Skill[];
  activities: Activity[];
  createdAt: string;
}

/**
 * نتيجة تقييم إنهاء النشاط
 */
export interface ActivityCompletionInput {
  activityId: string;
  skillId: string;
  helpUsed: boolean;
  startedAt: string;
  completedAt: string;
  answers: string[];
  stepAttempts: number[];
  sessionId?: string;
}

/**
 * معايير الإتقان التجريبية (فرضيات عمل وتقديرات أولية تحتاج اعتماداً تربوياً):
 * - 3 أدلة مستقلة في جلستين مختلفتين على الأقل بفاصل زمني لا يقل عن يوم واحد
 * - عتبات الإتقان وجداول المراجعة والانحدار (مثل 21 يوماً) هي تقديرات وفرضيات للمشروع وليست حقائق تربوية معتمدة
 */
export interface MasteryRulesConfig {
  independentThreshold: number; // 3
  minSessions: number;          // 2
  minGapDays: number;           // 1
  decayDays: number;            // 21
}

export const DEFAULT_MASTERY_RULES: MasteryRulesConfig = {
  independentThreshold: 3,
  minSessions: 2,
  minGapDays: 1,
  decayDays: 21,
};
