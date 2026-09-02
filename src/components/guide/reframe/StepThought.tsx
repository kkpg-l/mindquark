import React from "react";
import { cn } from "@/lib/utils";
import type { WizardStepProps } from "./wizardTypes";

const THOUGHT_TEMPLATES = [
  "If this isn't perfect, I'm a failure",
  "They must think I'm incompetent",
  "I always mess things up",
  "I can't handle this",
  "It'll never work out for me",
  "I don't deserve this",
  "Everyone else has it figured out",
  "My mistake ruined everything",
];

export const StepThought: React.FC<WizardStepProps> = ({ session, update }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-lg sm:text-xl font-bold text-foreground">Catch the automatic thought</h3>
      <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-lato-light-italic">
        What went through your mind in that moment — the exact words, if you can find them.
      </p>
    </div>
    <textarea
      autoFocus
      value={session.automaticThought}
      onChange={(e) => update({ automaticThought: e.target.value })}
      rows={4}
      maxLength={3000}
      placeholder="e.g., They all saw me fail — I'm clearly not cut out for this."
      className="w-full rounded-xl border border-muted-foreground/15 bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 resize-none"
    />
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Sound familiar? Tap one to borrow the words:
      </p>
      <div className="flex flex-wrap gap-2">
        {THOUGHT_TEMPLATES.map((template) => (
          <button
            key={template}
            onClick={() => update({ automaticThought: template })}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all cursor-pointer",
              session.automaticThought === template
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-muted-foreground/15 text-muted-foreground hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-foreground"
            )}
          >
            {template}
          </button>
        ))}
      </div>
    </div>
  </div>
);
