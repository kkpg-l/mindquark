import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, useAnimation } from "framer-motion";
import { cn } from "@/lib/utils";

const cursorImg =
  "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNSIgc3R5bGU9ImZpbGw6I2ZmZjtzdHJva2U6IzAwMDtzdHJva2Utd2lkdGg6MXB4OyIgLz4KPC9zdmc+'), auto";

export interface ScratchToRevealProps {
  width?: number;
  height?: number;
  minScratchPercentage?: number;
  gradientColors?: [string, string, string];
  onComplete?: () => void;
  className?: string;
  children: React.ReactNode;
}

export const ScratchToReveal: React.FC<ScratchToRevealProps> = ({
  width = 260,
  height = 260,
  minScratchPercentage = 45,
  gradientColors = ["#10B981", "#14B8A6", "#34D399"],
  onComplete,
  className,
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controls = useAnimation();
  const [isScratching, setIsScratching] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const completedCalledRef = useRef(false);
  const isInitializedRef = useRef(false);
  const hasScratchedRef = useRef(false);
  const checkThrottleRef = useRef<number | null>(null);

  // Initialize and paint canvas with gradient
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Never overwrite an active user scratch session!
    if (hasScratchedRef.current || completedCalledRef.current) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Reset composite operation to draw the cover gradient
    ctx.globalCompositeOperation = "source-over";

    // Diagonal linear gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, gradientColors[0]);
    gradient.addColorStop(0.5, gradientColors[1]);
    gradient.addColorStop(1, gradientColors[2]);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add delicate shimmer particles / texture overlay
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    for (let i = 0; i < 40; i++) {
      const px = (i * 37) % width;
      const py = (i * 73) % height;
      const radius = (i % 3) + 1;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Centered friendly prompt text on scratch surface
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✨ 轻划刮开心境 ✨", width / 2, height / 2 - 8);

    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.font = "11px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("Scratch to Reveal", width / 2, height / 2 + 12);

    setIsCompleted(false);
    completedCalledRef.current = false;
  }, [width, height, gradientColors]);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  // Calculate percentage of transparent pixels
  const checkCompletion = useCallback(() => {
    if (completedCalledRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const totalW = width * dpr;
    const totalH = height * dpr;

    try {
      const imgData = ctx.getImageData(0, 0, totalW, totalH);
      const pixels = imgData.data;
      const step = 16 * 4; // Fast sparse sampling for instant completion check
      let transparentPixels = 0;
      let totalSampled = 0;

      for (let i = 3; i < pixels.length; i += step) {
        totalSampled++;
        if (pixels[i] === 0) {
          transparentPixels++;
        }
      }

      const percentage = (transparentPixels / totalSampled) * 100;
      if (percentage >= minScratchPercentage) {
        completedCalledRef.current = true;
        setIsCompleted(true);
        ctx.clearRect(0, 0, totalW, totalH);

        // Inspira UI signature celebratory wiggle & scale pop animation on completion
        controls.start({
          scale: [1, 1.08, 0.96, 1],
          rotate: [0, 8, -8, 6, -6, 0],
          transition: { duration: 0.5, ease: "easeOut" },
        });

        if (onComplete) onComplete();
      }
    } catch {
      // Ignored for cross-origin or canvas errors
    }
  }, [width, height, minScratchPercentage, onComplete, controls]);

  // Throttled check to avoid blocking the GPU/main thread during active dragging
  const scheduleCheckCompletion = useCallback(() => {
    if (completedCalledRef.current) return;
    if (checkThrottleRef.current !== null) return;

    checkThrottleRef.current = window.setTimeout(() => {
      checkThrottleRef.current = null;
      checkCompletion();
    }, 120);
  }, [checkCompletion]);

  // Scratch stroke helper
  const drawStroke = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      hasScratchedRef.current = true;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 42;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (lastPointRef.current) {
        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, 21, 0, Math.PI * 2);
        ctx.fill();
      }

      lastPointRef.current = { x, y };
      scheduleCheckCompletion();
    },
    [scheduleCheckCompletion]
  );

  // Modern Pointer Events: unified, smooth, never drops contact even if cursor drifts outside
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Only respond to primary mouse button / single touch
    if (e.button !== 0 && e.pointerType === "mouse") return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture not supported
    }
    setIsScratching(true);
    lastPointRef.current = null;
    drawStroke(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isScratching) return;
    drawStroke(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isScratching) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
    setIsScratching(false);
    lastPointRef.current = null;
    // Check completion when user completes their scratch stroke (Inspira UI pattern)
    checkCompletion();
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
    setIsScratching(false);
    lastPointRef.current = null;
    checkCompletion();
  };

  return (
    <motion.div
      ref={containerRef}
      animate={controls}
      style={{
        width,
        height,
        cursor: cursorImg,
      }}
      className={cn("relative select-none overflow-hidden touch-none", className)}
    >
      {/* Background Content to Reveal */}
      <motion.div
        animate={
          isCompleted
            ? {
                scale: [0.95, 1.08, 1],
                transition: { duration: 0.45, ease: "easeOut" },
              }
            : {}
        }
        className="absolute inset-0 size-full flex items-center justify-center"
      >
        {children}
      </motion.div>

      {/* Foreground Scratch Canvas with smooth fadeout once completed */}
      <canvas
        ref={canvasRef}
        style={{ width, height, touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={cn(
          "absolute inset-0 size-full cursor-pointer touch-none select-none transition-opacity duration-500 ease-out",
          isCompleted ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      />
    </motion.div>
  );
};
