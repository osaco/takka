import { contentPackSchema, type Activity, type ContentPack } from './schema';

export type Severity = 'error' | 'warning';

export interface ValidationIssue {
  code: string;
  severity: Severity;
  message: string;
  path?: string;
}

export interface ValidationStats {
  islands: number;
  skills: number;
  activities: number;
  byTemplate: Record<string, number>;
}

export interface ValidationReport {
  ok: boolean;
  issues: ValidationIssue[];
  stats: ValidationStats;
}

const FORBIDDEN_FEEDBACK = ['خطأ', 'خسر', 'فشل', 'ضعيف', 'غبي'];
const SKILL_ID = /^g[1-6]\.(ar|arabic|ma|math|en|english|ci|civic|sc|science)(\.[a-z0-9-]+)+$/;
const ISLAND_ID = /^[a-z0-9-]+$/;
/** معرّف حزمة يحمل نسخة، مثل g1-ar-v1.0. */
const PACK_ID = /^[a-z0-9][a-z0-9.-]*$/;

const error = (code: string, message: string, path?: string): ValidationIssue => ({
  code,
  severity: 'error',
  message,
  path,
});
const warn = (code: string, message: string, path?: string): ValidationIssue => ({
  code,
  severity: 'warning',
  message,
  path,
});

/**
 * المدقّق التربوي الآلي. يفشل البناء، لا يحذّر فقط
 * (قرار الوثيقة 10 §9.2).
 */
