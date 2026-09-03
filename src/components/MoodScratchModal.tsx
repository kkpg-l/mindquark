import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScratchToReveal } from "@/components/ui/scratch-to-reveal";
import { useLanguage } from "@/lib/i18n";

interface MoodScratchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMood: string;
  onConfirm?: () => void;
}

export const MoodScratchModal: React.FC<MoodScratchModalProps> = ({
  isOpen,
  onClose,
  selectedMood,
  onConfirm,
}) => {
  const { language } = useLanguage();
  const [isRevealed, setIsRevealed] = useState(false);

  // Extract emoji and label from selectedMood string (e.g. "🌿 Calm & Centered" or "😊 喜悦与感恩")
  const emoji = selectedMood.match(/\p{Extended_Pictographic}/u)?.[0] || "🌿";
  const moodLabel = selectedMood.replace(/^\S+\s*/, "") || (language === "zh" ? "平和与安定" : "Calm & Centered");

  // Reset revealed state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsRevealed(false);
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-md"
          />

          {/* Silky Spring Animated Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-500/25 bg-white/95 dark:bg-[#04120f]/95 p-6 sm:p-7 text-center shadow-2xl shadow-emerald-500/15 backdrop-blur-2xl"
          >
            {/* Top Close Icon Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-emerald-500/10 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>

            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2.5">
              <Sparkles className="size-3 text-emerald-500" />
              <span>{language === "zh" ? "每日情绪盲盒" : "Daily Mood Reveal"}</span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {language === "zh" ? "揭晓今日专属心境" : "Reveal Today's Mood"}
            </h3>
            <p className="mt-1 mb-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[240px] mx-auto">
              {language === "zh"
                ? "在下方涂层轻触划动，刮开属于你的身心能量状态"
                : "Gently scratch the cover below to uncover your inner sanctuary energy"}
            </p>

            {/* Scratch to Reveal Card */}
            <div className="relative mx-auto flex items-center justify-center rounded-3xl p-1 bg-gradient-to-br from-emerald-100/40 via-white to-teal-100/30 dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-teal-950/30 border border-emerald-500/20 shadow-inner">
              <ScratchToReveal
                width={250}
                height={250}
                minScratchPercentage={45}
                gradientColors={["#10B981", "#14B8A6", "#34D399"]}
                onComplete={() => setIsRevealed(true)}
                className="rounded-2xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-sm"
              >
                {/* Revealed Content */}
                <div className="flex flex-col items-center justify-center gap-2 p-4 select-none">
                  <span
                    className={`text-7xl filter drop-shadow-sm transition-transform duration-500 ${
                      isRevealed ? "scale-110" : "scale-100"
                    }`}
                  >
                    {emoji}
                  </span>
                  <span className="text-sm font-bold text-emerald-900 dark:text-emerald-200 mt-1">
                    {moodLabel}
                  </span>
                  <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">
                    {language === "zh" ? "身心调和 · 活在当下" : "Inner Harmony · Present Mind"}
                  </span>
                </div>
              </ScratchToReveal>
            </div>

            {/* Status Feedback */}
            <p
              className={`mt-4 text-[11px] font-medium transition-all duration-300 flex items-center justify-center gap-1 ${
                isRevealed
                  ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {isRevealed ? (
                <>
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  <span>{language === "zh" ? "已完全揭晓！愿你拥有从容惬意的一天" : "Revealed! Wishing you a mindful day"}</span>
                </>
              ) : (
                <span>{language === "zh" ? "手指或鼠标划动卡片以刮开" : "Swipe or click & drag to scratch"}</span>
              )}
            </p>

            {/* Footer Actions */}
            <div className="mt-5 flex items-center justify-end gap-2.5 pt-1 border-t border-slate-100 dark:border-white/5">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="rounded-xl text-xs px-3.5 text-muted-foreground hover:bg-muted"
              >
                {language === "zh" ? "稍后再看" : "Close"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className="rounded-xl text-xs px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium shadow-sm shadow-emerald-500/25 cursor-pointer"
              >
                {language === "zh" ? "记录并确认" : "Confirm & Save"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
