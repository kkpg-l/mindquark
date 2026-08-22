import React, { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface IntroSplashProps {
  onFinish?: () => void;
}

// SVG Bezier Liquid Wave Morphing Keyframes (Codrops Multi-Layered Wave)
const PATH_FLAT_START = "M 0 0 L 100 0 L 100 100 Q 50 100 0 100 Z";
const PATH_WAVE_CURVE1 = "M 0 0 L 100 0 L 100 0 Q 50 -40 0 0 Z";
const PATH_WAVE_CURVE2 = "M 0 0 L 100 0 L 100 0 Q 50 -55 0 0 Z";
const PATH_FLAT_END = "M 0 0 L 100 0 L 100 0 Q 50 0 0 0 Z";

export const IntroSplash: React.FC<IntroSplashProps> = ({ onFinish }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);

  // Dual Liquid Wave Paths (Layer 1: Emerald Green, Layer 2: Pure White)
  const whiteWaveRef = useRef<SVGPathElement>(null);
  const greenWaveRef = useRef<SVGPathElement>(null);
  const [isRendered, setIsRendered] = useState(true);

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReduced) {
        setIsRendered(false);
        if (onFinish) onFinish();
        return;
      }

      const tl = gsap.timeline({
        onComplete: () => {
          setIsRendered(false);
          if (onFinish) onFinish();
        },
      });

      // ── 1. Initial State Setup ──
      gsap.set(containerRef.current, { autoAlpha: 1 });
      gsap.set(whiteWaveRef.current, { attr: { d: PATH_FLAT_START } });
      gsap.set(greenWaveRef.current, { attr: { d: PATH_FLAT_START } });
      gsap.set(titleRef.current, {
        y: 24,
        letterSpacing: "0.18em",
        autoAlpha: 0,
        filter: "blur(8px)",
      });
      gsap.set(subRef.current, {
        y: 12,
        letterSpacing: "0.06em",
        autoAlpha: 0,
        filter: "blur(4px)",
      });
      gsap.set(dividerRef.current, {
        scaleX: 0,
        transformOrigin: "center center",
        autoAlpha: 0,
      });
      gsap.set(".emerald-glow", {
        scale: 0.75,
        autoAlpha: 0,
      });

      // ── 2. Atmospheric White-Emerald Awakening ──
      tl.to(".emerald-glow", {
        scale: 1.25,
        autoAlpha: 0.9,
        duration: 0.45,
        ease: "power2.out",
      })
        .to(
          titleRef.current,
          {
            y: 0,
            letterSpacing: "-0.025em",
            autoAlpha: 1,
            filter: "blur(0px)",
            duration: 0.45,
            ease: "expo.out",
          },
          "-=0.32"
        )
        .to(
          subRef.current,
          {
            y: 0,
            letterSpacing: "0.015em",
            autoAlpha: 1,
            filter: "blur(0px)",
            duration: 0.38,
            ease: "expo.out",
          },
          "-=0.3"
        )
        .to(
          dividerRef.current,
          {
            scaleX: 1,
            autoAlpha: 1,
            duration: 0.35,
            ease: "power2.inOut",
          },
          "-=0.28"
        )

        // ── 3. Text Fades Gently ──
        .to(
          contentRef.current,
          {
            y: -28,
            autoAlpha: 0,
            filter: "blur(6px)",
            duration: 0.32,
            ease: "power2.in",
          },
          "+=0.15"
        )

        // ── 4. Staggered Dual-Layer White ➔ Emerald Liquid Wave Exit ──
        .to(
          whiteWaveRef.current,
          {
            attr: { d: PATH_WAVE_CURVE1 },
            duration: 0.42,
            ease: "power2.in",
          },
          "-=0.22"
        )
        .to(whiteWaveRef.current, {
          attr: { d: PATH_FLAT_END },
          duration: 0.25,
          ease: "power2.out",
        })
        .to(
          greenWaveRef.current,
          {
            attr: { d: PATH_WAVE_CURVE2 },
            duration: 0.45,
            ease: "power2.in",
          },
          "-=0.52"
        )
        .to(
          greenWaveRef.current,
          {
            attr: { d: PATH_FLAT_END },
            duration: 0.28,
            ease: "power2.out",
          },
          "-=0.12"
        )
        .to(
          containerRef.current,
          {
            autoAlpha: 0,
            duration: 0.1,
          },
          "-=0.08"
        );
    },
    { scope: containerRef }
  );

  if (!isRendered) return null;

  const handleSkip = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        autoAlpha: 0,
        duration: 0.25,
        ease: "power2.inOut",
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none overflow-hidden"
      style={{ willChange: "transform, opacity" }}
    >
      {/* Dual-Layered Liquid Wave SVG Curtain (White over Vibrant Emerald) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="emeraldWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="45%" stopColor="#059669" />
            <stop offset="85%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>

        {/* Bottom Layer 1: Vibrant Emerald Gradient Wave */}
        <path
          ref={greenWaveRef}
          d={PATH_FLAT_START}
          fill="url(#emeraldWaveGrad)"
        />

        {/* Top Layer 2: Pure Crisp White Layer */}
        <path
          ref={whiteWaveRef}
          d={PATH_FLAT_START}
          className="fill-white dark:fill-zinc-950"
        />
      </svg>

      {/* Luminous Emerald Atmosphere Glow Orbs on White Surface */}
      <div className="emerald-glow pointer-events-none absolute size-[580px] rounded-full bg-emerald-500/20 dark:bg-emerald-500/15 blur-3xl" />
      <div className="emerald-glow pointer-events-none absolute -bottom-24 -right-20 size-96 rounded-full bg-emerald-400/20 dark:bg-emerald-600/15 blur-3xl" />
      <div className="emerald-glow pointer-events-none absolute -top-24 -left-20 size-96 rounded-full bg-teal-400/15 dark:bg-emerald-400/15 blur-3xl" />

      {/* Center Typographic Stage */}
      <div
        ref={contentRef}
        className="relative flex flex-col items-center justify-center text-center z-10 space-y-4 px-6 max-w-lg w-full"
        style={{ willChange: "transform, opacity, filter" }}
      >
        <div className="space-y-1.5 pt-1">
          <h1
            ref={titleRef}
            className="text-4xl sm:text-5xl font-black tracking-tight flex items-center justify-center gap-2"
          >
            <span className="text-emerald-950 dark:text-white">MindQuark</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-lato-light-italic font-normal">
              Sanctuary
            </span>
          </h1>

          <p
            ref={subRef}
            className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 font-semibold font-lato-light-italic"
          >
            Breathe in clarity · Step into mindful peace
          </p>
        </div>

        {/* Minimalist Emerald Gradient Breath Line */}
        <div
          ref={dividerRef}
          className="w-36 h-1 bg-gradient-to-r from-emerald-400 via-emerald-600 to-teal-400 dark:from-emerald-500 dark:via-emerald-400 dark:to-teal-300 mx-auto rounded-full shadow-sm shadow-emerald-500/30"
        />
      </div>

      {/* Clean Emerald Skip Button */}
      <button
        onClick={handleSkip}
        className="absolute bottom-8 z-20 text-[11px] font-semibold text-emerald-800/70 dark:text-emerald-300/70 hover:text-emerald-900 dark:hover:text-emerald-200 transition-all active:scale-95 cursor-pointer tracking-widest uppercase px-4 py-1.5 rounded-full hover:bg-emerald-500/10"
      >
        Skip
      </button>
    </div>
  );
};
