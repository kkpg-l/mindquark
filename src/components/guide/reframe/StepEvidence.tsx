import React from "react";
import type { WizardStepProps } from "./wizardTypes";

export const StepEvidence: React.FC<WizardStepProps> = ({ session, update }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-lg sm:text-xl font-bold text-foreground">Weigh the evidence</h3>
      <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-lato-light-italic">
        Be a fair scientist of your own mind — both sides of the bench.
      </p>
    </div>

    <div className="space-y-2">
      <label className="text-xs font-semibold text-foreground/80">
        Evidence that supports the thought
      </label>
      <textarea
        value={session.evidenceFor}
        onChange={(e) => update({ evidenceFor: e.target.value })}
        rows={4}
        maxLength={1500}
        placeholder="Facts, not feelings — what genuinely backs it up?"
        className="w-full rounded-xl border border-muted-foreground/15 bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 resize-none"
      />
    </div>

    <div className="space-y-2">
      <label className="text-xs font-semibold text-foreground/80">
        Evidence against it
      </label>
      <textarea
        value={session.evidenceAgainst}
        onChange={(e) => update({ evidenceAgainst: e.target.value })}
        rows={4}
        maxLength={1500}
        placeholder="What would a kind, honest friend point out?"
        className="w-full rounded-xl border border-muted-foreground/15 bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 resize-none"
      />
    </div>

    <p className="text-[11px] text-muted-foreground">
      Both can stay blank — you can also skip ahead and come back.
    </p>
  </div>
);
