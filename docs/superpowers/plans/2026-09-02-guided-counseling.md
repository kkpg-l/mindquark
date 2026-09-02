# 引导式开导（Guided Counseling）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 Guide Tab，含两个子模块——7 步 CBT 重构向导（功能B）与认知评估引导（功能C：10 问问卷 + 混合评分 + 多维报告），严格沿用现有 White & Emerald 视觉体系与安全管线。

**Architecture:** 前端新增纯函数认知引擎（本地确定性评分）+ 后端 LLM 语义评分（`/api/guide/assess`、`/api/guide/reframe` 两个新路由，完整复用 limitText → 危机拦截 → captcha → 限流管线与 callLlmWithFailover 容错链），融合公式在前端执行（`0.5×确定性 + 0.5×语义`，语义层失败降级为纯确定性）。所有用户数据仅存 localStorage（独立命名空间），不上传。

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4 + GSAP（`useGSAP`）、lucide-react、thinking-orbs、Express（CloudBase 单函数）、Vitest（jsdom）。

**设计文档:** `docs/superpowers/specs/2026-09-02-guided-counseling-design.md`（已批准）
**复用调研:** `docs/research/sentience_v2_thought_reframer_analysis.md`

---

## 文件结构（纯增量 + 3 处最小改动）

```
创建：
src/lib/cognitiveEngine.ts        # Sentia 算法 TS 移植：词典、特征提取、评分融合、漂移检测（纯函数）
src/lib/guideStore.ts             # 向导草稿 + 评估快照 localStorage 存档
src/lib/activityLog.ts            # 被动信号：聊天用户消息 + 情绪打卡本地日志
src/lib/emotionsDatabase.ts       # 6 族 24 情绪双语库（复用现有 6 情绪标签粒度）
src/components/GuideSection.tsx   # Guide Tab 主容器 + 子模块路由
src/components/guide/assess/AssessmentFlow.tsx    # 评估编排：landing→quiz→analyzing→report
src/components/guide/assess/IntakeQuiz.tsx        # 10 问引导式问卷
src/components/guide/assess/quizQuestions.ts      # 问卷题目定义（纯数据）
src/components/guide/assess/CognitiveReport.tsx   # 报告页组装
src/components/guide/assess/TraitRadar.tsx        # SVG 三轴特质雷达图
src/components/guide/assess/StateGauge.tsx        # 状态仪表条
src/components/guide/assess/AttentionMapView.tsx   # 6 领域注意力条形图
src/components/guide/reframe/ReframeWizard.tsx    # 7 步向导编排器（草稿自动存档/危机拦截）
src/components/guide/reframe/StepSituation.tsx    # 步骤1 情境
src/components/guide/reframe/StepThought.tsx      # 步骤2 自动思维
src/components/guide/reframe/StepEmotion.tsx      # 步骤3 情绪标记
src/components/guide/reframe/StepDistortion.tsx  # 步骤4 扭曲侦探（AI识别+用户确认）
src/components/guide/reframe/StepEvidence.tsx    # 步骤5 证据检验
src/components/guide/reframe/StepReframe.tsx      # 步骤6 平衡认知（可编辑）
src/components/guide/reframe/StepSummary.tsx     # 步骤7 前后对比+归档
functions/api/guideUtils.js       # LLM JSON 提取/净化（纯函数，无依赖，可测）
tests/cognitiveEngine.test.ts
tests/guideStore.test.ts
tests/activityLog.test.ts
tests/guideApi.test.ts

修改（最小化）：
src/components/Navbar.tsx         # NavTab 加 "guide" + NAV_ITEMS 加一项（Compass 图标）
src/App.tsx                      # 加一个条件渲染块
src/services/api.ts              # 追加 2 个 guide API 客户端函数
functions/api/index.js           # 追加 2 条路由（共享现有安全管线）
src/components/ui/messaging-conversation.tsx  # handleSend 里加 1 行日志调用
src/components/MoodTrackerSection.tsx         # handleSaveCheckIn 里加 1 行日志调用
tests/serverSafety.test.ts       # 断言数从 4 提到 6（guide 路由也走危机拦截）
```

**依赖方向铁律**: guide 模块只通过 props 回调与外界通信（`onStartChatWithPrompt`、`onNavigate`、`onStartReframe`），禁止 import 其他 Section 内部状态。

---

## Task 1: cognitiveEngine.ts（纯函数引擎，TDD）

**Files:**
- Create: `src/lib/cognitiveEngine.ts`
- Test: `tests/cognitiveEngine.test.ts`

- [x] **Step 1: 写失败测试**

```typescript
// tests/cognitiveEngine.test.ts
import { describe, expect, it } from "vitest";
import {
  extractFeatures,
  getEmotionFrequency,
  calculateTraitScores,
  calculateStateScores,
  buildAttentionMap,
  detectAttentionDrift,
  clamp01,
  type AttentionMap,
} from "@/lib/cognitiveEngine";

describe("extractFeatures", () => {
  it("counts bilingual keyword hits per pattern", () => {
    const features = extractFeatures([
      "I feel like a total failure",
      "我总是失败，反复想停不下来",
      "I took a walk and did some breathing",
    ]);
    expect(features.messageCount).toBe(3);
    expect(features.selfCriticism).toBeGreaterThanOrEqual(2);
    expect(features.rumination).toBeGreaterThanOrEqual(2);
    expect(features.copingBehaviors).toBeGreaterThanOrEqual(2);
  });

  it("returns zeros for empty input", () => {
    const features = extractFeatures([]);
    expect(features.messageCount).toBe(0);
    expect(features.selfCriticism).toBe(0);
  });
});

describe("getEmotionFrequency", () => {
  it("computes anger/sadness rates from mood labels", () => {
    const freq = getEmotionFrequency([
      "😡 Frustrated & Tense",
      "😔 Low & Dejected",
      "😔 Low & Dejected",
      "🌿 Calm & Centered",
    ]);
    expect(freq.anger).toBeCloseTo(0.25);
    expect(freq.sadness).toBeCloseTo(0.5);
  });

  it("returns zeros for empty input", () => {
    expect(getEmotionFrequency([])).toEqual({ anger: 0, sadness: 0 });
  });
});

describe("calculateTraitScores", () => {
  const features = extractFeatures([
    "I am a failure and not good enough",
    "I avoid people and want to be alone",
    "I can't stop thinking about it, over and over",
  ]);

  it("fuses semantic + keyword rates per spec formula", () => {
    const semantic = { perfectionism: 0.8, avoidance: 0.6, rumination: 0.5, catastrophizing: 0.4, selfCriticism: 0.7 };
    const traits = calculateTraitScores(features, { anger: 0.2, sadness: 0.5 }, semantic, null);
    expect(traits.perfectionism).toBeCloseTo(0.7 * 0.8 + 0.3 * clamp01(features.selfCriticism / (3 * 1.5)));
    expect(traits.avoidance).toBeLessThanOrEqual(1);
    expect(traits.rumination).toBeCloseTo(0.4 * 0.5 + 0.3 * 0.5 + 0.3 * 0.4);
  });

  it("degrades to pure deterministic when semantic is null (LLM offline)", () => {
    const withSemantic = calculateTraitScores(features, { anger: 0, sadness: 0 }, { perfectionism: 0.9, avoidance: 0.9, rumination: 0.9, catastrophizing: 0.9, selfCriticism: 0.9 }, null);
    const without = calculateTraitScores(features, { anger: 0, sadness: 0 }, null, null);
    expect(without.perfectionism).toBeGreaterThan(0);
    expect(without.perfectionism).toBeLessThan(withSemantic.perfectionism);
  });

  it("fuses quiz priors at 0.5/0.5 weight", () => {
    const semantic = { perfectionism: 0.4, avoidance: 0.4, rumination: 0.4, catastrophizing: 0.4, selfCriticism: 0.4 };
    const traits = calculateTraitScores(features, { anger: 0, sadness: 0 }, semantic, { perfectionism: 0.9, avoidance: 0.2, rumination: 0.5 });
    expect(traits.perfectionism).toBeCloseTo(0.5 * 0.9 + 0.5 * clamp01(0.7 * 0.4 + 0.3 * clamp01(features.selfCriticism / 4.5)), 5);
    expect(traits.avoidance).toBeLessThan(traits.perfectionism);
  });

  it("clamps all outputs to [0,1]", () => {
    const semantic = { perfectionism: 1, avoidance: 1, rumination: 1, catastrophizing: 1, selfCriticism: 1 };
    const traits = calculateTraitScores(extractFeatures(["failure failure failure avoid people"]), { anger: 1, sadness: 1 }, semantic, { perfectionism: 1, avoidance: 1, rumination: 1 });
    for (const v of Object.values(traits)) expect(v).toBeLessThanOrEqual(1);
  });
});

describe("calculateStateScores", () => {
  it("computes states per spec formula with quiz adjustments", () => {
    const features = extractFeatures(["I took a walk", "sad and angry"]);
    const semantic = { perfectionism: 0.2, avoidance: 0.3, rumination: 0.2, catastrophizing: 0.2, selfCriticism: 0.2 };
    const states = calculateStateScores(features, { anger: 0.5, sadness: 0.5 }, semantic, { sleepQuality: 2, interestLoss: 4 });
    expect(states.burnout).toBeGreaterThan(0.3);
    expect(states.motivation).toBeGreaterThan(0);
    expect(states.stressAdaptation).toBeLessThanOrEqual(1);
  });
});

describe("buildAttentionMap", () => {
  it("normalizes 6 domains to sum 1", () => {
    const map = buildAttentionMap(["my boss deadline at work", "exam study stress", "mom and family dinner"], null);
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1);
    expect(map.career).toBeGreaterThan(0);
    expect(map.academic).toBeGreaterThan(0);
  });

  it("blends quiz-selected areas at 0.5 prior when text signal exists", () => {
    const map = buildAttentionMap(["work work work deadline"], ["relationships"]);
    expect(map.relationships).toBeGreaterThan(0);
    expect(map.career).toBeGreaterThan(map.relationships);
  });

  it("falls back to quiz-only when no text signal", () => {
    const map = buildAttentionMap([], ["health", "family"]);
    expect(map.health + map.family).toBeCloseTo(1);
  });

  it("returns uniform when no signal at all", () => {
    const map = buildAttentionMap([], null);
    expect(map.academic).toBeCloseTo(1 / 6);
  });
});

describe("detectAttentionDrift", () => {
  it("flags domains with |Z| >= 1.5 across history", () => {
    const history: AttentionMap[] = Array.from({ length: 4 }, () => ({
      academic: 0.1, career: 0.5, health: 0.1, relationships: 0.1, identity: 0.1, family: 0.1,
    }));
    const current: AttentionMap = { academic: 0.6, career: 0.1, health: 0.1, relationships: 0.1, identity: 0.1, family: 0.1 };
    const warnings = detectAttentionDrift(current, history);
    expect(warnings.some((w) => w.area === "academic" && w.z >= 1.5)).toBe(true);
    expect(warnings.some((w) => w.area === "career")).toBe(false);
  });

  it("returns empty for short history", () => {
    expect(detectAttentionDrift({ academic: 1, career: 0, health: 0, relationships: 0, identity: 0, family: 0 }, [])).toEqual([]);
  });
});
```

