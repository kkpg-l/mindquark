import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScratchToReveal } from "@/components/ui/scratch-to-reveal";
import { useLanguage } from "@/lib/i18n";

export interface MoodScratchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMood: string;
  onConfirm?: () => void;
  lockScroll?: boolean;
  closeOnOutside?: boolean;
  closeOnEsc?: boolean;
  showClose?: boolean;
}

export const MoodScratchModal: React.FC<MoodScratchModalProps> = ({
  isOpen,
  onClose,
  selectedMood,
  onConfirm,
  lockScroll = true,
  closeOnOutside = true,
  closeOnEsc = true,
  showClose = true,
}) => {
  const { language } = useLanguage();
  const [isRevealed, setIsRevealed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Extract emoji and label from selectedMood string (e.g. "🌿 Calm & Centered" or "😊 喜悦与感恩")
  const emoji = selectedMood.match(/\p{Extended_Pictographic}/u)?.[0] || "🌿";
  const moodLabel =
    selectedMood.replace(/^\S+\s*/, "") || (language === "zh" ? "平和与安定" : "Calm & Centered");

  // Reset revealed state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsRevealed(false);
    }
  }, [isOpen]);

  // Lock scroll when open
  useEffect(() => {
    if (!isOpen || !lockScroll) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, lockScroll]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{ zIndex: 10000 }}
          className="fixed inset-0 flex h-full w-full items-center justify-center p-4 [perspective:1000px] [transform-style:preserve-3d]"
        >
          {/* Backdrop with 10px blur as defined in AnimatedModal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={() => closeOnOutside && onClose()}
            className="fixed inset-0 h-full w-full bg-black/50"
          />

          {/* 3D Entrance Spring Animated Modal Body */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            initial={{
              opacity: 0,
              scale: 0.5,
              rotateX: 80,
              y: 40,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              rotateX: 0,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.8,
              rotateX: 10,
            }}
            transition={{
              opacity: { duration: 0.2, ease: "easeOut" },
              scale: { type: "spring", stiffness: 260, damping: 15 },
              rotateX: { type: "spring", stiffness: 260, damping: 15 },
              y: { type: "spring", stiffness: 260, damping: 15 },
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-50 flex max-h-[88vh] w-[min(460px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-emerald-500/20 bg-white dark:border-neutral-800 dark:bg-neutral-950 shadow-2xl"
          >
            {/* Show Close Button with group-hover rotate/scale */}
            {showClose && (
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="group absolute top-4 right-4 z-50 p-1 cursor-pointer outline-none"
              >
                <X className="h-4 w-4 text-black transition duration-200 group-hover:scale-125 group-hover:rotate-3 dark:text-white" />
              </button>
            )}

            {/* AnimatedModalContent */}
            <div className="flex flex-1 flex-col p-6 sm:p-7 items-center text-center">
              {/* Header Badge */}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                <Sparkles className="size-3 text-emerald-500" />
                <span>{language === "zh" ? "每日情绪盲盒" : "Daily Mood Reveal"}</span>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                {language === "zh" ? "揭晓今日专属心境" : "Reveal Today's Mood"}
              </h3>
              <p className="mt-1.5 mb-5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-[260px]">
                {language === "zh"
                  ? "在下方涂层轻触划动，刮开属于你的身心能量状态"
                  : "Gently scratch the cover below to uncover your inner sanctuary energy"}
              </p>

              {/* Scratch To Reveal Card */}
              <div className="relative mx-auto flex items-center justify-center rounded-2xl p-1 bg-gradient-to-br from-emerald-100/40 via-white to-teal-100/30 dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-teal-950/30 border border-emerald-500/20 shadow-inner">
                <ScratchToReveal
                  width={240}
                  height={240}
                  minScratchPercentage={45}
                  gradientColors={["#10B981", "#14B8A6", "#34D399"]}
                  onComplete={() => setIsRevealed(true)}
                  className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-sm"
                >
                  {/* Revealed Content with Mood Emoji */}
                  <div className="flex flex-col items-center justify-center gap-1.5 p-3 select-none">
                    <span
                      className={`text-6xl filter drop-shadow-sm transition-transform duration-500 ${
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
                className={`mt-3.5 text-[11px] font-medium transition-all duration-300 flex items-center justify-center gap-1 ${
                  isRevealed
                    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-gray-400 dark:text-gray-500"
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
            </div>

            {/* AnimatedModalFooter */}
            <div className="flex justify-end gap-2 bg-gray-100 p-4 dark:bg-neutral-900 border-t border-gray-200/50 dark:border-neutral-800">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="rounded-lg text-xs px-3.5 border-gray-300 dark:border-neutral-700 hover:bg-gray-200/60 dark:hover:bg-neutral-800 cursor-pointer"
              >
                {language === "zh" ? "取消" : "Cancel"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className="rounded-lg text-xs px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs cursor-pointer"
              >
                {language === "zh" ? "记录并确认" : "Confirm"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
