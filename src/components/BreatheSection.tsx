import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Wind,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Heart,
  Eye,
  Hand,
  Ear,
  Smile,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Activity,
  Waves,
  Check,
  Flame,
  Triangle,
  Zap,
  Feather,
  Info,
  Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SparklesText } from "@/components/ui/sparkles-text";
import { chimeAudio } from "@/lib/chimeAudio";
import { cn } from "@/lib/utils";

export type BreathingTechnique =
  | "4-7-8"
  | "box"
  | "coherent"
  | "triangle"
  | "sigh"
  | "energy"
  | "54321";

export type BreathingPhase =
  | "prepare"
  | "inhale"
  | "inhaleExtra"
  | "hold"
  | "exhale"
  | "holdPost";

interface PhaseConfig {
  phase: BreathingPhase;
  duration: number; // in seconds
  title: string;
  guide: string;
  sound: "inhale" | "hold" | "exhale";
  colorClass: string;
  glowColor: string;
}

interface TechniqueConfig {
  id: BreathingTechnique;
  name: string;
  badge: string;
  timingBadge: string;
  desc: string;
  mechanism: string;
  benefits: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  phases: PhaseConfig[];
}

// Harmonious White & Green Botanical Palette across all techniques
const TECHNIQUES: TechniqueConfig[] = [
  {
    id: "4-7-8",
    name: "4-7-8 Vagus Nerve Reset",
    badge: "Sleep & Deep Calm",
    timingBadge: "4s In · 7s Hold · 8s Out",
    desc: "Dr. Andrew Weil's natural tranquilizer to down-regulate the nervous system, lower resting heart rate, and dissolve bedtime insomnia.",
    mechanism: "Extended exhales trigger vagal tone to release acetylcholine, rapidly braking cardiac acceleration and halting racing thoughts.",
    benefits: "Dissolves insomnia · Calms heart palpitations · Nighttime reset",
    icon: Sparkles,
    phases: [
      {
        phase: "inhale",
        duration: 4,
        title: "Inhale (4s)",
        guide: "Inhale quietly through your nose deep into your belly.",
        sound: "inhale",
        colorClass: "from-emerald-400 via-emerald-500 to-teal-600",
        glowColor: "rgba(16, 185, 129, 0.45)",
      },
      {
        phase: "hold",
        duration: 7,
        title: "Hold Full (7s)",
        guide: "Retain the fullness in quiet stillness, feeling your shoulders drop.",
        sound: "hold",
        colorClass: "from-teal-400 via-emerald-500 to-teal-600",
        glowColor: "rgba(20, 184, 166, 0.45)",
      },
      {
        phase: "exhale",
        duration: 8,
        title: "Exhale Completely (8s)",
        guide: "Release all air through your mouth with a gentle, continuous sigh.",
        sound: "exhale",
        colorClass: "from-emerald-500 via-teal-600 to-emerald-700",
        glowColor: "rgba(16, 185, 129, 0.35)",
      },
    ],
  },
  {
    id: "box",
    name: "Box Breathing 4-4-4-4",
    badge: "Focus & Tactical Calm",
    timingBadge: "4s In · 4s Hold · 4s Out · 4s Rest",
    desc: "Navy SEALs tactical protocol to clear acute brain fog, neutralize the fight-or-flight panic reflex, and regain situational composure.",
    mechanism: "Equalized 4-phase respiration re-balances the autonomic nervous system, quieting amygdala alarm signals within 2 minutes.",
    benefits: "High-pressure composure · Clears brain fog · Rapid panic control",
    icon: Activity,
    phases: [
      {
        phase: "inhale",
        duration: 4,
        title: "Inhale (4s)",
        guide: "Inhale smoothly and steadily as your ribcage expands outward.",
        sound: "inhale",
        colorClass: "from-emerald-400 via-emerald-500 to-teal-600",
        glowColor: "rgba(16, 185, 129, 0.45)",
      },
      {
        phase: "hold",
        duration: 4,
        title: "Hold Full (4s)",
        guide: "Hold without closing your throat; maintain open ease.",
        sound: "hold",
        colorClass: "from-teal-400 via-emerald-500 to-teal-600",
        glowColor: "rgba(20, 184, 166, 0.45)",
      },
      {
        phase: "exhale",
        duration: 4,
        title: "Exhale (4s)",
        guide: "Release air smoothly and evenly through nose or mouth.",
        sound: "exhale",
        colorClass: "from-emerald-500 via-teal-600 to-emerald-700",
        glowColor: "rgba(16, 185, 129, 0.35)",
      },
      {
        phase: "holdPost",
        duration: 4,
        title: "Hold Empty (4s)",
        guide: "Rest in the quiet stillness at the bottom of the breath.",
        sound: "hold",
        colorClass: "from-emerald-600 via-teal-600 to-emerald-700",
        glowColor: "rgba(16, 185, 129, 0.3)",
      },
    ],
  },
  {
    id: "coherent",
    name: "Coherent HRV Resonance",
    badge: "Heart-Brain Coherence",
    timingBadge: "5.5s Inhale · 5.5s Exhale",
    desc: "Neuro-cardiology resonance rhythm (approx. 5.5 breaths/min) that maximizes Heart Rate Variability (HRV) and sustains daytime flow state.",
    mechanism: "Resonates cardiovascular and pulmonary rhythms to stimulate alpha brainwaves, inducing profound emotional equilibrium.",
    benefits: "Daytime flow state · Emotional stabilization · Cortisol reduction",
    icon: Waves,
    phases: [
      {
        phase: "inhale",
        duration: 5.5,
        title: "Inhale Coherently (5.5s)",
        guide: "A smooth, uninterrupted wave of breath expanding the heart space.",
        sound: "inhale",
        colorClass: "from-emerald-400 via-emerald-500 to-teal-600",
        glowColor: "rgba(16, 185, 129, 0.45)",
      },
      {
        phase: "exhale",
        duration: 5.5,
        title: "Exhale Coherently (5.5s)",
        guide: "Gentle receding tide of breath, sinking into peaceful lightness.",
        sound: "exhale",
        colorClass: "from-emerald-500 via-teal-600 to-emerald-700",
        glowColor: "rgba(16, 185, 129, 0.35)",
      },
    ],
  },
  {
    id: "triangle",
    name: "Triangle Breathing 4-4-4",
    badge: "Balance & Harmony",
    timingBadge: "4s In · 4s Hold · 4s Out",
    desc: "Classical Pranayama 3-phase symmetrical practice to gently center the mind, balance left-right hemispheres, and prepare for mindfulness.",
    mechanism: "Constructs an equilateral physiological rhythm, releasing everyday tension and stabilizing baseline respiration.",
    benefits: "Gentle daily de-stress · Meditation preparation · Autonomic harmony",
    icon: Triangle,
    phases: [
      {
        phase: "inhale",
        duration: 4,
        title: "Inhale (4s)",
        guide: "Draw fresh energy along the first side of the triangle.",
        sound: "inhale",
        colorClass: "from-emerald-400 via-emerald-500 to-teal-600",
        glowColor: "rgba(16, 185, 129, 0.45)",
      },
      {
        phase: "hold",
        duration: 4,
        title: "Hold (4s)",
        guide: "Hold calmly along the second side, sensing stability.",
        sound: "hold",
        colorClass: "from-teal-400 via-emerald-500 to-teal-600",
        glowColor: "rgba(20, 184, 166, 0.45)",
      },
      {
        phase: "exhale",
        duration: 4,
        title: "Exhale (4s)",
        guide: "Release fatigue along the third side, feeling grounded.",
        sound: "exhale",
        colorClass: "from-emerald-500 via-teal-600 to-emerald-700",
        glowColor: "rgba(16, 185, 129, 0.35)",
      },
    ],
  },
  {
    id: "sigh",
    name: "Physiological Sigh",
    badge: "Stanford Fast De-Stress",
    timingBadge: "2.5s In + 1s Top-Up · 6s Out",
    desc: "Stanford Huberman Lab method: double inhale pops open collapsed alveoli, followed by a long sigh to eliminate acute stress in under 60 seconds.",
    mechanism: "The second quick inhale inflates collapsed air sacs (alveoli); the long sigh offloads maximum CO₂ to rapidly brake autonomic arousal.",
    benefits: "Rapid panic shutdown · Emergency stress relief · Instant physical release",
    icon: Feather,
    phases: [
      {
        phase: "inhale",
        duration: 2.5,
        title: "First Inhale (2.5s)",
        guide: "Deep nasal inhale filling the majority of your lung volume.",
        sound: "inhale",
        colorClass: "from-emerald-400 via-emerald-500 to-teal-600",
        glowColor: "rgba(16, 185, 129, 0.45)",
      },
      {
        phase: "inhaleExtra",
        duration: 1,
        title: "Quick Top-Up Inhale (1s)",
        guide: "Sharply top off with a second quick sip of air to pop open alveoli!",
        sound: "inhale",
        colorClass: "from-emerald-300 via-teal-400 to-emerald-500",
        glowColor: "rgba(52, 211, 153, 0.55)",
      },
      {
        phase: "exhale",
        duration: 6,
        title: "Long Sigh Exhale (6s)",
        guide: "Gently sigh all the air out through your mouth, dropping every muscle.",
        sound: "exhale",
        colorClass: "from-emerald-500 via-teal-600 to-emerald-700",
        glowColor: "rgba(16, 185, 129, 0.35)",
      },
    ],
  },
  {
    id: "energy",
    name: "Awake & Energize 4-2-4",
    badge: "Morning Clarity & Wake Up",
    timingBadge: "4s In · 2s Hold · 4s Out",
    desc: "Brisk energizing rhythm to boost oxygenation, shake off afternoon brain fog, and restore vibrant mental clarity naturally without caffeine.",
    mechanism: "Accelerates metabolic circulation and blood oxygen saturation to stimulate the central nervous system with zero crash.",
    benefits: "Morning brain wake-up · Beat afternoon slump · Clean natural focus",
    icon: Zap,
    phases: [
      {
        phase: "inhale",
        duration: 4,
        title: "Inhale Fresh Energy (4s)",
        guide: "Inhale deeply and briskly, drawing vibrant energy into your cells.",
        sound: "inhale",
        colorClass: "from-emerald-400 via-emerald-500 to-teal-500",
        glowColor: "rgba(16, 185, 129, 0.45)",
      },
      {
        phase: "hold",
        duration: 2,
        title: "Brief Hold (2s)",
        guide: "Brief 2-second pause as oxygen distributes through your body.",
        sound: "hold",
        colorClass: "from-teal-400 via-emerald-400 to-teal-500",
        glowColor: "rgba(20, 184, 166, 0.45)",
      },
      {
        phase: "exhale",
        duration: 4,
        title: "Exhale Stagnancy (4s)",
        guide: "Exhale firmly and smoothly, casting off sluggishness.",
        sound: "exhale",
        colorClass: "from-emerald-500 via-teal-600 to-emerald-700",
        glowColor: "rgba(16, 185, 129, 0.35)",
      },
    ],
  },
];

