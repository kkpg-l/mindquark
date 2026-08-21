import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendChatMessage } from "../src/services/api";

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