export function validatePack(
  raw: unknown,
  opts: { requireReviewed?: boolean } = {},
): ValidationReport & { pack?: ContentPack } {
  const issues: ValidationIssue[] = [];
  const parsed = contentPackSchema.safeParse(raw);

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push(
        error('schema', issue.message, issue.path.map(String).join('.')),
      );
    }
    return {
      ok: false,
      issues,
      stats: { islands: 0, skills: 0, activities: 0, byTemplate: {} },
    };
  }

  const pack = parsed.data;
  const requireReviewed = opts.requireReviewed !== false;

  const islandIds = new Set(pack.islands.map((i) => i.id));
  const skillIds = new Set(pack.skills.map((s) => s.id));
  const skillById = new Map(pack.skills.map((s) => [s.id, s]));
  const byTemplate: Record<string, number> = {};

  // الهوية
  if (!PACK_ID.test(pack.manifest.id)) {
    issues.push(
      error('manifest.id', 'معرّف الحزمة يجب أن يكون بأحرف لاتينية صغيرة وشرطات ونقاط.'),
    );
  }
  if (ISLAND_ID.test(pack.manifest.id)) {
    issues.push(
      warn('manifest.id.version', 'معرّف الحزمة بلا نسخة ظاهرة؛ يُفضَّل g1-ar-v1.0.'),
    );
  }
  if (pack.manifest.auditStatus === 'draft' && requireReviewed) {
    issues.push(error('manifest.audit', 'حزمة بحالة draft لا تُنشر.'));
  }
  if (!pack.manifest.scopeNote.includes('ليست') && !pack.manifest.scopeNote.includes('عيّنة')) {
    issues.push(
      warn('manifest.scope', 'بيان النطاق يجب أن يصرّح بأنه ليس المنهاج الكامل.'),
    );
  }

  // الجزر
  const seenIslands = new Set<string>();
  for (const island of pack.islands) {
    if (seenIslands.has(island.id)) {
      issues.push(error('island.duplicate', `جزيرة مكرّرة: ${island.id}`, island.id));
    }
    seenIslands.add(island.id);
  }

  // المهارات
  const seenSkills = new Set<string>();
  for (const skill of pack.skills) {
    const path = `skills.${skill.id}`;
    if (seenSkills.has(skill.id)) {
      issues.push(error('skill.duplicate', `مهارة مكرّرة: ${skill.id}`, path));
    }
    seenSkills.add(skill.id);

    if (!SKILL_ID.test(skill.id)) {
      issues.push(
        error('skill.id', `معرّف مهارة غير صالح: ${skill.id}`, path),
      );
    }
    if (!islandIds.has(skill.islandId)) {
      issues.push(error('skill.island', `جزيرة غير موجودة: ${skill.islandId}`, path));
    }
    if (skill.grade !== pack.manifest.grade || skill.subject !== pack.manifest.subject) {
      issues.push(error('skill.scope', 'المهارة خارج صف/مادة الحزمة.', path));
    }
    for (const prereq of skill.prerequisites) {
      if (!skillIds.has(prereq)) {
        issues.push(error('skill.prereq', `متطلب سابق غير موجود: ${prereq}`, path));
      }
      if (prereq === skill.id) {
        issues.push(error('skill.cycle', 'المهارة لا تكون متطلباً لنفسها.', path));
      }
    }
    if (skill.sourceRef.kind === 'pack' && (!skill.sourceRef.file || !skill.sourceRef.edition)) {
      issues.push(error('source', 'مصدر المهارة يحتاج file + edition.', path));
    }
  }

  // لا دورات في المتطلبات
  for (const skill of pack.skills) {
    const seen = new Set<string>();
    let cur: string | undefined = skill.id;
    while (cur) {
      if (seen.has(cur)) {
        issues.push(error('skill.cycle', `دورة في متطلبات: ${skill.id}`, `skills.${skill.id}`));
        break;
      }
      seen.add(cur);
      const next: string | undefined = skillById.get(cur)?.prerequisites[0];
      cur = next;
    }
  }

  // الأنشطة
  const seenActivities = new Set<string>();
  for (const activity of pack.activities) {
    const path = `activities.${activity.id}`;
    byTemplate[activity.template] = (byTemplate[activity.template] ?? 0) + 1;

    if (seenActivities.has(activity.id)) {
      issues.push(error('activity.duplicate', `نشاط مكرّر: ${activity.id}`, path));
    }
    seenActivities.add(activity.id);

    if (activity.grade !== pack.manifest.grade || activity.subject !== pack.manifest.subject) {
      issues.push(error('activity.scope', 'النشاط خارج صف/مادة الحزمة.', path));
    }
    if (!skillIds.has(activity.skillId)) {
      issues.push(error('activity.skill', `مهارة غير موجودة: ${activity.skillId}`, path));
    }
    if (!islandIds.has(activity.islandId)) {
      issues.push(error('activity.island', `جزيرة غير موجودة: ${activity.islandId}`, path));
    }
    if (
      skillById.get(activity.skillId) &&
      skillById.get(activity.skillId)?.islandId !== activity.islandId
    ) {
      issues.push(warn('activity.island.mismatch', 'جزيرة النشاط تختلف عن جزيرة المهارة.', path));
    }
    if (activity.source.kind === 'pack') {
      if (!activity.source.file || !activity.source.unit || !activity.source.edition) {
        issues.push(error('source', 'مصدر النشاط يحتاج file + unit + edition.', path));
      }
      if (activity.source.page === undefined) {
        issues.push(
          warn('source.page', 'الصفحة غير مثبّتة — تُراجع بصرياً قبل النشر.', path),
        );
      }
    }
    if (requireReviewed && activity.audit.status !== 'internal_reviewed' && activity.audit.status !== 'expert_reviewed') {
      issues.push(error('audit', 'النشاط ليس مُراجعاً داخلياً.', path));
    }
    if (activity.audit.status === 'rejected') {
      issues.push(error('audit.rejected', 'نشاط مرفوض لا يدخل الحزمة.', path));
    }
    if (activity.scaffolding.hint.trim().length < 10) {
      issues.push(error('scaffold.hint', 'التلميح قصير جداً أو غائب.', path));
    }
    for (const word of FORBIDDEN_FEEDBACK) {
      if (activity.feedback.retry.includes(word)) {
        issues.push(error('feedback.shame', `لغة لوم في التغذية الراجعة: «${word}»`, path));
      }
    }
    if (!activity.feedback.retry.trim()) {
      issues.push(error('feedback.retry', 'لا بد من رسالة إعادة المحاولة.', path));
    }
    if (activity.title.length > 90) {
      issues.push(warn('title.long', 'العنوان طويل على طفل الصف الأول.', path));
    }

    if (activity.template === 'drag_match') {
      const pairs = activity.config.pairs;
      if (new Set(pairs.map((p) => p.id)).size !== pairs.length) {
        issues.push(error('drag.ids', 'معرّفات أزواج مكرّرة.', path));
      }
      const targets = pairs.map((p) => p.target.label);
      if (new Set(targets).size !== targets.length) {
        issues.push(error('drag.targets', 'أهداف مكرّرة لا تُعلّم شيئاً.', path));
      }
      for (const pair of pairs) {
        const d = pair.draggable;
        const t = pair.target;
        const visual = (i: typeof d) =>
          Boolean(i.image) || i.count !== undefined || Boolean(i.glyph) || Boolean(i.char);
        // التطابق بلا أي بصر (نصٌّ فقط في الطرفين) لا يُعلّم شيئاً لطفل لم يقرأ بعد.
        if (!visual(d) && !visual(t)) {
          issues.push(
            warn('drag.visual', `الزوج ${pair.id} بلا صورة أو رموز في طرفيه.`, path),
          );
        }
        if (d.image && !d.alt) {
          issues.push(warn('a11y.alt', `الصورة ${d.image} بلا نص بديل.`, path));
        }
        if (t.image && !t.alt) {
          issues.push(warn('a11y.alt', `الصورة ${t.image} بلا نص بديل.`, path));
        }
      }
    }

    if (activity.template === 'listen_identify') {
      const options = activity.config.options;
      if (options.filter((o) => o.correct).length !== 1) {
        issues.push(error('listen.correct', 'يجب أن تكون إجابة صحيحة واحدة بالضبط.', path));
      }
      if (new Set(options.map((o) => o.label)).size !== options.length) {
        issues.push(error('listen.dupes', 'خيارات مكرّرة.', path));
      }
      if (new Set(options.map((o) => o.id)).size !== options.length) {
        issues.push(error('listen.ids', 'معرّفات خيارات مكرّرة.', path));
      }
      if (!activity.config.audioFile) {
        issues.push(warn('audio.missing', 'لا ملف صوت؛ النص هو الأساس وهذا مقبول.', path));
      }
    }

    if (activity.template === 'trace_path') {
      const c = activity.config;
      if (c.character.trim().length === 0) {
        issues.push(error('trace.char', 'الحرف المطلوب تتبعه مفقود.', path));
      }
      if (c.tolerance < 10) {
        issues.push(warn('trace.tolerance', 'التسامح صغير جداً لأصابع الصف الأول.', path));
      }
    }

    if (activity.template === 'balance') {
      const c = activity.config;
      const leftSum = c.leftSide.items.reduce((s, i) => s + i.value, 0);
      const rightSum = c.rightSide.items.reduce((s, i) => s + i.value, 0);
      if (Math.abs(leftSum - c.leftSide.total) > 0.001) {
        issues.push(error('balance.left', 'مجموع الطرف الأيسر لا يطابق total.', path));
      }
      const answer = c.rightSide.options.find((o) => o.id === c.correctAnswer);
      if (!answer) {
        issues.push(error('balance.answer', 'correctAnswer ليست ضمن الخيارات.', path));
      } else if (Math.abs(rightSum + answer.value - c.leftSide.total) > 0.001) {
        issues.push(error('balance.math', 'الخيار الصحيح لا يوازن الميزان.', path));
      }
      if (new Set(c.rightSide.options.map((o) => o.id)).size !== c.rightSide.options.length) {
        issues.push(error('balance.ids', 'معرّفات أوزان مكرّرة.', path));
      }
    }
  }

  // كل مهارة يجب أن يخدمها نشاط واحد على الأقل
  for (const skill of pack.skills) {
    if (!pack.activities.some((a: Activity) => a.skillId === skill.id)) {
      issues.push(
        warn('skill.empty', `مهارة بلا نشاط: ${skill.id}`, `skills.${skill.id}`),
      );
    }
  }

  return {
    ok: !issues.some((i) => i.severity === 'error'),
    issues,
    pack,
    stats: {
      islands: pack.islands.length,
      skills: pack.skills.length,
      activities: pack.activities.length,
      byTemplate,
    },
  };
}

export function assertValidPack(raw: unknown, opts?: { requireReviewed?: boolean }): ContentPack {
  const report = validatePack(raw, opts);
  if (!report.ok || !report.pack) {
    const lines = report.issues
      .filter((i) => i.severity === 'error')
      .map((i) => `- [${i.code}] ${i.path ?? ''} ${i.message}`);
    throw new Error(`حزمة غير صالحة:\n${lines.join('\n')}`);
  }
  return report.pack;
}
