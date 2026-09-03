// Deterministic cognitive scoring engine (TS port of the Sentia scoring model).
// Pure functions only: no I/O, no randomness — fully testable.

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

export interface AttentionDriftWarning {
  area: AttentionArea;
  z: number;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

const SELF_CRITICISM_KEYWORDS = [
  "failure", "not good enough", "useless", "stupid", "worthless", "hate myself", "imposter",
  "incompetent", "my fault", "disappointed in myself", "mess up", "ruined it",
  "失败", "不够好", "没用", "笨", "讨厌自己", "冒名顶替", "都怪我", "搞砸",
];

const SOCIAL_WITHDRAWAL_KEYWORDS = [
  "avoid people", "cancel plans", "don't want to see anyone", "want to be alone", "isolate",
  "skip social", "stay home", "avoid going out", "shut everyone out",
  "不想见人", "推掉", "想一个人", "回避", "孤立", "宅在家",
];

const COPING_KEYWORDS = [
  "breathing", "journal", "took a walk", "exercise", "meditat", "rested", "took a nap",
  "talk to a friend", "talked to a friend", "listen to music", "listened to music",
  "took a break", "self-care", "stretch",
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

// When the LLM semantic layer is unavailable, keyword rates stand in for it
// so the fusion formula degrades to pure deterministic scoring.
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

  const stressAdaptation = clamp01(
    0.5 * copingRate + 0.3 * (1 - sem.catastrophizing) + 0.2 * (1 - sem.avoidance)
  );
  return { burnout, motivation, stressAdaptation };
}

export function buildAttentionMap(texts: string[], quizAreas: AttentionArea[] | null): AttentionMap {
  const counts: AttentionMap = { academic: 0, career: 0, health: 0, relationships: 0, identity: 0, family: 0 };
  const combined = texts.join("\n").toLowerCase();
  for (const area of Object.keys(ATTENTION_KEYWORDS) as AttentionArea[]) {
    counts[area] = countKeywordHits(combined, ATTENTION_KEYWORDS[area]);
  }

  const textTotal = Object.values(counts).reduce((a, b) => a + b, 0);
  const selectedAreas = (quizAreas ?? []).filter((a) => a in counts);

  if (textTotal === 0) {
    if (selectedAreas.length === 0) {
      const uniform = 1 / 6;
      return {
        academic: uniform, career: uniform, health: uniform,
        relationships: uniform, identity: uniform, family: uniform,
      };
    }
    const share = 1 / selectedAreas.length;
    for (const area of selectedAreas) counts[area] = share;
    return counts;
  }

  // Quiz-selected areas carry half the total signal weight when present.
  const priorPerArea = selectedAreas.length > 0 ? textTotal / selectedAreas.length : 0;
  for (const area of selectedAreas) counts[area] += priorPerArea;

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  for (const area of Object.keys(counts) as AttentionArea[]) {
    counts[area] = counts[area] / total;
  }
  return counts;
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
