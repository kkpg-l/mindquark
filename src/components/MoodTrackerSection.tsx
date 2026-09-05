import React, { useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Smile,
  Sparkles,
  HeartPulse,
  CheckCircle2,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logMoodEntry } from "@/lib/activityLog";
import { useLanguage } from "@/lib/i18n";
import { MoodScratchModal } from "@/components/MoodScratchModal";
import { cn } from "@/lib/utils";

export const MoodTrackerSection: React.FC<{
  onStartChatWithMood?: (moodPrompt: string) => void;
}> = ({ onStartChatWithMood }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { language, t } = useLanguage();
  const [selectedMood, setSelectedMood] = useState<string>("🌿 平和与安定");
  const [energyLevel, setEnergyLevel] = useState<number>(3);
  const [valenceLevel, setValenceLevel] = useState<number>(4);
  const [moodNote, setMoodNote] = useState<string>("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showScratchModal, setShowScratchModal] = useState(false);

  // GSAP Smooth Sanctuary Entrance
  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".mood-header-wrap", {
        y: -14,
        autoAlpha: 0,
        duration: 0.5,
      }).from(
        ".mood-main-card",
        {
          y: 20,
          autoAlpha: 0,
          duration: 0.55,
        },
        "-=0.2"
      );
    },
    { scope: containerRef }
  );

  const moodOptions = [
    { label: language === "zh" ? "🌿 平和与安定" : "🌿 Calm & Centered", emoji: "🌿" },
    { label: language === "zh" ? "😊 喜悦与感恩" : "😊 Joyful & Grateful", emoji: "😊" },
    { label: language === "zh" ? "😰 焦虑与不安" : "😰 Anxious & Uneasy", emoji: "😰" },
    { label: language === "zh" ? "😔 低落与沮丧" : "😔 Low & Dejected", emoji: "😔" },
    { label: language === "zh" ? "😴 倦怠与耗竭" : "😴 Drained & Burnt out", emoji: "😴" },
    { label: language === "zh" ? "😡 烦躁与紧绷" : "😡 Frustrated & Tense", emoji: "😡" },
  ];

  const handleSaveCheckIn = () => {
    logMoodEntry(selectedMood, energyLevel, valenceLevel, moodNote);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);

    // 用户完成每日心情记录后，自动弹出对应选择的心情刮刮卡
    setTimeout(() => {
      setShowScratchModal(true);
    }, 320);
  };

  return (
    <div ref={containerRef} className="container mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-7 select-none">
      {/* Title Header - Serene & Centered */}
      <div className="mood-header-wrap text-center max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2.5">
          <HeartPulse className="size-3.5 text-rose-500" />
          <span>{t("mood.headerBadge")}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-lato-light">
          {t("mood.headerTitle")}
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground font-lato-light-italic">
          {t("mood.headerSub")}
        </p>
      </div>

      {/* Main Journal Card - Refined, Balanced & Focused */}
      <Card className="mood-main-card rounded-3xl p-6 sm:p-9 border border-emerald-500/20 bg-card/50 dark:bg-card/40 shadow-lg shadow-emerald-500/[0.03] backdrop-blur-xl backdrop-saturate-150 space-y-7">
        {/* Card Header */}
        <CardHeader className="p-0 flex flex-row items-center justify-between pb-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Smile className="size-6" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-foreground">
                {t("mood.checkinTitle")}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("mood.checkinSub")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-muted/40 px-3 py-1.5 rounded-full border border-border/40">
            <Calendar className="size-3.5 text-emerald-500" />
            <span>
              {new Date().toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", {
                month: "short",
                day: "numeric",
                weekday: "short",
              })}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0 space-y-7">
          {/* Step 1: Primary Emotion Selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-foreground/80">
                {t("mood.step1")}
              </label>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                {selectedMood.replace(/^\S+\s*/, "")}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {moodOptions.map((opt) => {
                const isSelected = selectedMood === opt.label;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setSelectedMood(opt.label)}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl border p-3.5 text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer text-left",
                      isSelected
                        ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/30 font-semibold shadow-xs scale-[1.01]"
                        : "border-border/60 bg-background/50 hover:bg-muted/60 text-foreground/80 hover:border-emerald-500/30"
                    )}
                  >
                    <span
                      key={String(isSelected)}
                      className={cn(
                        "text-xl shrink-0 transition-transform duration-200 group-hover:scale-110",
                        isSelected && "animate-pop-in"
                      )}
                    >
                      {opt.emoji}
                    </span>
                    <span className="truncate">{opt.label.replace(/^\S+\s*/, "")}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Sliders: Energy & Valence */}
          <div className="space-y-5 pt-4 border-t border-border/50">
            {/* Energy Slider */}
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold text-foreground/80">{t("mood.energy")}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {energyLevel} / 5
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={energyLevel}
                onChange={(e) => setEnergyLevel(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5 font-lato-light-italic">
                <span>{t("mood.energyDepleted")}</span>
                <span>{t("mood.energyEnergized")}</span>
              </div>
            </div>

            {/* Valence Slider */}
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold text-foreground/80">{t("mood.valence")}</span>
                <span className="font-semibold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                  {valenceLevel} / 5
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={valenceLevel}
                onChange={(e) => setValenceLevel(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg accent-teal-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5 font-lato-light-italic">
                <span>{t("mood.valenceLow")}</span>
                <span>{t("mood.valenceHigh")}</span>
              </div>
            </div>
          </div>

          {/* Step 3: Context / Notes */}
          <div className="pt-2">
            <label className="text-xs font-semibold text-foreground/80 mb-2 block">
              {t("mood.step2")}
            </label>
            <textarea
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              placeholder={t("mood.notePlaceholder")}
              rows={3}
              className="w-full rounded-2xl border border-input/60 bg-background/50 p-3.5 text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 resize-none placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onStartChatWithMood &&
                onStartChatWithMood(
                  language === "zh"
                    ? `我刚完成了情绪记录。我此刻的心情是【${selectedMood}】，身心能量为 ${energyLevel}/5，情绪效价为 ${valenceLevel}/5。备注：${moodNote || "我想和你聊聊，一起探索如何梳理面对此刻的心境。"}`
                    : `I just logged my mood check-in. I'm feeling ${selectedMood}, with energy level ${energyLevel}/5 and valence ${valenceLevel}/5. Notes: ${moodNote || "I'd like to reflect with you on how to navigate this."}`
                )
              }
              className="rounded-xl text-xs gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
            >
              <Sparkles className="size-3.5 text-emerald-500" />
              <span>{t("mood.reflectBtn")}</span>
            </Button>

            <Button
              size="sm"
              onClick={handleSaveCheckIn}
              className="rounded-xl text-xs px-6 py-2 h-9.5 gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-sm cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="size-4 text-emerald-200 animate-pop-in" />
                  <span>{t("mood.saved")}</span>
                </>
              ) : (
                <>
                  <span>{t("mood.saveBtn")}</span>
                  <ArrowRight className="size-3.5 opacity-80" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gentle Navigation Hint */}
      <div className="text-center text-xs text-muted-foreground/80 font-lato-light-italic">
        <span>{language === "zh" ? "想拆解念头或练习感官着陆？去「思绪梳理」看看。" : "Unpack a sticky thought or try grounding in the Guide tab."}</span>
      </div>

      {/* Scratch To Reveal Animated Modal - Automatic on Save */}
      <MoodScratchModal
        isOpen={showScratchModal}
        onClose={() => setShowScratchModal(false)}
        selectedMood={selectedMood}
        energyLevel={energyLevel}
        valenceLevel={valenceLevel}
        moodNote={moodNote}
      />
    </div>
  );
};
