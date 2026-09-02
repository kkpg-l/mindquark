import React from "react";
import type { WizardStepProps } from "./wizardTypes";

export const StepSituation: React.FC<WizardStepProps> = ({ session, update }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-lg sm:text-xl font-bold text-foreground">Describe the situation</h3>
      <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-lato-light-italic">
        Just the facts — what happened, where, when?
      </p>
    </div>
    <textarea
      autoFocus
      value={session.situation}
      onChange={(e) => update({ situation: e.target.value })}
      rows={5}
      maxLength={2000}
      placeholder="e.g., I presented my project this morning and stumbled over two slides..."
      className="w-full rounded-xl border border-muted-foreground/15 bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 resize-none"
    />
    <div className="flex justify-between text-[11px] text-muted-foreground">
      <span>Stick to what a camera could record — thoughts and feelings come next.</span>
      <span className="font-mono">{session.situation.trim().length}/10 min</span>
    </div>
  </div>
);
