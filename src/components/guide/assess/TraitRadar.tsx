import React, { useMemo } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { TraitScores } from "@/lib/cognitiveEngine";

const CX = 110;
const CY = 110;
const RADIUS = 90;

const AXES: Array<{ key: keyof TraitScores; angle: number; label: string }> = [
  { key: "perfectionism", angle: -90, label: "Perfectionism" },
  { key: "avoidance", angle: 30, label: "Avoidance" },
  { key: "rumination", angle: 150, label: "Rumination" },
];

function polarPoint(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function ringPoints(radius: number): string {
  return AXES.map(({ angle }) => {
    const p = polarPoint(angle, radius);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ");
}

function labelPoint(angleDeg: number): { x: number; y: number } {
  return polarPoint(angleDeg, RADIUS + 26);
}

export const TraitRadar: React.FC<{ traits: TraitScores }> = ({ traits }) => {
  const groupRef = React.useRef<SVGGElement>(null);

  const dataPoints = useMemo(
    () =>
      AXES.map(({ key, angle }) => {
        const value = Math.min(1, Math.max(0, traits[key]));
        const p = polarPoint(angle, value * RADIUS);
        return { key, ...p, value };
      }),
    [traits]
  );

  const polygonPoints = useMemo(
    () => dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "),
    [dataPoints]
  );

  useGSAP(
    () => {
      if (!groupRef.current) return;
      gsap.from(groupRef.current, {
        scale: 0.6,
        autoAlpha: 0,
        svgOrigin: `${CX} ${CY}`,
        duration: 0.7,
        ease: "power3.out",
      });
    },
    { dependencies: [traits] }
  );

  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-56 mx-auto" role="img" aria-label="Trait radar chart">
      <g ref={groupRef}>
        {[0.33, 0.66, 1].map((ratio) => (
          <polygon
            key={ratio}
            points={ringPoints(RADIUS * ratio)}
            fill="none"
            stroke="currentColor"
            className="text-muted-foreground/25"
            strokeWidth={ratio === 1 ? 1.2 : 0.8}
            strokeDasharray={ratio === 1 ? undefined : "3 3"}
          />
        ))}

        {AXES.map(({ key, angle }) => {
          const end = polarPoint(angle, RADIUS);
          return (
            <line
              key={key}
              x1={CX}
              y1={CY}
              x2={end.x}
              y2={end.y}
              stroke="currentColor"
              className="text-muted-foreground/25"
              strokeWidth={0.8}
            />
          );
        })}

        <polygon
          points={polygonPoints}
          fill="rgba(16,185,129,0.18)"
          stroke="#10b981"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {dataPoints.map((p) => (
          <circle key={p.key} cx={p.x} cy={p.y} r={3.2} fill="#10b981" />
        ))}
      </g>

      {AXES.map(({ key, angle, label }) => {
        const lp = labelPoint(angle);
        const value = Math.min(1, Math.max(0, traits[key]));
        return (
          <text
            key={key}
            x={lp.x}
            y={lp.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 10, fontWeight: 600 }}
          >
            {label} {Math.round(value * 100)}
          </text>
        );
      })}
    </svg>
  );
};
