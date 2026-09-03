import React, { useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Compass, Route, HeartPulse, Sparkles, Clock3, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { NavTab } from "@/components/Navbar";
import { AssessmentFlow } from "@/components/guide/assess/AssessmentFlow";
import { ReframeWizard } from "@/components/guide/reframe/ReframeWizard";
import { loadReframeDraft, clearReframeDraft, getCognitiveSnapshots } from "@/lib/guideStore";
import { useLanguage } from "@/lib/i18n";

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
  const { language } = useLanguage();
  const isZh = language === "zh";
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<GuideMode>("home");
  const [reframePreset, setReframePreset] = useState<ReframePreset | null>(null);

  const draft = mode === "home" ? loadReframeDraft() : null;
  const lastSnapshot = mode === "home" ? getCognitiveSnapshots()[0] : null;

  useGSAP(
    () => {
      if (mode !== "home") return;
      gsap.from(".guide-home-card", {
        y: 24,
        autoAlpha: 0,
        stagger: 0.12,
        duration: 0.5,
        ease: "power3.out",
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

  return (
    <div ref={containerRef} className="container mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6">
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
                ? "基于循证 CBT 的温和练习 — 包含想法梳理向导与身心状态自测。"
                : "Evidence-based CBT journeys — a structured reframe wizard and a gentle cognitive assessment."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="guide-home-card rounded-3xl p-6 border border-emerald-500/20 bg-card/85 dark:bg-card/70 shadow-md shadow-emerald-500/5 backdrop-blur-md">
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
                    {isZh ? "暂无自测记录 — 初次评估约需 3 分钟。" : "No assessment yet — the first one takes about 3 minutes."}
                  </p>
                )}
              </div>
            </Card>

            <Card className="guide-home-card rounded-3xl p-6 border border-teal-500/20 bg-card/85 dark:bg-card/70 shadow-md shadow-teal-500/5 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/25 text-teal-600 dark:text-teal-400">
                  <HeartPulse className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    {isZh ? "想法梳理向导" : "Guided Reframe"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-lato-light-italic">
                    {isZh ? "7 步温和 CBT 记录法，一步一步理清思绪" : "A 7-step CBT thought record, one gentle move at a time"}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isZh
                  ? "专注梳理一个困扰你的想法：记录当下的情境，觉察自动闪过的想法与情绪，识别思维盲区，列出客观事实，提炼出平衡的新想法与行动小步。"
                  : "Work through a single sticky thought: name the situation, catch the automatic thought, feel the emotion, spot the distortion, weigh the evidence, and land on a balanced reframe with one small step."}
              </p>
              <p className="mt-3 inline-flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <FileText className="size-3.5 mt-0.5 shrink-0 text-teal-500/80" />
                {isZh ? "梳理草稿会自动保存在本地 — 可以随时离开并稍后继续。" : "Your draft auto-saves along the way — leave and pick it back up anytime."}
              </p>
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
