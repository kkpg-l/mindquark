import React, { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ChevronLeft, ClipboardList, Database, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThinkingOrb } from "thinking-orbs";
import type { NavTab } from "@/components/Navbar";
import type { ReframePreset } from "@/components/GuideSection";
import { IntakeQuiz, type QuizAnswers } from "./IntakeQuiz";
import { CognitiveReport } from "./CognitiveReport";
import { getAssessmentTexts, getRecentMoodEntries } from "@/lib/activityLog";
import {
  extractFeatures,
  getEmotionFrequency,
  calculateTraitScores,
  calculateStateScores,
  buildAttentionMap,
  detectAttentionDrift,
  type CognitiveSnapshot,
  type AttentionDriftWarning,
} from "@/lib/cognitiveEngine";
import { saveCognitiveSnapshot, getCognitiveSnapshots } from "@/lib/guideStore";
import { getCrisisFallback } from "@/lib/safety";
import { CrisisNotice } from "@/components/guide/CrisisNotice";
import { requestGuideAssessment, type GuideAssessResponse } from "@/services/api";
import { useLanguage } from "@/lib/i18n";

type AssessmentPhase = "landing" | "quiz" | "analyzing" | "report";

interface AssessmentReport {
  snapshot: CognitiveSnapshot;
  apiResult: GuideAssessResponse;
  driftWarnings: AttentionDriftWarning[];
  supportPreference?: number;
}

