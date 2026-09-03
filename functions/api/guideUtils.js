// Pure helpers for parsing and sanitizing LLM output in the guide endpoints.

function extractJsonObject(raw) {
  const text = String(raw || "").trim().replace(/```(?:json)?/gi, "");
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
  // Number(null) === 0 and Number("") === 0, so missing values must be rejected explicitly.
  if (value === null || value === undefined || typeof value === "boolean") return null;
  if (typeof value === "string" && value.trim() === "") return null;
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
  const explanation =
    typeof distortion.explanation === "string" ? distortion.explanation.trim().slice(0, 300) : "";
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
