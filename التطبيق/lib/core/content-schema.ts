import { z } from "zod";

/**
 * مخططات Zod لمحتوى تكة
 * متطابقة تماماً مع الأنواع المعرفة في lib/core/types.ts
 */

export const GradeSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const SubjectIdSchema = z.enum([
  "arabic",
  "math",
  "stories",
  "science",
  "civic",
]);

export const SourceRefSchema = z.object({
  kind: z.enum(["pack", "foundational_neutral", "curriculum_index"]),
  file: z.string().optional(),
  page: z.number().int().positive().optional(),
  unit: z.string().optional(),
  edition: z.string().optional(),
  note: z.string().optional(),
});

export const SkillSchema = z.object({
  id: z.string().uuid({ message: "معرف المهارة يجب أن يكون UUID صالحاً" }),
  grade: GradeSchema,
  subject: SubjectIdSchema,
  title: z.string().min(1, { message: "عنوان المهارة مطلوب" }),
  description: z.string().min(1, { message: "وصف المهارة مطلوب" }),
  prerequisites: z.array(z.string()),
  sourceRef: SourceRefSchema,
  createdAt: z.string().min(1, { message: "تاريخ إنشاء المهارة مطلوب" }),
});

export const ScaffoldStepSchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  type: z.enum(["model", "visual_cue", "verbal_hint", "simplify"]),
  text: z.string().min(1, { message: "نص خطوة السقالة مطلوب" }),
});

export const ActivityQuestionSchema = z.object({
  prompt: z.string().min(1, { message: "نص السؤال مطلوب" }),
  choices: z.array(z.string().min(1)).min(2, { message: "يجب توفير خيارين على الأقل لكل سؤال" }),
  answer: z.string().min(1, { message: "إجابة السؤال مطلوبة" }),
  object: z.string().optional(),
  hint: z.string().optional(),
  scaffolds: z.array(ScaffoldStepSchema).optional(),
});

export const ActivityRewardSchema = z.object({
  stars: z.number().int().nonnegative({ message: "النجوم يجب أن تكون عدداً صحيحاً غير سالب" }),
  planks: z.number().int().nonnegative({ message: "الألواح يجب أن تكون عدداً صحيحاً غير سالب" }),
  itemKey: z.string().min(1, { message: "مفتاح الزينة مطلوب" }),
  itemId: z.string().uuid({ message: "معرف الزينة يجب أن يكون UUID صالحاً" }),
});

export const BuildingKeySchema = z.enum(["letters", "numbers", "stories"]);
export const ThemeSchema = z.enum(["green", "apricot", "blue"]);

export const ActivityTemplateTypeSchema = z.enum([
  "multiple_choice",
  "drag_match",
  "trace_path",
  "listen_identify",
]);

export const DragMatchPairSchema = z.object({
  draggable: z.object({
    id: z.string().min(1, { message: "معرف العنصر القابل للسحب مطلوب" }),
    label: z.string().min(1, { message: "نص العنصر القابل للسحب مطلوب" }),
    char: z.string().optional(),
    image: z.string().optional(),
  }),
  target: z.object({
    id: z.string().min(1, { message: "معرف الهدف مطلوب" }),
    label: z.string().min(1, { message: "نص الهدف مطلوب" }),
    char: z.string().optional(),
    image: z.string().optional(),
  }),
});

export const DragMatchConfigSchema = z.object({
  prompt: z.string().min(1, { message: "نص التوجيه مطلوب" }),
  pairs: z.array(DragMatchPairSchema).min(1, { message: "يجب توفير زوج مطابقة واحد على الأقل" }),
  shuffleTargets: z.boolean().optional(),
  hint: z.string().optional(),
  scaffolds: z.array(ScaffoldStepSchema).optional(),
});

export const TraceCheckpointSchema = z.object({
  x: z.number().finite({ message: "إحداثي x يجب أن يكون عدداً محدوداً" }),
  y: z.number().finite({ message: "إحداثي y يجب أن يكون عدداً محدوداً" }),
  label: z.string().optional(),
});

export const TracePathConfigSchema = z.object({
  prompt: z.string().min(1, { message: "نص التوجيه مطلوب" }),
  character: z.string().min(1, { message: "الحرف أو الرمز المطلوب تتبعه مطلوب" }),
  strokePath: z.string().min(1, { message: "مسار الرسم SVG مطلوب" }),
  checkpoints: z.array(TraceCheckpointSchema).min(2, { message: "يجب توفير نقطتي تحقق على الأقل لتتبع المسار" }),
  guideOpacity: z.number().min(0).max(1).optional(),
  minStrokeLength: z.number().positive().optional(),
  hint: z.string().optional(),
  scaffolds: z.array(ScaffoldStepSchema).optional(),
});

export const ListenOptionSchema = z.object({
  id: z.string().min(1, { message: "معرف الخيار مطلوب" }),
  label: z.string().min(1, { message: "نص الخيار مطلوب" }),
  char: z.string().optional(),
  image: z.string().optional(),
  correct: z.boolean(),
});

