import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { Navbar, type NavTab } from "@/components/Navbar";
import { LanguageProvider, useLanguage, translations } from "@/lib/i18n";

describe("i18n and Chinese language switch button", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const baseProps = {
    currentTab: "hero" as NavTab,
    onTabChange: (_: NavTab) => {},
    isDarkMode: false,
    onToggleDarkMode: () => {},
  };

  it("renders Navbar with language switch button matching sanctuary style", () => {
    const markup = renderToStaticMarkup(
      <LanguageProvider initialLanguage="en">
        <Navbar {...baseProps} />
      </LanguageProvider>
    );

    // Conforms to button style with rounded-full, border, emerald hover
    expect(markup).toContain("rounded-full");
    expect(markup).toContain("border-emerald-500/20");
    // Displays language text EN
    expect(markup).toContain("EN");
    expect(markup).toContain("Switch to Chinese");
  });

  it("renders Chinese labels when language is zh", () => {
    const markup = renderToStaticMarkup(
      <LanguageProvider initialLanguage="zh">
        <Navbar {...baseProps} />
      </LanguageProvider>
    );

    // Displays Chinese toggle state
    expect(markup).toContain("中文");
    // Navigation items are translated to Chinese
    expect(markup).toContain("发现");
    expect(markup).toContain("愈疗对话");
    expect(markup).toContain("呼吸减压");
    expect(markup).toContain("情绪记录");
    expect(markup).toContain("思绪梳理");
    expect(markup).toContain("个人中心");
    // Brand subtitle & tagline
    expect(markup).toContain("愈心空间");
    expect(markup).toContain("24/7 AI 心理健康与愈疗向导");
  });

  it("renders English labels when language is en", () => {
    const markup = renderToStaticMarkup(
      <LanguageProvider initialLanguage="en">
        <Navbar {...baseProps} />
      </LanguageProvider>
    );

    expect(markup).toContain("Explore");
    expect(markup).toContain("Chat");
    expect(markup).toContain("Breathe");
    expect(markup).toContain("Mood");
    expect(markup).toContain("Guide");
    expect(markup).toContain("Me");
    expect(markup).toContain("Sanctuary");
  });

  it("translations dictionary has matching keys for en and zh", () => {
    expect(translations.en.nav.explore).toBe("Explore");
    expect(translations.zh.nav.explore).toBe("发现");
    expect(translations.en.hero.startChat).toBe("Begin Mindful Chat");
    expect(translations.zh.hero.startChat).toBe("开启愈疗对话");
    expect(translations.en.breathe.start).toBe("Start Session");
    expect(translations.zh.breathe.start).toBe("开始呼吸练习");
  });
});
