import React, { useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  HeartPulse,
  Sparkles,
  CheckCircle2,
  BrainCircuit,
  Smile,
  Wind,
} from "lucide-react";
import { requestCbtReframe } from "@/services/api";
import { ThinkingOrb } from "thinking-orbs";
import { ttsPlayer } from "@/lib/iflytekTTS";

export const MoodTrackerSection: React.FC<{
  onStartChatWithMood?: (moodPrompt: string) => void;
}> = ({ onStartChatWithMood }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedMood, setSelectedMood] = useState<string>("🌿 Calm & Centered");
  const [energyLevel, setEnergyLevel] = useState<number>(3);
  const [valenceLevel, setValenceLevel] = useState<number>(4);
  const [moodNote, setMoodNote] = useState<string>("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // CBT Reframer state
  const [automaticThought, setAutomaticThought] = useState("");
  const [distortionType, setDistortionType] = useState("all-or-nothing");
  const [reframedThought, setReframedThought] = useState("");
  const [isReframing, setIsReframing] = useState(false);

  // GSAP Smooth Sanctuary Entrance
  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".mood-header-wrap", {
        y: -15,
        autoAlpha: 0,
        duration: 0.6,
      })
        .from(
          ".mood-main-card",
          {
            y: 28,
            autoAlpha: 0,
            scale: 0.98,
            stagger: 0.12,
            duration: 0.65,
          },
          "-=0.3"
        )
        .from(
          ".mood-item-stagger",
          {
            y: 10,
            autoAlpha: 0,
            scale: 0.96,
            stagger: 0.03,
            duration: 0.4,
            ease: "power2.out",
          },
          "-=0.2"
        );
    },
    { scope: containerRef }
  );

  const moodOptions = [
    { label: "😊 Joyful & Grateful", emoji: "😊", color: "border-amber-400 bg-amber-500/10 text-amber-600" },
    { label: "🌿 Calm & Centered", emoji: "🌿", color: "border-emerald-400 bg-emerald-500/10 text-emerald-600" },
    { label: "😰 Anxious & Uneasy", emoji: "😰", color: "border-purple-400 bg-purple-500/10 text-purple-600" },
    { label: "😔 Low & Dejected", emoji: "😔", color: "border-blue-400 bg-blue-500/10 text-blue-600" },
    { label: "😴 Drained & Burnt out", emoji: "😴", color: "border-stone-400 bg-stone-500/10 text-stone-600" },
    { label: "😡 Frustrated & Tense", emoji: "😡", color: "border-rose-400 bg-rose-500/10 text-rose-600" },
  ];

  const handleSaveCheckIn = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleCbtReframe = async () => {
    if (!automaticThought.trim()) return;
    setIsReframing(true);

    try {
      const result = await requestCbtReframe(automaticThought, distortionType);
      setReframedThought(result);
    } catch (err) {
      console.error("Reframe error:", err);
    } finally {
      setIsReframing(false);
    }
  };

  return (
    <div ref={containerRef} className="container mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-8 select-none">
      {/* Title Header */}
      <div className="mood-header-wrap text-center max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
          <HeartPulse className="size-3.5 text-rose-500" />
          <span>Daily Mood Radar & CBT Cognitive Toolkit</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-lato-light">
          Track Your Mindset, Reframe Distortions
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground font-lato-light-italic">
          Grounded in evidence-based Cognitive Behavioral Therapy (CBT) and mindful reflection.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Module 1: Daily Mood Check-in (7 cols) */}
        <Card className="mood-main-card md:col-span-7 rounded-3xl p-6 border border-emerald-500/20 bg-card/85 dark:bg-card/70 shadow-md shadow-emerald-500/5 backdrop-blur-md">
          <CardHeader className="p-0 mb-5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Smile className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Daily Mood Check-In</CardTitle>
                <p className="text-xs text-muted-foreground">Notice and honor how you feel right now</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })}
            </span>
          </CardHeader>

          <CardContent className="p-0 space-y-5">
            {/* Mood Category Selector */}
            <div>
              <label className="text-xs font-semibold text-foreground/80 mb-2.5 block">
                1. Select your primary emotional state:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {moodOptions.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setSelectedMood(opt.label)}
                    className={`mood-item-stagger flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition-all cursor-pointer ${
                      selectedMood === opt.label
                        ? `${opt.color} ring-2 ring-primary/40 font-semibold shadow-xs`
                        : "border-border/70 hover:bg-accent text-foreground/80"
                    }`}
                  >
                    <span className="text-lg">{opt.emoji}</span>
                    <span className="truncate">{opt.label.slice(2)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders: Energy & Valence */}
            <div className="space-y-4 pt-2 border-t border-border/60">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-foreground/80">Energy Level</span>
                  <span className="font-semibold text-primary">{energyLevel} / 5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(Number(e.target.value))}
                  className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>🔋 Fully Depleted</span>
                  <span>⚡ Vibrant & Energized</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-foreground/80">Emotional Valence (Pleasantness)</span>
                  <span className="font-semibold text-rose-500">{valenceLevel} / 5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={valenceLevel}
                  onChange={(e) => setValenceLevel(Number(e.target.value))}
                  className="w-full accent-rose-500 h-2 bg-muted rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>🌧️ Deeply Low</span>
                  <span>☀️ Uplifted & Joyful</span>
                </div>
              </div>
            </div>

            {/* Optional note */}
            <div>
              <label className="text-xs font-semibold text-foreground/80 mb-1.5 block">
                2. Context / Triggers (Optional):
              </label>
              <textarea
                value={moodNote}
                onChange={(e) => setMoodNote(e.target.value)}
                placeholder="e.g., Demanding project timeline triggered my overthinking..."
                rows={2}
                className="w-full rounded-xl border border-input bg-background p-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStartChatWithMood && onStartChatWithMood(`I just logged my mood check-in. I'm feeling ${selectedMood}, with energy level ${energyLevel}/5 and valence ${valenceLevel}/5. Notes: ${moodNote || "I'd like to reflect with you on how to navigate this."}`)}
                className="rounded-xl text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Sparkles className="size-3.5" />
                <span>Reflect on this</span>
              </Button>

              <Button
                size="sm"
                onClick={handleSaveCheckIn}
                className="rounded-xl text-xs px-5 gap-1.5"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-300" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Check-In</span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Module 2: CBT Cognitive Reframer & Grounding (5 cols) */}
        <div className="md:col-span-5 space-y-6">
          {/* CBT Reframer */}
          <Card className="mood-main-card rounded-3xl p-5 border border-emerald-500/20 bg-card/85 dark:bg-card/70 shadow-md shadow-emerald-500/5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <BrainCircuit className="size-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">CBT Cognitive Reframer</h3>
                <p className="text-[11px] text-muted-foreground">Unmask distortions, rebuild mental clarity</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-foreground/80 block mb-1">Automatic Negative Thought:</span>
                <input
                  type="text"
                  value={automaticThought}
                  onChange={(e) => setAutomaticThought(e.target.value)}
                  placeholder="e.g., If this isn't perfect, I'm a total failure..."
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div>
                <span className="font-semibold text-foreground/80 block mb-1">Suspected Distortion:</span>
                <select
                  value={distortionType}
                  onChange={(e) => setDistortionType(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="all-or-nothing">All-or-Nothing Thinking</option>
                  <option value="catastrophizing">Catastrophizing</option>
                  <option value="emotional-reasoning">Emotional Reasoning</option>
                </select>
              </div>

              <Button
                size="sm"
                onClick={handleCbtReframe}
                disabled={!automaticThought.trim() || isReframing}
                className="w-full rounded-xl text-xs h-8 gap-1.5"
              >
                <Sparkles className="size-3.5" />
                <span>{isReframing ? "Reframing with CBT..." : "Scientifically Reframe"}</span>
              </Button>

              {isReframing && (
                <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-center gap-3 animate-in fade-in duration-200">
                  <ThinkingOrb state="solving" size={64} speed={0.85} />
                  <span className="text-[11px] font-lato-light-italic text-muted-foreground">
                    Formulating balanced perspective...
                  </span>
                </div>
              )}

              {reframedThought && !isReframing && (
                <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-[11px] leading-relaxed text-foreground whitespace-pre-line animate-in fade-in-50">
                  {reframedThought}
                </div>
              )}
            </div>
          </Card>

          {/* Quick Mindfulness Kit */}
          <Card className="rounded-3xl p-5 border-border/80 bg-linear-to-br from-emerald-500/5 to-teal-500/10 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Wind className="size-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  30s Somatic Grounding (5-4-3-2-1)
                </h4>
              </div>
              <button
                onClick={() =>
                  ttsPlayer.play(
                    "grounding-audio",
                    "Welcome to your 30-second somatic grounding. Take a deep, gentle breath. Look around and notice five things you can see. Four textures you can touch. Three sounds you can hear. Two scents you can smell. And one deep, calming breath. You are safe in this present moment.",
                    "female",
                    45
                  )
                }
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 transition-colors"
              >
                <span>🔊 Listen Voice Guide</span>
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed font-lato-light-italic">
              Look around and acknowledge: <strong>5 things</strong> you can see, <strong>4 textures</strong> you can touch, <strong>3 sounds</strong> you hear, <strong>2 scents</strong> you smell, and take <strong>1 deep restorative breath</strong>.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
