import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, CheckCircle2, Zap, Heart, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScratchToReveal } from "@/components/ui/scratch-to-reveal";
import { useLanguage } from "@/lib/i18n";

export interface MoodScratchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMood: string;
  energyLevel?: number;
  valenceLevel?: number;
  moodNote?: string;
  onConfirm?: () => void;
}

const SCRATCH_GRADIENT_COLORS: [string, string, string] = ["#10B981", "#14B8A6", "#34D399"];

// Tailored therapeutic affirmations corresponding to each selected mood
const AFFIRMATIONS: Record<string, { zh: string; en: string }> = {
  "🌿": {
    zh: "身心归位 · 平静即是力量。愿你带着这份从容，安然度过当下的每一刻。",
    en: "Centered & Grounded. Stillness is quiet strength. Carry this serenity with you.",
  },
  "😊": {
    zh: "阳光满溢 · 珍藏当下的欢愉。将这份喜悦化作前行路上温暖的底色。",
    en: "Radiant & Grateful. Cherish this warmth; let it illuminate your journey forward.",
  },
  "😰": {
    zh: "深深呼吸 · 允许波澜存在。焦虑只是路过的客人，你永远比想象中更安全。",
    en: "Breathe deeply. Anxiety is just a passing guest; you are always safe in this moment.",
  },
  "😔": {
    zh: "温和接纳 · 允许自己偶尔电量不足。乌云散去，阳光依然在云层后守候。",
    en: "Gentle acceptance. It is okay to rest. Behind every cloud, the sunlight patiently waits.",
  },
  "😴": {
    zh: "放下紧绷 · 允许身心全然休息。好好休整，你今天已经做得很棒了。",
    en: "Surrender tension. Grant your soul deep rest; you have done wonderfully today.",
  },
  "😡": {
    zh: "舒展眉头 · 情绪需要被倾听而非压抑。深呼一口气，让紧绷随风释怀。",
    en: "Unclench your jaw. Emotions deserve gentle release; let tensions exhale into the wind.",
  },
};