- [x] **Step 2: 运行确认失败**

Run: `npx vitest run tests/cognitiveEngine.test.ts`
Expected: FAIL（模块不存在）

- [x] **Step 3: 实现 cognitiveEngine.ts**

```typescript
// src/lib/cognitiveEngine.ts
// Sentia-inspired deterministic cognitive scoring engine (TS port).
// Pure functions only: no I/O, no randomness, fully testable.

export type AttentionArea = "academic" | "career" | "health" | "relationships" | "identity" | "family";

export interface SemanticScores {
  perfectionism: number;
  avoidance: number;
  rumination: number;
  catastrophizing: number;
  selfCriticism: number;
}

export interface CognitiveFeatures {
  messageCount: number;
  selfCriticism: number;
  socialWithdrawal: number;
  copingBehaviors: number;
  catastrophizing: number;
  rumination: number;
}

export interface EmotionFrequency {
  anger: number;
  sadness: number;
}

export type AttentionMap = Record<AttentionArea, number>;

export interface TraitScores {
  perfectionism: number;
  avoidance: number;
  rumination: number;
}

export interface StateScores {
  burnout: number;
  motivation: number;
  stressAdaptation: number;
}

export interface QuizTraitPriors {
  perfectionism: number;
  avoidance: number;
  rumination: number;
}

export interface QuizStateAdjustments {
  sleepQuality: number; // 1-5
  interestLoss: number; // 1-5
}

export interface CognitiveSnapshot {
  id: string;
  createdAt: string;
  traits: TraitScores;
  states: StateScores;
  attention: AttentionMap;
  source: "quiz+passive" | "passive-only" | "quiz-only";
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

const SELF_CRITICISM_KEYWORDS = [
  "failure", "not good enough", "useless", "stupid", "worthless", "hate myself", "imposter",
  "incompetent", "my fault", "disappointed in myself", "mess up", "ruined it", "failure",
  "失败", "不够好", "没用", "笨", "讨厌自己", "冒名顶替", "都怪我", "搞砸",
];

const SOCIAL_WITHDRAWAL_KEYWORDS = [
  "avoid people", "cancel plans", "don't want to see anyone", "want to be alone", "isolate",
  "skip social", "stay home", "avoid going out", "shut everyone out",
  "不想见人", "推掉", "想一个人", "回避", "孤立", "宅在家",
];

const COPING_KEYWORDS = [
  "breathing", "journal", "took a walk", "exercise", "meditat", "rested", "took a nap",
  "talk to a friend", "talked to a friend", "listen to music", "listened to music", "took a break",
  "self-care", "stretch",
  "呼吸", "散步", "运动", "冥想", "休息", "睡了一觉", "和朋友聊", "听音乐", "照顾自己",
];

const CATASTROPHIZING_KEYWORDS = [
  "everything is ruined", "worst case", "always fail", "never work out", "disaster",
  "end of the world", "can't handle it", "falling apart", "nothing will ever",
  "全完了", "最坏", "总是失败", "永远不", "灾难", "撑不住", "崩溃",
];

const RUMINATION_KEYWORDS = [
  "can't stop thinking", "keep replaying", "over and over", "stuck in my head",
  "keep thinking about", "ruminate", "on repeat",
  "停不下来", "反复想", "一直在想", "翻来覆去", "循环",
];

const ATTENTION_KEYWORDS: Record<AttentionArea, string[]> = {
  academic: ["exam", "study", "school", "grade", "thesis", "assignment", "class", "考试", "学习", "学校", "成绩", "论文", "作业", "上课"],
  career: ["work", "job", "boss", "deadline", "career", "colleague", "interview", "promotion", "overtime", "工作", "老板", "截止", "职业", "同事", "面试", "升职", "加班"],
  health: ["sleep", "insomnia", "tired", "sick", "pain", "doctor", "body", "weight", "睡眠", "失眠", "累", "生病", "疼", "医生", "身体", "体重"],
  relationships: ["partner", "boyfriend", "girlfriend", "friend", "date", "breakup", "crush", "argument", "伴侣", "男朋友", "女朋友", "朋友", "分手", "吵架", "恋爱"],
  identity: ["who i am", "my purpose", "my worth", "identity", "meaning of life", "self-esteem", "我是谁", "意义", "价值", "自我"],
  family: ["mom", "dad", "parents", "family", "sister", "brother", "home", "妈", "爸", "父母", "家里", "姐姐", "哥哥", "弟弟", "妹妹"],
};

const MOOD_SADNESS_MARKERS = ["low", "dejected", "drained", "burnt out", "低落", "疲惫"];
const MOOD_ANGER_MARKERS = ["frustrated", "tense", "愤怒", "紧张"];

function countKeywordHits(lowerText: string, keywords: string[]): number {
  let hits = 0;
  for (const keyword of keywords) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = lowerText.match(new RegExp(escaped, "g"));
    if (matches) hits += matches.length;
  }
  return hits;
}

export function extractFeatures(messages: string[]): CognitiveFeatures {
  const combined = messages.join("\n").toLowerCase();
  return {
    messageCount: messages.filter((m) => m.trim()).length,
    selfCriticism: countKeywordHits(combined, SELF_CRITICISM_KEYWORDS),
    socialWithdrawal: countKeywordHits(combined, SOCIAL_WITHDRAWAL_KEYWORDS),
    copingBehaviors: countKeywordHits(combined, COPING_KEYWORDS),
    catastrophizing: countKeywordHits(combined, CATASTROPHIZING_KEYWORDS),
    rumination: countKeywordHits(combined, RUMINATION_KEYWORDS),
  };
}

export function getEmotionFrequency(moodLabels: string[]): EmotionFrequency {
  const total = moodLabels.length;
  if (total === 0) return { anger: 0, sadness: 0 };
  let anger = 0;
  let sadness = 0;
  for (const label of moodLabels) {
    const lower = label.toLowerCase();
    if (MOOD_ANGER_MARKERS.some((m) => lower.includes(m))) anger += 1;
    if (MOOD_SADNESS_MARKERS.some((m) => lower.includes(m))) sadness += 1;
  }
  return { anger: anger / total, sadness: sadness / total };
}

function deterministicSemanticProxy(features: CognitiveFeatures): SemanticScores {
  const mCount = Math.max(1, features.messageCount);
  return {
    perfectionism: clamp01(features.selfCriticism / mCount),
    avoidance: clamp01(features.socialWithdrawal / mCount),
    rumination: clamp01(features.rumination / mCount),
    catastrophizing: clamp01(features.catastrophizing / mCount),
    selfCriticism: clamp01(features.selfCriticism / mCount),
  };
}

export function calculateTraitScores(
  features: CognitiveFeatures,
  emotionFreq: EmotionFrequency,
  semantic: SemanticScores | null,
  quizPriors: QuizTraitPriors | null
): TraitScores {
  const sem = semantic ?? deterministicSemanticProxy(features);
  const mCount = Math.max(1, features.messageCount);
  const selfCriticalRate = clamp01(features.selfCriticism / (mCount * 1.5));
  const withdrawalRate = clamp01(features.socialWithdrawal / (mCount * 1.5));

  const passive: TraitScores = {
    perfectionism: clamp01(0.7 * sem.perfectionism + 0.3 * selfCriticalRate),
    avoidance: clamp01(0.6 * sem.avoidance + 0.4 * withdrawalRate),
    rumination: clamp01(0.4 * sem.rumination + 0.3 * emotionFreq.sadness + 0.3 * sem.catastrophizing),
  };

  if (!quizPriors) return passive;
  return {
    perfectionism: clamp01(0.5 * quizPriors.perfectionism + 0.5 * passive.perfectionism),
    avoidance: clamp01(0.5 * quizPriors.avoidance + 0.5 * passive.avoidance),
    rumination: clamp01(0.5 * quizPriors.rumination + 0.5 * passive.rumination),
  };
}

export function calculateStateScores(
  features: CognitiveFeatures,
  emotionFreq: EmotionFrequency,
  semantic: SemanticScores | null,
  quiz: QuizStateAdjustments | null
): StateScores {
  const sem = semantic ?? deterministicSemanticProxy(features);
  const mCount = Math.max(1, features.messageCount);
  const copingRate = clamp01(features.copingBehaviors / mCount);

  let burnout = Math.min(
    1,
    0.3 * emotionFreq.anger + 0.3 * emotionFreq.sadness + 0.2 * (1 - copingRate) + 0.2 * sem.selfCriticism
  );
  if (quiz) {
    const sleepDeficit = clamp01((5 - quiz.sleepQuality) / 4);
    burnout = clamp01(0.85 * burnout + 0.15 * sleepDeficit);
  }

  let motivation = clamp01(0.4 * copingRate + 0.4 * (1 - emotionFreq.sadness) + 0.2 * (1 - sem.avoidance));
  if (quiz) {
    const interestDeficit = clamp01((quiz.interestLoss - 1) / 4);
    motivation = clamp01(0.85 * motivation + 0.15 * (1 - interestDeficit));
  }

  const stressAdaptation = clamp01(0.5 * copingRate + 0.3 * (1 - sem.catastrophizing) + 0.2 * (1 - sem.avoidance));
  return { burnout, motivation, stressAdaptation };
}

export function buildAttentionMap(texts: string[], quizAreas: AttentionArea[] | null): AttentionMap {
  const counts: AttentionMap = { academic: 0, career: 0, health: 0, relationships: 0, identity: 0, family: 0 };
  const combined = texts.join("\n").toLowerCase();
  for (const area of Object.keys(ATTENTION_KEYWORDS) as AttentionArea[]) {
    counts[area] = countKeywordHits(combined, ATTENTION_KEYWORDS[area]);
  }

  const textTotal = Object.values(counts).reduce((a, b) => a + b, 0);
  const selectedAreas = quizAreas?.filter((a) => a in counts) ?? [];

  if (textTotal === 0) {
    if (selectedAreas.length === 0) {
      const uniform = 1 / 6;
      return { academic: uniform, career: uniform, health: uniform, relationships: uniform, identity: uniform, family: uniform };
    }
    const share = 1 / selectedAreas.length;
    for (const area of selectedAreas) counts[area] = share;
    return counts;
  }

  // Quiz prior contributes half the total signal weight when areas are selected.
  const priorPerArea = selectedAreas.length > 0 ? textTotal / selectedAreas.length : 0;
  for (const area of selectedAreas) counts[area] += priorPerArea;

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  for (const area of Object.keys(counts) as AttentionArea[]) {
    counts[area] = counts[area] / total;
  }
  return counts;
}

export interface AttentionDriftWarning {
  area: AttentionArea;
  z: number;
}

export function detectAttentionDrift(current: AttentionMap, history: AttentionMap[]): AttentionDriftWarning[] {
  if (history.length < 2) return [];
  const warnings: AttentionDriftWarning[] = [];
  for (const area of Object.keys(ATTENTION_KEYWORDS) as AttentionArea[]) {
    const values = history.map((h) => h[area]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const std = Math.sqrt(variance);
    if (std < 1e-6) continue;
    const z = (current[area] - mean) / std;
    if (Math.abs(z) >= 1.5) {
      warnings.push({ area, z: Number(z.toFixed(2)) });
    }
  }
  return warnings;
}
```