// Unified Green & White styling for 5-4-3-2-1 Sensory Grounding
const GROUNDING_STEPS = [
  {
    count: 5,
    icon: Eye,
    sense: "Sight",
    instruction: "Look around you. Notice and identify 5 distinct objects in your immediate vision (e.g., light on a wall, a plant, a coffee mug, window reflection).",
    items: ["Object 1 in sight", "Object 2 in sight", "Object 3 in sight", "Object 4 in sight", "Object 5 in sight"],
  },
  {
    count: 4,
    icon: Hand,
    sense: "Touch",
    instruction: "Notice 4 physical touch sensations (e.g., feet grounding on the floor, texture of clothing, air on your skin, back against your chair).",
    items: ["Feet on floor", "Fabric texture", "Air temperature", "Back against chair"],
  },
  {
    count: 3,
    icon: Ear,
    sense: "Sound",
    instruction: "Listen closely. Identify 3 external ambient sounds around you (e.g., hum of a fan, distant traffic/birds, your own steady breathing).",
    items: ["Room ambient hum", "Distant exterior sound", "Rhythm of breath"],
  },
  {
    count: 2,
    icon: Wind,
    sense: "Smell",
    instruction: "Notice 2 scents in the air, or recall a comforting aroma you love (e.g., fresh rain, morning coffee, lavender, clean cedar).",
    items: ["Present room scent", "Comforting aroma memory"],
  },
  {
    count: 1,
    icon: Smile,
    sense: "Taste & Affirmation",
    instruction: "Notice 1 lingering taste, take a sip of water, and affirm: 'I am safe and grounded in this present moment.'",
    items: ["Mindful sip & 'I am safe' affirmation"],
  },
];