export const ListenIdentifyConfigSchema = z.object({
  prompt: z.string().min(1, { message: "نص التوجيه مطلوب" }),
  audioText: z.string().min(1, { message: "النص المنطوق مطلوب" }),
  audioFile: z.string().optional(),
  options: z.array(ListenOptionSchema).min(2, { message: "يجب توفير خيارين على الأقل للاستماع والتمييز" }),
  hint: z.string().optional(),
  scaffolds: z.array(ScaffoldStepSchema).optional(),
}).refine((config) => config.options.some((o) => o.correct), {
  message: "يجب توفير خيار صحيح واحد على الأقل",
  path: ["options"],
});

const baseActivityFields = {
  id: z.string().min(1, { message: "معرف النشاط النصي مطلوب" }),
  activityId: z.string().uuid({ message: "معرف النشاط UUID مطلوب" }),
  skillId: z.string().uuid({ message: "معرف المهارة UUID مطلوب" }),
  buildingKey: BuildingKeySchema,
  building: BuildingKeySchema,
  title: z.string().min(1, { message: "عنوان النشاط مطلوب" }),
  subtitle: z.string().min(1, { message: "العنوان الفرعي للنشاط مطلوب" }),
  icon: z.string().min(1, { message: "أيقونة النشاط مطلوبة" }),
  theme: ThemeSchema,
  reward: ActivityRewardSchema,
  sourceRef: SourceRefSchema,
  version: z.number().int().positive({ message: "رقم إصدار النشاط يجب أن يكون رقماً موجباً" }),
};

export const MultipleChoiceActivitySchema = z.object({
  ...baseActivityFields,
  template: z.literal("multiple_choice").optional(),
  questions: z.array(ActivityQuestionSchema).min(1, { message: "يجب أن يحتوي النشاط على سؤال واحد على الأقل" }),
});

export const DragMatchActivitySchema = z.object({
  ...baseActivityFields,
  template: z.literal("drag_match"),
  config: DragMatchConfigSchema,
  questions: z.array(ActivityQuestionSchema).optional(),
}).transform((data) => ({
  ...data,
  questions: data.questions && data.questions.length > 0 ? data.questions : [
    {
      prompt: data.config.prompt,
      choices: [data.config.pairs.map((p) => p.draggable.label).join(", "), "مطابقة غير مكتملة"],
      answer: data.config.pairs.map((p) => p.draggable.label).join(", "),
      hint: data.config.hint,
      scaffolds: data.config.scaffolds,
    },
  ],
}));

export const TracePathActivitySchema = z.object({
  ...baseActivityFields,
  template: z.literal("trace_path"),
  config: TracePathConfigSchema,
  questions: z.array(ActivityQuestionSchema).optional(),
}).transform((data) => ({
  ...data,
  questions: data.questions && data.questions.length > 0 ? data.questions : [
    {
      prompt: data.config.prompt,
      choices: [data.config.character, "تتبع المسار"],
      answer: data.config.character,
      hint: data.config.hint,
      scaffolds: data.config.scaffolds,
    },
  ],
}));

export const ListenIdentifyActivitySchema = z.object({
  ...baseActivityFields,
  template: z.literal("listen_identify"),
  config: ListenIdentifyConfigSchema,
  questions: z.array(ActivityQuestionSchema).optional(),
}).transform((data) => ({
  ...data,
  questions: data.questions && data.questions.length > 0 ? data.questions : [
    {
      prompt: data.config.prompt,
      choices: data.config.options.map((o) => o.label),
      answer: data.config.options.find((o) => o.correct)?.label ?? "",
      hint: data.config.hint,
      scaffolds: data.config.scaffolds,
    },
  ],
}));

export const ActivitySchema = z.union([
  MultipleChoiceActivitySchema,
  DragMatchActivitySchema,
  TracePathActivitySchema,
  ListenIdentifyActivitySchema,
]);

export const ContentPackReviewStatusSchema = z.enum([
  "unreviewed_neutral_sample",
  "pending_review",
  "pedagogical_reviewed",
]);

export const ContentPackSchema = z.object({
  id: z.string().min(1, { message: "معرف الحزمة مطلوب" }),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, { message: "إصدار الحزمة يجب أن يتبع نمط semver (مثل 1.0.0)" }),
  grade: GradeSchema,
  title: z.string().min(1, { message: "عنوان الحزمة مطلوب" }),
  description: z.string().min(1, { message: "وصف الحزمة مطلوب" }),
  reviewStatus: ContentPackReviewStatusSchema,
  reviewNotes: z.string().optional(),
  isMultiSubject: z.boolean(),
  subjects: z.array(SubjectIdSchema).min(1, { message: "يجب تحديد مادة واحدة على الأقل للحزمة" }),
  skills: z.array(SkillSchema).min(1, { message: "يجب أن تحتوي الحزمة على مهارة واحدة على الأقل" }),
  activities: z.array(ActivitySchema).min(1, { message: "يجب أن تحتوي الحزمة على نشاط واحد على الأقل" }),
  createdAt: z.string().min(1, { message: "تاريخ إنشاء الحزمة مطلوب" }),
});

export type ValidatedContentPack = z.infer<typeof ContentPackSchema>;
export type ValidatedSkill = z.infer<typeof SkillSchema>;
export type ValidatedActivity = z.infer<typeof ActivitySchema>;
export type ValidatedQuestion = z.infer<typeof ActivityQuestionSchema>;