- [x] **Step 4: 运行测试通过**

Run: `npx vitest run tests/cognitiveEngine.test.ts`
Expected: PASS 全绿

- [x] **Step 5: Commit**

```bash
git add src/lib/cognitiveEngine.ts tests/cognitiveEngine.test.ts
git commit -m "feat(guide): add deterministic cognitive scoring engine with bilingual keyword dictionaries"
```

---

## Task 2: guideStore.ts（草稿 + 快照存储，TDD）

**Files:**
- Create: `src/lib/guideStore.ts`
- Test: `tests/guideStore.test.ts`

- [x] **Step 1: 写失败测试**

```typescript
// tests/guideStore.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import {
  createEmptyReframeSession,
  saveReframeDraft,
  loadReframeDraft,
  clearReframeDraft,
  saveCognitiveSnapshot,
  getCognitiveSnapshots,
  clearGuideStorage,
} from "@/lib/guideStore";

beforeEach(() => {
  localStorage.clear();
});

describe("reframe draft", () => {
  it("round-trips a draft", () => {
    const session = createEmptyReframeSession();
    session.situation = "Meeting went badly";
    session.automaticThought = "I always mess up";
    saveReframeDraft(session);
    const loaded = loadReframeDraft();
    expect(loaded?.situation).toBe("Meeting went badly");
    expect(loaded?.automaticThought).toBe("I always mess up");
  });

  it("does not save empty drafts", () => {
    saveReframeDraft(createEmptyReframeSession());
    expect(loadReframeDraft()).toBeNull();
  });

  it("clears the draft", () => {
    const session = createEmptyReframeSession();
    session.situation = "x";
    saveReframeDraft(session);
    clearReframeDraft();
    expect(loadReframeDraft()).toBeNull();
  });
});

describe("cognitive snapshots", () => {
  it("saves snapshots newest-first and caps at 30", () => {
    for (let i = 0; i < 35; i++) {
      saveCognitiveSnapshot({
        traits: { perfectionism: i / 35, avoidance: 0.2, rumination: 0.3 },
        states: { burnout: 0.2, motivation: 0.5, stressAdaptation: 0.6 },
        attention: { academic: 1 / 6, career: 1 / 6, health: 1 / 6, relationships: 1 / 6, identity: 1 / 6, family: 1 / 6 },
        source: "passive-only",
      });
    }
    const snapshots = getCognitiveSnapshots();
    expect(snapshots.length).toBe(30);
    expect(snapshots[0].traits.perfectionism).toBeCloseTo(34 / 35);
  });

  it("assigns id and createdAt", () => {
    saveCognitiveSnapshot({
      traits: { perfectionism: 0, avoidance: 0, rumination: 0 },
      states: { burnout: 0, motivation: 0, stressAdaptation: 0 },
      attention: { academic: 0, career: 0, health: 0, relationships: 0, identity: 0, family: 0 },
      source: "quiz-only",
    });
    const snapshot = getCognitiveSnapshots()[0];
    expect(snapshot.id).toBeTruthy();
    expect(new Date(snapshot.createdAt).toString()).not.toBe("Invalid Date");
  });
});
```

- [x] **Step 2: 运行确认失败**

Run: `npx vitest run tests/guideStore.test.ts`
Expected: FAIL

- [x] **Step 3: 实现 guideStore.ts**

```typescript
// src/lib/guideStore.ts
// Local-first persistence for the guided counseling modules.
// Follows the profileStore pattern but keeps an isolated namespace.

import type { AttentionMap, CognitiveSnapshot, StateScores, TraitScores } from "@/lib/cognitiveEngine";

export interface ReframeSession {
  situation: string;
  automaticThought: string;
  selectedEmotionId?: string;
  emotionIntensity: number;
  energyLevel?: number;
  valenceLevel?: number;
  identifiedDistortion?: { type: string; explanation: string };
  confirmedDistortion?: string;
  evidenceFor: string;
  evidenceAgainst: string;
  reframedThought: string;
  completedAt?: string;
  archived: boolean;
}

const REFRAME_DRAFT_KEY = "mindquark_reframe_draft_v1";
const SNAPSHOTS_KEY = "mindquark_cognitive_snapshots_v1";
const MAX_SNAPSHOTS = 30;

export function createEmptyReframeSession(): ReframeSession {
  return {
    situation: "",
    automaticThought: "",
    emotionIntensity: 5,
    evidenceFor: "",
    evidenceAgainst: "",
    reframedThought: "",
    archived: false,
  };
}

export function saveReframeDraft(session: ReframeSession): void {
  if (typeof window === "undefined") return;
  if (!session.situation.trim() && !session.automaticThought.trim()) return;
  try {
    localStorage.setItem(REFRAME_DRAFT_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn("Failed to save reframe draft:", err);
  }
}

export function loadReframeDraft(): ReframeSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REFRAME_DRAFT_KEY);
    if (!raw) return null;
    return { ...createEmptyReframeSession(), ...JSON.parse(raw) } as ReframeSession;
  } catch {
    return null;
  }
}

export function clearReframeDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(REFRAME_DRAFT_KEY);
  } catch {
    /* noop */
  }
}

export interface SnapshotInput {
  traits: TraitScores;
  states: StateScores;
  attention: AttentionMap;
  source: CognitiveSnapshot["source"];
}

export function saveCognitiveSnapshot(input: SnapshotInput): CognitiveSnapshot {
  const snapshot: CognitiveSnapshot = {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...input,
  };

  if (typeof window === "undefined") return snapshot;
  try {
    const existing = getCognitiveSnapshots();
    const next = [snapshot, ...existing].slice(0, MAX_SNAPSHOTS);
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn("Failed to save cognitive snapshot:", err);
  }
  return snapshot;
}

export function getCognitiveSnapshots(): CognitiveSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearGuideStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(REFRAME_DRAFT_KEY);
    localStorage.removeItem(SNAPSHOTS_KEY);
  } catch {
    /* noop */
  }
}
```

- [x] **Step 4: 运行测试通过**

Run: `npx vitest run tests/guideStore.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/lib/guideStore.ts tests/guideStore.test.ts
git commit -m "feat(guide): add local-first reframe draft and cognitive snapshot storage"
```

---

## Task 3: activityLog.ts（被动信号日志，TDD + 接线）

**Files:**
- Create: `src/lib/activityLog.ts`
- Test: `tests/activityLog.test.ts`
- Modify: `src/components/ui/messaging-conversation.tsx`（handleSend 内 1 行）
- Modify: `src/components/MoodTrackerSection.tsx`（handleSaveCheckIn 内 1 行）

- [x] **Step 1: 写失败测试**

```typescript
// tests/activityLog.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import {
  logChatMessage,
  logMoodEntry,
  getRecentUserTexts,
  getRecentMoodEntries,
  getAssessmentTexts,
  clearActivityLog,
} from "@/lib/activityLog";

beforeEach(() => {
  localStorage.clear();
});

describe("activityLog", () => {
  it("stores user chat messages and returns recent texts", () => {
    logChatMessage("user", "I feel like a failure at work");
    logChatMessage("assistant", "I hear you...");
    logChatMessage("user", "My boss criticized the report");
    const texts = getRecentUserTexts(10);
    expect(texts).toEqual(["I feel like a failure at work", "My boss criticized the report"]);
  });

  it("stores mood entries", () => {
    logMoodEntry("😔 Low & Dejected", 2, 2, "tough week");
    const entries = getRecentMoodEntries(10);
    expect(entries.length).toBe(1);
    expect(entries[0]).toMatchObject({ mood: "😔 Low & Dejected", energy: 2, valence: 2, note: "tough week" });
  });

  it("caps storage size to protect quota", () => {
    for (let i = 0; i < 130; i++) logChatMessage("user", `message ${i}`);
    expect(getRecentUserTexts(200).length).toBeLessThanOrEqual(100);
  });

  it("combines chat texts and mood notes for assessment", () => {
    logChatMessage("user", "work deadline stress");
    logMoodEntry("😰 Anxious & Uneasy", 3, 3, "presentation tomorrow");
    const texts = getAssessmentTexts(20);
    expect(texts).toContain("work deadline stress");
    expect(texts.some((t) => t.includes("presentation tomorrow"))).toBe(true);
  });

  it("clears the log", () => {
    logChatMessage("user", "hello");
    clearActivityLog();
    expect(getRecentUserTexts(10)).toEqual([]);
  });
});
```

- [x] **Step 2: 运行确认失败**

Run: `npx vitest run tests/activityLog.test.ts`
Expected: FAIL

- [x] **Step 3: 实现 activityLog.ts**

```typescript
// src/lib/activityLog.ts
// Passive signals for cognitive assessment: recent user chat texts and mood check-ins.
// Local-only, capped to protect the localStorage quota, never uploaded as a batch.

export interface LoggedChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: string;
}

export interface LoggedMoodEntry {
  mood: string;
  energy: number;
  valence: number;
  note: string;
  at: string;
}

interface ActivityLogData {
  chatMessages: LoggedChatMessage[];
  moodEntries: LoggedMoodEntry[];
}

const ACTIVITY_LOG_KEY = "mindquark_activity_log_v1";
const MAX_CHAT_MESSAGES = 100;
const MAX_MOOD_ENTRIES = 60;
const MAX_CONTENT_LENGTH = 1_200;

function readLog(): ActivityLogData {
  if (typeof window === "undefined") return { chatMessages: [], moodEntries: [] };
  try {
    const raw = localStorage.getItem(ACTIVITY_LOG_KEY);
    if (!raw) return { chatMessages: [], moodEntries: [] };
    const parsed = JSON.parse(raw) as Partial<ActivityLogData>;
    return {
      chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
      moodEntries: Array.isArray(parsed.moodEntries) ? parsed.moodEntries : [],
    };
  } catch {
    return { chatMessages: [], moodEntries: [] };
  }
}

function writeLog(data: ActivityLogData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to persist activity log:", err);
  }
}

export function logChatMessage(role: LoggedChatMessage["role"], content: string): void {
  const text = String(content || "").trim().slice(0, MAX_CONTENT_LENGTH);
  if (!text) return;
  const data = readLog();
  data.chatMessages.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content: text,
    at: new Date().toISOString(),
  });
  data.chatMessages = data.chatMessages.slice(-MAX_CHAT_MESSAGES);
  writeLog(data);
}

export function logMoodEntry(mood: string, energy: number, valence: number, note: string): void {
  const data = readLog();
  data.moodEntries.push({
    mood: String(mood || "").slice(0, 100),
    energy: Number(energy) || 0,
    valence: Number(valence) || 0,
    note: String(note || "").trim().slice(0, 500),
    at: new Date().toISOString(),
  });
  data.moodEntries = data.moodEntries.slice(-MAX_MOOD_ENTRIES);
  writeLog(data);
}

export function getRecentUserTexts(limit = 20): string[] {
  return readLog()
    .chatMessages.filter((m) => m.role === "user")
    .slice(-limit)
    .map((m) => m.content);
}

export function getRecentMoodEntries(limit = 30): LoggedMoodEntry[] {
  return readLog().moodEntries.slice(-limit);
}

export function getAssessmentTexts(limit = 24): string[] {
  const moodNotes = getRecentMoodEntries(6)
    .map((entry) => entry.note)
    .filter(Boolean);
  const chatTexts = getRecentUserTexts(limit);
  return [...moodNotes, ...chatTexts].slice(-limit);
}

export function clearActivityLog(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACTIVITY_LOG_KEY);
  } catch {
    /* noop */
  }
}
```

