import { assertValidPack, validatePack } from './validator';
import type { ContentPack } from './schema';

export interface PackIndex {
  pack: ContentPack;
  skillsById: Record<string, ContentPack['skills'][number]>;
  islandsById: Record<string, ContentPack['islands'][number]>;
  activitiesBySkill: Record<string, ContentPack['activities']>;
  skillsByIsland: Record<string, ContentPack['skills']>;
}

/** يحمّل حزمة من JSON خام، ويفشل بصوت عالٍ إن كانت غير صالحة. */
export function loadPack(raw: unknown): ContentPack {
  return assertValidPack(raw);
}

/** نفس التحميل لكن بلا رمي — لعرض تقرير في بوابة ولي الأمر. */
export function tryLoadPack(raw: unknown): ReturnType<typeof validatePack> {
  return validatePack(raw);
}

export function indexPack(pack: ContentPack): PackIndex {
  const skillsById: PackIndex['skillsById'] = {};
  const islandsById: PackIndex['islandsById'] = {};
  const activitiesBySkill: PackIndex['activitiesBySkill'] = {};
  const skillsByIsland: PackIndex['skillsByIsland'] = {};

  for (const island of pack.islands) {
    islandsById[island.id] = island;
    skillsByIsland[island.id] = [];
  }
  for (const skill of pack.skills) {
    skillsById[skill.id] = skill;
    (skillsByIsland[skill.islandId] ??= []).push(skill);
    activitiesBySkill[skill.id] = [];
  }
  for (const skill of pack.skills) {
    skillsByIsland[skill.islandId]?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  for (const activity of pack.activities) {
    (activitiesBySkill[activity.skillId] ??= []).push(activity);
  }
  for (const key of Object.keys(activitiesBySkill)) {
    activitiesBySkill[key]?.sort((a, b) => a.difficulty - b.difficulty);
  }

  return { pack, skillsById, islandsById, activitiesBySkill, skillsByIsland };
}
