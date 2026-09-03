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
    const semantic = {
      perfectionism: 0.8,
      avoidance: 0.6,
      rumination: 0.5,
      catastrophizing: 0.4,
      selfCriticism: 0.7,
    };
    const traits = calculateTraitScores(features, { anger: 0.2, sadness: 0.5 }, semantic, null);
    expect(traits.perfectionism).toBeCloseTo(
      0.7 * 0.8 + 0.3 * clamp01(features.selfCriticism / (3 * 1.5))
    );
    expect(traits.avoidance).toBeLessThanOrEqual(1);
    expect(traits.rumination).toBeCloseTo(0.4 * 0.5 + 0.3 * 0.5 + 0.3 * 0.4);
  });

  it("degrades to pure deterministic when semantic is null (LLM offline)", () => {
    const withSemantic = calculateTraitScores(
      features,
      { anger: 0, sadness: 0 },
      { perfectionism: 0.9, avoidance: 0.9, rumination: 0.9, catastrophizing: 0.9, selfCriticism: 0.9 },
      null
    );
    const without = calculateTraitScores(features, { anger: 0, sadness: 0 }, null, null);
    expect(without.perfectionism).toBeGreaterThan(0);
    expect(without.perfectionism).toBeLessThan(withSemantic.perfectionism);
  });

  it("fuses quiz priors at 0.5/0.5 weight", () => {
    const semantic = {
      perfectionism: 0.4,
      avoidance: 0.4,
      rumination: 0.4,
      catastrophizing: 0.4,
      selfCriticism: 0.4,
    };
    const traits = calculateTraitScores(features, { anger: 0, sadness: 0 }, semantic, {
      perfectionism: 0.9,
      avoidance: 0.2,
      rumination: 0.5,
    });
    const passivePerfectionism = clamp01(0.7 * 0.4 + 0.3 * clamp01(features.selfCriticism / 4.5));
    expect(traits.perfectionism).toBeCloseTo(0.5 * 0.9 + 0.5 * passivePerfectionism, 5);
    expect(traits.avoidance).toBeLessThan(traits.perfectionism);
  });

  it("clamps all outputs to [0,1]", () => {
    const semantic = {
      perfectionism: 1,
      avoidance: 1,
      rumination: 1,
      catastrophizing: 1,
      selfCriticism: 1,
    };
    const traits = calculateTraitScores(
      extractFeatures(["failure failure failure avoid people"]),
      { anger: 1, sadness: 1 },
      semantic,
      { perfectionism: 1, avoidance: 1, rumination: 1 }
    );
    for (const v of Object.values(traits)) expect(v).toBeLessThanOrEqual(1);
  });
});

describe("calculateStateScores", () => {
  it("computes states per spec formula with quiz adjustments", () => {
    const features = extractFeatures(["I took a walk", "sad and angry"]);
    const semantic = {
      perfectionism: 0.2,
      avoidance: 0.3,
      rumination: 0.2,
      catastrophizing: 0.2,
      selfCriticism: 0.2,
    };
    const states = calculateStateScores(features, { anger: 0.5, sadness: 0.5 }, semantic, {
      sleepQuality: 2,
      interestLoss: 4,
    });
    expect(states.burnout).toBeGreaterThan(0.3);
    expect(states.motivation).toBeGreaterThan(0);
    expect(states.stressAdaptation).toBeLessThanOrEqual(1);
  });

  it("lowers motivation as interest loss grows", () => {
    const features = extractFeatures(["nothing much"]);
    const semantic = {
      perfectionism: 0.2,
      avoidance: 0.3,
      rumination: 0.2,
      catastrophizing: 0.2,
      selfCriticism: 0.2,
    };
    const lowLoss = calculateStateScores(features, { anger: 0, sadness: 0 }, semantic, {
      sleepQuality: 3,
      interestLoss: 1,
    });
    const highLoss = calculateStateScores(features, { anger: 0, sadness: 0 }, semantic, {
      sleepQuality: 3,
      interestLoss: 5,
    });
    expect(highLoss.motivation).toBeLessThan(lowLoss.motivation);
  });
});

describe("buildAttentionMap", () => {
  it("normalizes 6 domains to sum 1", () => {
    const map = buildAttentionMap(
      ["my boss deadline at work", "exam study stress", "mom and family dinner"],
      null
    );
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1);
    expect(map.career).toBeGreaterThan(0);
    expect(map.academic).toBeGreaterThan(0);
  });

  it("blends quiz-selected areas at half weight when text signal exists", () => {
    const map = buildAttentionMap(["work work work deadline"], ["relationships", "health"]);
    expect(map.relationships).toBeGreaterThan(0);
    expect(map.career).toBeGreaterThan(map.relationships);
    expect(map.relationships).toBeCloseTo(map.health);
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
    const history: AttentionMap[] = [
      { academic: 0.05, career: 0.5, health: 0.1, relationships: 0.1, identity: 0.1, family: 0.1 },
      { academic: 0.1, career: 0.5, health: 0.1, relationships: 0.1, identity: 0.1, family: 0.1 },
      { academic: 0.15, career: 0.5, health: 0.1, relationships: 0.1, identity: 0.1, family: 0.1 },
      { academic: 0.1, career: 0.5, health: 0.1, relationships: 0.1, identity: 0.1, family: 0.1 },
    ];
    const current: AttentionMap = {
      academic: 0.6,
      career: 0.1,
      health: 0.1,
      relationships: 0.1,
      identity: 0.1,
      family: 0.1,
    };
    const warnings = detectAttentionDrift(current, history);
    expect(warnings.some((w) => w.area === "academic" && w.z >= 1.5)).toBe(true);
    expect(warnings.some((w) => w.area === "career")).toBe(false);
  });

  it("returns empty for short history", () => {
    expect(
      detectAttentionDrift(
        { academic: 1, career: 0, health: 0, relationships: 0, identity: 0, family: 0 },
        []
      )
    ).toEqual([]);
  });
});