- [x] **Step 4: 运行测试通过**

Run: `npx vitest run tests/activityLog.test.ts`
Expected: PASS

- [x] **Step 5: 接线两处调用**

`src/components/ui/messaging-conversation.tsx` — `handleSend` 内、`setMessages((prev) => [...prev, userMsg]);` 之后加：

```typescript
import { logChatMessage } from "@/lib/activityLog"; // 文件顶部 import 区

// handleSend 内：
setMessages((prev) => [...prev, userMsg]);
logChatMessage("user", textToSend); // 被动信号：仅本地存储，用于认知评估
```

`src/components/MoodTrackerSection.tsx` — `handleSaveCheckIn` 改为：

```typescript
import { logMoodEntry } from "@/lib/activityLog"; // 文件顶部 import 区

const handleSaveCheckIn = () => {
  logMoodEntry(selectedMood, energyLevel, valenceLevel, moodNote);
  setSavedSuccess(true);
  setTimeout(() => setSavedSuccess(false), 2500);
};
```

- [x] **Step 6: 全量测试回归**

Run: `npm test`
Expected: 全部 PASS

- [x] **Step 7: Commit**

```bash
git add src/lib/activityLog.ts tests/activityLog.test.ts src/components/ui/messaging-conversation.tsx src/components/MoodTrackerSection.tsx
git commit -m "feat(guide): log local chat and mood passive signals for cognitive assessment"
```

---

## Task 4: 后端 guideUtils.js + /guide/assess 路由（TDD）

**Files:**
- Create: `functions/api/guideUtils.js`
- Modify: `functions/api/index.js`（追加路由 + requestChatCompletion 加 temperature 参数）
- Test: `tests/guideApi.test.ts`
- Modify: `tests/serverSafety.test.ts`（危机拦截计数 4→6）

- [x] **Step 1: 写失败测试**

```typescript
// tests/guideApi.test.ts
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { extractJsonObject, sanitizeScore, sanitizeSemanticScores, sanitizeReframeResult } = require("../functions/api/guideUtils.js");
const apiSource = fs.readFileSync(path.resolve(process.cwd(), "functions/api/index.js"), "utf8");

describe("extractJsonObject", () => {
  it("parses plain JSON", () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in markdown fences", () => {
    expect(extractJsonObject('```json\n{"a": 0.5}\n```')).toEqual({ a: 0.5 });
  });

  it("parses first JSON object embedded in prose", () => {
    expect(extractJsonObject('Here you go: {"patterns": {"avoidance": 0.4}} hope this helps')).toEqual({
      patterns: { avoidance: 0.4 },
    });
  });

  it("returns null for garbage", () => {
    expect(extractJsonObject("no json here")).toBeNull();
    expect(extractJsonObject("")).toBeNull();
  });
});

describe("sanitizeScore", () => {
  it("clamps to [0,1] and rejects non-numbers", () => {
    expect(sanitizeScore(1.7)).toBe(1);
    expect(sanitizeScore(-0.2)).toBe(0);
    expect(sanitizeScore("0.5")).toBe(0.5);
    expect(sanitizeScore("high")).toBeNull();
    expect(sanitizeScore(null)).toBeNull();
  });
});

describe("sanitizeSemanticScores", () => {
  it("accepts valid camelCase payload with evidence", () => {
    const result = sanitizeSemanticScores({
      patterns: { perfectionism: 0.6, avoidance: 0.3, rumination: 0.9, catastrophizing: 0.2, selfCriticism: 0.4 },
      evidence: ["I always fail", "valid quote", 42, ""],
    });
    expect(result?.scores.perfectionism).toBe(0.6);
    expect(result?.evidence).toEqual(["I always fail", "valid quote"]);
  });

  it("accepts snake_case keys", () => {
    const result = sanitizeSemanticScores({
      patterns: { perfectionism: 0.1, avoidance: 0.1, rumination: 0.1, catastrophizing: 0.1, self_criticism: 0.1 },
    });
    expect(result?.scores.selfCriticism).toBe(0.1);
  });

  it("returns null when any pattern is missing or invalid", () => {
    expect(sanitizeSemanticScores({ patterns: { perfectionism: 0.5, avoidance: 0.5, rumination: 0.5, catastrophizing: 0.5 } })).toBeNull();
    expect(sanitizeSemanticScores(null)).toBeNull();
    expect(sanitizeSemanticScores({ patterns: { perfectionism: "??", avoidance: 0.5, rumination: 0.5, catastrophizing: 0.5, selfCriticism: 0.5 } })).toBeNull();
  });
});

describe("sanitizeReframeResult", () => {
  it("validates and trims a full payload", () => {
    const result = sanitizeReframeResult({
      distortion: { type: "catastrophizing", explanation: "  expecting the worst  " },
      reframe: { balancedThought: "A calmer view.", actionableStep: "Take a walk." },
    });
    expect(result?.distortion.explanation).toBe("expecting the worst");
    expect(result?.reframe.balancedThought).toBe("A calmer view.");
  });

  it("returns null when required fields are missing", () => {
    expect(sanitizeReframeResult({ distortion: { type: "x" }, reframe: {} })).toBeNull();
    expect(sanitizeReframeResult(null)).toBeNull();
  });
});

describe("guide api safety wiring", () => {
  it("runs both guide routes through the full safety pipeline", () => {
    expect(apiSource).toContain('router.post("/guide/assess"');
    expect(apiSource).toContain('router.post("/guide/reframe"');
    expect((apiSource.match(/getCrisisResponse\(/g) || []).length).toBeGreaterThanOrEqual(6);
    expect((apiSource.match(/verifyTencentCaptcha\(/g) || []).length).toBeGreaterThanOrEqual(6);
  });
});
```

- [x] **Step 2: 运行确认失败**

Run: `npx vitest run tests/guideApi.test.ts`
Expected: FAIL

- [x] **Step 3: 实现 guideUtils.js**

```javascript
// functions/api/guideUtils.js
// Pure helpers for parsing and sanitizing LLM output in the guide endpoints.

function extractJsonObject(raw) {
  let text = String(raw || "").trim().replace(/```(?:json)?/gi, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function sanitizeScore(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.min(1, Math.max(0, num));
}

function sanitizeSemanticScores(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  const patterns = parsed.patterns && typeof parsed.patterns === "object" ? parsed.patterns : parsed;
  const pick = (camel, snake) => sanitizeScore(patterns[camel] ?? patterns[snake]);

  const perfectionism = pick("perfectionism", "perfectionism");
  const avoidance = pick("avoidance", "avoidance");
  const rumination = pick("rumination", "rumination");
  const catastrophizing = pick("catastrophizing", "catastrophizing");
  const selfCriticism = pick("selfCriticism", "self_criticism");

  if (
    perfectionism === null ||
    avoidance === null ||
    rumination === null ||
    catastrophizing === null ||
    selfCriticism === null
  ) {
    return null;
  }

  const evidence = Array.isArray(parsed.evidence)
    ? parsed.evidence
        .filter((item) => typeof item === "string" && item.trim())
        .map((item) => item.trim().slice(0, 160))
        .slice(0, 5)
    : [];

  return {
    scores: { perfectionism, avoidance, rumination, catastrophizing, selfCriticism },
    evidence,
  };
}

function sanitizeReframeResult(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  const distortion = parsed.distortion && typeof parsed.distortion === "object" ? parsed.distortion : null;
  const reframe = parsed.reframe && typeof parsed.reframe === "object" ? parsed.reframe : null;
  if (!distortion || !reframe) return null;

  const type = typeof distortion.type === "string" ? distortion.type.trim().slice(0, 60) : "";
  const explanation = typeof distortion.explanation === "string" ? distortion.explanation.trim().slice(0, 300) : "";
  const balancedThought =
    typeof reframe.balancedThought === "string" ? reframe.balancedThought.trim().slice(0, 600) : "";
  const actionableStep =
    typeof reframe.actionableStep === "string" ? reframe.actionableStep.trim().slice(0, 300) : "";

  if (!type || !explanation || !balancedThought || !actionableStep) return null;

  return {
    distortion: { type, explanation },
    reframe: { balancedThought, actionableStep },
  };
}

