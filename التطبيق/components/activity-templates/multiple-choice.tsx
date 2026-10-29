"use client";

import { Check, Volume2 } from "lucide-react";
import type { ActivityQuestion } from "@/lib/core/types";

interface Props {
  question: ActivityQuestion;
  selected: string | null;
  audioEnabled: boolean;
  onSelect: (choice: string) => void;
  onReadPrompt: () => void;
}

export function MultipleChoiceTemplate({
  question,
  selected,
  audioEnabled,
  onSelect,
  onReadPrompt,
}: Props) {
  return (
    <div className="multiple-choice-template">
      <h2>{question.prompt}</h2>

      {question.object && (
        <div className="lesson-object" aria-label="مجموعة أشياء للعدّ">
          {question.object}
        </div>
      )}

      <button
        className="read-aloud"
        type="button"
        onClick={onReadPrompt}
        disabled={!audioEnabled}
        aria-label={audioEnabled ? "استمع إلى السؤال" : "الصوت مكتوم في الإعدادات"}
      >
        <Volume2 size={18} />
        <span>{audioEnabled ? "اسمع السؤال" : "الصوت مكتوم"}</span>
      </button>

      <div className="answer-grid" role="group" aria-label="خيارات الإجابة">
        {question.choices.map((choice) => {
          const isSelected = selected === choice;
          const isCorrectChoice = isSelected && choice === question.answer;
          const isWrongChoice = isSelected && choice !== question.answer;

          return (
            <button
              key={choice}
              type="button"
              className={`answer-option${isCorrectChoice ? " answer-correct" : ""}${
                isWrongChoice ? " answer-wrong" : ""
              }`}
              onClick={() => onSelect(choice)}
              aria-pressed={isSelected}
            >
              <span>{choice}</span>
              {isCorrectChoice && <Check size={18} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
