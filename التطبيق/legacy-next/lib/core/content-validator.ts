import { ContentPackSchema, type ValidatedContentPack } from "./content-schema.ts";
import type { ContentPackReviewStatus } from "./types.ts";

export interface ValidationIssue {
  type: "error" | "warning";
  code: string;
  message: string;
  path?: string;
  activityId?: string;
  skillId?: string;
}

export interface PackValidationResult {
  packId: string;
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  humanReviewStatus: {
    status: ContentPackReviewStatus;
    needsHumanReview: boolean;
    notice: string;
  };
  stats: {
    skillsCount: number;
    activitiesCount: number;
    questionsCount: number;
  };
}

/**
 * فحص وتدقيق حزمة محتوى تكة بنيوياً وترابطياً
 *
 * تنبيه أساسي: نجاح هذا الفحص يؤكد السلامة البنيوية والترابط الداخلي للبيانات فقط،
 * ولا يثبت الصحة التربوية أو اللغوية أو الاعتماد المنهاجي، والتي تتطلب مراجعة بشرية متخصصة.
 */
export function validateContentPack(rawPack: unknown): PackValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  let dataToValidate = rawPack;
  if (typeof rawPack === "string") {
    try {
      dataToValidate = JSON.parse(rawPack);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "تعذر تحليل JSON";
      return {
        packId: "invalid-json",
        valid: false,
        errors: [
          {
            type: "error",
            code: "invalid_json",
            message: `فشل قراءة بنية JSON: ${errorMsg}`,
          },
        ],
        warnings: [],
        humanReviewStatus: {
          status: "unreviewed_neutral_sample",
          needsHumanReview: true,
          notice: "فشل التحقق بسبب بنية JSON غير صالحة.",
        },
        stats: {
          skillsCount: 0,
          activitiesCount: 0,
          questionsCount: 0,
        },
      };
    }
  }

  // 1. فحص بنية Zod أولاً
  const parseResult = ContentPackSchema.safeParse(dataToValidate);

  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push({
        type: "error",
        code: `schema_${issue.code}`,
        message: issue.message,
        path: issue.path.join("."),
      });
    }

    const packId =
      dataToValidate && typeof dataToValidate === "object" && "id" in dataToValidate && typeof (dataToValidate as { id: unknown }).id === "string"
        ? (dataToValidate as { id: string }).id
        : "unknown-pack";

    return {
      packId,
      valid: false,
      errors,
      warnings,
      humanReviewStatus: {
        status: "unreviewed_neutral_sample",
        needsHumanReview: true,
        notice: "فشلت الحزمة في اجتياز الفحص البنيوي لـ Zod.",
      },
      stats: {
        skillsCount: 0,
        activitiesCount: 0,
        questionsCount: 0,
      },
    };
  }

  const pack: ValidatedContentPack = parseResult.data;
  const packId = pack.id;

  // 2. فحص فرادة المعرفات (Unique IDs)
  const seenSkillIds = new Set<string>();
  for (const skill of pack.skills) {
    if (seenSkillIds.has(skill.id)) {
      errors.push({
        type: "error",
        code: "duplicate_skill_id",
        message: `معرف المهارة مكرر داخل الحزمة: ${skill.id}`,
        skillId: skill.id,
      });
    }
    seenSkillIds.add(skill.id);
  }

  const seenActivityIds = new Set<string>();
  const seenActivityUuids = new Set<string>();
  for (const activity of pack.activities) {
    if (seenActivityIds.has(activity.id)) {
      errors.push({
        type: "error",
        code: "duplicate_activity_id",
        message: `معرف النشاط النصي مكرر داخل الحزمة: ${activity.id}`,
        activityId: activity.id,
      });
    }
    seenActivityIds.add(activity.id);

    if (seenActivityUuids.has(activity.activityId)) {
      errors.push({
        type: "error",
        code: "duplicate_activity_uuid",
        message: `معرف النشاط UUID مكرر داخل الحزمة: ${activity.activityId}`,
        activityId: activity.id,
      });
    }
    seenActivityUuids.add(activity.activityId);
  }

  // 3. فحص الترابط الإحالي (Referential Integrity)
  for (const activity of pack.activities) {
    if (!seenSkillIds.has(activity.skillId)) {
      errors.push({
        type: "error",
        code: "missing_skill_reference",
        message: `النشاط "${activity.title}" (${activity.id}) يشير إلى مهارة غير موجودة في الحزمة: ${activity.skillId}`,
        activityId: activity.id,
        skillId: activity.skillId,
      });
    }

    if (activity.buildingKey !== activity.building) {
      errors.push({
        type: "error",
        code: "mismatched_building_keys",
        message: `تعارض بين buildingKey (${activity.buildingKey}) و building (${activity.building}) في النشاط ${activity.id}`,
        activityId: activity.id,
      });
    }
  }

  for (const skill of pack.skills) {
    for (const prereq of skill.prerequisites) {
      if (!seenSkillIds.has(prereq)) {
        errors.push({
          type: "error",
          code: "missing_prerequisite_reference",
          message: `المهارة "${skill.title}" (${skill.id}) تشير إلى متطلب سابق غير معرف في الحزمة: ${prereq}`,
          skillId: skill.id,
        });
      }
    }
  }

  // 4. فحص المراجع والحيادية (SourceRef)
  for (const skill of pack.skills) {
    if (skill.sourceRef.kind === "foundational_neutral") {
      if (!skill.sourceRef.note || skill.sourceRef.note.trim().length === 0) {
        errors.push({
          type: "error",
          code: "missing_neutral_note",
          message: `المهارة "${skill.title}" محايدة ولكن ينقصها ملاحظة توضح طبيعتها التأسيسية المحايدة.`,
          skillId: skill.id,
        });
      }
    }
  }

  for (const activity of pack.activities) {
    if (activity.sourceRef.kind === "foundational_neutral") {
      if (!activity.sourceRef.note || activity.sourceRef.note.trim().length === 0) {
        errors.push({
          type: "error",
          code: "missing_neutral_note",
          message: `النشاط "${activity.title}" محايد ولكن ينقصه ملاحظة توضح طبيعته المحايدة دون ادعاء تغطية المنهاج.`,
          activityId: activity.id,
        });
      }
    }
  }

  // 5. فحص الأسئلة والخيارات والإجابات
  let totalQuestionsCount = 0;
  for (let aIdx = 0; aIdx < pack.activities.length; aIdx++) {
    const activity = pack.activities[aIdx];
    totalQuestionsCount += activity.questions.length;

    for (let qIdx = 0; qIdx < activity.questions.length; qIdx++) {
      const q = activity.questions[qIdx];
      const qPath = `activities[${aIdx}].questions[${qIdx}]`;

      if (!q.choices.includes(q.answer)) {
        errors.push({
          type: "error",
          code: "answer_not_in_choices",
          message: `إجابة السؤال "${q.prompt}" وهي [${q.answer}] غير موجودة ضمن الخيارات: [${q.choices.join(", ")}] في النشاط ${activity.id}`,
          path: `${qPath}.answer`,
          activityId: activity.id,
        });
      }

      const uniqueChoices = new Set(q.choices);
      if (uniqueChoices.size !== q.choices.length) {
        warnings.push({
          type: "warning",
          code: "duplicate_choice_text",
          message: `يوجد خيارات مكررة في السؤال "${q.prompt}" بالنشاط ${activity.id}`,
          path: `${qPath}.choices`,
          activityId: activity.id,
        });
      }
    }

    // 5.ب فحص قوالب الأنشطة الخاصة (P3)
    const actAsAny = activity as unknown as { template?: string; config?: Record<string, unknown> };
    if (actAsAny.template === "drag_match") {
      const config = actAsAny.config as { pairs?: Array<{ draggable: { id: string }; target: { id: string } }> };
      if (!config || !Array.isArray(config.pairs) || config.pairs.length === 0) {
        errors.push({
          type: "error",
          code: "invalid_template_config",
          message: `قالب سحب ومطابقة في النشاط ${activity.id} ينقصه أزواج مطابقة صالحة.`,
          activityId: activity.id,
        });
      } else {
        const dIds = new Set<string>();
        const tIds = new Set<string>();
        for (const pair of config.pairs) {
          if (dIds.has(pair.draggable.id)) {
            errors.push({
              type: "error",
              code: "duplicate_draggable_id",
              message: `معرف العنصر القابل للسحب مكرر: ${pair.draggable.id} في النشاط ${activity.id}`,
              activityId: activity.id,
            });
          }
          dIds.add(pair.draggable.id);
          if (tIds.has(pair.target.id)) {
            errors.push({
              type: "error",
              code: "duplicate_target_id",
              message: `معرف الهدف مكرر: ${pair.target.id} في النشاط ${activity.id}`,
              activityId: activity.id,
            });
          }
          tIds.add(pair.target.id);
        }
      }
    } else if (actAsAny.template === "trace_path") {
      const config = actAsAny.config as { character?: string; strokePath?: string; checkpoints?: unknown[] };
      if (!config || !config.character || !config.strokePath || !Array.isArray(config.checkpoints) || config.checkpoints.length < 2) {
        errors.push({
          type: "error",
          code: "invalid_template_config",
          message: `قالب تتبع المسار في النشاط ${activity.id} ينقصه مسار SVG أو نقاط تحقق كافية (على الأقل نقطتان).`,
          activityId: activity.id,
        });
      }
    } else if (actAsAny.template === "listen_identify") {
      const config = actAsAny.config as { audioText?: string; options?: Array<{ id: string; correct: boolean }> };
      if (!config || !config.audioText || !Array.isArray(config.options) || config.options.length < 2) {
        errors.push({
          type: "error",
          code: "invalid_template_config",
          message: `قالب الاستماع والتمييز في النشاط ${activity.id} ينقصه نص منطوق أو خيارات كافية.`,
          activityId: activity.id,
        });
      } else {
        const correctCount = config.options.filter((o) => o.correct).length;
        if (correctCount === 0) {
          errors.push({
            type: "error",
            code: "missing_correct_option",
            message: `قالب الاستماع في النشاط ${activity.id} لا يحتوي على أي خيار صحيح.`,
            activityId: activity.id,
          });
        }
      }
    }
  }

  // 6. فحص حالة المراجعة البشرية وضمان عدم ادعاء المراجعة أو الاعتماد تلقائياً
  const needsHumanReview = pack.reviewStatus !== "pedagogical_reviewed";
  if (pack.reviewStatus === "unreviewed_neutral_sample") {
    warnings.push({
      type: "warning",
      code: "unreviewed_sample_notice",
      message: `الحزمة "${pack.title}" مصنفة كعينة محايدة أولية غير مراجعة بشرياً. لا يجوز عرضها كمنهاج معتمد أو محتوى مراجع.`,
    });
  }

  const humanReviewNotice =
    pack.reviewStatus === "pedagogical_reviewed"
      ? "الحزمة موسومة بمراجعة بشرية موثقة."
      : "تنبيه: نجاح التدقيق البنيوي الآلي يضمن سلامة البيانات التقنية فقط، ولا يعني سلامة المحتوى تربوياً أو لغوياً، ويتطلب مراجعة بشرية متخصصة ومستقلة.";

  const valid = errors.length === 0;

  return {
    packId,
    valid,
    errors,
    warnings,
    humanReviewStatus: {
      status: pack.reviewStatus,
      needsHumanReview,
      notice: humanReviewNotice,
    },
    stats: {
      skillsCount: pack.skills.length,
      activitiesCount: pack.activities.length,
      questionsCount: totalQuestionsCount,
    },
  };
}
