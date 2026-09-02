import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SparklesText } from "@/components/ui/sparkles-text";
import { MouseTrailComponent } from "@/components/ui/mouse-trail";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MessageCircleHeart,
  HeartPulse,
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
  Compass,
  Sparkles,
  HeartHandshake,
} from "lucide-react";
import { type NavTab } from "./Navbar";

interface HeroSectionProps {
  onStartChat: (initialPrompt?: string) => void;
  onNavigate: (tab: NavTab) => void;
}

interface MoodBubble {
  text: string;
  prompt: string;
}

const MOOD_BUBBLES: MoodBubble[] = [
  {
    text: "😰 Feeling overwhelmed & spiraling",
    prompt: "I'm feeling really overwhelmed with work and life lately, and my thoughts keep spiraling...",
  },
  {
    text: "😴 Drained by burnout & insomnia",
    prompt: "I can't seem to sleep well because my mind won't shut off, and I feel completely exhausted.",
  },
  {
    text: "💔 Struggling with relationship stress",
    prompt: "Interpersonal conflicts have been draining me emotionally, and I keep second-guessing myself.",
  },
  {
    text: "🌱 Seeking calm & mindfulness",
    prompt: "I'd like to practice mindfulness and ground myself to find inner peace today.",
  },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartChat,
  onNavigate,
}) => {
  const heroRef = useRef<HTMLDivElement>(null);

  // GSAP staggered entrance on first paint; clearProps hands transform back to CSS hover
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const tl = gsap.timeline({ defaults: { ease: "power3.out", clearProps: "all" } });
      tl.from(".hero-badge", { autoAlpha: 0, y: 16, duration: 0.5 })
        .from(".hero-title", { autoAlpha: 0, y: 24, duration: 0.6 }, "-=0.32")
        .from(".hero-sub", { autoAlpha: 0, y: 16, duration: 0.5 }, "-=0.36")
        .from(".hero-cta", { autoAlpha: 0, y: 16, duration: 0.5 }, "-=0.3")
        .from(".hero-hint", { autoAlpha: 0, y: 10, duration: 0.35 }, "-=0.28")
        .from(".hero-pill", { autoAlpha: 0, y: 12, duration: 0.35, stagger: 0.07 }, "-=0.2")
        .from(".hero-card", { autoAlpha: 0, y: 24, duration: 0.5, stagger: 0.1 }, "-=0.2")
        .from(".hero-privacy", { autoAlpha: 0, duration: 0.4 }, "-=0.2");
    },
    { scope: heroRef }
  );

  return (
    <div ref={heroRef} className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden py-10 sm:py-14">
      {/* Background Interactive Mouse Trail */}
      <MouseTrailComponent />

      {/* Background Soft Glow Orbs */}
      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-emerald-400/20 to-teal-500/10 rounded-full blur-3xl -z-10" />
      <div className="pointer-events-none absolute bottom-10 right-10 w-[450px] h-[320px] bg-emerald-500/12 rounded-full blur-3xl -z-10" />
      <div className="pointer-events-none absolute top-1/2 left-10 w-[350px] h-[250px] bg-teal-400/10 rounded-full blur-3xl -z-10" />

      {/* Main Hero Content */}
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 text-center z-10 flex flex-col items-center">
        {/* Eyebrow badge with glowing emerald border */}
        <div className="hero-badge mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 dark:bg-emerald-950/40 px-4 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 backdrop-blur-md shadow-xs">
          <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-lato-light-italic">Grounded in Evidence-Based CBT & Mindful Psychology</span>
        </div>

        {/* Hero Title using SparklesText */}
        <div className="hero-title my-2">
          <SparklesText
            text="MindQuark Sanctuary"
            colors={{ first: "#0d9488", second: "#10b981" }}
            className="text-4xl sm:text-6xl md:text-7xl font-light tracking-tight text-foreground"
          />
        </div>

        {/* Poetic Subtitle in Lato Light / Thin Italic */}
        <p className="hero-sub mt-3.5 max-w-2xl text-sm sm:text-base md:text-lg font-lato-light-italic text-foreground/60 dark:text-foreground/55 font-light leading-relaxed tracking-wide">
          "Your 24/7 quiet harbor for mental health & emotional coaching. A safe, gentle space to deconstruct anxiety and rediscover inner stillness."
        </p>

        {/* CTA Buttons */}
        <div className="hero-cta mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Button
            size="lg"
            onClick={() => onStartChat()}
            className="rounded-full px-8 gap-2 text-base font-normal bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 hover:scale-105 transition-all cursor-pointer"
          >
            <MessageCircleHeart className="size-5" />
            <span>Begin Mindful Chat</span>
            <ArrowRight className="size-4" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => onNavigate("mood")}
            className="rounded-full px-6 gap-2 text-base border-emerald-600/25 bg-background/80 hover:bg-emerald-500/10 text-foreground backdrop-blur-md font-light shadow-xs cursor-pointer"
          >
            <HeartPulse className="size-5 text-emerald-500" />
            <span>Explore Mood Radar</span>
          </Button>
        </div>

        {/* Quick Mood Entry Pills */}
        <div className="mt-10 w-full max-w-2xl">
          <p className="hero-hint text-xs font-semibold text-emerald-900 dark:text-emerald-300 mb-3 font-lato-light-italic">
            💡 What is resting on your mind today? Click to begin gently:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {MOOD_BUBBLES.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onStartChat(item.prompt)}
                className="hero-pill rounded-full border border-emerald-600/20 bg-card/85 dark:bg-card/75 px-4 py-2 text-xs sm:text-sm text-foreground/90 shadow-xs hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-500/10 transition-all active:scale-95 font-light backdrop-blur-sm cursor-pointer"
              >
                {item.text}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3 Core Highlights with gentle emerald card tinting */}
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 mt-12 z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card
            onClick={() => onNavigate("chat")}
            className="hero-card group cursor-pointer p-6 rounded-3xl border-emerald-500/20 bg-card/80 dark:bg-card/60 hover:bg-card/95 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 backdrop-blur-md"
          >
            <div className="size-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xs">
              <BrainCircuit className="size-6" />
            </div>
            <h3 className="font-normal text-base text-foreground mb-1.5">CBT Cognitive Reframing</h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-light leading-relaxed">
              Deconstruct all-or-nothing and catastrophizing mindsets with evidence-based psychological reframing.
            </p>
          </Card>

          <Card
            onClick={() => onNavigate("mood")}
            className="hero-card group cursor-pointer p-6 rounded-3xl border-emerald-500/20 bg-card/80 dark:bg-card/60 hover:bg-card/95 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 backdrop-blur-md"
          >
            <div className="size-11 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xs">
              <Compass className="size-6" />
            </div>
            <h3 className="font-normal text-base text-foreground mb-1.5">Dual-Axis Mood Radar</h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-light leading-relaxed">
              Track energy levels and emotional valence, paired with 5-4-3-2-1 sensory grounding techniques.
            </p>
          </Card>

          <Card
            onClick={() => onNavigate("chat")}
            className="hero-card group cursor-pointer p-6 rounded-3xl border-emerald-500/20 bg-card/80 dark:bg-card/60 hover:bg-card/95 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 backdrop-blur-md"
          >
            <div className="size-11 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xs">
              <HeartHandshake className="size-6" />
            </div>
            <h3 className="font-normal text-base text-foreground mb-1.5">Gentle Perspectives & Real-Time Call</h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-light leading-relaxed">
              Connect with Maya or Liam via mindful chat, voice dictation, or a gentle real-time AI phone check-in call.
            </p>
          </Card>
        </div>

        {/* Privacy Note */}
        <div className="hero-privacy mt-8 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 font-lato-light-italic">
          <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Client privacy guaranteed • Strict adherence to ethical psychological boundaries</span>
        </div>
      </div>
    </div>
  );
};
