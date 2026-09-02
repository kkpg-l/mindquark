import React from "react";
import type { ReframePreset } from "@/components/GuideSection";

export const ReframeWizard: React.FC<{
  preset: ReframePreset | null;
  onBack: () => void;
  onStartChatWithPrompt: (prompt?: string) => void;
}> = () => (
  <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
    <p className="text-sm text-muted-foreground font-lato-light-italic">
      The reframe wizard is being assembled — coming in the next step.
    </p>
  </div>
);
