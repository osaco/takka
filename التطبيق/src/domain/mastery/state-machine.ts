import type { Evidence, EvidenceKind, SkillState } from '../types';

const STATE_RANK: Record<SkillState, number> = {
  not_reached: 0,
  tried: 1,
  with_help: 2,
  independent: 3,
};

/**
 * حالة المهارة = أعلى نوع دليل وصل إليه الطفل.
 * ملاحظة: «مستقل» هنا يعني «أظهر إتقاناً مستقلاً مرة واحدة على الأقل»،
 * أما «مُتقنة» فتُحسب بقاعدة الثلاث مرات في evidence-store.
 */
export function advanceSkillState(current: SkillState, kind: EvidenceKind): SkillState {
  const target: SkillState =
    kind === 'independent'
      ? 'independent'
      : kind === 'with_hint' || kind === 'with_scaffold'
        ? 'with_help'
        : 'tried';

  return STATE_RANK[target] > STATE_RANK[current] ? target : current;
}

export function stateFromEvidence(evidences: readonly Evidence[]): SkillState {
  let state: SkillState = 'not_reached';
  for (const evidence of evidences) {
    state = advanceSkillState(state, evidence.kind);
  }
  return state;
}

/** هل يستطيع الطفل فتح مهارة لاحقة؟ prerequisite مفتوح إذا جُرّب على الأقل. */
export function isPrerequisiteOpen(state: SkillState): boolean {
  return state !== 'not_reached';
}
