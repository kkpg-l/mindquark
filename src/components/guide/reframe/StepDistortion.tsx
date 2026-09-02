import React from "react";
import { Sparkles, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThinkingOrb } from "thinking-orbs";
import type { GuideReframeResult } from "@/services/api";
import type { WizardStepProps } from "./wizardTypes";

const DISTORTIONS: Array<{ type: string; label: string; labelZh: string; description: string }> = [
  { type: "all-or-nothing", label: "All-or-nothing", labelZh: "非黑即白", description: "Only extremes — perfect or total failure." },
  { type: "catastrophizing", label: "Catastrophizing", labelZh: "灾难化", description: "The worst outcome already feels decided." },
  { type: "overgeneralization", label: "Overgeneralization", labelZh: "以偏概全", description: "One event becomes 'always' or 'never'." },
  { type: "mind-reading", label: "Mind-reading", labelZh: "读心", description: "Assuming you know what others think." },
  { type: "fortune-telling", label: "Fortune-telling", labelZh: "预言未来", description: "Predicting the future as fixed fact." },
  { type: "emotional-reasoning", label: "Emotional reasoning", labelZh: "情绪推理", description: "Feelings treated as proof." },
  { type: "should-statements", label: "Should statements", labelZh: "应该思维", description: "Rigid rules for you and others." },
  { type: "labeling", label: "Labeling", labelZh: "贴标签", description: "A harsh fixed label on yourself." },
  { type: "discounting-positive", label: "Discounting positive", labelZh: "否定积极", description: "Wins and strengths don't count." },
  { type: "personalization", label: "Personalization", labelZh: "个人化", description: "Blaming self for what you can't control." },
  { type: "blame", label: "Blame", labelZh: "归咎他人", description: "Others held entirely responsible." },
  { type: "filtering", label: "Filtering", labelZh: "过滤", description: "Only the negatives get through." },
];

interface StepDistortionProps extends WizardStepProps {
  aiResult: GuideReframeResult | null;
  isAnalyzing: boolean;
}

export const StepDistortion: React.FC<StepDistortionProps> = ({ session, update, aiResult, isAnalyzing }) => {
  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <ThinkingOrb state="solving" size={64} speed={0.85} />
        <p className="text-sm text-muted-foreground font-lato-light-italic">
          Reading your thought with care — one moment...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-foreground">Spot the thinking trap</h3>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-lato-light-italic">
          Does this pattern sound like yours? Confirm it, or pick what fits better.
        </p>
      </div>

      {aiResult && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <Sparkles className="size-3.5" />
            <span>AI observation</span>
            {aiResult.degraded && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[9px] text-amber-600 dark:text-amber-300">
                <Cpu className="size-2.5" />
                offline fallback
              </span>
            )}
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed">{aiResult.distortion.explanation}</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {DISTORTIONS.map((distortion) => {
          const isSelected = session.confirmedDistortion === distortion.type;
          const isAiPick = aiResult?.distortion.type === distortion.type;
          return (
            <button
              key={distortion.type}
              onClick={() => update({ confirmedDistortion: distortion.type })}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer",
                isSelected
                  ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/40"
                  : "border-muted-foreground/15 hover:border-emerald-500/40 hover:bg-emerald-500/5"
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground">{distortion.label}</span>
                {isAiPick && !isSelected && (
                  <Sparkles className="size-3 text-emerald-500/70" />
                )}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{distortion.labelZh}</div>
              <div className="text-[10px] text-muted-foreground/80 mt-1 leading-snug">
                {distortion.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
