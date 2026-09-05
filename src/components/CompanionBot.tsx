import { useCallback, useEffect, useRef, useState } from "react";
import { BloubBot } from "@/components/BloubBot";
import type { StateId } from "@/bot/states";
import type { ExpressionId } from "@/bot/expressions";
import { useLanguage } from "@/lib/i18n";

interface CompanionBotProps {
  expression: ExpressionId;
}

export function CompanionBot({ expression }: CompanionBotProps) {
  const [state, setState] = useState<StateId>("idle");
  const timerRef = useRef<number | null>(null);
  const { t } = useLanguage();

  // --- drag state ---
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const posRef = useRef(pos);
  const draggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null);
  const dragMovedRef = useRef(false);

  posRef.current = pos;

  const handleClick = () => {
    if (dragMovedRef.current) return; // suppress click after drag
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setState("wink");
    timerRef.current = window.setTimeout(() => setState("idle"), 2000);
  };

  // --- drag handlers ---
  // Use e.currentTarget (the div with the handler) instead of e.target (could be SVG child)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragMovedRef.current = false;
    draggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: posRef.current.x,
      posY: posRef.current.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMovedRef.current = true;
    setPos({
      x: dragStartRef.current.posX + dx,
      y: dragStartRef.current.posY + dy,
    });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    draggingRef.current = false;
    dragStartRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

  return (
    <div
      className="bot-float fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 select-none"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, touchAction: "none" }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label={t("bot.ariaLabel", "Quark companion")}
        className="relative cursor-grab rounded-full transition-transform duration-200 hover:scale-105 active:scale-95 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
      >
        <BloubBot
          size={160}
          shape="nuage"
          color="vert-clair"
          paper="#1b2a25"
          expression={expression}
          state={state}
          follow
          className="pointer-events-none drop-shadow-[0_8px_20px_rgba(4,60,48,0.25)] dark:drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        />
      </div>
    </div>
  );
}

export default CompanionBot;