export function BreatheSection({
  onNavigateToChat,
}: {
  onNavigateToChat?: (customMessage?: string) => void;
}) {
  const [selectedTechnique, setSelectedTechnique] = useState<BreathingTechnique>("4-7-8");
  const [isActive, setIsActive] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [activeGroundingStep, setActiveGroundingStep] = useState(0);
  const [checkedGroundingItems, setCheckedGroundingItems] = useState<Record<number, boolean[]>>({
    0: [false, false, false, false, false],
    1: [false, false, false, false],
    2: [false, false, false],
    3: [false, false],
    4: [false],
  });

  // High-precision smooth animation state (60fps rAF)
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [displaySecondsLeft, setDisplaySecondsLeft] = useState(4);
  const [idleBreathTick, setIdleBreathTick] = useState(0);

  const activeTechConfig = useMemo(
    () => TECHNIQUES.find((t) => t.id === selectedTechnique) || TECHNIQUES[0],
    [selectedTechnique]
  );
  const currentPhaseConfig = activeTechConfig.phases[phaseIndex] || activeTechConfig.phases[0];

  // Shared technique card styles (used by both mapped techniques and the 54321 card)
  const TECHNIQUE_CARD_SELECTED = "bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/60 dark:from-emerald-50/15 dark:via-white/8 dark:to-teal-50/10 border-emerald-400/80 dark:border-emerald-400/50 shadow-lg shadow-emerald-500/15 ring-2 ring-emerald-200/70 dark:ring-emerald-400/30 scale-[1.01]";
  const TECHNIQUE_CARD_UNSELECTED = "bg-white/90 dark:bg-emerald-50/5 border border-emerald-100/90 dark:border-emerald-500/20 hover:border-emerald-300/80 dark:hover:border-emerald-400/40 hover:bg-gradient-to-br hover:from-white hover:to-emerald-50/40 dark:hover:from-emerald-50/10 dark:hover:to-teal-50/8 hover:shadow-md hover:shadow-emerald-500/10 backdrop-blur-sm";
  const TECHNIQUE_ICON_SELECTED = "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/35 scale-105";
  const TECHNIQUE_ICON_UNSELECTED = "bg-white dark:bg-emerald-50/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-500/25 group-hover:border-emerald-400/60 group-hover:bg-gradient-to-br group-hover:from-white group-hover:to-emerald-50 dark:group-hover:bg-emerald-50/15";

  const rafRef = useRef<number | null>(null);
  const phaseStartTimeRef = useRef<number>(0);
  const counterRef = useRef<HTMLSpanElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const mandalaRef = useRef<SVGSVGElement>(null);

  // Toggle Mute
  const handleToggleSound = () => {
    const nextMuted = !isSoundMuted;
    setIsSoundMuted(nextMuted);
    chimeAudio.setMuted(nextMuted);
  };

  // Reset session
  const handleReset = useCallback(() => {
    setIsActive(false);
    setPhaseIndex(0);
    setPhaseProgress(0);
    setDisplaySecondsLeft(activeTechConfig.phases[0].duration);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [activeTechConfig]);

  // Switch technique
  const handleSelectTechnique = (tech: BreathingTechnique) => {
    setSelectedTechnique(tech);
    setIsActive(false);
    setPhaseIndex(0);
    setPhaseProgress(0);
    const target = TECHNIQUES.find((t) => t.id === tech);
    if (target) {
      setDisplaySecondsLeft(target.phases[0].duration);
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  // GSAP Kinetic Number Pop when seconds tick down
  useEffect(() => {
    if (counterRef.current && isActive) {
      gsap.fromTo(
        counterRef.current,
        { scale: 1.18, opacity: 0.9 },
        { scale: 1, opacity: 1, duration: 0.28, ease: "power2.out" }
      );
    }
  }, [displaySecondsLeft, isActive]);

  // 60FPS Organic Animation Loop
  useEffect(() => {
    if (!isActive || selectedTechnique === "54321") {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    let currentPIndex = phaseIndex;
    phaseStartTimeRef.current = performance.now();

    const loop = (now: number) => {
      const currentConfig = activeTechConfig.phases[currentPIndex];
      const phaseDurationMs = currentConfig.duration * 1000;
      const elapsed = now - phaseStartTimeRef.current;
      const rawProgress = Math.min(1, Math.max(0, elapsed / phaseDurationMs));
      const secsLeft = Math.max(1, Math.ceil(currentConfig.duration - elapsed / 1000));

      setPhaseProgress(rawProgress);
      setDisplaySecondsLeft(secsLeft);

      if (elapsed >= phaseDurationMs) {
        // Switch to next phase
        const nextIndex = (currentPIndex + 1) % activeTechConfig.phases.length;
        currentPIndex = nextIndex;
        setPhaseIndex(nextIndex);
        phaseStartTimeRef.current = now;

        const nextConfig = activeTechConfig.phases[nextIndex];
        chimeAudio.playPhaseChime(nextConfig.sound);

        if (nextIndex === 0) {
          setCompletedCycles((c) => c + 1);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isActive, selectedTechnique, activeTechConfig]);

  // Gentle idle breathing animation loop (always running for living feel)
  useEffect(() => {
    if (isActive && selectedTechnique !== "54321") return;

    let idleRaf: number;
    const idleStart = performance.now();
    const loop = (now: number) => {
      setIdleBreathTick((now - idleStart) / 1000);
      idleRaf = requestAnimationFrame(loop);
    };
    idleRaf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(idleRaf);
  }, [isActive, selectedTechnique]);

  // Start / Pause
  const handleToggleActive = () => {
    if (!isActive) {
      chimeAudio.playPhaseChime(currentPhaseConfig.sound);
    }
    setIsActive((prev) => !prev);
  };

  // Toggle Grounding Item Check
  const handleToggleGroundingItem = (stepIdx: number, itemIdx: number) => {
    setCheckedGroundingItems((prev) => {
      const stepItems = [...(prev[stepIdx] || [])];
      stepItems[itemIdx] = !stepItems[itemIdx];
      if (stepItems[itemIdx]) {
        chimeAudio.playPhaseChime("hold");
      }
      return { ...prev, [stepIdx]: stepItems };
    });
  };

  // Compute organic biological breathing scale and micro-vibrations with ripple phase offsets
  const { orbScale, ringScale1, ringScale2, ringScale3, auraOpacity, lungPercent, coreGlow, ripplePulse } = useMemo(() => {
    if (!isActive) {
      // Gentle idle micro-breathing so orb never feels dead (4.2s cycle for natural resting breath)
      const t = idleBreathTick;
      const idleBreath = 0.5 - 0.5 * Math.cos((t / 4.2) * Math.PI * 2);
      return {
        orbScale: 0.92 + idleBreath * 0.08,
        ringScale1: 1.02 + idleBreath * 0.06,
        ringScale2: 1.14 + idleBreath * 0.08,
        ringScale3: 1.28 + idleBreath * 0.06,
        auraOpacity: 0.28 + idleBreath * 0.18,
        lungPercent: 45 + Math.round(idleBreath * 10),
        coreGlow: 0.22 + idleBreath * 0.18,
        ripplePulse: 0,
      };
    }

    const p = phaseProgress;
    // Smoother sine ease for organic breathing feel
    const easedProgress = 0.5 - 0.5 * Math.cos(p * Math.PI);

    let scale = 1;
    let aura = 0.45;
    let lung = 50;
    let glow = 0.3;
    let ripple = 0;

    if (currentPhaseConfig.phase === "inhale") {
      // Inhale: smooth expansion from relaxed to full
      scale = 0.82 + easedProgress * 0.6;  // 0.82 -> 1.42
      aura = 0.35 + easedProgress * 0.5;   // soft -> strong
      lung = Math.round(15 + easedProgress * 80);
      glow = 0.25 + easedProgress * 0.55;
    } else if (currentPhaseConfig.phase === "inhaleExtra") {
      // Top off breath - full expansion with slight surge
      scale = 1.42 + easedProgress * 0.08;
      aura = 0.85 + easedProgress * 0.1;
      lung = 100;
      glow = 0.8 + easedProgress * 0.15;
      ripple = easedProgress; // ripple fires at peak inhale
    } else if (currentPhaseConfig.phase === "hold") {
      // Holding full breath - gentle alive tremor (heartbeat-like micro pulse)
      const microFlutter = Math.sin(p * Math.PI * 8) * 0.012 + Math.sin(p * Math.PI * 3) * 0.008;
      scale = 1.48 + microFlutter;
      aura = 0.82 + Math.sin(p * Math.PI * 5) * 0.08;
      lung = 100;
      glow = 0.88 + Math.sin(p * Math.PI * 4) * 0.08;
    } else if (currentPhaseConfig.phase === "exhale") {
      // Exhale: gentle controlled release, slower start faster end
      const exhaleEase = 0.5 - 0.5 * Math.cos(easedProgress * Math.PI * 0.85);
      scale = 1.48 - exhaleEase * 0.68; // 1.48 -> 0.80
      aura = 0.82 - exhaleEase * 0.5;
      lung = Math.round(100 - exhaleEase * 85);
      glow = 0.8 - exhaleEase * 0.6;
    } else if (currentPhaseConfig.phase === "holdPost") {
      // Rest at bottom - calm, tiny pulse like a resting heartbeat
      const microRest = Math.sin(p * Math.PI * 6) * 0.006 + Math.sin(p * Math.PI * 2) * 0.004;
      scale = 0.80 + microRest;
      aura = 0.3 + Math.sin(p * Math.PI * 2) * 0.06;
      lung = 12;
      glow = 0.2 + Math.sin(p * Math.PI) * 0.08;
    }

    return {
      orbScale: scale,
      // Ring scales: each layer progressively larger, single source of truth
      ringScale1: scale * 1.06,
      ringScale2: scale * 1.18,
      ringScale3: scale * 1.48 + 0.06,
      auraOpacity: aura,
      lungPercent: lung,
      coreGlow: glow,
      ripplePulse: ripple,
    };
  }, [isActive, phaseProgress, currentPhaseConfig.phase, idleBreathTick]);

  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference * (1 - phaseProgress);

  // GSAP Entrance & Continuous Sacred Mandala Spin Animation
  useGSAP(
    () => {
      if (mandalaRef.current) {
        gsap.to(mandalaRef.current, {
          rotation: 360,
          transformOrigin: "center center",
          duration: 45,
          repeat: -1,
          ease: "none",
        });
      }

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".breath-banner-eyebrow", {
        y: -12,
        opacity: 0,
        duration: 0.5,
      })
        .from(
          ".breath-title-sparkles",
          {
            y: 16,
            opacity: 0,
            duration: 0.55,
          },
          "-=0.3"
        )
        .from(
          ".breath-subtitle-desc",
          {
            y: 10,
            opacity: 0,
            duration: 0.45,
          },
          "-=0.3"
        )
        .from(
          ".tech-list-column",
          {
            x: -20,
            opacity: 0,
            duration: 0.55,
          },
          "-=0.2"
        )
        .from(
          ".breath-stage-column",
          {
            x: 20,
            opacity: 0,
            duration: 0.55,
          },
          "-=0.4"
        );
    },
    { scope: sectionRef }
  );

  // Animate on technique switch
  useEffect(() => {
    if (contentAreaRef.current) {
      gsap.fromTo(
        contentAreaRef.current,
        { autoAlpha: 0, scale: 0.985 },
        { autoAlpha: 1, scale: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [selectedTechnique]);

  const renderTechniqueCard = (
    technique: Pick<TechniqueConfig, "id" | "name" | "badge" | "timingBadge" | "desc" | "icon">
  ) => {
    const Icon = technique.icon;
    const isSelected = selectedTechnique === technique.id;

    return (
      <div
        key={technique.id}
        onClick={() => handleSelectTechnique(technique.id)}
        className={cn(
          "group relative rounded-2xl p-3.5 sm:p-4 transition-all duration-300 cursor-pointer flex items-start gap-3.5 text-left overflow-hidden",
          isSelected ? TECHNIQUE_CARD_SELECTED : TECHNIQUE_CARD_UNSELECTED
        )}
      >
        <div
          className={cn(
            "absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-all duration-300",
            isSelected
              ? "bg-gradient-to-b from-emerald-400 via-emerald-500 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              : "bg-transparent"
          )}
        />
        {isSelected && (
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 dark:from-emerald-950/40 dark:via-transparent dark:to-teal-950/30" />
        )}
        <div
          className={cn(
            "size-10 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 mt-0.5",
            isSelected ? TECHNIQUE_ICON_SELECTED : TECHNIQUE_ICON_UNSELECTED
          )}
        >
          <Icon className="size-4.5" strokeWidth={isSelected ? 2.2 : 2} />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-1.5">
            <h4
              className={cn(
                "text-[13px] truncate transition-colors font-semibold",
                isSelected ? "text-emerald-900 dark:text-emerald-100" : "text-foreground"
              )}
            >
              {technique.name}
            </h4>
            {isSelected ? (
              <span className="inline-flex items-center gap-1 text-[10px] bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-2.5 py-0.5 rounded-full font-bold shrink-0 shadow-sm shadow-emerald-500/25">
                <CheckCircle2 className="size-2.5" /> Active
              </span>
            ) : (
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0 font-medium">
                {technique.timingBadge}
              </span>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {technique.desc}
          </p>

          <div className="pt-0.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 px-2 py-0.5 rounded-full">
              <span className="size-1 rounded-full bg-emerald-400" /> {technique.badge}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={sectionRef} className="container mx-auto max-w-6xl px-4 py-4 md:py-6 space-y-6 select-none">
      {/* Header Banner */}
      <div className="breath-section-banner text-center max-w-2xl mx-auto space-y-2">
        <div className="breath-banner-eyebrow inline-flex items-center gap-2 rounded-full bg-white dark:bg-white/5 border border-emerald-200/60 dark:border-emerald-500/20 px-4 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 backdrop-blur-md shadow-sm">
          <Wind className="size-3.5 text-emerald-500" />
          <span>Somatic Nervous System Reset · Sanctuary</span>
        </div>
        <div className="breath-title-sparkles">
          <SparklesText
            colors={{ first: "#059669", second: "#10b981" }}
            sparklesCount={8}
            className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-foreground"
          >
            <span>Mindful Breathing & Grounding </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-lato-light-italic font-normal pb-0.5 inline-block">
              Sanctuary
            </span>
          </SparklesText>
        </div>
        <p className="breath-subtitle-desc text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto font-lato-light-italic">
          7 clinical evidence-based breathwork and grounding protocols. Select a technique to begin soothing your nervous system within 60 seconds.
        </p>
      </div>

      {/* Main Responsive Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Technique Selector Hub (5 cols on Desktop) */}
        <div className="tech-list-column lg:col-span-5 space-y-2.5">
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-emerald-500" />
              <span>Select Technique</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 bg-white dark:bg-white/5 border border-emerald-200/60 dark:border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold shadow-sm">
              7 Clinical Protocols
            </span>
          </div>

          <div className="space-y-2.5">
            {TECHNIQUES.map(renderTechniqueCard)}
            {renderTechniqueCard({
              id: "54321",
              name: "5-4-3-2-1 Somatic Grounding",
              timingBadge: "5 Senses",
              desc: "Clinical sensory grounding to pull racing minds out of amygdala panic and anchor attention firmly in the present.",
              badge: "Panic & Rumination Reset",
              icon: ShieldCheck,
            })}
          </div>
        </div>

        {/* Right Column: Active Breathing Stage & Biological Simulator (7 cols on Desktop) */}
        <div className="breath-stage-column lg:col-span-7">
          <div ref={contentAreaRef} className="breath-active-container">
            {selectedTechnique !== "54321" ? (
              <div className="rounded-3xl bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 dark:from-emerald-50/10 dark:via-white/5 dark:to-teal-50/8 border border-emerald-500/20 dark:border-emerald-400/25 backdrop-blur-xl shadow-xl shadow-emerald-500/8 p-5 sm:p-7 flex flex-col items-center justify-center space-y-6 relative overflow-hidden">
                {/* Top Row Info & Sound Bell Toggle */}
                <div className="w-full flex items-center justify-between z-10 px-1">
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-2.5">
                      <span className={cn("absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75", isActive && "animate-ping")} />
                      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                    </span>
                    <div>
                      <span className="text-xs font-bold text-foreground">
                        {activeTechConfig.name}
                      </span>
                      <span className="ml-2 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium">
                        {activeTechConfig.timingBadge}
                      </span>
                    </div>
                  </div>

                  {/* Tibetan Singing Bowl Bell Toggle */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleSound}
                    className="h-8 gap-1.5 rounded-full text-xs text-emerald-700 dark:text-emerald-300 border-emerald-300/50 dark:border-emerald-500/25 bg-emerald-50/60 dark:bg-emerald-50/10 hover:bg-emerald-100/70 dark:hover:bg-emerald-50/15 cursor-pointer shadow-xs font-medium"
                    title={isSoundMuted ? "Enable 432Hz Tibetan singing bowl" : "Mute bells"}
                  >
                    {isSoundMuted ? (
                      <VolumeX className="size-3.5 text-rose-500" />
                    ) : (
                      <Volume2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <span className="text-[11px]">{isSoundMuted ? "Bowl: Off" : "432Hz Bowl: On"}</span>
                  </Button>
                </div>

                {/* Dynamic Ambient Background Light Field */}
                <div
                  className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-1000 blur-3xl"
                  style={{
                    opacity: auraOpacity * 0.6,
                    background: `radial-gradient(circle at 50% 50%, ${currentPhaseConfig.glowColor}, transparent 68%)`,
                  }}
                />

                {/* Breathing Phase Header with Step Guidance */}
                <div className="flex flex-col items-center space-y-1 text-center z-10">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-xs font-extrabold uppercase tracking-widest transition-all duration-300 shadow-sm",
                        isActive
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border border-emerald-400/50 shadow-emerald-500/20"
                          : "bg-white dark:bg-white/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/20"
                      )}
                    >
                      {isActive ? (
                        <span className="relative flex size-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full size-1.5 bg-white"></span>
                        </span>
                      ) : (
                        <Leaf className="size-3" />
                      )}
                      {isActive ? currentPhaseConfig.title : "Ready to Begin"}
                    </span>
                    {isActive && (
                      <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold bg-white dark:bg-white/10 border border-emerald-200/60 dark:border-emerald-500/20 px-2.5 py-0.5 rounded-full shadow-sm">
                        Lung Capacity ~{lungPercent}%
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-foreground/80 font-medium max-w-md h-8 flex items-center justify-center transition-all duration-300 leading-snug px-3">
                    {isActive ? currentPhaseConfig.guide : "Click start below to synchronize your breathing with the living orb."}
                  </p>
                </div>

                {/* The Organic Multi-Layer Living Breath Orb - Pearl White + Emerald Glow */}
                <div className="relative flex size-64 sm:size-72 items-center justify-center my-1">
                  {/* Layer -1: Deep ambient field glow (breath-driven) */}
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: "140%",
                      height: "140%",
                      background: `radial-gradient(circle, ${currentPhaseConfig.glowColor}33 0%, ${currentPhaseConfig.glowColor}11 40%, transparent 70%)`,
                      transform: `scale(${0.9 + (isActive ? auraOpacity * 0.3 : coreGlow * 0.5)})`,
                      opacity: isActive ? auraOpacity * 0.55 : coreGlow * 0.8,
                      filter: "blur(28px)",
                    }}
                  />

                  {/* Layer 0: Subtle Sacred Geometry Mandala Pattern (slow rotation) */}
                  <svg
                    ref={mandalaRef}
                    className="absolute size-64 sm:size-72 pointer-events-none opacity-25 dark:opacity-35"
                    viewBox="0 0 200 200"
                  >
                    <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 5" className="text-emerald-300/70" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 4" className="text-emerald-300/60" />
                    <circle cx="100" cy="100" r="65" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="3 5" className="text-emerald-200/70" />
                    <circle cx="100" cy="100" r="50" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2 6" className="text-emerald-200/50" />
                    {/* 8 petal marks for lotus feel */}
                    {Array.from({ length: 8 }).map((_, i) => {
                      const angle = (i * Math.PI * 2) / 8;
                      const x1 = 100 + Math.cos(angle) * 40;
                      const y1 = 100 + Math.sin(angle) * 40;
                      const x2 = 100 + Math.cos(angle) * 95;
                      const y2 = 100 + Math.sin(angle) * 95;
                      return (
                        <line
                          key={i}
                          x1={x1} y1={y1} x2={x2} y2={y2}
                          stroke="currentColor"
                          strokeWidth="0.4"
                          strokeDasharray="1 3"
                          className="text-emerald-300/40"
                        />
                      );
                    })}
                  </svg>

                  {/* Layer 1: Outermost Soft Ethereal Emerald Breath Aura (expands most) */}
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: "100%",
                      height: "100%",
                      transform: `scale(${ringScale3})`,
                      background: `radial-gradient(circle, ${currentPhaseConfig.glowColor}55 0%, ${currentPhaseConfig.glowColor}22 35%, transparent 68%)`,
                      opacity: auraOpacity * 0.75,
                      filter: "blur(16px)",
                    }}
                  />

                  {/* Layer 1b: Inhale ripple wave - fires outward at peak inhale */}
                  {isActive && ripplePulse > 0 && (
                    <div
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        inset: "1.5rem",
                        border: `1.5px solid rgba(16,185,129,${0.5 - ripplePulse * 0.45})`,
                        transform: `scale(${1 + ripplePulse * 0.45})`,
                        opacity: 1 - ripplePulse,
                        boxShadow: `0 0 20px rgba(16,185,129,${0.3 - ripplePulse * 0.25})`,
                      }}
                    />
                  )}

                  {/* Layer 2: Outer soft white-emerald breath ring */}
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      inset: "1.2rem",
                      transform: `scale(${ringScale2})`,
                      border: `1.5px solid rgba(255,255,255,0.55)`,
                      boxShadow: `0 0 24px ${currentPhaseConfig.glowColor}66, inset 0 0 18px rgba(255,255,255,0.25)`,
                      opacity: auraOpacity * 0.7,
                    }}
                  />

                  {/* Layer 2b: Inner white pearl ring (crisper) */}
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      inset: "0.6rem",
                      transform: `scale(${ringScale1})`,
                      border: `2px solid rgba(255,255,255,0.85)`,
                      boxShadow: `0 0 22px ${currentPhaseConfig.glowColor}99, 0 0 10px rgba(255,255,255,0.7), inset 0 0 16px rgba(255,255,255,0.55)`,
                      opacity: auraOpacity * 0.9,
                    }}
                  />

                  {/* Floating orbit particles - tiny light dots drifting around the orb when active */}
                  {isActive && (
                    <>
                      {[0, 1, 2, 3, 4, 5].map((i) => {
                        const particleTime = phaseProgress;
                        const baseAngle = (i / 6) * Math.PI * 2 + particleTime * (0.3 + i * 0.05);
                        const orbitRadius = 110 + Math.sin((phaseProgress + i * 0.5) * Math.PI * 2) * 18;
                        const px = 128 + Math.cos(baseAngle) * orbitRadius;
                        const py = 128 + Math.sin(baseAngle) * orbitRadius * 0.95;
                        const size = 2 + (i % 3) * 1.2;
                        return (
                          <div
                            key={i}
                            className="absolute rounded-full pointer-events-none"
                            style={{
                              left: `${(px / 256) * 100}%`,
                              top: `${(py / 256) * 100}%`,
                              width: size,
                              height: size,
                              transform: "translate(-50%,-50%)",
                              background: i % 2 === 0 ? "white" : "rgba(52,211,153,0.9)",
                              boxShadow: `0 0 ${size * 3}px ${i % 2 === 0 ? "rgba(255,255,255,0.9)" : "rgba(16,185,129,0.8)"}`,
                              opacity: 0.45 + auraOpacity * 0.45,
                            }}
                          />
                        );
                      })}
                    </>
                  )}

                  {/* Layer 3: Smooth SVG Circular Progress Indicator Ring */}
                  <svg
                    className="absolute size-56 sm:size-64 -rotate-90 pointer-events-none"
                    viewBox="0 0 240 240"
                  >
                    <circle
                      cx="120"
                      cy="120"
                      r="110"
                      className="stroke-emerald-200/50 dark:stroke-emerald-400/20 fill-none"
                      strokeWidth="2"
                    />
                    {isActive && (
                      <circle
                        cx="120"
                        cy="120"
                        r="110"
                        className="stroke-emerald-500 dark:stroke-emerald-400 fill-none"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        style={{
                          filter: "drop-shadow(0 0 8px rgba(16, 185, 129, 0.7))",
                          transition: "stroke-dashoffset 80ms linear",
                        }}
                      />
                    )}
                  </svg>

                  {/* Layer 4: Pearl-White Living Core Orb with Emerald Breath */}
                  <div
                    className="relative flex size-40 sm:size-48 items-center justify-center rounded-full select-none cursor-pointer group"
                    style={{
                      transform: `scale(${orbScale})`,
                      background: `radial-gradient(circle at 38% 32%, #ffffff 0%, #ffffff 25%, #f0fdf6 50%, #d1fae5 78%, #a7f3d0 100%)`,
                      boxShadow: `
                        0 12px 48px rgba(16,185,129,0.28),
                        0 0 ${40 + coreGlow * 50}px ${currentPhaseConfig.glowColor}cc,
                        0 0 ${20 + coreGlow * 30}px rgba(255,255,255,0.9),
                        inset 0 -8px 28px rgba(16,185,129,${0.12 + coreGlow * 0.15}),
                        inset 0 8px 24px rgba(255,255,255,0.95),
                        inset 0 0 50px rgba(20,184,166,${0.06 + coreGlow * 0.1})
                      `,
                      border: `2.5px solid rgba(255,255,255,0.95)`,
                    }}
                    onClick={handleToggleActive}
                  >
                    {/* Inner soft emerald breath tint - grows and shifts with phase */}
                    <div
                      className="pointer-events-none absolute rounded-full"
                      style={{
                        inset: "8%",
                        background: `radial-gradient(circle at 50% 58%, ${currentPhaseConfig.glowColor} 0%, transparent 65%)`,
                        opacity: isActive ? auraOpacity * 0.5 : coreGlow * 0.7,
                      }}
                    />

                    {/* Second deeper inner glow for core warmth */}
                    <div
                      className="pointer-events-none absolute rounded-full"
                      style={{
                        inset: "28%",
                        background: `radial-gradient(circle, ${currentPhaseConfig.glowColor}88 0%, transparent 70%)`,
                        opacity: isActive ? auraOpacity * 0.45 : coreGlow * 0.5,
                        filter: "blur(4px)",
                      }}
                    />

                    {/* Top-left large pearl highlight (main light source) */}
                    <div
                      className="pointer-events-none absolute rounded-full"
                      style={{
                        top: "8%",
                        left: "16%",
                        width: "32%",
                        height: "26%",
                        background: "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 50%, transparent 75%)",
                        filter: "blur(2px)",
                      }}
                    />

                    {/* Smaller secondary highlight */}
                    <div
                      className="pointer-events-none absolute rounded-full"
                      style={{
                        top: "18%",
                        right: "20%",
                        width: "12%",
                        height: "10%",
                        background: "radial-gradient(circle, rgba(255,255,255,0.7) 0%, transparent 70%)",
                        filter: "blur(1.5px)",
                      }}
                    />

                    {/* Bottom rim light - soft emerald reflection */}
                    <div
                      className="pointer-events-none absolute rounded-full"
                      style={{
                        bottom: "10%",
                        right: "14%",
                        width: "28%",
                        height: "20%",
                        background: "radial-gradient(ellipse at 50% 60%, rgba(52,211,153,0.35) 0%, transparent 70%)",
                        filter: "blur(3px)",
                        opacity: 0.6 + (isActive ? auraOpacity * 0.3 : 0),
                      }}
                    />

                    {/* Subtle specular dot highlight */}
                    <div
                      className="pointer-events-none absolute rounded-full bg-white"
                      style={{
                        top: "14%",
                        left: "22%",
                        width: "5%",
                        height: "5%",
                        boxShadow: "0 0 6px rgba(255,255,255,0.9)",
                        opacity: 0.85,
                      }}
                    />

                    {/* Counter & Status Display */}
                    {isActive ? (
                      <div className="flex flex-col items-center justify-center text-center z-10">
                        <span
                          ref={counterRef}
                          className="text-4xl sm:text-5xl font-black font-mono tracking-tight leading-none breath-counter-number"
                          style={{
                            color: "#047857",
                            textShadow: "0 1px 2px rgba(255,255,255,0.9), 0 0 12px rgba(16,185,129,0.3)",
                          }}
                        >
                          {displaySecondsLeft}
                        </span>
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-700/80 mt-1.5 font-sans">
                          {currentPhaseConfig.phase}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center z-10 space-y-1.5 group-hover:scale-105 transition-transform duration-300">
                        <div
                          className="size-14 rounded-full flex items-center justify-center shadow-lg border-[3px] border-white/90"
                          style={{
                            background: "linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)",
                            boxShadow: "0 6px 20px rgba(16,185,129,0.5), inset 0 1px 2px rgba(255,255,255,0.5)",
                          }}
                        >
                          <Play className="size-5 fill-white text-white ml-0.5 drop-shadow-sm" />
                        </div>
                        <span className="text-[11px] font-extrabold tracking-widest uppercase text-emerald-700 dark:text-emerald-700">
                          Start
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Control Buttons */}
                <div className="flex items-center gap-3 pt-1 z-10">
                  <Button
                    onClick={handleToggleActive}
                    className="h-11 px-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 gap-2 transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer border border-white/20"
                  >
                    {isActive ? (
                      <>
                        <Pause className="size-4 text-white" />
                        <span>Pause Practice</span>
                      </>
                    ) : (
                      <>
                        <Play className="size-4 fill-white text-white" />
                        <span>Start Breathing</span>
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="h-11 px-5 rounded-full text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-500/25 bg-white dark:bg-emerald-50/10 hover:bg-emerald-50 dark:hover:bg-emerald-50/15 gap-1.5 cursor-pointer shadow-sm font-semibold"
                    title="Reset session"
                  >
                    <RotateCcw className="size-3.5" />
                    <span className="text-xs hidden sm:inline">Reset</span>
                  </Button>
                </div>

                {/* Scientific Mechanism Note */}
                <div className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/60 via-white to-teal-50/40 dark:from-emerald-50/10 dark:via-white/5 dark:to-teal-50/8 border border-emerald-200/70 dark:border-emerald-500/20 text-xs text-muted-foreground flex items-start gap-2.5 shadow-sm backdrop-blur-sm">
                  <Info className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 leading-relaxed text-left">
                    <span className="font-bold text-emerald-800 dark:text-emerald-200">Neurophysiological Mechanism:</span>
                    <p className="text-[11px] leading-relaxed">{activeTechConfig.mechanism}</p>
                  </div>
                </div>

                {/* Session Stats & Clinical Insights */}
                <div className="flex flex-col sm:flex-row items-center justify-between w-full pt-1 text-xs text-muted-foreground z-10 gap-2 border-t border-emerald-500/10">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span>Completed: <strong className="text-foreground text-sm font-mono">{completedCycles}</strong> Cycles</span>
                    {completedCycles > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full">
                        <Flame className="size-3 text-emerald-600 dark:text-emerald-400" /> Streak Active
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] sm:text-right font-medium text-emerald-700 dark:text-emerald-300 font-lato-light-italic">
                    {activeTechConfig.benefits}
                  </div>
                </div>
              </div>
            ) : (
              /* 5-4-3-2-1 Somatic Grounding Interactive Step-by-Step Guide */
              <div className="rounded-3xl bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 dark:from-emerald-50/10 dark:via-white/5 dark:to-teal-50/8 border border-emerald-500/20 dark:border-emerald-400/25 backdrop-blur-xl shadow-xl shadow-emerald-500/8 p-5 sm:p-7 space-y-5">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="size-3.5" />
                    <span>5-4-3-2-1 Somatic Grounding Technique</span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    Acute Panic, Anxiety & Rumination Reset
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-lato-light-italic">
                    Anchor your sensory cortices by clicking through the real-time physical touchpoints below:
                  </p>
                </div>

                {/* Grounding Step Cards (Harmonious Emerald Palette) */}
                <div className="space-y-2.5">
                  {GROUNDING_STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const isCurrent = activeGroundingStep === idx;
                    const checkedList = checkedGroundingItems[idx] || [];
                    const allChecked = checkedList.length > 0 && checkedList.every(Boolean);

                    return (
                      <div
                        key={step.count}
                        onClick={() => setActiveGroundingStep(idx)}
                        className={cn(
                          "cursor-pointer rounded-2xl p-3.5 transition-all duration-200 flex flex-col gap-2.5 border",
                          isCurrent
                            ? "bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 dark:from-emerald-50/15 dark:via-white/8 dark:to-teal-50/10 border-emerald-400/60 dark:border-emerald-400/40 shadow-md shadow-emerald-500/10"
                            : allChecked
                            ? "bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-50/10 dark:to-white/5 border-emerald-300/50 dark:border-emerald-500/25"
                            : "bg-white/90 dark:bg-emerald-50/5 border-emerald-100/80 dark:border-emerald-500/20 hover:bg-gradient-to-br hover:from-white hover:to-emerald-50/40 dark:hover:from-emerald-50/8 dark:hover:to-teal-50/6 hover:border-emerald-300/60"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex size-9 items-center justify-center rounded-xl font-bold shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
                            <Icon className="size-4.5" />
                          </div>

                          <div className="flex-1 space-y-0.5 text-left">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground">
                                Step {idx + 1}: Notice {step.count} Things · {step.sense}
                              </span>
                              {allChecked ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                  <Check className="size-3" /> Step Anchored
                                </span>
                              ) : isCurrent ? (
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                  Active Focus
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed font-normal">
                              {step.instruction}
                            </p>
                          </div>
                        </div>

                        {/* Interactive Checkable Sensory Items */}
                        {isCurrent && (
                          <div className="pt-2 border-t border-emerald-500/10 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in duration-300">
                            {step.items.map((itemLabel, itemIdx) => {
                              const isItemChecked = checkedList[itemIdx] || false;
                              return (
                                <button
                                  key={itemIdx}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleGroundingItem(idx, itemIdx);
                                  }}
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer border",
                                    isItemChecked
                                      ? "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-50/15 dark:to-teal-50/10 border-emerald-400/60 text-emerald-900 dark:text-emerald-100 font-semibold shadow-sm"
                                      : "bg-white dark:bg-emerald-50/5 border-emerald-200/70 dark:border-emerald-500/20 text-foreground/80 hover:bg-emerald-50/60 dark:hover:bg-emerald-50/10 hover:border-emerald-300/60"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "size-4 rounded-md flex items-center justify-center transition-colors",
                                      isItemChecked
                                        ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm"
                                        : "border border-emerald-300/60 dark:border-emerald-500/30 bg-white dark:bg-emerald-50/5"
                                    )}
                                  >
                                    {isItemChecked && <Check className="size-3 text-white" />}
                                  </div>
                                  <span className="truncate text-[11px]">{itemLabel}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Stepper Navigation */}
                <div className="flex items-center justify-between pt-2 border-t border-emerald-500/10">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activeGroundingStep === 0}
                    onClick={() => setActiveGroundingStep((prev) => Math.max(0, prev - 1))}
                    className="rounded-full text-xs cursor-pointer bg-white dark:bg-emerald-50/10 border-emerald-300/60 dark:border-emerald-500/25 font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-50/15"
                  >
                    Previous
                  </Button>

                  <div className="text-xs font-bold text-muted-foreground font-mono">
                    Step {activeGroundingStep + 1} of {GROUNDING_STEPS.length}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      if (activeGroundingStep < 4) {
                        setActiveGroundingStep((prev) => prev + 1);
                      } else {
                        chimeAudio.playPhaseChime("complete");
                      }
                    }}
                    className="rounded-full text-xs px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    {activeGroundingStep === 4 ? "Complete Grounding ✨" : "Next Sense →"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Callout: Jump back to Chat with Counselor */}
      {onNavigateToChat && (
        <div className="max-w-6xl mx-auto rounded-2xl bg-emerald-500/5 border border-emerald-500/15 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/15">
              <Heart className="size-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">
                Feeling more grounded? Ready to explore your thoughts?
              </div>
              <div className="text-[11px] text-muted-foreground leading-normal mt-0.5 font-lato-light-italic">
                Connect with your AI counselor (Maya / Liam) in a safe, confidential sanctuary for gentle CBT guidance.
              </div>
            </div>
          </div>
          <Button
            onClick={() => onNavigateToChat("I just completed a mindful breathing session and felt my body calm down.")}
            size="sm"
            className="rounded-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shrink-0 px-4 py-2 cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <span>Talk with Counselor</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
