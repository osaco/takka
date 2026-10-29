"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, HelpCircle, X } from "lucide-react";
import { resolveScaffoldHint } from "@/lib/core/activity";
import type { Lesson } from "@/lib/types";
import { ActivityTemplateHost } from "@/components/activity-templates/activity-template-host";

type Props = {
  lesson: Lesson;
  childId: string;
  audioEnabled: boolean;
  onExit: (hasInteracted?: boolean) => void;
  onComplete: (details: {
    helpUsed: boolean;
    startedAt: string;
    completedAt: string;
    answers: string[];
    stepAttempts: number[];
  }) => void;
};

type Draft = {
  lessonId: string;
  step: number;
  helpUsed: boolean;
  startedAt: string;
  answers: string[];
  selected: string | null;
  stepAttempts?: number[];
};

export function LessonPlayer({ lesson, childId, audioEnabled, onExit, onComplete }: Props) {
  const legacyDraftKey = `takka.draft.v1.${childId}`;
  const draftKey = `${legacyDraftKey}.${lesson.id}`;
  const initialDraft = useMemo(
    () =>
      typeof window === "undefined"
        ? null
        : readDraft(draftKey, lesson.id, lesson.questions.length, legacyDraftKey),
    [draftKey, legacyDraftKey, lesson.id, lesson.questions.length],
  );
  const [step, setStep] = useState(initialDraft?.step ?? 0);
  const [helpUsed, setHelpUsed] = useState(initialDraft?.helpUsed ?? false);
  const [answers, setAnswers] = useState<string[]>(initialDraft?.answers ?? []);
  const [startedAt] = useState(initialDraft?.startedAt ?? new Date().toISOString());
  const [selected, setSelected] = useState<string | null>(initialDraft?.selected ?? null);
  const [stepAttempts, setStepAttempts] = useState<number[]>(
    initialDraft?.stepAttempts ?? new Array(lesson.questions.length).fill(0),
  );
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [message, setMessage] = useState("");

  const question = lesson.questions[step] ?? lesson.questions[0];
  const isTemplateActivity = Boolean(lesson.template && lesson.template !== "multiple_choice");
  const isStepCorrect = selected !== null && (selected === question?.answer || (isTemplateActivity && Boolean(selected)));

  useEffect(() => {
    window.localStorage.setItem(
      draftKey,
      JSON.stringify({
        lessonId: lesson.id,
        step,
        helpUsed,
        startedAt,
        answers,
        selected,
        stepAttempts,
      } satisfies Draft),
    );
  }, [answers, draftKey, helpUsed, lesson.id, selected, startedAt, step, stepAttempts]);

  function choose(choice: string) {
    if (selected === question.answer) return;
    setSelected(choice);
    setAnswers((current) => {
      const next = [...current];
      next[step] = choice;
      return next;
    });

    setStepAttempts((current) => {
      const next = [...current];
      next[step] = (next[step] ?? 0) + 1;
      return next;
    });

    if (choice === question.answer) {
      setMessage("أحسنت الانتباه. خلّينا نكمل للمثال التالي.");
    } else {
      setWrongAttempts((prev) => prev + 1);
      setMessage("قريب! جرّب مرة ثانية، وخذ وقتك.");
    }
  }

  function handleTemplateAttempt(isCorrect: boolean, attempts: number, answerValue: string) {
    setStepAttempts((current) => {
      const next = [...current];
      next[step] = (next[step] ?? 0) + 1;
      return next;
    });

    setAnswers((current) => {
      const next = [...current];
      next[step] = answerValue;
      return next;
    });

    if (isCorrect) {
      setSelected(answerValue);
      setMessage("أحسنت الإنجاز! خطوة موفقة ومتقنة.");
    } else {
      setWrongAttempts(attempts);
      setMessage("قريب! جرّب مرة ثانية على راحتك.");
    }
  }

  function advance() {
    if (step + 1 < lesson.questions.length) {
      setStep((value) => value + 1);
      setSelected(null);
      setMessage("");
      setShowHint(false);
      setWrongAttempts(0);
      return;
    }
    window.localStorage.removeItem(draftKey);
    onComplete({
      helpUsed,
      startedAt,
      completedAt: new Date().toISOString(),
      answers,
      stepAttempts,
    });
  }

  function readPrompt() {
    if (!audioEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const promptText = question?.prompt ?? lesson.title;
    const choicesText = question?.choices && question.choices.length > 0 ? question.choices.join(". ") : "";
    const utterance = new SpeechSynthesisUtterance(choicesText ? `${promptText}. ${choicesText}` : promptText);
    utterance.lang = "ar";
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  }

  const scaffoldHint = question ? resolveScaffoldHint(question, wrongAttempts) : "لاحظ المثال بهدوء، ثم جرّب على راحتك.";

  function handleExit() {
    const hasInteracted =
      step > 0 ||
      answers.some((a) => Boolean(a)) ||
      wrongAttempts > 0 ||
      selected !== null ||
      stepAttempts.some((c) => c > 0);
    onExit(hasInteracted);
  }

  return (
    <div className="lesson-scrim">
      <section className="lesson-panel" aria-label={lesson.title}>
        <header className="lesson-topbar">
          <button className="icon-button lesson-exit" type="button" onClick={handleExit} aria-label="الخروج من النشاط">
            <X size={22} />
          </button>
          <div className="lesson-progress" aria-label={`الخطوة ${step + 1} من ${lesson.questions.length}`}>
            {lesson.questions.map((item, index) => (
              <span key={`${item.prompt}-${index}`} className={index <= step ? "active" : ""} />
            ))}
          </div>
          <span className="lesson-step-label">{step + 1} / {lesson.questions.length}</span>
        </header>

        <div className="lesson-body">
          <div className={`lesson-symbol theme-${lesson.theme}`}>{lesson.icon}</div>
          <p className="eyebrow">محطة قصيرة · {lesson.title}</p>

          <ActivityTemplateHost
            activity={lesson}
            step={step}
            audioEnabled={audioEnabled}
            selected={selected}
            onSelectChoice={choose}
            onReadPrompt={readPrompt}
            onTemplateAttempt={handleTemplateAttempt}
          />

          <button
            className={`hint-toggle${showHint ? " is-open" : ""}`}
            type="button"
            onClick={() => {
              setShowHint((value) => !value);
              setHelpUsed(true);
            }}
            aria-expanded={showHint}
          >
            <HelpCircle size={18} /> تلميح من فطين
          </button>
          {showHint && (
            <div className="hint-card">
              <span className="hint-dot">ف</span>
              <p>{scaffoldHint}</p>
            </div>
          )}

          <div className={`lesson-feedback${message ? " has-message" : ""}`} aria-live="polite">
            {message && <span className={isStepCorrect ? "feedback-good" : "feedback-soft"}>{message}</span>}
            {isStepCorrect && (
              <button className="button button-primary" type="button" onClick={advance}>
                {step + 1 < lesson.questions.length ? "المثال التالي" : "إنهاء المحطة"}
                <ArrowRight size={17} />
              </button>
            )}
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
