import { z } from 'zod';

/**
 * عقد المحتوى (Content Contract) — صادر عن الوثيقة 10 §9.2.
 * أي نشاط لا يملك source أو audit.status لا يُبنى ولا يُحمَّل.
 */

export const gradeSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const subjectSchema = z.enum(['arabic', 'math', 'english', 'civic', 'science']);

export const templateSchema = z.enum([
  'drag_match',
  'trace_path',
  'listen_identify',
  'balance',
]);

export const sourceRefSchema = z
  .object({
    kind: z.enum(['pack', 'curriculum-index', 'foundational']),
    file: z.string().min(1).optional(),
    unit: z.string().min(1).optional(),
    page: z.number().int().positive().optional(),
    edition: z.string().min(1).optional(),
    note: z.string().min(1).optional(),
  })
  .strict();

export const auditSchema = z
  .object({
    status: z.enum(['draft', 'internal_reviewed', 'expert_reviewed', 'rejected']),
    reviewedAt: z.string().min(1),
    reviewer: z.string().min(1).optional(),
    notes: z.string().optional(),
  })
  .strict();

export const glyphSchema = z.enum(['apple', 'star', 'circle', 'square', 'triangle', 'dot']);

/** عنصر قابل للعرض: نص، أو صورة، أو مجموعة رموز معدودة (للرياضيات). */
export const itemSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    image: z.string().min(1).optional(),
    alt: z.string().min(1).optional(),
    count: z.number().int().min(1).max(20).optional(),
    glyph: glyphSchema.optional(),
    char: z.string().min(1).optional(),
    value: z.number().optional(),
  })
  .strict();

const dragPairSchema = z
  .object({
    id: z.string().min(1),
    draggable: itemSchema,
    target: itemSchema,
  })
  .strict();

export const dragMatchConfigSchema = z
  .object({
    prompt: z.string().min(1),
    pairs: z.array(dragPairSchema).min(2).max(5),
    shuffleTargets: z.boolean().default(true),
  })
  .strict();

export const listenOptionSchema = itemSchema.extend({ correct: z.boolean() }).strict();

export const listenIdentifyConfigSchema = z
  .object({
    prompt: z.string().min(1),
    /** البديل النصي لما «يُسمع». لا معلومة صوتية وحده. */
    spokenText: z.string().min(1),
    audioFile: z.string().min(1).optional(),
    options: z.array(listenOptionSchema).min(2).max(5),
  })
  .strict();

export const tracePathConfigSchema = z
  .object({
    prompt: z.string().min(1),
    character: z.string().min(1).max(3),
    /** مسار SVG للعرض والقياس. */
    strokePath: z.string().startsWith('M'),
    /** نسبة تغطية مقبولة (الوثيقة 04: 70%). */
    minCoverage: z.number().min(0.5).max(1).default(0.7),
    tolerance: z.number().min(8).max(80).default(28),
    showGuide: z.boolean().default(true),
  })
  .strict();

const weightSchema = z
  .object({
    id: z.string().min(1),
    value: z.number(),
    label: z.string().min(1),
  })
  .strict();

export const balanceConfigSchema = z
  .object({
    prompt: z.string().min(1),
    leftSide: z
      .object({ items: z.array(weightSchema), total: z.number() })
      .strict(),
    rightSide: z
      .object({
        items: z.array(weightSchema),
        options: z.array(weightSchema).min(2).max(5),
      })
      .strict(),
    correctAnswer: z.string().min(1),
  })
  .strict();

export const audioRefSchema = z
  .object({
    instruction: z.string().min(1).nullable().optional(),
    success: z.string().min(1).nullable().optional(),
    retry: z.string().min(1).nullable().optional(),
    /** الصوت اختياري دائماً؛ النص والصورة يبقيان. */
    optional: z.boolean().default(true),
  })
  .strict();

const activityBase = z
  .object({
    id: z.string().min(1),
    grade: gradeSchema,
    subject: subjectSchema,
    islandId: z.string().min(1),
    skillId: z.string().min(1),
    title: z.string().min(1).max(90),
    difficulty: z.number().int().min(1).max(5),
    scaffolding: z
      .object({
        level: z.number().int().min(1).max(4),
        hint: z.string().min(10),
      })
      .strict(),
    source: sourceRefSchema,
    audit: auditSchema,
    audio: audioRefSchema.optional(),
    feedback: z
      .object({
        success: z.string().min(1),
        retry: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export const activitySchema = z.discriminatedUnion('template', [
  activityBase.extend({ template: z.literal('drag_match'), config: dragMatchConfigSchema }),
  activityBase.extend({ template: z.literal('trace_path'), config: tracePathConfigSchema }),
  activityBase.extend({
    template: z.literal('listen_identify'),
    config: listenIdentifyConfigSchema,
  }),
  activityBase.extend({ template: z.literal('balance'), config: balanceConfigSchema }),
]);

export const skillSchema = z
  .object({
    id: z.string().min(1),
    grade: gradeSchema,
    subject: subjectSchema,
    islandId: z.string().min(1),
    title: z.string().min(1).max(120),
    prerequisites: z.array(z.string().min(1)).default([]),
    sourceRef: sourceRefSchema,
    order: z.number().int().min(0).optional(),
  })
  .strict();

export const islandSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    subject: subjectSchema,
    description: z.string().min(1).optional(),
  })
  .strict();

export const manifestSchema = z
  .object({
    id: z.string().min(1),
    grade: gradeSchema,
    subject: subjectSchema,
    version: z.string().min(1),
    title: z.string().min(1),
    edition: z.string().min(1),
    publishedAt: z.string().min(1),
    auditStatus: z.enum(['draft', 'internal_reviewed', 'expert_reviewed']),
    /** بيان صدق النطاق: ما الذي يغطيه هذا الإصدار فعلاً. */
    scopeNote: z.string().min(1),
    coverage: z
      .object({
        declared: z.string().min(1),
        units: z
          .array(
            z
              .object({
                id: z.string().min(1),
                title: z.string().min(1),
                page: z.number().int().positive().optional(),
                lessons: z.number().int().positive().optional(),
              })
              .strict(),
          )
          .default([]),
      })
      .strict(),
  })
  .strict();

export const contentPackSchema = z
  .object({
    manifest: manifestSchema,
    islands: z.array(islandSchema).min(1),
    skills: z.array(skillSchema).min(1),
    activities: z.array(activitySchema).min(1),
  })
  .strict();

export type ContentPack = z.infer<typeof contentPackSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type DragMatchActivity = Extract<Activity, { template: 'drag_match' }>;
export type TracePathActivity = Extract<Activity, { template: 'trace_path' }>;
export type ListenIdentifyActivity = Extract<Activity, { template: 'listen_identify' }>;
export type BalanceActivity = Extract<Activity, { template: 'balance' }>;
export type ContentSkill = z.infer<typeof skillSchema>;
export type ContentIsland = z.infer<typeof islandSchema>;
export type PackManifest = z.infer<typeof manifestSchema>;
