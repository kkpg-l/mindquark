import React from "react";
import { ArrowRight, CheckCircle2, MessageCircleHeart, RotateCcw, Save, Route } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ReframeSession } from "@/lib/guideStore";

interface StepSummaryProps {
  session: ReframeSession;
  completed: boolean;
  onStartChatWithPrompt: (prompt?: string) => void;
  onFinish: () => void;
  onRestart: () => void;
}

export const StepSummary: React.FC<StepSummaryProps> = ({
  session,
  completed,
  onStartChatWithPrompt,
  onFinish,
  onRestart,
}) => {
  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-7" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg sm:text-xl font-bold text-foreground">Saved. Take a breath.</h3>
          <p className="text-sm text-muted-foreground font-lato-light-italic max-w-sm">
            You just walked one sticky thought all the way around — that&apos;s real CBT work. Your
            record stays on this device.
          </p>
        </div>
        <Button
          onClick={onRestart}
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-10 gap-1.5"
        >
          <RotateCcw className="size-4" />
          Start a new one
        </Button>
      </div>
    );
  }

  const continuePrompt = `I just completed a CBT reframe. My original thought was "${session.automaticThought}" and I reframed it to "${session.reframedThought}" — can we keep exploring this together?`;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-foreground">Before and after</h3>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-lato-light-italic">
          Look how far that thought has traveled.
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-stretch gap-3 md:gap-2">
        <Card className="flex-1 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
          <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-300">The automatic thought</p>
          <p className="text-sm text-foreground/85 leading-relaxed italic">
            &ldquo;{session.automaticThought}&rdquo;
          </p>
          {session.confirmedDistortion && (
            <p className="text-[11px] text-muted-foreground">
              Pattern noticed: <span className="font-semibold capitalize">{session.confirmedDistortion.replace(/-/g, " ")}</span>
            </p>
          )}
        </Card>

        <div className="flex items-center justify-center">
          <ArrowRight className="size-5 text-emerald-500/70 rotate-90 md:rotate-0" />
        </div>

        <Card className="flex-1 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-2">
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">The balanced thought</p>
          <p className="text-sm text-foreground/85 leading-relaxed">{session.reframedThought}</p>
          {session.actionableStep && (
            <p className="flex gap-1.5 text-[11px] text-muted-foreground">
              <Route className="size-3.5 mt-0.5 shrink-0 text-teal-500/70" />
              {session.actionableStep}
            </p>
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-2.5">
        <Button
          onClick={() => onStartChatWithPrompt(continuePrompt)}
          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-10 gap-1.5"
        >
          <MessageCircleHeart className="size-4" />
          Continue in conversation
        </Button>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Button
            onClick={onFinish}
            variant="outline"
            className="flex-1 rounded-xl border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 h-9 gap-1.5"
          >
            <Save className="size-4" />
            Save &amp; finish
          </Button>
          <Button
            onClick={onRestart}
            variant="ghost"
            className="flex-1 rounded-xl text-muted-foreground hover:text-foreground h-9 gap-1.5"
          >
            <RotateCcw className="size-4" />
            Start over
          </Button>
        </div>
      </div>
    </div>
  );
};
