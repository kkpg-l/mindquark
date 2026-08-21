import React from "react";
import { Sparkles } from "lucide-react";

interface ThinkingIndicatorProps {
  counselorName: string;
}

export function ThinkingIndicator({ counselorName }: ThinkingIndicatorProps) {
  return (
    <div className="my-3 flex justify-start animate-in fade-in duration-300">
      <div className="flex max-w-[85%] sm:max-w-[80%] items-center gap-3 rounded-2xl bg-card/90 border border-emerald-500/25 px-4 py-3 shadow-md backdrop-blur-md">
        {/* Animated CBT Mindful Breathing Orb */}
        <div className="relative flex size-9 items-center justify-center shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/30 opacity-75" />
          <span className="absolute inline-flex size-7 rounded-full bg-emerald-500/20 animate-pulse" />
          <div className="relative flex size-6 items-center justify-center rounded-full bg-linear-to-tr from-emerald-600 to-teal-400 text-white shadow-xs">
            <Sparkles className="size-3.5 animate-spin" style={{ animationDuration: "3s" }} />
          </div>
        </div>

        {/* Text description */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              {counselorName} is reflecting mindfully...
            </span>
            <span className="inline-flex gap-1 items-center">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="size-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="size-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-lato-light-italic">
            Formulating empathetic CBT guidance
          </span>
        </div>
      </div>
    </div>
  );
}
