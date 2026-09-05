import React, { useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Compass,
  Route,
  HeartPulse,
  Sparkles,
  Clock3,
  FileText,
  BrainCircuit,
  Wind,
  Volume2,
  Sparkle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { NavTab } from "@/components/Navbar";
import { AssessmentFlow } from "@/components/guide/assess/AssessmentFlow";
import { ReframeWizard } from "@/components/guide/reframe/ReframeWizard";
import { loadReframeDraft, clearReframeDraft, getCognitiveSnapshots } from "@/lib/guideStore";
import { useLanguage } from "@/lib/i18n";
import { requestCbtReframe } from "@/services/api";
import { ThinkingOrb } from "thinking-orbs";
import { ttsPlayer } from "@/lib/iflytekTTS";

type GuideMode = "home" | "assess" | "reframe";

export interface ReframePreset {
  distortionType?: string;
  situation?: string;
}

function formatWhen(iso: string | undefined, isZh: boolean): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(isZh ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const GuideSection: React.FC<{
  onStartChatWithPrompt: (prompt?: string) => void;
  onNavigate: (tab: NavTab) => void;
}> = ({ onStartChatWithPrompt, onNavigate }) => {
  const { language, t } = useLanguage();
  const isZh = language === "zh";
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<GuideMode>("home");
  const [reframePreset, setReframePreset] = useState<ReframePreset | null>(null);

  // Quick CBT Studio state
  const [automaticThought, setAutomaticThought] = useState("");
  const [distortionType, setDistortionType] = useState("all-or-nothing");
  const [reframedThought, setReframedThought] = useState("");
  const [isReframing, setIsReframing] = useState(false);

  const draft = mode === "home" ? loadReframeDraft() : null;
  const lastSnapshot = mode === "home" ? getCognitiveSnapshots()[0] : null;

  useGSAP(
    () => {
      if (mode !== "home") return;
      gsap.from(".guide-home-card", {
        y: 24,
        autoAlpha: 0,
        stagger: 0.08,
        duration: 0.5,
        ease: "power3.out",
        clearProps: "all",
      });
    },
    { scope: containerRef, dependencies: [mode] }
  );

  const handleBackHome = () => {
    setReframePreset(null);
    setMode("home");
  };

  const startAssessment = () => setMode("assess");
  const startWizard = () => {
    setReframePreset(null);
    setMode("reframe");
  };
  const startWizardFresh = () => {
    if (draft) clearReframeDraft();
    setReframePreset(null);
    setMode("reframe");
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
    <div ref={containerRef} className="container mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-7">
      {mode === "home" && (
        <>
          <div className="text-center max-w-xl mx-auto pt-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
              <Compass className="size-3.5" />
              <span>{isZh ? "思绪梳理工作坊" : "Guided Counseling Studio"}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-lato-light">
              {isZh ? "理解内心感受，温和梳理思绪" : "Understand Your Mind, Reframe Your Thoughts"}
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground font-lato-light-italic">
              {isZh
                ? "基于循证 CBT 的专业体系 — 涵盖全流程深度向导与即时微练习。"
                : "Evidence-based CBT journeys — comprehensive guided wizards and rapid micro-practices."}
            </p>
          </div>

          {/* Section 1: Quick Micro-Practice Suite (即时轻量练习 · 快速解构与情绪着陆) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80 px-1">
              <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isZh ? "即时轻量练习 · 快速解构与情绪着陆" : "Quick Micro-Practices · Immediate Unpacking & Grounding"}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: CBT Thought Studio (即时思维解构) */}
              <Card className="guide-home-card rounded-3xl p-6 border border-emerald-500/20 bg-card/50 dark:bg-card/40 shadow-lg shadow-emerald-500/[0.03] backdrop-blur-xl backdrop-saturate-150 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/25 text-purple-600 dark:text-purple-400">
                      <BrainCircuit className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground">
                        {t("mood.reframeTitle")}
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-lato-light-italic">
                        {t("mood.reframeSub")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-xs mt-4">
                    <div>
                      <span className="font-semibold text-foreground/80 block mb-1.5">
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
                      <span className="font-semibold text-foreground/80 block mb-1.5">
                        {t("mood.distortionTitle")}
                      </span>
                      <select
                        value={distortionType}
                        onChange={(e) => setDistortionType(e.target.value)}
                        className="w-full rounded-xl border border-input/60 bg-background/50 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 cursor-pointer"
                      >
                        <option value="all-or-nothing">
                          {isZh ? "非黑即白思维 (All-or-Nothing)" : "All-or-Nothing Thinking"}
                        </option>
                        <option value="catastrophizing">
                          {isZh ? "灾难化思维 (Catastrophizing)" : "Catastrophizing"}
                        </option>
                        <option value="emotional-reasoning">
                          {isZh ? "情绪化推理 (Emotional Reasoning)" : "Emotional Reasoning"}
                        </option>
                      </select>
                    </div>

                    <Button
                      size="sm"
                      onClick={handleCbtReframe}
                      disabled={!automaticThought.trim() || isReframing}
                      className="w-full rounded-xl text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer mt-1"
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
                </div>
              </Card>

              {/* Card 2: 30s Somatic Grounding (30s感官着陆) */}
              <Card className="guide-home-card rounded-3xl p-6 border border-teal-500/20 bg-card/50 dark:bg-card/40 shadow-lg shadow-teal-500/[0.03] backdrop-blur-xl backdrop-saturate-150 flex flex-col justify-between transition-[transform,box-shadow,border-color] duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/35">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/25 text-teal-600 dark:text-teal-400">
                      <Wind className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground">
                        {t("mood.groundingCardTitle")}
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-lato-light-italic">
                        {isZh ? "快速重构感官连接 · 缓解急性惊慌与胡思乱想" : "Rapid somatic reconnection · Reset panic & rumination"}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mt-4">
                    {t("mood.groundingDesc")}
                  </p>

                  <div className="mt-4 p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-800 dark:text-teal-200 leading-relaxed">
                    💡 {isZh ? "当感到焦虑、过载或情绪紧绷时，5-4-3-2-1 练习通过调动五大感官，能在 30 秒内有效中断大脑的焦虑反刍回路。" : "When feeling overwhelmed or tense, the 5-4-3-2-1 practice interrupts mental rumination by grounding attention directly in sensory reality."}
                  </div>
                </div>

                <div className="mt-5">
                  <Button
                    onClick={() =>
                      ttsPlayer.play(
                        "grounding-audio",
                        isZh
                          ? "欢迎来到 30 秒感官着陆练习。请先做一次舒缓平稳的深呼吸。环顾四周，留意五件你能看到的物品。四种你能触摸到的质感。三种你能听到的声音。两种你能闻到的气味。最后再做一次深长放松的深呼吸。在这一刻，你是完全安全的。"
                          : "Welcome to your 30-second somatic grounding. Take a deep, gentle breath. Look around and notice five things you can see. Four textures you can touch. Three sounds you can hear. Two scents you can smell. And one deep, calming breath. You are safe in this present moment.",
                        "female",
                        45
                      )
                    }
                    className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white h-10 gap-2 cursor-pointer"
                  >
                    <Volume2 className="size-4" />
                    <span>{t("mood.groundingVoiceBtn")}</span>
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* Section 2: Deep Structured Journeys (深度疗愈与自测向导) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80 px-1">
              <Route className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isZh ? "深度疗愈与自测向导" : "In-Depth Journeys & Assessment"}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 3: Cognitive Assessment */}
              <Card className="guide-home-card rounded-3xl p-6 border border-emerald-500/20 bg-card/50 dark:bg-card/40 shadow-lg shadow-emerald-500/[0.03] backdrop-blur-xl backdrop-saturate-150 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400">
                      <Route className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground">
                        {isZh ? "心境与状态自测" : "Cognitive Assessment"}
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-lato-light-italic">
                        {isZh ? "10 道温和的自测题目，生成多维度分析报告" : "A gentle 10-question intake with a multi-dimension report"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {isZh
                      ? "完成简短自测问卷，并在征得你同意的前提下，结合近期对话与情绪记录，梳理思维倾向、精力状态与心理注意力分布。"
                      : "Answer a short intake quiz and — with your permission — blend in signals from your recent chats and mood check-ins to map thinking tendencies, energy states, and where your attention has been living."}
                  </p>
                  <p className="mt-3 inline-flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <Sparkles className="size-3.5 mt-0.5 shrink-0 text-emerald-500/80" />
                    {isZh ? "所有数据仅保存在本地设备中 — 绝不会上传或留存在云端服务器。" : "Everything stays on your device — nothing is uploaded or stored on a server."}
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-2.5">
                  <Button
                    onClick={startAssessment}
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-10 cursor-pointer"
                  >
                    {isZh ? "开始自测" : "Start Assessment"}
                  </Button>
                  {lastSnapshot ? (
                    <p className="text-center text-[11px] text-muted-foreground">
                      <Clock3 className="inline size-3 mr-1 -mt-0.5" />
                      {isZh ? `上次自测 ${formatWhen(lastSnapshot.createdAt, isZh)}` : `Last snapshot ${formatWhen(lastSnapshot.createdAt, isZh)}`}
                    </p>
                  ) : (
                    <p className="text-center text-[11px] text-muted-foreground">
                      {isZh ? "暂无自测记录 · 约需 3 分钟" : "No assessment yet · takes ~3 minutes"}
                    </p>
                  )}
                </div>
              </Card>

              {/* Card 4: 7-Step Reframe Wizard */}
              <Card className="guide-home-card rounded-3xl p-6 border border-teal-500/20 bg-card/50 dark:bg-card/40 shadow-lg shadow-teal-500/[0.03] backdrop-blur-xl backdrop-saturate-150 flex flex-col justify-between transition-[transform,box-shadow,border-color] duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/35">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/25 text-teal-600 dark:text-teal-400">
                      <HeartPulse className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground">
                        {isZh ? "7步想法梳理向导" : "7-Step Guided Reframe"}
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-lato-light-italic">
                        {isZh ? "温和 CBT 记录法，一步一步理清思绪" : "A 7-step CBT thought record, one gentle move at a time"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {isZh
                      ? "记录情境、觉察念头与情绪、识别思维盲区、权衡证据，提炼出平衡的新视角。"
                      : "Name the situation, catch the automatic thought, spot the distortion, weigh the evidence, and land on a balanced reframe."}
                  </p>
                  <p className="mt-3 inline-flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <FileText className="size-3.5 mt-0.5 shrink-0 text-teal-500/80" />
                    {isZh ? "草稿自动保存在本地，可随时离开、稍后继续。" : "Your draft auto-saves — leave and pick it back up anytime."}
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-2.5">
                  {draft ? (
                    <>
                      <Button
                        onClick={startWizard}
                        className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white h-10 cursor-pointer"
                      >
                        {isZh ? "继续上次草稿 — 从离开处恢复" : "Continue Draft — resume where you left off"}
                      </Button>
                      <Button
                        onClick={startWizardFresh}
                        variant="outline"
                        className="w-full rounded-xl h-9 border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 cursor-pointer"
                      >
                        {isZh ? "重新开始" : "Start Fresh"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={startWizard}
                      className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white h-10 cursor-pointer"
                    >
                      {isZh ? "开始 7 步梳理" : "Begin 7-Step Wizard"}
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      {mode === "assess" && (
        <AssessmentFlow
          onBack={handleBackHome}
          onStartReframe={(preset) => {
            setReframePreset(preset);
            setMode("reframe");
          }}
          onNavigate={onNavigate}
        />
      )}

      {mode === "reframe" && (
        <ReframeWizard
          preset={reframePreset}
          onBack={handleBackHome}
          onStartChatWithPrompt={onStartChatWithPrompt}
        />
      )}
    </div>
  );
};
