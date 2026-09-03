import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { TrendingUp } from "lucide-react";
import type { AttentionMap, AttentionDriftWarning, AttentionArea } from "@/lib/cognitiveEngine";
import { ATTENTION_AREA_LABELS } from "./quizQuestions";

export const AttentionMapView: React.FC<{
  attention: AttentionMap;
  driftWarnings: AttentionDriftWarning[];
}> = ({ attention, driftWarnings }) => {
  const listRef = useRef<HTMLDivElement>(null);

  const areas = Object.entries(attention) as Array<[AttentionArea, number]>;

  useGSAP(
    () => {
      if (!listRef.current) return;
      gsap.from(".attention-bar-fill", {
        scaleX: 0,
        transformOrigin: "left center",
        stagger: 0.08,
        duration: 0.7,
        ease: "power2.out",
      });
      gsap.from(".attention-bar-row", {
        x: -12,
        autoAlpha: 0,
        stagger: 0.08,
        duration: 0.4,
        ease: "power2.out",
      });
    },
    { scope: listRef, dependencies: [attention] }
  );

  const warningAreas = new Map(driftWarnings.map((w) => [w.area, w.z]));

  return (
    <div ref={listRef} className="space-y-4">
      <div className="space-y-3">
        {areas.map(([area, value]) => {
          const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
          const drift = warningAreas.get(area);
          return (
            <div key={area} className="attention-bar-row space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground/85">
                  {ATTENTION_AREA_LABELS[area]}
                </span>
                <div className="flex items-center gap-2">
                  {drift !== undefined && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-300">
                      <TrendingUp className="size-3" />
                      Trending
                    </span>
                  )}
                  <span className="text-xs font-mono text-muted-foreground">
                    {Math.round(clamped * 100)}%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="attention-bar-fill h-full rounded-full bg-emerald-500/70"
                  style={{ width: `${clamped * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {driftWarnings.length > 0 && (
        <div className="space-y-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5">
          {driftWarnings.map((w) => (
            <p key={w.area} className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
              Compared with your recent snapshots, your attention to{" "}
              <span className="font-semibold">{ATTENTION_AREA_LABELS[w.area]}</span> has shifted
              noticeably.
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
