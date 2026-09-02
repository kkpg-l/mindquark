import React, { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ChevronLeft, ChevronRight, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chimeAudio } from "@/lib/chimeAudio";
import { isHighRiskText, getCrisisFallback } from "@/lib/safety";
import type { AttentionArea } from "@/lib/cognitiveEngine";
import { QUIZ_QUESTIONS, ATTENTION_AREA_LABELS } from "./quizQuestions";

export interface QuizAnswers {
  lowFrequency: number;
  interestLoss: number;
  ruminateVsAct: number;
  standards: number;
  avoidVsFace: number;
  sleepQuality: number;
  attentionAreas: AttentionArea[];
  copingActivities: string[];
  supportPreference: number;
  openText: string;
}

type AnswerRecord = Record<number, number | string | string[] | AttentionArea[]>;

function toQuizAnswers(record: AnswerRecord): QuizAnswers {
  const num = (id: number, fallback: number) =>
    typeof record[id] === "number" ? (record[id] as number) : fallback;
  return {
    lowFrequency: num(1, 3),
    interestLoss: num(2, 3),
    ruminateVsAct: num(3, 3),
    standards: num(4, 3),
    avoidVsFace: num(5, 3),
    sleepQuality: num(6, 3),
    attentionAreas: Array.isArray(record[7]) ? (record[7] as AttentionArea[]) : [],
    copingActivities: Array.isArray(record[8]) ? (record[8] as string[]) : [],
    supportPreference: num(9, 1),
    openText: typeof record[10] === "string" ? (record[10] as string) : "",
  };
}