export const MoodScratchModal: React.FC<MoodScratchModalProps> = ({
  isOpen,
  onClose,
  selectedMood,
  energyLevel = 3,
  valenceLevel = 4,
  moodNote = "",
  onConfirm,
}) => {
  const { language } = useLanguage();
  const [isRevealed, setIsRevealed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Client-side portal mounting check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract emoji and label from selectedMood
  const emoji = selectedMood.match(/\p{Extended_Pictographic}/u)?.[0] || "🌿";
  const moodLabel =
    selectedMood.replace(/^\S+\s*/, "") || (language === "zh" ? "平和与安定" : "Calm & Centered");

  // Pick affirmation
  const affirmation = AFFIRMATIONS[emoji]
    ? language === "zh"
      ? AFFIRMATIONS[emoji].zh
      : AFFIRMATIONS[emoji].en
    : language === "zh"
    ? "身心调和 · 活在当下 · 感受内心的宁静与笃定"
    : "Inner Harmony · Present Mind · Trusting your inner journey";

  // Reset revealed state when opened
  useEffect(() => {
    if (isOpen) {
      setIsRevealed(false);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Layer 1: Hardware-Accelerated 2D Backdrop (Independent compositing layer) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-md"
            style={{ willChange: "opacity" }}
          />

          {/* Layer 2: Modal Body with Butter-Smooth Native Compositor Curve */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{
              opacity: 0,
              scale: 0.92,
              y: 18,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.94,
              y: 10,
            }}
            transition={{
              duration: 0.26,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              willChange: "transform, opacity",
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 flex max-h-[90vh] w-[min(480px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border border-emerald-500/25 bg-white dark:bg-[#071915] shadow-2xl shadow-emerald-950/20"
          >
            {/* Top Close Button */}
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="group absolute top-4 right-4 z-20 flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-emerald-500/10 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer outline-none"
            >
              <X className="size-4 transition-transform duration-200 group-hover:scale-110" />
            </button>

            {/* Modal Header & Content */}
            <div className="flex flex-1 flex-col items-center px-6 pt-6 pb-5 text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                <Sparkles className="size-3 text-emerald-500" />
                <span>{language === "zh" ? "每日心情记录卡" : "Daily Mood Reveal"}</span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {language === "zh" ? "今日心境专属盲盒" : "Today's Mindset Card"}
              </h3>
              <p className="mt-1 mb-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[280px]">
                {language === "zh"
                  ? "记录已生成！轻触划动涂层，刮开专属于你的今日心境与疗愈箴言"
                  : "Check-in logged! Gently scratch the card to reveal your energy state and affirmation"}
              </p>

              {/* Scratch To Reveal Interactive Card */}
              <div className="relative mx-auto flex items-center justify-center rounded-2xl p-1 bg-gradient-to-br from-emerald-100/50 via-white to-teal-100/40 dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-teal-950/30 border border-emerald-500/20 shadow-inner">
                <ScratchToReveal
                  key={isOpen ? "modal-open" : "modal-closed"}
                  width={250}
                  height={250}
                  minScratchPercentage={42}
                  gradientColors={SCRATCH_GRADIENT_COLORS}
                  onComplete={() => setIsRevealed(true)}
                  className="rounded-xl border border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-950/50 shadow-sm"
                >
                  {/* Revealed Content: Bound strictly to user's selected answers */}
                  <div className="flex flex-col items-center justify-center gap-1.5 p-3 select-none">
                    <span
                      className={`text-6xl filter drop-shadow-sm transition-transform duration-500 ${
                        isRevealed ? "scale-110" : "scale-100"
                      }`}
                    >
                      {emoji}
                    </span>
                    <span className="text-sm font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">
                      {moodLabel}
                    </span>

                    {/* Answer metrics badges */}
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                      <span className="inline-flex items-center gap-0.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <Zap className="size-2.5 text-amber-500" />
                        {language === "zh" ? `能量 ${energyLevel}/5` : `Energy ${energyLevel}/5`}
                      </span>
                      <span className="inline-flex items-center gap-0.5 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                        <Heart className="size-2.5 text-rose-500" />
                        {language === "zh" ? `效价 ${valenceLevel}/5` : `Valence ${valenceLevel}/5`}
                      </span>
                    </div>

                    {/* Therapeutic Affirmation */}
                    <p className="mt-1 text-[10.5px] text-emerald-800/85 dark:text-emerald-300/85 font-medium leading-relaxed px-2 line-clamp-3">
                      {affirmation}
                    </p>

                    {/* User's note if present */}
                    {moodNote && (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[9.5px] text-muted-foreground truncate max-w-[210px]">
                        <MessageSquare className="size-2.5 shrink-0" />
                        <span className="truncate italic">"{moodNote}"</span>
                      </div>
                    )}
                  </div>
                </ScratchToReveal>
              </div>

              {/* Status Feedback */}
              <p
                className={`mt-3 text-[11px] font-medium transition-all duration-300 flex items-center justify-center gap-1 ${
                  isRevealed
                    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {isRevealed ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span>{language === "zh" ? "🎉 盲盒已开启 · 愿你心境从容温和" : "Revealed! Wishing you an inspired, peaceful day"}</span>
                  </>
                ) : (
                  <span>{language === "zh" ? "划动手指或按住鼠标刮开涂层" : "Swipe or drag mouse to scratch & reveal"}</span>
                )}
              </p>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2.5 bg-slate-50 dark:bg-black/30 px-6 py-3.5 border-t border-slate-100 dark:border-white/5">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="rounded-xl text-xs px-3.5 text-muted-foreground hover:bg-muted cursor-pointer"
              >
                {language === "zh" ? "关闭" : "Close"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className="rounded-xl text-xs px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs shadow-emerald-500/20 cursor-pointer"
              >
                {language === "zh" ? "收下今日心语" : "Accept Affirmation"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
