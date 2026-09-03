import React, { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

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
  const [isScratching, setIsScratching] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const completedCalledRef = useRef(false);

  // Initialize and paint canvas with gradient
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
    const rafId = requestAnimationFrame(() => {
      initCanvas();
    });
    return () => cancelAnimationFrame(rafId);
  }, [initCanvas]);

  // Calculate percentage of transparent pixels
  const checkCompletion = useCallback(() => {
    if (completedCalledRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const totalW = width * dpr;
    const totalH = height * dpr;

    try {
      const imgData = ctx.getImageData(0, 0, totalW, totalH);
      const pixels = imgData.data;
      const step = 8 * 4; // Sample every 8th pixel for 60fps performance
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
        if (onComplete) onComplete();
      }
    } catch {
      // Ignored for cross-origin or canvas errors
    }
  }, [width, height, minScratchPercentage, onComplete]);

  // Scratch stroke helper
  const scratch = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 36;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (lastPointRef.current) {
        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      lastPointRef.current = { x, y };
      checkCompletion();
    },
    [checkCompletion]
  );

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsScratching(true);
    lastPointRef.current = null;
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isScratching) return;
    scratch(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsScratching(false);
    lastPointRef.current = null;
  };

  // Touch handlers with passive prevention
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      setIsScratching(true);
      lastPointRef.current = null;
      scratch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isScratching || e.touches.length === 0) return;
    scratch(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    setIsScratching(false);
    lastPointRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      style={{ width, height }}
      className={cn("relative select-none overflow-hidden touch-none", className)}
    >
      {/* Background Content to Reveal */}
      <div className="absolute inset-0 size-full flex items-center justify-center">
        {children}
      </div>

      {/* Foreground Scratch Canvas with smooth fadeout once completed */}
      <canvas
        ref={canvasRef}
        style={{ width, height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "absolute inset-0 size-full cursor-pointer transition-opacity duration-700 ease-out",
          isCompleted ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      />
    </div>
  );
};
