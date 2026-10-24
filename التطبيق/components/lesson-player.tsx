"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, HelpCircle, Volume2, X } from "lucide-react";
import type { Lesson } from "@/lib/types";

type Props = {
  lesson: Lesson;
  childId: string;
  audioEnabled: boolean;
  onExit: () => void;
  onComplete: (details: { helpUsed: boolean; startedAt: string; answers: string[] }) => void;
};

type Draft = { lessonId: string; step: number; helpUsed: boolean; startedAt: string; answers: string[]; selected: string | null };

export function LessonPlayer({ lesson, childId, audioEnabled, onExit, onComplete }: Props) {
  const legacyDraftKey = `takka.draft.v1.${childId}`;
  const draftKey = `${legacyDraftKey}.${lesson.id}`;
  const initialDraft = useMemo(() => typeof window === "undefined" ? null : readDraft(draftKey, lesson.id, lesson.questions.length, legacyDraftKey), [draftKey, legacyDraftKey, lesson.id, lesson.questions.length]);
  const [step, setStep] = useState(initialDraft?.step ?? 0);
  const [helpUsed, setHelpUsed] = useState(initialDraft?.helpUsed ?? false);
  const [answers, setAnswers] = useState<string[]>(initialDraft?.answers ?? []);
  const [startedAt] = useState(initialDraft?.startedAt ?? new Date().toISOString());
  const [selected, setSelected] = useState<string | null>(initialDraft?.selected ?? null);
  const [showHint, setShowHint] = useState(false);
  const [message, setMessage] = useState("");
  const question = lesson.questions[step];
  const correct = selected === question.answer;

  useEffect(() => {
    window.localStorage.setItem(draftKey, JSON.stringify({ lessonId: lesson.id, step, helpUsed, startedAt, answers, selected } satisfies Draft));
  }, [answers, draftKey, helpUsed, lesson.id, selected, startedAt, step]);

  function choose(choice: string) {
    if (selected === question.answer) return;
    setSelected(choice);
    setAnswers((current) => {
      const next = [...current];
      next[step] = choice;
      return next;
    });
    if (choice === question.answer) {
      setMessage("أحسنت الانتباه. خلّينا نكمل للمثال التالي.");
    } else {
      setMessage("قريب! جرّب مرة ثانية، وخذ وقتك.");
    }
  }

  function advance() {
    if (step + 1 < lesson.questions.length) {
      setStep((value) => value + 1);
      setSelected(null);
      setMessage("");
      setShowHint(false);
      return;
    }
    window.localStorage.removeItem(draftKey);
    onComplete({ helpUsed, startedAt, answers });
  }

  function readPrompt() {
    if (!audioEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${question.prompt}. ${question.choices.join(". ")}`);
    utterance.lang = "ar";
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="lesson-scrim">
      <section className="lesson-panel" aria-label={lesson.title}>
        <header className="lesson-topbar">
          <button className="icon-button lesson-exit" type="button" onClick={onExit} aria-label="الخروج من النشاط"><X size={22} /></button>
          <div className="lesson-progress" aria-label={`الخطوة ${step + 1} من ${lesson.questions.length}`}>
            {lesson.questions.map((item, index) => <span key={item.prompt} className={index <= step ? "active" : ""} />)}
          </div>
          <span className="lesson-step-label">{step + 1} / {lesson.questions.length}</span>
        </header>

        <div className="lesson-body">
          <div className={`lesson-symbol theme-${lesson.theme}`}>{lesson.icon}</div>
          <p className="eyebrow">محطة قصيرة · {lesson.title}</p>
          <h2>{question.prompt}</h2>
          {question.object && <div className="lesson-object" aria-label="مجموعة أشياء للعدّ">{question.object}</div>}
          <button className="read-aloud" type="button" onClick={readPrompt} disabled={!audioEnabled}>
            <Volume2 size={17} /> {audioEnabled ? "اسمع السؤال" : "الصوت مكتوم"}
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
                  className={`answer-option${isCorrectChoice ? " answer-correct" : ""}${isWrongChoice ? " answer-wrong" : ""}`}
                  onClick={() => choose(choice)}
                  aria-pressed={isSelected}
                >
                  <span>{choice}</span>
                  {isCorrectChoice && <Check size={18} />}
                </button>
              );
            })}
          </div>

          <button
            className={`hint-toggle${showHint ? " is-open" : ""}`}
            type="button"
            onClick={() => { setShowHint((value) => !value); setHelpUsed(true); }}
            aria-expanded={showHint}
          >
            <HelpCircle size={18} /> تلميح من فطين
          </button>
          {showHint && <div className="hint-card"><span className="hint-dot">ف</span><p>{question.hint ?? "لاحظ المثال مرة أخرى، ثم جرّب على راحتك."}</p></div>}

          <div className={`lesson-feedback${message ? " has-message" : ""}`} aria-live="polite">
            {message && <span className={correct ? "feedback-good" : "feedback-soft"}>{message}</span>}
            {correct && <button className="button button-primary" type="button" onClick={advance}>{step + 1 < lesson.questions.length ? "المثال التالي" : "إنهاء المحطة"}<ArrowRight size={17} /></button>}
          </div>
        </div>
      </section>

    </div>
  );
}

function readDraft(key: string, lessonId: string, maximum: number, legacyKey: string): Draft | null {
  const current = readDraftValue(key, lessonId, maximum);
  if (current) return current;

  const legacy = readDraftValue(legacyKey, lessonId, maximum);
  if (!legacy) return null;
  window.localStorage.setItem(key, JSON.stringify(legacy));
  window.localStorage.removeItem(legacyKey);
  return legacy;
}

function readDraftValue(key: string, lessonId: string, maximum: number): Draft | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "null") as Draft | null;
    if (!value || value.lessonId !== lessonId || value.step < 0 || value.step >= maximum) return null;
    value.answers ??= [];
    value.selected = typeof value.selected === "string" ? value.selected : null;
    return value;
  } catch {
    return null;
  }
}
