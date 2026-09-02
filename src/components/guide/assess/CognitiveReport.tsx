import React from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  MessageCircleHeart,
  HeartPulse,
  Wind,
  ClipboardList,
  Sparkles,
  Compass,
  Quote,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { NavTab } from "@/components/Navbar";
import type { ReframePreset } from "@/components/GuideSection";
import type { CognitiveSnapshot, AttentionDriftWarning, TraitScores } from "@/lib/cognitiveEngine";
import { TraitRadar } from "./TraitRadar";
import { StateGauge } from "./StateGauge";
import { AttentionMapView } from "./AttentionMapView";

interface CognitiveReportProps {
  snapshot: CognitiveSnapshot;
  narrative: string | null;
  recommendations: string[];
  evidence: string[];
  semanticActive: boolean;
  driftWarnings: AttentionDriftWarning[];
  supportPreference?: number;
  onStartReframe: (preset: ReframePreset) => void;
  onNavigate: (tab: NavTab) => void;
  onRestart: () => void;
}

const TRAIT_EXPLANATIONS: Record<keyof TraitScores, string> = {
  perfectionism:
    "How tightly all-or-nothing standards and fear of mistakes show up in your recent signals.",
  avoidance: "How often difficult tasks, people, or feelings get sidestepped lately.",
  rumination: "How strongly repetitive, stuck thinking loops appear in your words.",
};

const TRAIT_DISTORTION_MAP: Record<keyof TraitScores, string> = {
  perfectionism: "should-statements",
  avoidance: "fortune-telling",
  rumination: "overgeneralization",
};

const MODULE_CTAS = [
  {
    prefValue: 1,
    icon: MessageCircleHeart,
    label: "Talk it through",
    description: "Open a warm conversation with your companion.",
    action: "chat" as const,
  },
  {
    prefValue: 2,
    icon: HeartPulse,
    label: "Guided reframe",
    description: "Reshape one sticky thought in 7 gentle steps.",
    action: "reframe" as const,
  },
  {
    prefValue: 3,
    icon: Wind,
    label: "Breathe with me",
    description: "A slow breathing reset for your nervous system.",
    action: "breathe" as const,
  },
  {
    prefValue: 4,
    icon: ClipboardList,
    label: "Revisit this report",
    description: "Your snapshots stay on this device — read at your own pace.",
    action: null,
  },
];