module.exports = { extractJsonObject, sanitizeScore, sanitizeSemanticScores, sanitizeReframeResult };
```

- [x] **Step 4: index.js 加路由**

`functions/api/index.js` 顶部 require 区加：

```javascript
const { extractJsonObject, sanitizeSemanticScores, sanitizeReframeResult } = require("./guideUtils");
```

常量区加：

```javascript
const MAX_GUIDE_MESSAGES = 12;
const MAX_GUIDE_MESSAGE_LENGTH = 1_200;
const MAX_GUIDE_SESSION_LENGTH = 2_000;
const MAX_GUIDE_THOUGHT_LENGTH = 3_000;
```

`requestChatCompletion` 签名加 temperature（默认 0.7，评分调用传 0.2）：把 `temperature: 0.7,` 改为 `temperature,`，函数签名 `{ hostname, path, authorization, model, messages, maxTokens, temperature = 0.7 }`。

在 `router.post("/analyze", ...)` 之前插入两条路由：

```javascript
router.post("/guide/assess", rateLimit, async (req, res) => {
  const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = rawMessages
    .filter((m) => typeof m === "string")
    .map((m) => m.trim().slice(0, MAX_GUIDE_MESSAGE_LENGTH))
    .filter(Boolean)
    .slice(-MAX_GUIDE_MESSAGES);
  const quizContext = typeof req.body?.quizContext === "string"
    ? req.body.quizContext.trim().slice(0, 600)
    : "";

  if (messages.length === 0 && !quizContext) {
    return res.status(400).json({ error: "No assessment input provided." });
  }

  const combined = [...messages, quizContext].join("\n");
  const crisisResponse = getCrisisResponse(combined);
  if (crisisResponse) return res.json(crisisResponse);

  const captchaTicket = req.body?.captchaTicket || req.headers["x-captcha-ticket"];
  const captchaRandstr = req.body?.captchaRandstr || req.headers["x-captcha-randstr"];
  const captchaResult = await verifyTencentCaptcha({
    ticket: captchaTicket,
    randstr: captchaRandstr,
    userIp: getClientKey(req),
  });
  if (!captchaResult.ok) {
    return res.status(403).json({ error: captchaResult.error || "Captcha verification failed." });
  }

  // ① Semantic scoring — deterministic degradation to null on any failure.
  let semanticScores = null;
  let evidence = [];
  if (messages.length > 0) {
    try {
      const raw = await callLlmWithFailover(
        [
          {
            role: "system",
            content:
              "You are a careful psychological text analyst. You never diagnose. Return ONLY valid JSON with no markdown fences.",
          },
          {
            role: "user",
            content: `Analyze these journal/chat excerpts from one person. Rate how strongly each thinking pattern appears, from 0.0 (absent) to 1.0 (very strong):
- perfectionism: rigid all-or-nothing standards, fear of mistakes
- avoidance: evading tasks, people, or feelings
- rumination: repetitive, stuck thinking loops
- catastrophizing: expecting worst-case outcomes
- selfCriticism: harsh self-judgment and self-blame

Return ONLY this JSON shape:
{"patterns": {"perfectionism": 0.0, "avoidance": 0.0, "rumination": 0.0, "catastrophizing": 0.0, "selfCriticism": 0.0}, "evidence": ["short quote", "short quote"]}
evidence: up to 3 short quotes (max 20 words each) supporting the two highest scores.

Text:
"""
${messages.join("\n---\n")}
"""`,
          },
        ],
        300,
        0.2
      );
      const sanitized = sanitizeSemanticScores(extractJsonObject(raw));
      if (sanitized) {
        semanticScores = sanitized.scores;
        evidence = sanitized.evidence;
      }
    } catch (error) {
      console.warn("Guide semantic scoring failed; falling back to deterministic mode.", error.message);
    }
  }

  // ② Narrative generation — LLM never participates in scoring.
  let narrative = null;
  let recommendations = [];
  try {
    const scoreLine = semanticScores
      ? `Pattern scores (0-1): perfectionism ${semanticScores.perfectionism}, avoidance ${semanticScores.avoidance}, rumination ${semanticScores.rumination}, catastrophizing ${semanticScores.catastrophizing}, selfCriticism ${semanticScores.selfCriticism}.`
      : "Pattern scores unavailable; rely on the quiz context.";
    const raw = await callLlmWithFailover(
      [
        {
          role: "system",
          content:
            "You are a warm, gentle wellbeing guide. Non-diagnostic, non-clinical, strengths-acknowledging. Return ONLY valid JSON with no markdown fences.",
        },
        {
          role: "user",
          content: `${scoreLine}
${quizContext ? `Quiz context: ${quizContext}\n` : ""}Write:
1. "narrative": 2-3 sentences in second person, warm and non-judgmental, describing these as tendencies (never diagnoses or labels), acknowledging one strength.
2. "recommendations": exactly 3 short actionable suggestions (max 15 words each) matched to the strongest patterns.

Return ONLY this JSON shape: {"narrative": "...", "recommendations": ["...", "...", "..."]}`,
        },
      ],
      400
    );
    const parsed = extractJsonObject(raw);
    if (parsed && typeof parsed.narrative === "string" && parsed.narrative.trim()) {
      narrative = parsed.narrative.trim().slice(0, 600);
    }
    if (Array.isArray(parsed?.recommendations)) {
      recommendations = parsed.recommendations
        .filter((r) => typeof r === "string" && r.trim())
        .map((r) => r.trim().slice(0, 140))
        .slice(0, 3);
    }
  } catch (error) {
    console.warn("Guide narrative generation failed; report will use local copy.", error.message);
  }

  res.json({ ok: true, semanticScores, evidence, narrative, recommendations });
});
```

> 注意：`callLlmWithFailover(messages, maxTokens)` 目前只有两个参数，需同步给它和 `callPrimaryModel`/`callBackupModel` 加 `temperature` 透传（评分调用 `0.2`，叙事默认 `0.7`）。这是对现有函数的最小签名扩展。

- [x] **Step 5: serverSafety.test.ts 断言升级**

把 `it("applies the same safety gateway before chat, reframe, and analyze generation")` 内的：

```typescript
expect((apiSource.match(/getCrisisResponse\(/g) || []).length).toBeGreaterThanOrEqual(4);
```

改为：

```typescript
expect((apiSource.match(/getCrisisResponse\(/g) || []).length).toBeGreaterThanOrEqual(6);
expect(apiSource).toContain('router.post("/guide/assess"');
expect(apiSource).toContain('router.post("/guide/reframe"');
```

- [x] **Step 6: 运行测试通过**

Run: `npx vitest run tests/guideApi.test.ts tests/serverSafety.test.ts`
Expected: PASS

- [x] **Step 7: Commit**

```bash
git add functions/api/guideUtils.js functions/api/index.js tests/guideApi.test.ts tests/serverSafety.test.ts
git commit -m "feat(guide): add /guide/assess endpoint with semantic scoring, narrative, and full safety pipeline"
```

---

## Task 5: 前端 API 客户端

**Files:**
- Modify: `src/services/api.ts`（文件末尾追加）

- [x] **Step 1: 追加类型与函数**

```typescript
// ── Guided Counseling (Guide module) ──────────────────────────────

export interface GuideSemanticScores {
  perfectionism: number;
  avoidance: number;
  rumination: number;
  catastrophizing: number;
  selfCriticism: number;
}

export interface GuideAssessResponse {
  ok: boolean;
  semanticScores: GuideSemanticScores | null;
  evidence: string[];
  narrative: string | null;
  recommendations: string[];
}

export async function requestGuideAssessment(
  messages: string[],
  quizContext: string
): Promise<GuideAssessResponse> {
  const filtered = messages.filter((m) => typeof m === "string" && m.trim()).slice(-12);
  try {
    const captchaData = await getCaptchaVerification();
    const response = await fetch(`${API_BASE_URL}/api/guide/assess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: filtered,
        quizContext: quizContext.slice(0, 600),
        captchaTicket: captchaData?.ticket,
        captchaRandstr: captchaData?.randstr,
      }),
      signal: AbortSignal.timeout(35_000),
    });
    if (response.ok) {
      const data = await response.json();
      return {
        ok: true,
        semanticScores: data.semanticScores ?? null,
        evidence: Array.isArray(data.evidence) ? data.evidence : [],
        narrative: typeof data.narrative === "string" ? data.narrative : null,
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      };
    }
  } catch (error) {
    console.warn("Guide assessment fell back to deterministic mode:", error);
  }
  return { ok: false, semanticScores: null, evidence: [], narrative: null, recommendations: [] };
}

export interface GuideReframeSessionPayload {
  situation: string;
  automaticThought: string;
  emotionLabel?: string;
  emotionIntensity?: number;
  evidenceFor?: string;
  evidenceAgainst?: string;
}

export interface GuideReframeResult {
  ok: boolean;
  distortion: { type: string; explanation: string };
  reframe: { balancedThought: string; actionableStep: string };
  degraded: boolean;
}

export async function requestGuideReframe(
  session: GuideReframeSessionPayload
): Promise<GuideReframeResult> {
  const payload = {
    situation: session.situation.slice(0, 2_000),
    automaticThought: session.automaticThought.slice(0, 3_000),
    emotionLabel: session.emotionLabel?.slice(0, 60),
    emotionIntensity: session.emotionIntensity,
    evidenceFor: session.evidenceFor?.slice(0, 1_500),
    evidenceAgainst: session.evidenceAgainst?.slice(0, 1_500),
  };

  if (isHighRiskText(`${payload.situation} ${payload.automaticThought}`)) {
    throw new Error("CRISIS");
  }

  try {
    const captchaData = await getCaptchaVerification();
    const response = await fetch(`${API_BASE_URL}/api/guide/reframe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: payload,
        captchaTicket: captchaData?.ticket,
        captchaRandstr: captchaData?.randstr,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.distortion && data.reframe) {
        return {
          ok: true,
          distortion: data.distortion,
          reframe: data.reframe,
          degraded: false,
        };
      }
    }
  } catch (error) {
    console.warn("Guide reframe fell back to local copy:", error);
  }

  return {
    ok: true,
    distortion: {
      type: "all-or-nothing",
      explanation: "This thought leans toward an all-or-nothing reading of the situation.",
    },
    reframe: {
      balancedThought: `"${payload.automaticThought}" is a real feeling, and feelings are valid signals — but they are not permanent facts. A more balanced view: this moment is difficult, not the whole story, and you have handled difficult moments before.`,
      actionableStep: "Write down one small thing that went okay today, however minor.",
    },
    degraded: true,
  };
}
```

- [x] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: 无错误

- [x] **Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m "feat(guide): add frontend API clients for assessment and reframe endpoints"
```

---

## Task 6: emotionsDatabase.ts（情绪库）

**Files:**
- Create: `src/lib/emotionsDatabase.ts`

- [x] **Step 1: 实现（6 族 × 4 情绪，双语，映射现有 6 情绪标签粒度 + emerald 变体色）**

```typescript
// src/lib/emotionsDatabase.ts
// Compact bilingual emotion catalog for the reframe wizard.
// 6 families aligned with the existing Mood Tracker labels; emerald-tinted per family.

export type EmotionFamilyId = "joy" | "calm" | "sadness" | "anxiety" | "anger" | "fatigue";

export interface GuideEmotion {
  id: string;
  label: string;
  labelZh: string;
  family: EmotionFamilyId;
  colorClass: string;
}

export interface EmotionFamily {
  id: EmotionFamilyId;
  label: string;
  emoji: string;
  colorClass: string;
}

export const EMOTION_FAMILIES: EmotionFamily[] = [
  { id: "sadness", label: "Sadness", emoji: "😔", colorClass: "bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400" },
  { id: "anxiety", label: "Anxiety", emoji: "😰", colorClass: "bg-purple-500/10 text-purple-600 border-purple-500/25 dark:text-purple-400" },
  { id: "anger", label: "Anger", emoji: "😡", colorClass: "bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400" },
  { id: "fatigue", label: "Fatigue", emoji: "😴", colorClass: "bg-stone-500/10 text-stone-600 border-stone-500/25 dark:text-stone-400" },
  { id: "calm", label: "Calm", emoji: "🌿", colorClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400" },
  { id: "joy", label: "Joy", emoji: "😊", colorClass: "bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400" },
];

export const EMOTIONS: GuideEmotion[] = [
  { id: "low", label: "Low", labelZh: "低落", family: "sadness", colorClass: "bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400" },
  { id: "lonely", label: "Lonely", labelZh: "孤独", family: "sadness", colorClass: "bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400" },
  { id: "heartbroken", label: "Heartbroken", labelZh: "伤心", family: "sadness", colorClass: "bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400" },
  { id: "empty", label: "Empty", labelZh: "空虚", family: "sadness", colorClass: "bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400" },
  { id: "anxious", label: "Anxious", labelZh: "焦虑", family: "anxiety", colorClass: "bg-purple-500/10 text-purple-600 border-purple-500/25 dark:text-purple-400" },
  { id: "fearful", label: "Fearful", labelZh: "害怕", family: "anxiety", colorClass: "bg-purple-500/10 text-purple-600 border-purple-500/25 dark:text-purple-400" },
  { id: "overwhelmed", label: "Overwhelmed", labelZh: "不堪重负", family: "anxiety", colorClass: "bg-purple-500/10 text-purple-600 border-purple-500/25 dark:text-purple-400" },
  { id: "restless", label: "Restless", labelZh: "不安", family: "anxiety", colorClass: "bg-purple-500/10 text-purple-600 border-purple-500/25 dark:text-purple-400" },
  { id: "frustrated", label: "Frustrated", labelZh: "沮丧", family: "anger", colorClass: "bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400" },
  { id: "irritated", label: "Irritated", labelZh: "烦躁", family: "anger", colorClass: "bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400" },
  { id: "resentful", label: "Resentful", labelZh: "怨恨", family: "anger", colorClass: "bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400" },
  { id: "betrayed", label: "Betrayed", labelZh: "被背叛", family: "anger", colorClass: "bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400" },
  { id: "drained", label: "Drained", labelZh: "疲惫", family: "fatigue", colorClass: "bg-stone-500/10 text-stone-600 border-stone-500/25 dark:text-stone-400" },
  { id: "numb", label: "Numb", labelZh: "麻木", family: "fatigue", colorClass: "bg-stone-500/10 text-stone-600 border-stone-500/25 dark:text-stone-400" },
  { id: "burnt-out", label: "Burnt out", labelZh: "倦怠", family: "fatigue", colorClass: "bg-stone-500/10 text-stone-600 border-stone-500/25 dark:text-stone-400" },
  { id: "depleted", label: "Depleted", labelZh: "耗竭", family: "fatigue", colorClass: "bg-stone-500/10 text-stone-600 border-stone-500/25 dark:text-stone-400" },
  { id: "centered", label: "Centered", labelZh: "安定", family: "calm", colorClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400" },
  { id: "serene", label: "Serene", labelZh: "宁静", family: "calm", colorClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400" },
  { id: "content", label: "Content", labelZh: "满足", family: "calm", colorClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400" },
  { id: "safe", label: "Safe", labelZh: "安全", family: "calm", colorClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400" },
  { id: "joyful", label: "Joyful", labelZh: "喜悦", family: "joy", colorClass: "bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400" },
  { id: "grateful", label: "Grateful", labelZh: "感恩", family: "joy", colorClass: "bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400" },
  { id: "hopeful", label: "Hopeful", labelZh: " hopeful", family: "joy", colorClass: "bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400" },
  { id: "proud", label: "Proud", labelZh: "自豪", family: "joy", colorClass: "bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400" },
];

export function getEmotionsByFamily(family: EmotionFamilyId): GuideEmotion[] {
  return EMOTIONS.filter((emotion) => emotion.family === family);
}

export function getEmotionById(id: string | undefined): GuideEmotion | undefined {
  if (!id) return undefined;
  return EMOTIONS.find((emotion) => emotion.id === id);
}
```

（注意修正 `hopeful` 的 labelZh 应为 `"有希望"`）

- [x] **Step 2: typecheck + Commit**

```bash
git add src/lib/emotionsDatabase.ts
git commit -m "feat(guide): add bilingual emotion catalog for reframe wizard"
```

---

## Task 7: Guide Tab 接入

**Files:**
- Create: `src/components/GuideSection.tsx`
- Modify: `src/components/Navbar.tsx`
- Modify: `src/App.tsx`

- [x] **Step 1: GuideSection.tsx（容器 + 子模块路由）**

```tsx
// src/components/GuideSection.tsx
import React, { useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Compass, Route, HeartPulse, ChevronLeft, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { NavTab } from "@/components/Navbar";
import { AssessmentFlow } from "@/components/guide/assess/AssessmentFlow";
import { ReframeWizard } from "@/components/guide/reframe/ReframeWizard";
import { loadReframeDraft } from "@/lib/guideStore";

type GuideMode = "home" | "assess" | "reframe";

export interface ReframePreset {
  distortionType?: string;
  situation?: string;
}

export const GuideSection: React.FC<{
  onStartChatWithPrompt: (prompt?: string) => void;
  onNavigate: (tab: NavTab) => void;
}> = ({ onStartChatWithPrompt, onNavigate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<GuideMode>("home");
  const [reframePreset, setReframePreset] = useState<ReframePreset | null>(null);
  const draft = mode === "home" ? loadReframeDraft() : null;

  useGSAP(
    () => {
      gsap.from(".guide-home-card", { y: 24, autoAlpha: 0, stagger: 0.1, duration: 0.5, ease: "power3.out" });
    },
    { scope: containerRef, dependencies: [mode] }
  );

  const handleBackHome = () => setMode("home");

  return (
    <div ref={containerRef} className="container mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6">
      {mode === "home" && (
        <>
          <div className="text-center max-w-xl mx-auto">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
              <Compass className="size-3.5" />
              <span>Guided Counseling Studio</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-lato-light">
              Understand Your Mind, Reframe Your Thoughts
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground font-lato-light-italic">
              Evidence-based CBT journeys — a structured reframe wizard and a gentle cognitive assessment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="guide-home-card rounded-3xl p-6 border border-emerald-500/20 bg-card/85 dark:bg-card/70 shadow-md shadow-emerald-500/5 backdrop-blur-md">
              {/* 评估模块卡片：图标 + 说明 + Start Assessment 按钮 + 最近快照时间 */}
            </Card>
            <Card className="guide-home-card rounded-3xl p-6 border border-teal-500/20 bg-card/85 dark:bg-card/70 shadow-md shadow-teal-500/5 backdrop-blur-md">
              {/* 重构模块卡片：图标 + 说明 + Begin 7-step wizard 按钮 + draft 存在时"Continue draft" */}
            </Card>
          </div>
        </>
      )}

      {mode === "assess" && (
        <AssessmentFlow onBack={handleBackHome} onStartReframe={(preset) => { setReframePreset(preset); setMode("reframe"); }} onNavigate={onNavigate} />
      )}

      {mode === "reframe" && (
        <ReframeWizard preset={reframePreset} onBack={handleBackHome} onStartChatWithPrompt={onStartChatWithPrompt} />
      )}
    </div>
  );
};
```

（实施时把两张卡片 JSX 补完整——评估卡：`Route` 图标、`"Cognitive Assessment"` 标题、10 问问卷 + 本地信号说明、隐私声明"stays on your device"、`Start Assessment` 主按钮、上次评估时间；重构卡：`HeartPulse` 图标、`"Guided Reframe"` 标题、7 步流程说明、`Begin Wizard` 主按钮、草稿存在时附加 `Continue Draft` 次按钮 + 草稿时间。）

- [x] **Step 2: Navbar.tsx**

```tsx
// NavTab 类型：
export type NavTab = "hero" | "chat" | "breathe" | "mood" | "guide" | "me";

// import 加 Compass：
import { Sparkles, MessageCircleHeart, HeartPulse, Wind, Moon, Sun, Compass } from "lucide-react";

// NAV_ITEMS 在 mood 之后插入：
{ id: "guide", label: "Guide", icon: Compass, iconClass: "text-emerald-500/90 dark:text-emerald-400" },
```

- [x] **Step 3: App.tsx**

```tsx
import { GuideSection } from "@/components/GuideSection";

// 条件渲染块（mood 之后）：
{currentTab === "guide" && (
  <GuideSection onStartChatWithPrompt={handleStartChatWithPrompt} onNavigate={handleTabSwitch} />
)}
```

- [x] **Step 4: typecheck + Commit**

```bash
npm run typecheck
git add src/components/GuideSection.tsx src/components/Navbar.tsx src/App.tsx
git commit -m "feat(guide): add Guide tab with module routing container"
```

---

## Task 8: 评估流程 UI（AssessmentFlow + IntakeQuiz + quizQuestions）

**Files:**
- Create: `src/components/guide/assess/quizQuestions.ts`
- Create: `src/components/guide/assess/IntakeQuiz.tsx`
- Create: `src/components/guide/assess/AssessmentFlow.tsx`

- [x] **Step 1: quizQuestions.ts（10 问纯数据）**

```typescript
// src/components/guide/assess/quizQuestions.ts
import type { AttentionArea } from "@/lib/cognitiveEngine";

export type QuizAnswerValue = number | AttentionArea[] | string;

export interface QuizQuestion {
  id: number;
  type: "scale" | "choice" | "multi" | "text";
  question: string;
  hint?: string;
  options?: Array<{ label: string; value: number }>;
  areas?: AttentionArea[];
  maxSelect?: number;
  placeholder?: string;
  required?: boolean;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    type: "scale",
    question: "Over the past two weeks, how often have you felt down, low, or hopeless?",
    options: [
      { label: "Rarely", value: 1 },
      { label: "Sometimes", value: 2 },
      { label: "Often", value: 3 },
      { label: "Most days", value: 4 },
      { label: "Nearly every day", value: 5 },
    ],
  },
  {
    id: 2,
    type: "scale",
    question: "Over the past two weeks, how often did little feel interesting or enjoyable?",
    options: [
      { label: "Rarely", value: 1 },
      { label: "Sometimes", value: 2 },
      { label: "Often", value: 3 },
      { label: "Most days", value: 4 },
      { label: "Nearly every day", value: 5 },
    ],
  },
  {
    id: 3,
    type: "choice",
    question: "When something stresses you, do you tend to replay it or take action?",
    options: [
      { label: "Always replay it", value: 1 },
      { label: "Mostly replay it", value: 2 },
      { label: "It's balanced", value: 3 },
      { label: "Mostly take action", value: 4 },
      { label: "Always take action", value: 5 },
    ],
  },
  {
    id: 4,
    type: "scale",
    question: "Do you often set standards for yourself that are hard to reach?",
    options: [
      { label: "Almost never", value: 1 },
      { label: "Rarely", value: 2 },
      { label: "Sometimes", value: 3 },
      { label: "Often", value: 4 },
      { label: "Almost always", value: 5 },
    ],
  },
  {
    id: 5,
    type: "choice",
    question: "With difficult conversations or tasks, do you avoid them or face them?",
    options: [
      { label: "Almost always avoid", value: 1 },
      { label: "Usually avoid", value: 2 },
      { label: "It varies", value: 3 },
      { label: "Usually face them", value: 4 },
      { label: "Almost always face them", value: 5 },
    ],
  },
  {
    id: 6,
    type: "scale",
    question: "How has your sleep been in the last two weeks?",
    options: [
      { label: "Very poor", value: 1 },
      { label: "Poor", value: 2 },
      { label: "Okay", value: 3 },
      { label: "Good", value: 4 },
      { label: "Very good", value: 5 },
    ],
  },
  {
    id: 7,
    type: "multi",
    question: "Which life areas feel most heavy right now?",
    hint: "Pick up to 2",
    maxSelect: 2,
    areas: ["academic", "career", "health", "relationships", "identity", "family"],
  },
  {
    id: 8,
    type: "multi",
    question: "Which of these have helped you recover in the past month?",
    hint: "Pick any that apply",
    maxSelect: 6,
    areas: [],
    options: [
      { label: "Walking or exercise", value: 1 },
      { label: "Journaling", value: 2 },
      { label: "Talking with a friend", value: 3 },
      { label: "Breathing or meditation", value: 4 },
      { label: "Music or art", value: 5 },
      { label: "Rest and sleep", value: 6 },
    ],
  },
  {
    id: 9,
    type: "choice",
    question: "What kind of support feels most helpful to you right now?",
    options: [
      { label: "Being listened to", value: 1 },
      { label: "Gentle guidance", value: 2 },
      { label: "Practical tools", value: 3 },
      { label: "Understanding my patterns", value: 4 },
    ],
  },
  {
    id: 10,
    type: "text",
    question: "What would you most like to feel better about?",
    hint: "Optional — it stays on your device",
    placeholder: "e.g., I want to stop second-guessing myself at work...",
    required: false,
  },
];

export const ATTENTION_AREA_LABELS: Record<AttentionArea, string> = {
  academic: "Studies",
  career: "Work",
  health: "Health",
  relationships: "Relationships",
  identity: "Identity",
  family: "Family",
};
```

- [x] **Step 2: IntakeQuiz.tsx**

交互要点：一次一题；scale/choice 点击后短暂高亮 300ms 自动前进（multi/text 需 Next）；顶部 10 个进度圆点；底部 Back/Continue；每题过 `isHighRiskText`（第 10 题重点）；翻页 `chimeAudio.playPhaseChime("hold")`；GSAP 方向感知滑动（`gsap.fromTo` y 依据 direction 正负）；答案状态由父组件持有（`answers: Record<number, QuizAnswerValue>`）。

Props 接口：

```tsx
export interface QuizAnswers {
  lowFrequency: number;        // Q1 1-5
  interestLoss: number;        // Q2 1-5
  ruminateVsAct: number;       // Q3 1-5（1=总反刍）
  standards: number;           // Q4 1-5
  avoidVsFace: number;         // Q5 1-5（1=总回避）
  sleepQuality: number;        // Q6 1-5
  attentionAreas: AttentionArea[]; // Q7
  copingActivities: string[];  // Q8 labels
  supportPreference: number;   // Q9 1-4
  openText: string;            // Q10
}

interface IntakeQuizProps {
  onComplete: (answers: QuizAnswers) => void;
  onBack: () => void;
}
```

- [x] **Step 3: AssessmentFlow.tsx（编排器）**

状态机：`phase: "landing" | "quiz" | "analyzing" | "report"`。

核心编排逻辑（analyzing 阶段）：

```typescript
const runAssessment = async (answers: QuizAnswers | null) => {
  setPhase("analyzing");
  const texts = getAssessmentTexts(24);
  const moodEntries = getRecentMoodEntries(30);

  const features = extractFeatures(texts);
  const emotionFreq = getEmotionFrequency(moodEntries.map((e) => e.mood));

  const quizContext = answers
    ? `Sleep quality ${answers.sleepQuality}/5. Tends to ${answers.ruminateVsAct <= 2 ? "replay stress" : "act on stress"}. ${answers.avoidVsFace <= 2 ? "Often avoids difficult tasks." : "Generally faces difficult tasks."} Prefers ${["being listened to", "gentle guidance", "practical tools", "pattern analysis"][answers.supportPreference - 1]}. Wants: ${answers.openText || "not specified"}.`
    : "";

  const apiResult = texts.length > 0 || quizContext
    ? await requestGuideAssessment(texts, quizContext)
    : { ok: false, semanticScores: null, evidence: [], narrative: null, recommendations: [] };

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
  setReport({ snapshot, apiResult, evidence: apiResult.evidence });
  setPhase("report");
};
```

landing 页要素：说明卡（评估做什么/不做什么）、数据来源披露（本地 N 条对话 + M 次打卡，均不上传）、两个入口按钮（`Start 10-question quiz` 主按钮 / `Skip quiz — use my local history` 文字按钮，无本地数据时禁用并说明）、伦理声明。

report 由 Task 9 的 `CognitiveReport` 渲染（此步先渲染占位结构，Task 9 替换为完整组件）。

- [x] **Step 4: typecheck + Commit**

```bash
npm run typecheck
git add src/components/guide/assess
git commit -m "feat(guide): add intake quiz and assessment flow orchestration"
```

---

## Task 9: 评估报告 UI（CognitiveReport + TraitRadar + StateGauge + AttentionMapView）

**Files:**
- Create: `src/components/guide/assess/TraitRadar.tsx`
- Create: `src/components/guide/assess/StateGauge.tsx`
- Create: `src/components/guide/assess/AttentionMapView.tsx`
- Create: `src/components/guide/assess/CognitiveReport.tsx`
- Modify: `src/components/guide/assess/AssessmentFlow.tsx`（接入 CognitiveReport）

- [x] **Step 1: TraitRadar.tsx（SVG 三轴雷达）**

实现要点：viewBox `0 0 220 220`，中心 110,110，半径 90；三个轴（完美主义/回避/反刍）分别位于 -90°、30°、150°；三层同心参考环（33%/66%/100%）；数据多边形 `fill="rgba(16,185,129,0.18)" stroke="#10b981"`；轴端标签 + 分值（0-100 显示）；GSAP 入场时从中心展开（`gsap.from` scale 0.6 autoAlpha 0）。纯计算函数生成 `polygon points`。

- [x] **Step 2: StateGauge.tsx（状态仪表条）**

```tsx
interface StateGaugeProps {
  label: string;
  description: string;
  value: number; // 0-1
  invert?: boolean; // true = 分数越高越好（motivation/stressAdaptation）
}
```

实现要点：标签行（label + 百分比）；轨道条 `h-2.5 rounded-full bg-muted`，填充条用 GSAP `gsap.to` 从 0 宽到 `${value*100}%`；颜色语义：`invert` 时高=emerald 低=rose（burnout）；低=emerald 高=amber/rose；下方一行 `text-[11px]` 描述性措辞（趋势化语言，禁临床标签，如 "Running low on fuel lately" 而非 "抑郁"）。

- [x] **Step 3: AttentionMapView.tsx（6 领域条形图）**

实现要点：横条列表，每行 = 领域标签（ATTENTION_AREA_LABELS）+ 百分比 + 条形（`bg-emerald-500/70`，GSAP stagger 展开）；漂移警告（|Z|≥1.5 的领域）行尾加 amber `Trending` 徽标（来自 `driftWarnings` prop）；数据归一化后占比展示。漂移提示文案："Compared with your recent snapshots, your attention to {area} has shifted noticeably."

- [x] **Step 4: CognitiveReport.tsx（组装）**

Props：

```tsx
interface CognitiveReportProps {
  snapshot: CognitiveSnapshot;
  narrative: string | null;
  recommendations: string[];
  evidence: string[];
  semanticActive: boolean;
  driftWarnings: AttentionDriftWarning[];
  supportPreference?: number;
  onStartReframe: (preset: ReframePreset) => void;
  onNavigate: (tab: NavTab) => void;
  onRestart: () => void;
}
```

布局（自上而下）：
1. **免责横幅**（amber/rose 边框）：`"A self-awareness companion — not a diagnosis or medical advice."`
2. **叙事卡**（narrative 有值时）：`mood-main-card` 结构 + LLM 叙事 + evidence 引句（斜体小字）
3. **特质雷达卡**：左雷达右图例（三轴 + 各自分值 + 一句解释）
4. **状态仪表卡**：三个 StateGauge（倦怠 invert=false / 动机 invert=true / 压力适应 invert=true）
5. **注意力地图卡**：AttentionMapView + 漂移警告
6. **来源透明块**：`text-[11px]`，"Blended from {source} signals · AI semantic layer {active/offline — deterministic mode}"
7. **推荐卡**：3 条 recommendations（emerald Check 图标）+ 依据 supportPreference 排序的模块 CTA：listening→Chat、guidance→Reframe wizard、tools→Breathe、analysis→本报告回看
8. **CTA 行**：主按钮 `Reframe a thought`（onStartReframe）+ 次按钮 `Breathe with me`（onNavigate("breathe")）+ 文字按钮 `Retake assessment`（onRestart）

- [x] **Step 5: AssessmentFlow 接入 + 全模块冒烟**

Run: `npm run typecheck && npm test && npm run build`
Expected: 全部通过

- [x] **Step 6: Commit**

```bash
git add src/components/guide/assess
git commit -m "feat(guide): add cognitive assessment report with radar, gauges, and attention map"
```

---

## Task 10: 后端 /guide/reframe 路由

**Files:**
- Modify: `functions/api/index.js`（追加路由）

- [x] **Step 1: 路由实现**

```javascript
router.post("/guide/reframe", rateLimit, async (req, res) => {
  const session = req.body?.session && typeof req.body.session === "object" ? req.body.session : null;
  if (!session) {
    return res.status(400).json({ error: "A reframe session payload is required." });
  }

  const situationResult = limitText(session.situation, MAX_GUIDE_SESSION_LENGTH, "Situation");
  if (situationResult.error) return res.status(400).json({ error: situationResult.error });

  const thoughtResult = limitText(session.automaticThought, MAX_GUIDE_THOUGHT_LENGTH, "Automatic thought");
  if (thoughtResult.error) return res.status(400).json({ error: thoughtResult.error });

  const evidenceFor = typeof session.evidenceFor === "string" ? session.evidenceFor.trim().slice(0, 1_500) : "";
  const evidenceAgainst = typeof session.evidenceAgainst === "string" ? session.evidenceAgainst.trim().slice(0, 1_500) : "";
  const emotionLabel = typeof session.emotionLabel === "string" ? session.emotionLabel.slice(0, 60) : "";
  const emotionIntensity = Number(session.emotionIntensity);

  const combined = [situationResult.text, thoughtResult.text, evidenceFor, evidenceAgainst].join("\n");
  const crisisResponse = getCrisisResponse(combined);
  if (crisisResponse) return res.json(crisisResponse);

  const captchaTicket = req.body?.captchaTicket || req.headers["x-captcha-ticket"];
  const captchaRandstr = req.body?.captchaRandstr || req.headers["x-captcha-randstr"];
  const captchaResult = await verifyTencentCaptcha({
    ticket: captchaTicket,
    randstr: captchaRandstr,
    userIp: getClientKey(req),
  });
  if (!captchaResult.ok) {
    return res.status(403).json({ error: captchaResult.error || "Captcha verification failed." });
  }

  const prompt = `A person is completing a CBT thought record. Help them with the final two steps.

Situation (what happened):
"${situationResult.text}"

Automatic thought:
"${thoughtResult.text}"

Emotion: ${emotionLabel || "unspecified"}${Number.isFinite(emotionIntensity) ? ` (intensity ${Math.min(10, Math.max(1, emotionIntensity))}/10)` : ""}
Evidence supporting the thought: ${evidenceFor || "(none given yet)"}
Evidence against the thought: ${evidenceAgainst || "(none given yet)"}

Tasks:
1. Identify the single best-fitting cognitive distortion type, choosing exactly one of: all-or-nothing, catastrophizing, overgeneralization, mind-reading, fortune-telling, emotional-reasoning, should-statements, labeling, discounting-positive, personalization, blame, filtering.
2. Explain that distortion in ONE gentle, non-judgmental sentence (second person).
3. Write a balanced thought (2-3 sentences): compassionate, realistic, grounded in the evidence above.
4. Suggest ONE small, concrete step they can take today.

Return ONLY valid JSON, no markdown:
{"distortion": {"type": "...", "explanation": "..."}, "reframe": {"balancedThought": "...", "actionableStep": "..."}}`;

  try {
    const raw = await callLlmWithFailover(
      [
        {
          role: "system",
          content:
            "You are a CBT-informed guide: warm, concise, non-diagnostic. Output only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      500
    );
    const result = sanitizeReframeResult(extractJsonObject(raw));
    if (result) {
      return res.json({ ok: true, ...result });
    }
    console.warn("Guide reframe returned unparseable JSON; using fallback.");
  } catch (error) {
    console.error("Guide reframe generation failed.", error.message);
  }

  res.json({
    ok: true,
    distortion: {
      type: "all-or-nothing",
      explanation: "This thought leans toward an all-or-nothing reading of the situation.",
    },
    reframe: {
      balancedThought: `"${thoughtResult.text}" is a real feeling, and feelings are valid signals — but they are not permanent facts. A more balanced view: this moment is difficult, not the whole story, and you have handled difficult moments before.`,
      actionableStep: "Write down one small thing that went okay today, however minor.",
    },
  });
});
```

- [x] **Step 2: 回归测试**

Run: `npx vitest run tests/guideApi.test.ts tests/serverSafety.test.ts`
Expected: PASS（安全断言含新路由）

- [x] **Step 3: Commit**

```bash
git add functions/api/index.js
git commit -m "feat(guide): add /guide/reframe endpoint with distortion detection and balanced reframe"
```

---

## Task 11: 重构向导 UI（ReframeWizard + 7 步组件）

**Files:**
- Create: `src/components/guide/reframe/StepSituation.tsx`
- Create: `src/components/guide/reframe/StepThought.tsx`
- Create: `src/components/guide/reframe/StepEmotion.tsx`
- Create: `src/components/guide/reframe/StepDistortion.tsx`
- Create: `src/components/guide/reframe/StepEvidence.tsx`
- Create: `src/components/guide/reframe/StepReframe.tsx`
- Create: `src/components/guide/reframe/StepSummary.tsx`
- Create: `src/components/guide/reframe/ReframeWizard.tsx`

- [x] **Step 1: 步骤组件骨架（统一 Props）**

```tsx
// 各步骤共用接口（放 ReframeWizard.tsx 内导出或独立 types）
import type { ReframeSession } from "@/lib/guideStore";

export interface WizardStepProps {
  session: ReframeSession;
  update: (patch: Partial<ReframeSession>) => void;
  onNext: () => void;
  onBack: () => void;
}
```

**StepSituation（步骤1）**: 标题"Describe the situation" + 引导问题 `"Just the facts — what happened, where, when?"` + textarea（rows=5, maxLength=2000, autoFocus）+ 字符计数 + Next 至少 10 字符。

**StepThought（步骤2）**: 标题"Catch the automatic thought" + textarea + 常见模板 chip 组（点击填入）：`["If this isn't perfect, I'm a failure", "They must think I'm incompetent", "I always mess things up", "I can't handle this", "It'll never work out for me", "I don't deserve this", "Everyone else has it figured out", "My mistake ruined everything"]`。Next 至少 5 字符。

**StepEmotion（步骤3）**: 6 族 tab（EMOTION_FAMILIES）→ 每族 4 情绪网格（EMOTIONS，双语标签，选中 `ring-2 ring-emerald-500/40`）→ 选中后强度滑块（1-10，`accent-emerald-500`）+ 建议文案。Next 需 `selectedEmotionId`。

**StepDistortion（步骤4）**: 进入时由向导触发 LLM（见编排器）；本组件展示：AI 识别结果卡（`Sparkles` 徽标 "AI observation" + distortion.explanation）+ 12 种扭曲网格供确认/修改（含简短双语说明，选中 emerald ring；默认选中 AI 建议 type）。Props 额外有 `aiResult`/`isAnalyzing`；加载态用 `ThinkingOrb`。

**StepEvidence（步骤5）**: 双栏 textarea——`"Evidence that supports the thought"` / `"Evidence against it"`（各 maxLength 1500，rows=4）+ 提示 `"Be a fair scientist of your own mind"`。可留空。

**StepReframe（步骤6）**: `balancedThought` 可编辑 textarea（预填 LLM 结果）+ `actionableStep` 展示卡（`Route` 图标）+ "Edit to make it yours" 提示。Next 需非空。

**StepSummary（步骤7）**: 前后对比卡（左：自动思维 + 确认扭曲，右：平衡认知 + 小步骤，中间 `ArrowRight`）；三个动作：`Continue in conversation`（onStartChatWithPrompt 构造 prompt：`I just completed a CBT reframe. My original thought was "..." and I reframed it to "..." — can we keep exploring this together?`）、`Save & finish`（completedAt=now, clearReframeDraft, 显示完成态 + `Start a new one`）、`Start over`。

每步输入过危机预检：编排器在 Next 处理器里对文本字段执行 `isHighRiskText`，命中则展示危机面板（`getCrisisFallback` + 988/findahelpline 链接，rose 边框卡）。

- [x] **Step 2: ReframeWizard.tsx（编排器）**

```tsx
// 核心状态与逻辑骨架
const STEPS = ["Situation", "Thought", "Emotion", "Distortion", "Evidence", "Reframe", "Summary"];

const [stepIndex, setStepIndex] = useState(0);
const [session, setSession] = useState<ReframeSession>(() => preset ? { ...createEmptyReframeSession(), situation: preset.situation ?? "" } : createEmptyReframeSession());
const [aiResult, setAiResult] = useState<GuideReframeResult | null>(null);
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [crisisText, setCrisisText] = useState<string | null>(null);
const [completed, setCompleted] = useState(false);
const directionRef = useRef(1);
const stepRef = useRef<HTMLDivElement>(null);

const update = (patch: Partial<ReframeSession>) => setSession((prev) => ({ ...prev, ...patch }));

// 草稿自动存档
useEffect(() => {
  if (!completed) saveReframeDraft(session);
}, [session, completed]);

// 步骤切换 GSAP 方向感知滑动 + hold 音效
const goToStep = (next: number) => {
  const direction = next > stepIndex ? 1 : -1;
  directionRef.current = direction;
  setStepIndex(next);
  chimeAudio.playPhaseChime("hold");
};

useGSAP(() => {
  if (!stepRef.current) return;
  gsap.fromTo(
    stepRef.current,
    { y: directionRef.current > 0 ? 24 : -24, autoAlpha: 0 },
    { y: 0, autoAlpha: 1, duration: 0.35, ease: "power2.out" }
  );
}, [stepIndex]);

const handleNext = () => {
  const textFields = [session.situation, session.automaticThought, session.evidenceFor, session.evidenceAgainst];
  if (textFields.some((field) => isHighRiskText(field))) {
    setCrisisText(getCrisisFallback(session.situation || session.automaticThought));
    return;
  }
  if (stepIndex === 3 && !session.confirmedDistortion) return; // 须确认扭曲
  goToStep(stepIndex + 1);
};

// 进入步骤4时触发一次 LLM（situation+thought+emotion 就绪）
useEffect(() => {
  if (stepIndex !== 3 || aiResult || isAnalyzing) return;
  const run = async () => {
    setIsAnalyzing(true);
    try {
      const emotion = getEmotionById(session.selectedEmotionId);
      const result = await requestGuideReframe({
        situation: session.situation,
        automaticThought: session.automaticThought,
        emotionLabel: emotion ? `${emotion.label} (${emotion.labelZh})` : undefined,
        emotionIntensity: session.emotionIntensity,
      });
      setAiResult(result);
      setSession((prev) => ({
        ...prev,
        identifiedDistortion: result.distortion,
        confirmedDistortion: prev.confirmedDistortion ?? result.distortion.type,
        reframedThought: prev.reframedThought || result.reframe.balancedThought,
        actionableStep: result.reframe.actionableStep,
      }));
    } catch (err) {
      if ((err as Error)?.message === "CRISIS") setCrisisText(getCrisisFallback(session.automaticThought));
    } finally {
      setIsAnalyzing(false);
    }
  };
  run();
}, [stepIndex]);
```

（`ReframeSession` 需在 Task 2 基础上补 `actionableStep?: string` 字段；顶部渲染 7 段进度条——emerald 渐变填充，GSAP 宽度动画；底部统一 Back/Next 按钮行；危机面板为 rose 边框卡片，含 helpline 链接。）

- [x] **Step 3: typecheck + test + build**

Run: `npm run typecheck && npm test && npm run build`
Expected: 全部通过

- [x] **Step 4: Commit**

```bash
git add src/components/guide/reframe src/lib/guideStore.ts
git commit -m "feat(guide): add 7-step CBT reframe wizard with draft autosave and crisis interception"
```

---

## Task 12: 联动打磨 + 全量验证

**Files:**
- Modify: `src/components/GuideSection.tsx`（评估报告 → 向导跳转带 preset：situation 预填 + distortionType 提示）
- Modify: `src/components/guide/assess/CognitiveReport.tsx`（CTA → onStartReframe）
- 可能微调：`src/components/HeroSection.tsx`（可选：探索卡片区加 Guide 入口——不做也不影响验收）

- [x] **Step 1: 评估 → 向导联动**

`CognitiveReport` 主 CTA 调 `onStartReframe({ distortionType: 最强特质对应扭曲, situation: "" })`；`GuideSection` 把 preset 传入 `ReframeWizard`；向导初始 `confirmedDistortion` 保持 undefined（AI 识别优先），preset 仅作为向导头部"来自评估的建议"提示卡（`Compass` 图标 + `Suggested focus: {type}` + 一键采纳按钮）。

- [x] **Step 2: 全量验证**

Run: `npm run typecheck && npm test && npm run build`
Expected: typecheck 0 错误；vitest 全绿（原有 5 个测试文件 + 新增 4 个）；build 成功

- [x] **Step 3: 手动冒烟清单（dev server）**

- Guide Tab 出现在导航，图标 Compass，切换动画正常
- 评估：跳过问卷（无本地数据时按钮禁用并说明）→ analyzing → 报告渲染雷达/仪表/条形图
- 评估：走完 10 问 → 报告含问卷融合来源标注
- 向导：7 步完整走通；步骤 4 AI 识别（本地 API 未部署时走降级文案，`degraded` 标注）；草稿刷新后可恢复；完成存档清除草稿
- 危机词（如 "I want to die"）输入 → 立即出现危机面板，不调用 LLM
- 深色模式视觉检查

- [x] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(guide): wire assessment-to-wizard jump and polish guided counseling integration"
```

---

## 部署提醒（实施完成后）

1. `functions/api/` 需重新部署到 CloudBase（`/guide/assess`、`/guide/reframe` 才会生效）；部署前本地可用 `npm start`（functions/api 内）联调。
2. `CORS_ORIGINS` 无需变更（同源新增路由）。
3. 环境变量无新增（复用 OPENROUTER_API_KEY / BACKUP_API_KEY / TCAPTCHA_*）。

## 验收标准（对照设计文档）

- [ ] 安全管线不变式：两条新路由完整经过 limitText → getCrisisResponse → captcha → rateLimit（serverSafety 测试断言）
- [ ] 依赖方向：guide 模块零 import 其他 Section 内部状态
- [ ] LLM 契约：语义评分/叙事/重构 JSON parse 失败均有兜底，评分绝不由叙事 LLM 参与
- [ ] 本地数据不变式：评估快照、草稿、活动日志仅存 localStorage；API 请求只传文本特征（无用户标识）
- [ ] 视觉一致：所有新组件使用 emerald 系配色、`mood-main-card` 卡片结构、GSAP 入场、lucide 图标、ThinkingOrb 加载态
