/**
 * تكة — بيانات الجزر وحالات الإزهار
 * القاعدة: الحالة تُحسب من بيانات الإتقان، ولا تُخزَّن كحقل مستقل.
 */
import type { IslandMood, SkillMastery } from '@domain/types';

export interface IslandView {
  id: string;
  title: string;
  /** موضع الشبكة في الأرخبيل. */
  gx: number;
  gy: number;
  mood: IslandMood;
  /** نسبة الإتقان 0..1 — تُحسب من المهارات المنشورة فقط. */
  progress: number;
  mastered: number;
  total: number;
}

export function islandMoodFor(progress: number, total: number): IslandMood {
  if (total <= 0 || progress <= 0) return 'sleeping';
  if (progress >= 1) return 'blooming';
  return 'awakening';
}

export function islandViewFor(
  islandId: string,
  title: string,
  gx: number,
  gy: number,
  skillIds: readonly string[],
  mastery: Readonly<Record<string, SkillMastery>>,
): IslandView {
  const total = skillIds.length;
  const mastered = skillIds.filter((id) => mastery[id]?.mastered).length;
  const progress = total === 0 ? 0 : mastered / total;
  return {
    id: islandId,
    title,
    gx,
    gy,
    mood: islandMoodFor(progress, total),
    progress,
    mastered,
    total,
  };
}

/** تخطيط الأرخبيل الافتراضي للصف الأول: جزيرة لكل مادة ووحدة. */
export const ARCHIPELAGO_LAYOUT: ReadonlyArray<{ id: string; gx: number; gy: number }> = [
  { id: 'island-letters', gx: 0, gy: 0 },
  { id: 'island-words', gx: 3, gy: 1 },
  { id: 'island-numbers', gx: 1, gy: 3 },
  { id: 'island-math', gx: 4, gy: 4 },
];
