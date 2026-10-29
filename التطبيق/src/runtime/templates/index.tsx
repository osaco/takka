import type { Activity } from '@domain/content/schema';
import { Balance } from './Balance';
import { DragMatch } from './DragMatch';
import { ListenIdentify } from './ListenIdentify';
import { TracePath } from './TracePath';

export interface ActivityStageProps {
  activity: Activity;
  activityKey: string;
  onAttempt: (correct: boolean) => void;
  onDone: (correct: boolean, itemId?: string) => void;
  reducedMotion?: boolean;
}

/** موزّع القوالب: مخرج واحد للشاشة، وقالب واحد لكل عقد. */
export function ActivityStage({ activity, activityKey, onAttempt, onDone, reducedMotion }: ActivityStageProps) {
  switch (activity.template) {
    case 'drag_match':
      return (
        <DragMatch
          activity={activity}
          activityKey={activityKey}
          onAttempt={onAttempt}
          onDone={onDone}
          reducedMotion={reducedMotion}
        />
      );
    case 'listen_identify':
      return (
        <ListenIdentify
          activity={activity}
          activityKey={activityKey}
          onAttempt={onAttempt}
          onDone={onDone}
          reducedMotion={reducedMotion}
        />
      );
    case 'trace_path':
      return (
        <TracePath
          activity={activity}
          activityKey={activityKey}
          onAttempt={onAttempt}
          onDone={onDone}
          reducedMotion={reducedMotion}
        />
      );
    case 'balance':
      return (
        <Balance
          activity={activity}
          activityKey={activityKey}
          onAttempt={onAttempt}
          onDone={onDone}
          reducedMotion={reducedMotion}
        />
      );
    default:
      return null;
  }
}

export * from './measure';
export * from './types';
