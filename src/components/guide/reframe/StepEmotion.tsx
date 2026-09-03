import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { EMOTION_FAMILIES, getEmotionsByFamily } from "@/lib/emotionsDatabase";
import { getEmotionById } from "@/lib/emotionsDatabase";
import type { WizardStepProps } from "./wizardTypes";

export const StepEmotion: React.FC<WizardStepProps> = ({ session, update }) => {
  const [activeFamily, setActiveFamily] = useState(EMOTION_FAMILIES[0].id);
  const familyEmotions = getEmotionsByFamily(activeFamily);
  const selected = getEmotionById(session.selectedEmotionId);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-foreground">Name the emotion</h3>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-lato-light-italic">
          Feelings get lighter once they have a name. Pick the closest one.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {EMOTION_FAMILIES.map((family) => (
          <button
            key={family.id}
            onClick={() => setActiveFamily(family.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              activeFamily === family.id
                ? family.colorClass + " ring-2 ring-emerald-500/30"
                : "border-muted-foreground/15 text-muted-foreground hover:text-foreground hover:border-emerald-500/30"
            )}
          >
            <span className="mr-1">{family.emoji}</span>
            {family.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {familyEmotions.map((emotion) => {
          const isSelected = session.selectedEmotionId === emotion.id;
          return (
            <button
              key={emotion.id}
              onClick={() => update({ selectedEmotionId: emotion.id })}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-xs font-medium transition-all cursor-pointer text-center",
                isSelected
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/40"
                  : "border-muted-foreground/15 text-foreground/85 hover:border-emerald-500/40 hover:bg-emerald-500/5"
              )}
            >
              <div>{emotion.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{emotion.labelZh}</div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="space-y-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-foreground">
              How strong is the {selected.label.toLowerCase()} right now?
            </span>
            <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {session.emotionIntensity}/10
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={session.emotionIntensity}
            onChange={(e) => update({ emotionIntensity: Number(e.target.value) })}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>a whisper</span>
            <span>a wave</span>
          </div>
        </div>
      )}
    </div>
  );
};
