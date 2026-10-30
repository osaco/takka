"use client";

import type { Activity } from "@/lib/core/types";
import { MultipleChoiceTemplate } from "./multiple-choice";
import { DragMatchTemplate } from "./drag-match";
import { TracePathTemplate } from "./trace-path";
import { ListenIdentifyTemplate } from "./listen-identify";

interface Props {
  activity: Activity;
  step: number;
  audioEnabled: boolean;
  selected: string | null;
  onSelectChoice: (choice: string) => void;
  onReadPrompt: () => void;
  onTemplateAttempt: (isCorrect: boolean, attempts: number, answerValue: string) => void;
}

export function ActivityTemplateHost({
  activity,
  step,
  audioEnabled,
  selected,
  onSelectChoice,
  onReadPrompt,
  onTemplateAttempt,
}: Props) {
  const template = activity.template ?? "multiple_choice";

  switch (template) {
    case "drag_match": {
      if (activity.template !== "drag_match" || !activity.config) {
        return <div className="template-fallback">بيانات قالب السحب والمطابقة غير مكتملة.</div>;
      }
      return (
        <DragMatchTemplate
          config={activity.config}
          onAttempt={(isCorrect, attempts, allDone) => {
            onTemplateAttempt(isCorrect, attempts, allDone ? "all_matched" : `matched_${attempts}`);
          }}
        />
      );
    }

    case "trace_path": {
      if (activity.template !== "trace_path" || !activity.config) {
        return <div className="template-fallback">بيانات قالب تتبع المسار غير مكتملة.</div>;
      }
      return (
        <TracePathTemplate
          config={activity.config}
          onAttempt={(isCorrect, attempts, allDone) => {
            onTemplateAttempt(isCorrect, attempts, allDone ? activity.config.character : "in_progress");
          }}
        />
      );
    }

    case "listen_identify": {
      if (activity.template !== "listen_identify" || !activity.config) {
        return <div className="template-fallback">بيانات قالب الاستماع غير مكتملة.</div>;
      }
      return (
        <ListenIdentifyTemplate
          config={activity.config}
          audioEnabled={audioEnabled}
          onAttempt={(isCorrect, attempts, optionId) => {
            onTemplateAttempt(isCorrect, attempts, optionId);
          }}
        />
      );
    }

    case "multiple_choice":
    default: {
      const question = activity.questions[step] ?? activity.questions[0];
      if (!question) {
        return <div className="template-fallback">لا توجد أسئلة متوفرة في هذا النشاط.</div>;
      }
      return (
        <MultipleChoiceTemplate
          question={question}
          selected={selected}
          audioEnabled={audioEnabled}
          onSelect={onSelectChoice}
          onReadPrompt={onReadPrompt}
        />
      );
    }
  }
}
