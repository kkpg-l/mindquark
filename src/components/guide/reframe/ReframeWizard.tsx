import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ChevronLeft, ChevronRight, Compass } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chimeAudio } from "@/lib/chimeAudio";
import { isHighRiskText, getCrisisFallback } from "@/lib/safety";
import { CrisisNotice } from "@/components/guide/CrisisNotice";
import {
  createEmptyReframeSession,
  loadReframeDraft,
  saveReframeDraft,
  clearReframeDraft,
  type ReframeSession,
} from "@/lib/guideStore";
import { getEmotionById } from "@/lib/emotionsDatabase";
import { requestGuideReframe, type GuideReframeResult } from "@/services/api";
import type { ReframePreset } from "@/components/GuideSection";
import { StepSituation } from "./StepSituation";
import { StepThought } from "./StepThought";
import { StepEmotion } from "./StepEmotion";
import { StepDistortion } from "./StepDistortion";
import { StepEvidence } from "./StepEvidence";
import { StepReframe } from "./StepReframe";
import { StepSummary } from "./StepSummary";
import { STEPS } from "./wizardTypes";

export const ReframeWizard: React.FC<{
  preset: ReframePreset | null;
  onBack: () => void;
  onStartChatWithPrompt: (prompt?: string) => void;
}> = ({ preset, onBack, onStartChatWithPrompt }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [session, setSession] = useState<ReframeSession>(() =>
    preset
      ? { ...createEmptyReframeSession(), situation: preset.situation ?? "" }
      : loadReframeDraft() ?? createEmptyReframeSession()
  );
  const [draftRestored] = useState(() => !preset && Boolean(loadReframeDraft()));
  const [aiResult, setAiResult] = useState<GuideReframeResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [crisisText, setCrisisText] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const directionRef = useRef(1);
  const stepRef = useRef<HTMLDivElement>(null);

  const isLastStep = stepIndex === STEPS.length - 1;

  const update = (patch: Partial<ReframeSession>) => {
    setSession((prev) => ({ ...prev, ...patch }));
    if (
      stepIndex < 3 &&
      (patch.situation !== undefined || patch.automaticThought !== undefined)
    ) {
      setAiResult(null);
    }
  };

  useEffect(() => {
    if (!completed) saveReframeDraft(session);
  }, [session, completed]);

  const goToStep = (next: number) => {
    if (next < 0 || next >= STEPS.length) return;
    directionRef.current = next > stepIndex ? 1 : -1;
    setStepIndex(next);
    chimeAudio.playPhaseChime("hold");
  };

  useGSAP(
    () => {
      if (!stepRef.current) return;
      gsap.fromTo(
        stepRef.current,
        { y: directionRef.current > 0 ? 24 : -24, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.35, ease: "power2.out" }
      );
    },
    { dependencies: [stepIndex] }
  );

  const canProceed = (): boolean => {
    switch (stepIndex) {
      case 0:
        return session.situation.trim().length >= 10;
      case 1:
        return session.automaticThought.trim().length >= 5;
      case 2:
        return Boolean(session.selectedEmotionId);
      case 3:
        return Boolean(session.confirmedDistortion);
      case 4:
        return true;
      case 5:
        return session.reframedThought.trim().length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (crisisText) return;
    const textFields = [session.situation, session.automaticThought, session.evidenceFor, session.evidenceAgainst];
    if (textFields.some((field) => isHighRiskText(field))) {
      setCrisisText(getCrisisFallback(session.situation || session.automaticThought));
      return;
    }
    if (!canProceed()) return;
    goToStep(stepIndex + 1);
  };

  const handleStepBack = () => {
    if (stepIndex === 0) onBack();
    else goToStep(stepIndex - 1);
  };

  useEffect(() => {
    if (stepIndex !== 3 || aiResult || isAnalyzing) return;
    const run = async () => {
      setIsAnalyzing(true);
      try {
        const emotion = getEmotionById(session.selectedEmotionId);
        const result = await requestGuideReframe({
          situation: session.situation,
          automaticThought: session.automaticThought,
          emotionLabel: emotion ? `${emotion.label} (${emotion.labelZh})` : undefined,
          emotionIntensity: session.emotionIntensity,
        });
        setAiResult(result);
        setSession((prev) => ({
          ...prev,
          identifiedDistortion: result.distortion,
          confirmedDistortion: prev.confirmedDistortion ?? result.distortion.type,
          reframedThought: prev.reframedThought || result.reframe.balancedThought,
          actionableStep: result.reframe.actionableStep,
        }));
      } catch (err) {
        if ((err as Error)?.message === "CRISIS") {
          setCrisisText(getCrisisFallback(session.automaticThought));
        }
      } finally {
        setIsAnalyzing(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  const handleFinish = () => {
    setSession((prev) => ({ ...prev, completedAt: new Date().toISOString() }));
    setCompleted(true);
    clearReframeDraft();
    chimeAudio.playPhaseChime("complete");
  };

  const handleRestart = () => {
    clearReframeDraft();
    setSession(createEmptyReframeSession());
    setAiResult(null);
    setCrisisText(null);
    setCompleted(false);
    setStepIndex(0);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 py-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={onBack}
          className="rounded-full text-muted-foreground hover:text-foreground hover:bg-emerald-500/10 gap-1 -ml-2"
        >
          <ChevronLeft className="size-4" />
          Guide home
        </Button>
        <span className="text-[11px] font-mono text-muted-foreground">
          Step {stepIndex + 1} / {STEPS.length} · {STEPS[stepIndex]}
        </span>
      </div>

      {/* 7-segment progress */}
      <div className="flex gap-1.5">
        {STEPS.map((step, i) => (
          <div key={step} className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500",
                i <= stepIndex ? "w-full" : "w-0"
              )}
            />
          </div>
        ))}
      </div>

      {draftRestored && !completed && (
        <p className="text-[11px] text-muted-foreground font-lato-light-italic">
          Draft restored — pick up right where you left off.
        </p>
      )}

      {preset?.distortionType && !session.confirmedDistortion && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-teal-500/25 bg-teal-500/5 px-4 py-3">
          <Compass className="size-4 shrink-0 text-teal-500/80" />
          <p className="flex-1 text-xs text-muted-foreground leading-relaxed">
            From your assessment — suggested focus:{" "}
            <span className="font-semibold capitalize text-foreground">
              {preset.distortionType.replace(/-/g, " ")}
            </span>
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => update({ confirmedDistortion: preset.distortionType })}
            className="shrink-0 rounded-full h-7 text-[11px] border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10"
          >
            Adopt
          </Button>
        </div>
      )}

      {crisisText && <CrisisNotice text={crisisText} onDismiss={() => setCrisisText(null)} />}

      <Card className="rounded-3xl border border-emerald-500/20 bg-card/85 dark:bg-card/70 shadow-md shadow-emerald-500/5 backdrop-blur-md p-6 sm:p-8">
        <div ref={stepRef}>
          {stepIndex === 0 && <StepSituation session={session} update={update} />}
          {stepIndex === 1 && <StepThought session={session} update={update} />}
          {stepIndex === 2 && <StepEmotion session={session} update={update} />}
          {stepIndex === 3 && (
            <StepDistortion session={session} update={update} aiResult={aiResult} isAnalyzing={isAnalyzing} />
          )}
          {stepIndex === 4 && <StepEvidence session={session} update={update} />}
          {stepIndex === 5 && <StepReframe session={session} update={update} />}
          {stepIndex === 6 && (
            <StepSummary
              session={session}
              completed={completed}
              onStartChatWithPrompt={onStartChatWithPrompt}
              onFinish={handleFinish}
              onRestart={handleRestart}
            />
          )}
        </div>
      </Card>

      {!isLastStep && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleStepBack}
            className="rounded-full text-muted-foreground hover:text-foreground hover:bg-emerald-500/10 gap-1"
          >
            <ChevronLeft className="size-4" />
            {stepIndex === 0 ? "Leave wizard" : "Back"}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || !!crisisText || isAnalyzing}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
          >
            Continue
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
