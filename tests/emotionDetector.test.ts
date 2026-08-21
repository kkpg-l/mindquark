import { describe, it, expect } from "vitest";
import { detectEmotion } from "../src/lib/emotionDetector";

describe("Emotion Detector Suite", () => {
  it("should classify anxiety and panic cues", () => {
    const result = detectEmotion("I feel so overwhelmed and my heart is beating fast with panic");
    expect(result.category).toBe("anxiety");
    expect(result.label).toContain("Anxiety");
    expect(result.suggestedAction).toContain("Breathing");
  });

  it("should classify burnout and exhaustion", () => {
    const result = detectEmotion("I am so exhausted, completely burned out from work");
    expect(result.category).toBe("burnout");
    expect(result.label).toContain("Burnout");
  });

  it("should classify self-criticism and impostor syndrome", () => {
    const result = detectEmotion("I made a mistake, I feel like a total failure and imposter");
    expect(result.category).toBe("doubt");
    expect(result.suggestedAction).toContain("CBT");
  });

  it("should detect high distress level with intensity words", () => {
    const result = detectEmotion("I am extremely anxious and dying from fear");
    expect(result.distressLevel).toBe("High");
  });

  it("should return neutral baseline for general input", () => {
    const result = detectEmotion("Hello there, how are you today?");
    expect(result.category).toBe("neutral");
  });
});
