"use client";

import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Check } from "lucide-react";
import type { ListenIdentifyConfig, ListenOption } from "@/lib/core/types";

interface Props {
  config: ListenIdentifyConfig;
  audioEnabled: boolean;
  onAttempt: (isCorrect: boolean, attempts: number, optionId: string) => void;
}

export function ListenIdentifyTemplate({ config, audioEnabled, onAttempt }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // إيقاف الصوت عند إلغاء التحميل
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // تشغيل الصوت يدوياً فقط عند النقر (لا تشغيل تلقائي نهائياً)
  const handlePlayAudio = () => {
    if (!audioEnabled) {
      setFeedback("الصوت مكتوم في الإعدادات؛ اقرأ السؤال أو فعّل الصوت.");
      return;
    }

    setIsPlaying(true);

    if (config.audioFile) {
      if (!audioRef.current) {
        audioRef.current = new Audio(config.audioFile);
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onerror = () => {
          // في حال تعذر ملف الصوت، نستخدم التوليف الصوتي كبديل
          playSpeechFallback();
        };
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => playSpeechFallback());
    } else {
      playSpeechFallback();
    }
  };

  const playSpeechFallback = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(config.audioText);
      utterance.lang = "ar";
      utterance.rate = 0.8;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlaying(false);
    }
  };

  const handleSelectOption = (option: ListenOption) => {
    if (selectedId && config.options.find((o) => o.id === selectedId)?.correct) {
      return; // مكتمل بالفعل
    }

    setSelectedId(option.id);

    if (option.correct) {
      setFeedback("أحسنت الاستماع والتمييز!");
      onAttempt(true, wrongCount, option.id);
    } else {
      const nextWrong = wrongCount + 1;
      setWrongCount(nextWrong);
      setFeedback("قريب! استمع مرة أخرى وجرّب اختياراً آخر.");
      onAttempt(false, nextWrong, option.id);
    }
  };

  return (
    <div className="listen-identify-container" dir="rtl">
      <h2>{config.prompt}</h2>

      {/* زر تشغيل الصوت اليدوي الكبير */}
      <div className="listen-audio-section">
        <button
          type="button"
          className={`listen-play-btn${isPlaying ? " is-playing" : ""}`}
          onClick={handlePlayAudio}
          aria-label={audioEnabled ? "استمع للصوت" : "الصوت مكتوم"}
        >
          {audioEnabled ? (
            <Volume2 size={28} className={isPlaying ? "animate-pulse" : ""} />
          ) : (
            <VolumeX size={28} />
          )}
          <span>
            {isPlaying
              ? "نستمع الآن…"
              : audioEnabled
              ? "اضغط للاستماع للصوت"
              : "الصوت مكتوم (المهمة واضحة بالنص أدناه)"}
          </span>
        </button>

        {/* نص المهمة البديل: يضمن فهم السؤال حتى لو كان الصوت معطلاً أو مكتوماً */}
        <p className="listen-text-fallback">
          <small>النص المقروء: «{config.audioText}»</small>
        </p>
      </div>

      <p className="listen-instruction" aria-live="polite">
        {feedback ?? "استمع إلى الصوت أعلاه ثم اختر الإجابة المناسبة."}
      </p>

      {/* شبكة الخيارات التفاعلية */}
      <div className="listen-options-grid" role="group" aria-label="خيارات التمييز">
        {config.options.map((option) => {
          const isSelected = selectedId === option.id;
          const isCorrect = isSelected && option.correct;
          const isWrong = isSelected && !option.correct;

          return (
            <button
              key={option.id}
              type="button"
              className={`listen-option-card${isCorrect ? " option-correct" : ""}${
                isWrong ? " option-wrong" : ""
              }`}
              onClick={() => handleSelectOption(option)}
              aria-pressed={isSelected}
            >
              {option.image ? (
                <span className="option-image">{option.image}</span>
              ) : option.char ? (
                <span className="option-char">{option.char}</span>
              ) : null}
              <span className="option-label">{option.label}</span>
              {isCorrect && <Check size={20} className="option-check" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