export const IntakeQuiz: React.FC<{
  onComplete: (answers: QuizAnswers) => void;
  onBack: () => void;
}> = ({ onComplete, onBack }) => {
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord>({});
  const [pendingOption, setPendingOption] = useState<number | null>(null);
  const [crisisText, setCrisisText] = useState<string | null>(null);
  const directionRef = useRef(1);
  const stepRef = useRef<HTMLDivElement>(null);

  const question = QUIZ_QUESTIONS[qIndex];
  const total = QUIZ_QUESTIONS.length;
  const isLast = qIndex === total - 1;

  useGSAP(
    () => {
      if (!stepRef.current) return;
      gsap.fromTo(
        stepRef.current,
        { y: directionRef.current > 0 ? 24 : -24, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.35, ease: "power2.out" }
      );
    },
    { dependencies: [qIndex] }
  );

  const goTo = (next: number) => {
    if (next < 0 || next >= total) return;
    directionRef.current = next > qIndex ? 1 : -1;
    setQIndex(next);
    chimeAudio.playPhaseChime("hold");
  };

  const handleSelectOption = (option: { label: string; value: number }) => {
    if (pendingOption !== null) return;
    setAnswers((prev) => ({ ...prev, [question.id]: option.value }));
    setPendingOption(option.value);
    const next = qIndex + 1;
    window.setTimeout(() => {
      setPendingOption(null);
      if (next < total) goTo(next);
    }, 300);
  };

  const toggleArea = (area: AttentionArea) => {
    const current = Array.isArray(answers[question.id]) ? (answers[question.id] as AttentionArea[]) : [];
    const isSelected = current.includes(area);
    if (!isSelected && current.length >= (question.maxSelect ?? 6)) return;
    setAnswers((prev) => ({
      ...prev,
      [question.id]: isSelected ? current.filter((a) => a !== area) : [...current, area],
    }));
  };

  const toggleActivity = (label: string) => {
    const current = Array.isArray(answers[question.id]) ? (answers[question.id] as string[]) : [];
    const isSelected = current.includes(label);
    if (!isSelected && current.length >= (question.maxSelect ?? 6)) return;
    setAnswers((prev) => ({
      ...prev,
      [question.id]: isSelected ? current.filter((l) => l !== label) : [...current, label],
    }));
  };

  const handleTextChange = (value: string) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    if (isHighRiskText(value)) {
      setCrisisText(getCrisisFallback(value));
    } else {
      setCrisisText(null);
    }
  };

  const handleNext = () => {
    if (crisisText) return;
    if (isLast) {
      onComplete(toQuizAnswers(answers));
      return;
    }
    goTo(qIndex + 1);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5">
        {QUIZ_QUESTIONS.map((q, i) => {
          const answered = answers[q.id] !== undefined && answers[q.id] !== "";
          return (
            <span
              key={q.id}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === qIndex
                  ? "w-6 bg-emerald-600 dark:bg-emerald-400"
                  : answered
                    ? "w-2 bg-emerald-500/60"
                    : "w-2 bg-muted-foreground/20"
              )}
            />
          );
        })}
      </div>

      <Card className="rounded-3xl border border-emerald-500/20 bg-card/85 dark:bg-card/70 shadow-md shadow-emerald-500/5 backdrop-blur-md p-6 sm:p-8">
        <div ref={stepRef} className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground">
              Question {qIndex + 1} / {total}
            </span>
            {question.hint && (
              <span className="text-[11px] text-muted-foreground font-lato-light-italic">{question.hint}</span>
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-foreground leading-snug">
            {question.question}
          </h3>

          {(question.type === "scale" || question.type === "choice") &&
            question.options?.map((option) => {
              const selected = answers[question.id] === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleSelectOption(option)}
                  className={cn(
                    "w-full text-left rounded-xl border px-4 py-3 text-sm font-medium transition-all cursor-pointer",
                    selected
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30"
                      : "border-muted-foreground/15 text-foreground/85 hover:border-emerald-500/40 hover:bg-emerald-500/5"
                  )}
                >
                  {option.label}
                </button>
              );
            })}

          {question.type === "multi" && question.areas && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {question.areas.map((area) => {
                const current = Array.isArray(answers[question.id])
                  ? (answers[question.id] as AttentionArea[])
                  : [];
                const selected = current.includes(area);
                return (
                  <button
                    key={area}
                    onClick={() => toggleArea(area)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-xs sm:text-sm font-medium transition-all cursor-pointer",
                      selected
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30"
                        : "border-muted-foreground/15 text-foreground/85 hover:border-emerald-500/40 hover:bg-emerald-500/5"
                    )}
                  >
                    {ATTENTION_AREA_LABELS[area]}
                  </button>
                );
              })}
            </div>
          )}

          {question.type === "multi" && question.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {question.options.map((option) => {
                const current = Array.isArray(answers[question.id])
                  ? (answers[question.id] as string[])
                  : [];
                const selected = current.includes(option.label);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleActivity(option.label)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-xs sm:text-sm font-medium transition-all cursor-pointer text-left",
                      selected
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30"
                        : "border-muted-foreground/15 text-foreground/85 hover:border-emerald-500/40 hover:bg-emerald-500/5"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}

          {question.type === "text" && (
            <textarea
              value={typeof answers[question.id] === "string" ? (answers[question.id] as string) : ""}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={question.placeholder}
              rows={4}
              maxLength={600}
              className="w-full rounded-xl border border-muted-foreground/15 bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 resize-none"
            />
          )}

          {crisisText && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-300 text-xs font-semibold">
                <ShieldAlert className="size-4" />
                <span>Your safety comes first</span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">{crisisText}</p>
            </div>
          )}
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={qIndex === 0 ? onBack : () => goTo(qIndex - 1)}
          className="rounded-full text-muted-foreground hover:text-foreground hover:bg-emerald-500/10 gap-1"
        >
          <ChevronLeft className="size-4" />
          {qIndex === 0 ? "Leave quiz" : "Back"}
        </Button>

        {(question.type === "multi" || question.type === "text") && (
          <Button
            onClick={handleNext}
            disabled={!!crisisText}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
          >
            {isLast ? "See my report" : "Continue"}
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
