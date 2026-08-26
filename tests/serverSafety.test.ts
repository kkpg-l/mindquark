import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { assessSafety, buildCrisisResponse } = require("../functions/api/safety.js");
const apiSource = fs.readFileSync(path.resolve(process.cwd(), "functions/api/index.js"), "utf8");

describe("server safety gateway", () => {
  it("routes English and Chinese high-risk disclosures to a non-generative crisis response", () => {
    const englishAssessment = assessSafety("I feel overwhelmed and I want to die");
    const chineseAssessment = assessSafety("我现在不想活了");

    expect(englishAssessment.level).toBe("high");
    expect(chineseAssessment.level).toBe("high");
    expect(buildCrisisResponse(englishAssessment.language)).toMatchObject({
      isCrisis: true,
      cbtCategory: "Crisis Safety",
    });
    expect(buildCrisisResponse(chineseAssessment.language).reply).toContain("当地紧急服务");
  });

  it("does not escalate ordinary wellbeing language", () => {
    expect(assessSafety("I am stressed about tomorrow's presentation").level).toBe("none");
  });

  it("removes source-code credential fallbacks and rejects arbitrary CORS origins", () => {
    expect(apiSource).not.toContain("sk-or-v1-");
    expect(apiSource).not.toContain("allowedOrigins.includes(\"*\")");
    expect(apiSource).toContain("Origin is not allowed by CORS policy");
    expect(apiSource).toContain("requireConfigured(\"OPENROUTER_API_KEY\"");
  });

  it("applies the same safety gateway before chat, reframe, and analyze generation", () => {
    expect((apiSource.match(/getCrisisResponse\(/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(apiSource).toContain("router.post(\"/chat\"");
    expect(apiSource).toContain("router.post(\"/reframe\"");
    expect(apiSource).toContain("router.post(\"/analyze\"");
  });

  it("enforces anti-bot and scraper protection middleware", () => {
    expect(apiSource).toContain("antiBotMiddleware");
    expect(apiSource).toContain("python-requests");
    expect(apiSource).toContain("Access denied: Automated scraper detected.");
  });
});
