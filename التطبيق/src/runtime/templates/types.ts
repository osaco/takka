import type {
  BalanceActivity,
  DragMatchActivity,
  ListenIdentifyActivity,
  TracePathActivity,
} from '@domain/content/schema';

/** عنصر محتوى: نص، أو صورة، أو مجموعة رموز معدودة. */
export type ContentItem = DragMatchActivity['config']['pairs'][number]['draggable'];
export type BalanceWeight = BalanceActivity['config']['rightSide']['options'][number];

export interface TemplateProps<A> {
  activity: A;
  activityKey: string;
  /** محاولة جزئية: تُغذّي راجعةً وترفع السقالة، ولا تُنهي التفاعل. */
  onAttempt: (correct: boolean) => void;
  /** تفاعل مكتمل: يُنهي تفاعلاً، ويسجّل دليلاً عند النجاح. */
  onDone: (correct: boolean, itemId?: string) => void;
  /** الوضع المنخفض: بلا حركات ولا زخارف. */
  reducedMotion?: boolean;
}

export type DragMatchProps = TemplateProps<DragMatchActivity>;
export type ListenIdentifyProps = TemplateProps<ListenIdentifyActivity>;
export type TracePathProps = TemplateProps<TracePathActivity>;
export type BalanceProps = TemplateProps<BalanceActivity>;

/** بذرة ثابتة من معرّف النشاط — نفس النشاط يعطي نفس الترتيب كل مرة. */
export function seedFrom(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
