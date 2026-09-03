import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const {
  extractJsonObject,
  sanitizeScore,
  sanitizeSemanticScores,
  sanitizeReframeResult,
} = require("../functions/api/guideUtils.js");
const apiSource = fs.readFileSync(path.resolve(process.cwd(), "functions/api/index.js"), "utf8");

describe("extractJsonObject", () => {
  it("parses plain JSON", () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in markdown fences", () => {
    expect(extractJsonObject('```json\n{"a": 0.5}\n```')).toEqual({ a: 0.5 });
  });

  it("parses first JSON object embedded in prose", () => {
    expect(
      extractJsonObject('Here you go: {"patterns": {"avoidance": 0.4}} hope this helps')
    ).toEqual({ patterns: { avoidance: 0.4 } });
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
      patterns: {
        perfectionism: 0.6,
        avoidance: 0.3,
        rumination: 0.9,
        catastrophizing: 0.2,
        selfCriticism: 0.4,
      },
      evidence: ["I always fail", "valid quote", 42, ""],
    });
    expect(result?.scores.perfectionism).toBe(0.6);
    expect(result?.evidence).toEqual(["I always fail", "valid quote"]);
  });

  it("accepts snake_case keys", () => {
    const result = sanitizeSemanticScores({
      patterns: {
        perfectionism: 0.1,
        avoidance: 0.1,
        rumination: 0.1,
        catastrophizing: 0.1,
        self_criticism: 0.1,
      },
    });
    expect(result?.scores.selfCriticism).toBe(0.1);
  });

  it("returns null when any pattern is missing or invalid", () => {
    expect(
      sanitizeSemanticScores({
        patterns: { perfectionism: 0.5, avoidance: 0.5, rumination: 0.5, catastrophizing: 0.5 },
      })
    ).toBeNull();
    expect(sanitizeSemanticScores(null)).toBeNull();
    expect(
      sanitizeSemanticScores({
        patterns: {
          perfectionism: "??",
          avoidance: 0.5,
          rumination: 0.5,
          catastrophizing: 0.5,
          selfCriticism: 0.5,
        },
      })
    ).toBeNull();
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