export const AssessmentFlow: React.FC<{
  onBack: () => void;
  onStartReframe: (preset: ReframePreset) => void;
  onNavigate: (tab: NavTab) => void;
}> = ({ onBack, onStartReframe, onNavigate }) => {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<AssessmentPhase>("landing");
  const [report, setReport] = useState<AssessmentReport | null>(null);
  const [crisisNotice, setCrisisNotice] = useState<string | null>(null);

  const localTexts = phase === "landing" ? getAssessmentTexts(24) : [];
  const localMoods = phase === "landing" ? getRecentMoodEntries(30) : [];
  const hasLocalData = localTexts.length > 0 || localMoods.length > 0;

  useGSAP(
    () => {
      if (phase !== "landing") return;
      gsap.from(".assess-landing-item", { y: 20, autoAlpha: 0, stagger: 0.1, duration: 0.5, ease: "power3.out" });
    },
    { scope: containerRef, dependencies: [phase] }
  );

  const runAssessment = async (answers: QuizAnswers | null) => {
    setPhase("analyzing");
    const texts = getAssessmentTexts(24);
    const moodEntries = getRecentMoodEntries(30);

    const features = extractFeatures(texts);
    const emotionFreq = getEmotionFrequency(moodEntries.map((e) => e.mood));

    const quizContext = answers
      ? `Sleep quality ${answers.sleepQuality}/5. Tends to ${
          answers.ruminateVsAct <= 2 ? "replay stress" : "act on stress"
        }. ${
          answers.avoidVsFace <= 2 ? "Often avoids difficult tasks." : "Generally faces difficult tasks."
        } Prefers ${
          ["being listened to", "gentle guidance", "practical tools", "pattern analysis"][
            answers.supportPreference - 1
          ]
        }. Wants: ${answers.openText || "not specified"}.`
      : "";

    let apiResult: GuideAssessResponse = {
      ok: false,
      semanticScores: null,
      evidence: [],
      narrative: null,
      recommendations: [],
    };
    if (texts.length > 0 || quizContext) {
      try {
        apiResult = await requestGuideAssessment(texts, quizContext);
      } catch (err) {
        if ((err as Error)?.message === "CRISIS") {
          setCrisisNotice(getCrisisFallback(quizContext || texts[texts.length - 1] || ""));
          setPhase("landing");
          return;
        }
      }
    }

    const quizPriors = answers
      ? {
          perfectionism: answers.standards / 5,
          avoidance: (6 - answers.avoidVsFace) / 5,
          rumination: (6 - answers.ruminateVsAct) / 5,
        }
      : null;

    const traits = calculateTraitScores(features, emotionFreq, apiResult.semanticScores, quizPriors);
    const states = calculateStateScores(
      features,
      emotionFreq,
      apiResult.semanticScores,
      answers ? { sleepQuality: answers.sleepQuality, interestLoss: answers.interestLoss } : null
    );
    const attention = buildAttentionMap(texts, answers?.attentionAreas ?? null);
    const source: CognitiveSnapshot["source"] =
      texts.length > 0 && answers ? "quiz+passive" : texts.length > 0 ? "passive-only" : "quiz-only";

    const snapshot = saveCognitiveSnapshot({ traits, states, attention, source });
    const history = getCognitiveSnapshots()
      .filter((s) => s.id !== snapshot.id)
      .map((s) => s.attention);
    const driftWarnings = detectAttentionDrift(attention, history);
    setReport({ snapshot, apiResult, driftWarnings, supportPreference: answers?.supportPreference });
    setPhase("report");
  };

  const handleRestart = () => {
    setReport(null);
    setCrisisNotice(null);
    setPhase("landing");
  };

  return (
    <div ref={containerRef} className="max-w-2xl mx-auto space-y-6 py-2">
      {phase === "landing" && (
        <>
          <div className="assess-landing-item flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={onBack}
              className="rounded-full text-muted-foreground hover:text-foreground hover:bg-emerald-500/10 gap-1 -ml-2 cursor-pointer"
            >
              <ChevronLeft className="size-4" />
              {isZh ? "返回工作坊" : "Guide home"}
            </Button>
          </div>

          <Card className="assess-landing-item rounded-3xl border border-emerald-500/20 bg-card/50 dark:bg-card/40 shadow-lg shadow-emerald-500/[0.03] backdrop-blur-xl backdrop-saturate-150 p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400">
                <ClipboardList className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">
                  {isZh ? "在开始自测前" : "Before we begin"}
                </h3>
                <p className="text-[11px] text-muted-foreground font-lato-light-italic">
                  {isZh ? "关于本自测的性质与边界说明" : "What this is — and what it isn't"}
                </p>
              </div>
            </div>

            <ul className="space-y-2.5 text-sm text-muted-foreground leading-relaxed">
              <li className="flex gap-2">
                <ShieldCheck className="size-4 mt-0.5 shrink-0 text-emerald-500/80" />
                <span>
                  {isZh ? (
                    <>
                      这是一个基于 CBT 心理学理念的自我觉察工具 — 它描绘的是你的
                      <span className="text-foreground font-medium">思维倾向</span>
                      而非临床诊断，无法替代专业医护与心理门诊。
                    </>
                  ) : (
                    <>
                      This is a self-awareness companion built on CBT concepts — it maps{" "}
                      <span className="text-foreground font-medium">tendencies</span>, not diagnoses, and never
                      replaces professional care.
                    </>
                  )}
                </span>
              </li>
              <li className="flex gap-2">
                <ClipboardList className="size-4 mt-0.5 shrink-0 text-emerald-500/80" />
                <span>
                  {isZh
                    ? "10 道自测问卷涵盖睡眠、情绪、思维习惯以及近期感到沉重的事物 — 约需 3 分钟。"
                    : "A 10-question intake covers sleep, mood, thinking habits, and what's feeling heavy lately — about 3 minutes."}
                </span>
              </li>
              <li className="flex gap-2">
                <Database className="size-4 mt-0.5 shrink-0 text-emerald-500/80" />
                <span>
                  {isZh ? (
                    <>
                      在征得你同意后，我们将结合本地记录：
                      <span className="text-foreground font-medium">
                        {localTexts.length} 条近期对话与 {localMoods.length} 次情绪记录
                      </span>
                      。所有内容均仅保存在本地设备中。
                    </>
                  ) : (
                    <>
                      With your permission we blend in local signals:{" "}
                      <span className="text-foreground font-medium">
                        {localTexts.length} recent message{localTexts.length === 1 ? "" : "s"} and{" "}
                        {localMoods.length} mood check-in{localMoods.length === 1 ? "" : "s"}
                      </span>
                      . Everything stays on your device.
                    </>
                  )}
                </span>
              </li>
            </ul>

            <div className="flex flex-col gap-2.5 pt-1">
              <Button
                onClick={() => setPhase("quiz")}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-10 cursor-pointer"
              >
                {isZh ? "开始 10 题自测" : "Start 10-question quiz"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => runAssessment(null)}
                disabled={!hasLocalData}
                className="w-full rounded-xl text-muted-foreground hover:text-foreground h-9 cursor-pointer"
              >
                {hasLocalData
                  ? (isZh ? "跳过问卷 — 直接使用本地历史记录分析" : "Skip quiz — use my local history")
                  : (isZh ? "跳过问卷（需要先有一些本地历史记录 — 请尝试对话或记录情绪）" : "Skip quiz (needs some local history first — try chatting or a mood check-in)")}
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground font-lato-light-italic border-t border-emerald-500/10 pt-4">
              {isZh
                ? "非医疗器械 · 不适用于紧急危机 · 如遇危急情况，请立即联系当地急救或心理危机干预热线。"
                : "Not a medical device · Not for emergencies · If you are in crisis, please contact local emergency services or a crisis line right away."}
            </p>
          </Card>
        </>
      )}

      {phase === "quiz" && (
        <IntakeQuiz onComplete={(answers) => runAssessment(answers)} onBack={() => setPhase("landing")} />
      )}

      {phase === "analyzing" && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <ThinkingOrb state="solving" size={64} speed={0.85} />
          <p className="text-sm text-muted-foreground font-lato-light-italic">
            {isZh ? "正在将你的身心信号整理为温和的画像 — 请稍候..." : "Blending your signals into a gentle map — one moment..."}
          </p>
        </div>
      )}

      {phase === "report" && report && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={onBack}
              className="rounded-full text-muted-foreground hover:text-foreground hover:bg-emerald-500/10 gap-1 -ml-2 cursor-pointer"
            >
              <ChevronLeft className="size-4" />
              {isZh ? "返回工作坊" : "Guide home"}
            </Button>
          </div>

          {crisisNotice && <CrisisNotice text={crisisNotice} />}

          <CognitiveReport
            snapshot={report.snapshot}
            narrative={report.apiResult.narrative}
            recommendations={report.apiResult.recommendations}
            evidence={report.apiResult.evidence}
            semanticActive={Boolean(report.apiResult.semanticScores)}
            driftWarnings={report.driftWarnings}
            supportPreference={report.supportPreference}
            onStartReframe={onStartReframe}
            onNavigate={onNavigate}
            onRestart={handleRestart}
          />
        </div>
      )}
    </div>
  );
};
