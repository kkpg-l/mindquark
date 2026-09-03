import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sendChatMessage,
  requestGuideReframe,
  requestGuideAssessment,
} from "../src/services/api";

describe("API Service Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should process successful backend chat responses", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reply: "Take a gentle breath.",
        cbtTip: "Mindful Reflection",
        cbtCategory: "CBT Reframe",
        isCrisis: false,
      }),
    } as Response);

    const res = await sendChatMessage("I feel overwhelmed", [], "female");
    expect(res.reply).toBe("Take a gentle breath.");
    expect(res.cbtCategory).toBe("CBT Reframe");
    expect(res.isCrisis).toBe(false);
  });

  it("should fallback gracefully if network request rejects", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network offline"));

    const res = await sendChatMessage("Hello", [], "male");
    expect(res.reply).toContain("I hear you");
    expect(res.isCrisis).toBe(false);
    expect(res.cbtTip).toBeDefined();
  });

  it("should return crisis support without sending high-risk text to the model API", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    const res = await sendChatMessage("I want to die", [], "female");

    expect(res.isCrisis).toBe(true);
    expect(res.cbtCategory).toBe("Crisis Safety");
    expect(res.reply).toContain("988");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("Guide API crisis interception", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("requestGuideReframe throws CRISIS locally for high-risk input without network", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    await expect(
      requestGuideReframe({
        situation: "I failed my exam today",
        automaticThought: "I want to die",
      })
    ).rejects.toThrow("CRISIS");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requestGuideReframe propagates backend crisis responses instead of using the generic fallback", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reply: "Your safety matters most right now.",
        isCrisis: true,
        resources: [],
      }),
    } as Response);

    await expect(
      requestGuideReframe({
        situation: "A normal situation",
        automaticThought: "Everything feels ruined",
      })
    ).rejects.toThrow("CRISIS");
  });

  it("requestGuideAssessment throws CRISIS for high-risk history without network", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    await expect(requestGuideAssessment(["I want to die"], "")).rejects.toThrow("CRISIS");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requestGuideAssessment degrades gracefully on network failure", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network offline"));

    const res = await requestGuideAssessment(["I feel fine today"], "");
    expect(res.ok).toBe(false);
    expect(res.semanticScores).toBeNull();
    expect(res.evidence).toEqual([]);
  });
});
