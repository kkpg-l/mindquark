import { describe, expect, it, beforeEach } from "vitest";
import {
  createEmptyReframeSession,
  saveReframeDraft,
  loadReframeDraft,
  clearReframeDraft,
  saveCognitiveSnapshot,
  getCognitiveSnapshots,
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
        attention: {
          academic: 1 / 6,
          career: 1 / 6,
          health: 1 / 6,
          relationships: 1 / 6,
          identity: 1 / 6,
          family: 1 / 6,
        },
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
