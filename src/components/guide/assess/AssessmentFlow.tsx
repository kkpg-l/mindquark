import React from "react";
import type { NavTab } from "@/components/Navbar";
import type { ReframePreset } from "@/components/GuideSection";

export const AssessmentFlow: React.FC<{
  onBack: () => void;
  onStartReframe: (preset: ReframePreset) => void;
  onNavigate: (tab: NavTab) => void;
}> = () => (
  <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
    <p className="text-sm text-muted-foreground font-lato-light-italic">
      The assessment flow is being assembled — coming in the next step.
    </p>
  </div>
);
