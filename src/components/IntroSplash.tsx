import React, { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Sparkles, Leaf } from "lucide-react";

interface IntroSplashProps {
  onFinish?: () => void;
}

export const IntroSplash: React.FC<IntroSplashProps> = ({ onFinish }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = useState(true);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => {
          setIsRendered(false);
          if (onFinish) onFinish();
        },
      });

      // 1. Initial State Setup
      gsap.set(".bloom-badge", { scale: 0, rotation: -25, autoAlpha: 0 });
      gsap.set(".bloom-leaf-icon", { scale: 0, rotation: -40 });
      gsap.set(".breeze-line", { scaleX: 0, autoAlpha: 0 });
      gsap.set(".bloom-text-title", { y: 18, autoAlpha: 0 });
      gsap.set(".bloom-text-sub", { y: 12, autoAlpha: 0 });
      gsap.set(".bloom-sparkle", { scale: 0, autoAlpha: 0 });

      // 2. Breeze Lines Sweep In
      tl.to(".breeze-line", {
        scaleX: 1,
        autoAlpha: 0.7,
        stagger: 0.08,
        duration: 0.4,
        ease: "power2.out",
      })
        // 3. Leaf Badge Blooms with Elastic Spring Physics
        .to(
          ".bloom-badge",
          {
            scale: 1,
            rotation: 0,
            autoAlpha: 1,
            duration: 0.6,
            ease: "back.out(2.4)",
          },
          "-=0.2"
        )
        .to(
          ".bloom-leaf-icon",
          {
            scale: 1,
            rotation: 0,
            duration: 0.5,
            ease: "back.out(2.8)",
          },
          "-=0.45"
        )
        // 4. Concentric Water Ripples Expand
        .fromTo(
          ".bloom-ripple-1",
          { scale: 0.7, autoAlpha: 0.9 },
          {
            scale: 2.3,
            autoAlpha: 0,
            duration: 0.75,
            ease: "power2.out",
          },
          "-=0.35"
        )
        .fromTo(
          ".bloom-ripple-2",
          { scale: 0.5, autoAlpha: 0.8 },
          {
            scale: 2.8,
            autoAlpha: 0,
            duration: 0.85,
            ease: "power2.out",
          },
          "-=0.55"
        )
        // 5. Sparkles Pop Out
        .to(
          ".bloom-sparkle",
          {
            scale: 1,
            autoAlpha: 1,
            stagger: 0.06,
            duration: 0.35,
            ease: "back.out(2.5)",
          },
          "-=0.5"
        )
        // 6. Title and Subtitle Slide In
        .to(
          ".bloom-text-title",
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.45,
            ease: "power3.out",
          },
          "-=0.35"
        )
        .to(
          ".bloom-text-sub",
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.4,
            ease: "power3.out",
          },
          "-=0.25"
        )
        // 7. Curtain Elegantly Glides Upward (Wipe Reveal)
        .to(
          containerRef.current,
          {
            yPercent: -100,
            duration: 0.65,
            ease: "power3.inOut",
          },
          "+=0.35"
        );
    },
    { scope: containerRef }
  );

  if (!isRendered) return null;

  const handleSkip = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        yPercent: -100,
        duration: 0.35,
        ease: "power3.inOut",
        onComplete: () => {
          setIsRendered(false);
          if (onFinish) onFinish();
        },
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 select-none overflow-hidden"
      style={{ willChange: "transform" }}
    >
      {/* Background Soft Emerald & Mint Ambient Field */}
      <div className="pointer-events-none absolute size-[520px] rounded-full bg-emerald-400/15 dark:bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-1/4 size-80 rounded-full bg-teal-400/10 blur-2xl" />

      {/* Gentle Horizontal Breeze Lines in Background */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-around opacity-40 px-8">
        <div className="breeze-line w-2/3 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent mx-auto origin-left" />
        <div className="breeze-line w-4/5 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent mx-auto origin-right" />
        <div className="breeze-line w-1/2 h-px bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent mx-auto origin-left" />
      </div>

      {/* Center Blooming Stage */}
      <div className="relative flex flex-col items-center justify-center text-center z-10 space-y-4">
        {/* Central Blooming Flower / Leaf Emblem */}
        <div className="relative flex items-center justify-center size-28">
          {/* Water Ripples */}
          <div className="bloom-ripple-1 absolute size-28 rounded-full border-2 border-emerald-400/50 pointer-events-none" />
          <div className="bloom-ripple-2 absolute size-28 rounded-full border border-teal-300/40 pointer-events-none" />

          {/* Sparkles around badge */}
          <div className="bloom-sparkle absolute -top-2 -right-2 text-emerald-500">
            <Sparkles className="size-5" />
          </div>
          <div className="bloom-sparkle absolute -bottom-1 -left-2 text-teal-400">
            <Sparkles className="size-4" />
          </div>

          {/* Blooming Emerald Emblem */}
          <div
            ref={leafRef}
            className="bloom-badge relative flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/35 ring-4 ring-white dark:ring-zinc-900"
          >
            <Leaf className="bloom-leaf-icon size-10 fill-white/90 text-white drop-shadow-xs" />
          </div>
        </div>

        {/* Typography Reveal */}
        <div className="space-y-1 pt-1">
          <h1 className="bloom-text-title text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-1.5">
            <span>MindQuark</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-lato-light-italic font-normal">
              Sanctuary
            </span>
          </h1>

          <p className="bloom-text-sub text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-300/80 font-medium font-lato-light-italic tracking-wide">
            🌿 Breathe in clarity · Let go of noise
          </p>
        </div>
      </div>

      {/* Subtle Skip button at bottom */}
      <button
        onClick={handleSkip}
        className="absolute bottom-8 text-[11px] font-medium text-muted-foreground/60 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer tracking-wider uppercase px-4 py-1.5 rounded-full hover:bg-emerald-500/10"
      >
        Skip intro
      </button>
    </div>
  );
};
