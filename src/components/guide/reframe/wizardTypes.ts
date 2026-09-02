import type { ReframeSession } from "@/lib/guideStore";

export interface WizardStepProps {
  session: ReframeSession;
  update: (patch: Partial<ReframeSession>) => void;
}

export const STEPS = ["Situation", "Thought", "Emotion", "Distortion", "Evidence", "Reframe", "Summary"] as const;
