/**
 * Motion-polish regression tests (Plan Task 13)
 *
 * Covers four contract areas:
 *  1. Button variant press feedback (active:scale)
 *  2. VoiceCallModal entry/exit animation asymmetry + delayed-close pattern
 *  3. Navbar accessibility (aria-current, keyboard) + sliding-pill architecture
 *  4. motion.css reduced-motion gate + utility-class definitions
 *
 * Uses renderToStaticMarkup for component markup assertions and fs.readFileSync
 * for source-file / CSS contract checks — deterministic and DOM-interaction-free.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Navbar, type NavTab } from "@/components/Navbar";
import { VoiceCallModal, type VoiceCallPhase } from "@/components/VoiceCallModal";

const testDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testDir, "..");

function readSrc(rel: string): string {
  return readFileSync(resolve(projectRoot, rel), "utf-8");
}

/* ────────────────────────────────────────────────
 * 1. Button press feedback
 * ──────────────────────────────────────────────── */

describe("Button motion variants", () => {
  it("interactive variants apply active:scale-[0.97] for tactile press", () => {
    for (const variant of [
      "default",
      "outline",
      "ghost",
      "secondary",
      "destructive",
    ] as const) {
      const markup = renderToStaticMarkup(
        <Button variant={variant}>Click</Button>
      );
      expect(markup).toContain("active:scale-[0.97]");
    }
  });

  it("link variant neutralizes press with active:scale-100", () => {
    const markup = renderToStaticMarkup(<Button variant="link">Link</Button>);
    expect(markup).toContain("active:scale-100");
    expect(markup).not.toContain("active:scale-[0.97]");
  });

  it("base transition list is GPU-friendly with duration-200 / hover:duration-150", () => {
    const markup = renderToStaticMarkup(<Button>Test</Button>);
    expect(markup).toContain(
      "transition-[transform,color,background-color,border-color,box-shadow,opacity]"
    );
    expect(markup).toContain("duration-200");
    expect(markup).toContain("hover:duration-150");
  });
});

/* ────────────────────────────────────────────────
 * 2. VoiceCallModal animation asymmetry
 * ──────────────────────────────────────────────── */

describe("VoiceCallModal motion", () => {
  const baseProps = {
    isOpen: true as boolean,
    onClose: () => {},
    counselorName: "Dr. Test",
    callPhase: "form" as VoiceCallPhase,
    callPhone: "",
    onPhoneChange: (_: string) => {},
    callConsent: false,
    onConsentChange: (_: boolean) => {},
    callError: null as string | null,
    callStatusText: null as string | null,
    onStartCall: () => {},
  };

  it("entry uses animate-in fade-in-50 zoom-in-95 duration-200 (spec open 200-300ms)", () => {
    const markup = renderToStaticMarkup(
      <VoiceCallModal {...baseProps} />
    );
    expect(markup).toContain("animate-in");
    expect(markup).toContain("fade-in-50");
    expect(markup).toContain("zoom-in-95");
    expect(markup).toContain("duration-200");
    // Exit classes should NOT be present when modal is opening
    expect(markup).not.toContain("animate-out");
  });

  it("source defines exit animation with animate-out fade-out duration-150 (close asymmetry)", () => {
    const src = readSrc("src/components/VoiceCallModal.tsx");
    expect(src).toContain("animate-out fade-out");
    expect(src).toContain("duration-150");
  });

  it("delayed-close pattern: isClosing state + CLOSING_DELAY_MS + onAnimationEnd fallback timer", () => {
    const src = readSrc("src/components/VoiceCallModal.tsx");
    expect(src).toContain("isClosing");
    expect(src).toContain("CLOSING_DELAY_MS");
    expect(src).toContain("onAnimationEnd");
    // Fallback timer must exist (guards against browsers that skip animationend)
    expect(src).toContain("setTimeout");
  });
});

/* ────────────────────────────────────────────────
 * 3. Navbar accessibility + sliding pill
 * ──────────────────────────────────────────────── */

describe("Navbar accessibility and pill architecture", () => {
  // Suppress React's SSR useLayoutEffect warning during static markup tests
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const baseProps = {
    currentTab: "chat" as NavTab,
    onTabChange: (_: NavTab) => {},
    isDarkMode: false,
    onToggleDarkMode: () => {},
  };

  it("active tab carries aria-current='page'", () => {
    const markup = renderToStaticMarkup(<Navbar {...baseProps} />);
    expect(markup).toContain('aria-current="page"');
  });

  it("logo div has role='button' and tabindex='0' for keyboard activation", () => {
    const markup = renderToStaticMarkup(<Navbar {...baseProps} />);
    expect(markup).toContain('role="button"');
    expect(markup).toContain('tabindex="0"');
  });

  it("nav items are keyboard-accessible <button type='button'> elements", () => {
    const markup = renderToStaticMarkup(<Navbar {...baseProps} />);
    expect(markup).toContain("<button");
    expect(markup).toContain('type="button"');
    // No span-based nav items (subagent regression we fixed)
    expect(markup).not.toContain("<span type=\"button\"");
  });

  it("pill indicator is absent in static SSR markup (no flash before measurement)", () => {
    // useLayoutEffect does not run during renderToStaticMarkup, so the pill
    // state stays null and the absolutely-positioned span never renders.
    const markup = renderToStaticMarkup(<Navbar {...baseProps} />);
    expect(markup).not.toContain("translateX(");
  });

  it("source implements sliding pill via useLayoutEffect + activeRef + measurePill", () => {
    const src = readSrc("src/components/Navbar.tsx");
    expect(src).toContain("useLayoutEffect");
    expect(src).toContain("activeRef");
    expect(src).toContain("measurePill");
    expect(src).toContain("transition-[transform,width]");
    expect(src).toContain("ease-out-soft");
  });
});

/* ────────────────────────────────────────────────
 * 4. motion.css reduced-motion gate + utility classes
 * ──────────────────────────────────────────────── */

describe("motion.css contracts", () => {
  const css = readSrc("src/lib/motion.css");

  it("defines custom easing tokens in @theme", () => {
    expect(css).toContain("--ease-out-soft");
    expect(css).toContain("--ease-spring-gentle");
    expect(css).toContain("--ease-in-soft");
  });

  it("defines the three keyframe utility classes", () => {
    expect(css).toContain(".animate-pop-in");
    expect(css).toContain(".animate-draw-check");
    expect(css).toContain(".animate-bounce-pulse");
    // Spring gentle on pop-in, soft on draw-check
    expect(css).toContain("var(--ease-spring-gentle)");
  });

  it("reduced-motion gate disables custom keyframes", () => {
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("animation: none !important");
  });

  it("reduced-motion gate strips tw-animate-css displacement for .animate-in/.animate-out", () => {
    expect(css).toContain("--tw-enter-scale");
    expect(css).toContain("--tw-exit-scale");
    expect(css).toContain("--tw-enter-translate-y");
    expect(css).toContain("100ms");
  });

  it("reduced-motion gate downgrades .motion-lift/.motion-press/.motion-slide to opacity-only", () => {
    expect(css).toContain("transition-property: opacity");
  });
});
