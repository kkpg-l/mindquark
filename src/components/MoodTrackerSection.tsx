import React, { useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Smile,
  Sparkles,
  HeartPulse,
  BrainCircuit,
  Wind,
  CheckCircle2,
  Volume2,
  ArrowRight,
  Sparkle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logMoodEntry } from "@/lib/activityLog";
import { requestCbtReframe } from "@/services/api";
import { ThinkingOrb } from "thinking-orbs";
import { ttsPlayer } from "@/lib/iflytekTTS";
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

  // Right column tab: 'cbt' or 'grounding'
  const [activeRightTab, setActiveRightTab] = useState<"cbt" | "grounding">("cbt");

  // CBT Reframer state
  const [automaticThought, setAutomaticThought] = useState("");
  const [distortionType, setDistortionType] = useState("all-or-nothing");
  const [reframedThought, setReframedThought] = useState("");
  const [isReframing, setIsReframing] = useState(false);

  // GSAP Smooth Sanctuary Entrance
  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".mood-header-wrap", {
        y: -12,
        autoAlpha: 0,
        duration: 0.5,
      }).from(
        ".mood-card-bento",
        {
          y: 20,
          autoAlpha: 0,
          stagger: 0.1,
          duration: 0.55,
        },
        "-=0.25"
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

  const handleCbtReframe = async () => {
    if (!automaticThought.trim()) return;
    setIsReframing(true);

    try {
      const result = await requestCbtReframe(automaticThought, distortionType);
      setReframedThought(result);
    } catch (err) {
      console.error("Reframe error:", err);
    } finally {
      setIsReframing(false);
    }
  };

  return (
    <div ref={containerRef} className="container mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-7 select-none">
      {/* Title Header - Clean & Serene */}
      <div className="mood-header-wrap text-center max-w-lg mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-2">
          <HeartPulse className="size-3.5 text-rose-500" />
          <span>{t("mood.headerBadge")}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-lato-light">
          {t("mood.headerTitle")}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-lato-light-italic">
          {t("mood.headerSub")}
        </p>
      </div>

      {/* Balanced 2-Column Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Module 1: Daily Mood Check-in (7 cols) */}
        <Card className="mood-card-bento md:col-span-7 rounded-3xl p-6 border border-emerald-500/15 bg-card/80 dark:bg-card/60 shadow-sm backdrop-blur-md space-y-5">
          {/* Card Header */}
          <CardHeader className="p-0 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Smile className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">{t("mood.checkinTitle")}</CardTitle>
                <p className="text-xs text-muted-foreground">{t("mood.checkinSub")}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-mono bg-muted/40 px-2.5 py-1 rounded-full border border-border/40">
              {new Date().toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", {
                month: "short",
                day: "numeric",
                weekday: "short",
              })}
            </span>
          </CardHeader>

          <CardContent className="p-0 space-y-5">
            {/* Step 1: Mood Category Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-foreground/80">
                  {t("mood.step1")}
                </label>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {selectedMood.replace(/^\S+\s*/, "")}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {moodOptions.map((opt) => {
                  const isSelected = selectedMood === opt.label;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setSelectedMood(opt.label)}
                      className={cn(
                        "flex items-center gap-2 rounded-2xl border p-2.5 text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer",
                        isSelected
                          ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-500/30 font-semibold shadow-xs"
                          : "border-border/60 bg-background/50 hover:bg-muted/60 text-foreground/80"
                      )}
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      <span className="truncate">{opt.label.replace(/^\S+\s*/, "")}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Sliders: Energy & Valence */}
            <div className="space-y-3.5 pt-3 border-t border-border/50">
              {/* Energy Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-foreground/80">{t("mood.energy")}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {energyLevel} / 5
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(Number(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{t("mood.energyDepleted")}</span>
                  <span>{t("mood.energyEnergized")}</span>
                </div>
              </div>

              {/* Valence Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-foreground/80">{t("mood.valence")}</span>
                  <span className="font-semibold text-teal-600 dark:text-teal-400">
                    {valenceLevel} / 5
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={valenceLevel}
                  onChange={(e) => setValenceLevel(Number(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg accent-teal-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{t("mood.valenceLow")}</span>
                  <span>{t("mood.valenceHigh")}</span>
                </div>
              </div>
            </div>

            {/* Step 3: Optional Notes */}
            <div>
              <label className="text-xs font-semibold text-foreground/80 mb-1.5 block">
                {t("mood.step2")}
              </label>
              <textarea
                value={moodNote}
                onChange={(e) => setMoodNote(e.target.value)}
                placeholder={t("mood.notePlaceholder")}
                rows={2}
                className="w-full rounded-2xl border border-input/60 bg-background/50 p-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50 resize-none"
              />
            </div>

            {/* Action Bar - Clean 2-action flow */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onStartChatWithMood &&
                  onStartChatWithMood(
                    language === "zh"
                      ? `我刚完成了情绪记录。我此刻的心情是【${selectedMood}】，身心能量为 ${energyLevel}/5，情绪效价为 ${valenceLevel}/5。备注：${moodNote || "我想和你聊聊，一起探索如何梳理面对此刻的心境。"}`
                      : `I just logged my mood check-in. I'm feeling ${selectedMood}, with energy level ${energyLevel}/5 and valence ${valenceLevel}/5. Notes: ${moodNote || "I'd like to reflect with you on how to navigate this."}`
                  )
                }
                className="rounded-xl text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              >
                <Sparkles className="size-3.5 text-emerald-500" />
                <span>{t("mood.reflectBtn")}</span>
              </Button>

              <Button
                size="sm"
                onClick={handleSaveCheckIn}
                className="rounded-xl text-xs px-5 gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-200 animate-pop-in" />
                    <span>{t("mood.saved")}</span>
                  </>
                ) : (
                  <>
                    <span>{t("mood.saveBtn")}</span>
                    <ArrowRight className="size-3 opacity-70" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Module 2: Unified Mind Studio (5 cols) */}
        <Card className="mood-card-bento md:col-span-5 rounded-3xl p-6 border border-emerald-500/15 bg-card/80 dark:bg-card/60 shadow-sm backdrop-blur-md space-y-5">
          {/* Header with Zen Segmented Tabs */}
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="inline-flex p-1 bg-muted/60 dark:bg-white/5 rounded-2xl border border-border/40 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveRightTab("cbt")}
                className={cn(
                  "px-3 py-1 rounded-xl transition-all font-medium cursor-pointer",
                  activeRightTab === "cbt"
                    ? "bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-300 shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                💡 {t("mood.reframeTitle")}
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab("grounding")}
                className={cn(
                  "px-3 py-1 rounded-xl transition-all font-medium cursor-pointer",
                  activeRightTab === "grounding"
                    ? "bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-300 shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                🍃 {language === "zh" ? "30s 感官着陆" : "Grounding"}
              </button>
            </div>
          </div>

          {/* Tab 1: CBT Thought Studio */}
          {activeRightTab === "cbt" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <span className="text-xs font-semibold text-foreground/80 block mb-1.5">
                  {t("mood.antTitle")}
                </span>
                <input
                  type="text"
                  value={automaticThought}
                  onChange={(e) => setAutomaticThought(e.target.value)}
                  placeholder={t("mood.antPlaceholder")}
                  className="w-full rounded-xl border border-input/60 bg-background/50 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
              </div>

              <div>
                <span className="text-xs font-semibold text-foreground/80 block mb-1.5">
                  {t("mood.distortionTitle")}
                </span>
                <select
                  value={distortionType}
                  onChange={(e) => setDistortionType(e.target.value)}
                  className="w-full rounded-xl border border-input/60 bg-background/50 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 cursor-pointer"
                >
                  <option value="all-or-nothing">
                    {language === "zh" ? "非黑即白思维 (All-or-Nothing)" : "All-or-Nothing Thinking"}
                  </option>
                  <option value="catastrophizing">
                    {language === "zh" ? "灾难化思维 (Catastrophizing)" : "Catastrophizing"}
                  </option>
                  <option value="emotional-reasoning">
                    {language === "zh" ? "情绪化推理 (Emotional Reasoning)" : "Emotional Reasoning"}
                  </option>
                </select>
              </div>

              <Button
                size="sm"
                onClick={handleCbtReframe}
                disabled={!automaticThought.trim() || isReframing}
                className="w-full rounded-xl text-xs h-8.5 gap-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white cursor-pointer"
              >
                <Sparkle className="size-3.5" />
                <span>{isReframing ? t("mood.reframing") : t("mood.reframeBtn")}</span>
              </Button>

              {isReframing && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-center gap-3 animate-in fade-in duration-200">
                  <ThinkingOrb state="solving" size={64} speed={0.85} />
                  <span className="text-[11px] text-muted-foreground">
                    {t("mood.reframingText")}
                  </span>
                </div>
              )}

              {reframedThought && !isReframing && (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-3.5 text-xs leading-relaxed text-foreground whitespace-pre-line animate-in fade-in">
                  {reframedThought}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: 30s Somatic Grounding */}
          {activeRightTab === "grounding" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                    <Wind className="size-4" />
                    <span>{t("mood.groundingCardTitle")}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      ttsPlayer.play(
                        "grounding-audio",
                        language === "zh"
                          ? "欢迎来到 30 秒感官着陆练习。请先做一次舒缓平稳的深呼吸。环顾四周，留意五件你能看到的物品。四种你能触摸到的质感。三种你能听到的声音。两种你能闻到的气味。最后再做一次深长放松的深呼吸。在这一刻，你是完全安全的。"
                          : "Welcome to your 30-second somatic grounding. Take a deep, gentle breath. Look around and notice five things you can see. Four textures you can touch. Three sounds you can hear. Two scents you can smell. And one deep, calming breath. You are safe in this present moment.",
                        "female",
                        45
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3 py-1 text-[11px] font-medium hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                  >
                    <Volume2 className="size-3" />
                    <span>{t("mood.groundingVoiceBtn")}</span>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("mood.groundingDesc")}
                </p>
              </div>

              <div className="text-[11px] text-muted-foreground space-y-1.5 px-1">
                <p>💡 {language === "zh" ? "当感到焦虑或紧绷时，感官着陆能迅速将注意力带回身体。" : "When feeling anxious or flooded, grounding brings focus gently back to the body."}</p>
              </div>
            </div>
          )}
        </Card>
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
