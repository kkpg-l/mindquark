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
    expect(entries[0]).toMatchObject({
      mood: "😔 Low & Dejected",
      energy: 2,
      valence: 2,
      note: "tough week",
    });
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