export const CognitiveReport: React.FC<CognitiveReportProps> = ({
  snapshot,
  narrative,
  recommendations,
  evidence,
  semanticActive,
  driftWarnings,
  supportPreference,
  onStartReframe,
  onNavigate,
  onRestart,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const sortedModules = React.useMemo(() => {
    const pref = supportPreference ?? 2;
    return [...MODULE_CTAS].sort(
      (a, b) => Math.abs(a.prefValue - pref) - Math.abs(b.prefValue - pref)
    );
  }, [supportPreference]);

  useGSAP(
    () => {
      gsap.from(".report-card", {
        y: 22,
        autoAlpha: 0,
        stagger: 0.1,
        duration: 0.55,
        ease: "power3.out",
      });
    },
    { scope: containerRef }
  );

  const percent = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <div ref={containerRef} className="space-y-5">
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-700 dark:text-amber-300">
        A self-awareness companion — not a diagnosis or medical advice.
      </div>

      {narrative && (
        <Card className="report-card rounded-3xl border border-emerald-500/20 bg-card/85 dark:bg-card/70 shadow-md shadow-emerald-500/5 backdrop-blur-md p-6 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="size-4" />
            </div>
            <h3 className="font-bold text-base text-foreground">What we noticed</h3>
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed">{narrative}</p>
          {evidence.length > 0 && (
            <div className="space-y-1.5 border-t border-emerald-500/10 pt-3">
              <p className="text-[11px] font-semibold text-muted-foreground">From your own words:</p>
              {evidence.map((quote, i) => (
                <p key={i} className="flex gap-1.5 text-[11px] text-muted-foreground italic">
                  <Quote className="size-3 mt-0.5 shrink-0 text-emerald-500/60" />
                  {quote}
                </p>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="report-card rounded-3xl border border-emerald-500/20 bg-card/85 dark:bg-card/70 shadow-md shadow-emerald-500/5 backdrop-blur-md p-6">
        <h3 className="font-bold text-base text-foreground mb-4">Thinking tendencies</h3>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-full sm:w-1/2">
            <TraitRadar traits={snapshot.traits} />
          </div>
          <div className="w-full sm:w-1/2 space-y-4">
            {(Object.keys(snapshot.traits) as Array<keyof TraitScores>).map((key) => (
              <div key={key} className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold capitalize text-foreground/85">{key}</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {percent(snapshot.traits[key])}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {TRAIT_EXPLANATIONS[key]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="report-card rounded-3xl border border-emerald-500/20 bg-card/85 dark:bg-card/70 shadow-md shadow-emerald-500/5 backdrop-blur-md p-6 space-y-5">
        <h3 className="font-bold text-base text-foreground">Current energy states</h3>
        <StateGauge
          label="Burnout load"
          description={
            snapshot.states.burnout >= 0.5
              ? "Running low on fuel lately — rest is not a reward, it's maintenance."
              : "Your tank seems to be holding a reasonable charge."
          }
          value={snapshot.states.burnout}
        />
        <StateGauge
          label="Motivation"
          description={
            snapshot.states.motivation >= 0.5
              ? "Your spark is still answering when you call it."
              : "Gentle momentum matters more than intensity right now."
          }
          value={snapshot.states.motivation}
          invert
        />
        <StateGauge
          label="Stress adaptation"
          description={
            snapshot.states.stressAdaptation >= 0.5
              ? "You've been bending without breaking under recent pressure."
              : "Stress has been landing a little harder than usual."
          }
          value={snapshot.states.stressAdaptation}
          invert
        />
      </Card>

      <Card className="report-card rounded-3xl border border-emerald-500/20 bg-card/85 dark:bg-card/70 shadow-md shadow-emerald-500/5 backdrop-blur-md p-6 space-y-4">
        <h3 className="font-bold text-base text-foreground">Where your attention lives</h3>
        <AttentionMapView attention={snapshot.attention} driftWarnings={driftWarnings} />
        <p className="text-[11px] text-muted-foreground border-t border-emerald-500/10 pt-3">
          Blended from{" "}
          {
            {
              "quiz+passive": "your quiz and local history",
              "passive-only": "your local history only",
              "quiz-only": "your quiz answers only",
            }[snapshot.source]
          }{" "}
          · AI semantic layer {semanticActive ? "active" : "offline — deterministic mode"}
        </p>
      </Card>

      {recommendations.length > 0 && (
        <Card className="report-card rounded-3xl border border-emerald-500/20 bg-card/85 dark:bg-card/70 shadow-md shadow-emerald-500/5 backdrop-blur-md p-6 space-y-5">
          <h3 className="font-bold text-base text-foreground">Gentle suggestions</h3>
          <ul className="space-y-2.5">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-foreground/85 leading-relaxed">
                <Compass className="size-4 mt-0.5 shrink-0 text-emerald-500/80" />
                {rec}
              </li>
            ))}
          </ul>

          <div className="border-t border-emerald-500/10 pt-4 space-y-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground">Matched to how you like to be supported:</p>
            {sortedModules.map((module, i) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.label}
                  className="flex items-center gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3.5 py-2.5"
                >
                  <Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">{module.label}</span>
                      {i === 0 && (
                        <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                          Best match
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{module.description}</p>
                  </div>
                  {module.action === "chat" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onNavigate("chat")}
                      className="rounded-full h-7 text-[11px] border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                    >
                      Open
                    </Button>
                  )}
                  {module.action === "reframe" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onStartReframe({})}
                      className="rounded-full h-7 text-[11px] border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                    >
                      Open
                    </Button>
                  )}
                  {module.action === "breathe" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onNavigate("breathe")}
                      className="rounded-full h-7 text-[11px] border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                    >
                      Open
                    </Button>
                  )}
                  {module.action === null && (
                    <span className="text-[10px] text-muted-foreground font-lato-light-italic">
                      You&apos;re here
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-2.5">
        <Button
          onClick={() => {
            const strongestTrait = (Object.keys(snapshot.traits) as Array<keyof TraitScores>).reduce(
              (a, b) => (snapshot.traits[b] > snapshot.traits[a] ? b : a)
            );
            onStartReframe({ distortionType: TRAIT_DISTORTION_MAP[strongestTrait] });
          }}
          className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-10 gap-1.5"
        >
          <HeartPulse className="size-4" />
          Reframe a thought
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate("breathe")}
          className="flex-1 rounded-xl border border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 h-10 gap-1.5"
        >
          <Wind className="size-4" />
          Breathe with me
        </Button>
      </div>
      <Button
        variant="ghost"
        onClick={onRestart}
        className="w-full rounded-xl text-muted-foreground hover:text-foreground h-9"
      >
        Retake assessment
      </Button>
    </div>
  );
};
