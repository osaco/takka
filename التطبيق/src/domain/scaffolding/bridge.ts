import type { Skill, SkillMastery } from '../types';
import { isPrerequisiteOpen } from '../mastery/state-machine';
import type { ScaffoldLevel } from './levels';

export type BridgeReason = 'missing_prerequisite' | 'repeated_difficulty' | 'decay';

export interface BridgeOffer {
  skillId: string;
  reason: BridgeReason;
  /** جملة واحدة لولي الأمر/الطفل، بلا لوم. */
  message: string;
}

/**
 * «الجسر التأسيسي» اختياري دائماً، ولا يُفرض (الوثيقة 10 §6.3).
 * اقتراحه لا يغيّر حالة المهارة، ولا يُنقص شيئاً.
 */
export function suggestBridge(
  target: Skill,
  skillsById: Readonly<Record<string, Skill>>,
  mastery: Readonly<Record<string, SkillMastery>>,
  level: ScaffoldLevel,
): BridgeOffer | null {
  const missing = target.prerequisites.find((id) => {
    const state = mastery[id]?.state ?? 'not_reached';
    return !isPrerequisiteOpen(state);
  });

  if (missing) {
    const skill = skillsById[missing];
    return {
      skillId: missing,
      reason: 'missing_prerequisite',
      message: skill
        ? `نبدأ من «${skill.title}» — خطوة صغيرة تعيدنا إلى المسار.`
        : 'نبدأ من خطوة تأسيسية صغيرة أولاً.',
    };
  }

  if (level >= 4) {
    return {
      skillId: target.id,
      reason: 'repeated_difficulty',
      message: 'نُبسّط المثال قليلاً، ثم نعود إلى نفس المهارة. لا شيء يضيع.',
    };
  }

  if (mastery[target.id]?.needsReview) {
    return {
      skillId: target.id,
      reason: 'decay',
      message: 'مرّ وقت — مراجعة قصيرة تعيد الإحساس بالكفاءة.',
    };
  }

  return null;
}
