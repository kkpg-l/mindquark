import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

interface StateGaugeProps {
  label: string;
  description: string;
  value: number; // 0-1
  invert?: boolean; // true = higher is better
}

function gaugeColor(value: number, invert: boolean): string {
  if (invert) {
    if (value >= 0.6) return "bg-emerald-500";
    if (value >= 0.4) return "bg-amber-500";
    return "bg-rose-500";
  }
  if (value <= 0.4) return "bg-emerald-500";
  if (value <= 0.6) return "bg-amber-500";
  return "bg-rose-500";
}

export const StateGauge: React.FC<StateGaugeProps> = ({ label, description, value, invert = false }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

  useGSAP(
    () => {
      if (!barRef.current) return;
      gsap.fromTo(
        barRef.current,
        { width: "0%" },
        { width: `${clamped * 100}%`, duration: 0.9, ease: "power2.out" }
      );
    },
    { dependencies: [clamped] }
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold text-foreground/85">{label}</span>
        <span className="text-xs font-mono text-muted-foreground">{Math.round(clamped * 100)}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          ref={barRef}
          className={cn("h-full rounded-full", gaugeColor(clamped, invert))}
          style={{ width: `${clamped * 100}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
};
