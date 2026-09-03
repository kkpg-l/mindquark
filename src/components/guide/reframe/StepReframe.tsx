import React from "react";
import { Route } from "lucide-react";
import type { WizardStepProps } from "./wizardTypes";

export const StepReframe: React.FC<WizardStepProps> = ({ session, update }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-lg sm:text-xl font-bold text-foreground">Write the balanced thought</h3>
      <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-lato-light-italic">
        Not forced positivity — just fair, and true to the whole picture.
      </p>
    </div>

    <textarea
      value={session.reframedThought}
      onChange={(e) => update({ reframedThought: e.target.value })}
      rows={5}
      maxLength={1200}
      placeholder="e.g., Stumbling on two slides doesn't erase the work I put in. Most people were focused on the ideas, and I can practice the delivery."
      className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 resize-none"
    />
    <p className="text-[11px] text-muted-foreground">
      Edit to make it yours — your words land softer than borrowed ones.
    </p>

    {session.actionableStep && (
      <div className="rounded-2xl border border-teal-500/25 bg-teal-500/5 p-4 flex gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/25 text-teal-600 dark:text-teal-400">
          <Route className="size-4" />
        </div>
        <div className="space-y-0.5">
          <p className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">One small step for today</p>
          <p className="text-sm text-foreground/85 leading-relaxed">{session.actionableStep}</p>
        </div>
      </div>
    )}
  </div>
);
