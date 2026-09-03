import React, { useState, useRef } from "react";
import gsap from "gsap";
import { Navbar, type NavTab } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import MessageConversation from "@/components/ui/messaging-conversation";
import { BreatheSection } from "@/components/BreatheSection";
import { MoodTrackerSection } from "@/components/MoodTrackerSection";
import { GuideSection } from "@/components/GuideSection";
import { MeSection } from "@/components/MeSection";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { IntroSplash } from "@/components/IntroSplash";
import { LanguageProvider } from "@/lib/i18n";

function SanctuaryApp() {
  const [currentTab, setCurrentTab] = useState<NavTab>("hero");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [initialChatPrompt, setInitialChatPrompt] = useState<string | undefined>(undefined);
  const contentRef = useRef<HTMLDivElement>(null);

  // Toggle Dark Mode
  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  // GSAP Smooth Page Transition on tab switch
  const handleTabSwitch = (newTab: NavTab) => {
    if (newTab === currentTab) return;

    if (contentRef.current) {
      gsap.to(contentRef.current, {
        autoAlpha: 0,
        y: -8,
        scale: 0.99,
        duration: 0.18,
        ease: "power2.in",
        onComplete: () => {
          setCurrentTab(newTab);
          window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
          gsap.fromTo(
            contentRef.current,
            { autoAlpha: 0, y: 12, scale: 0.985 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.3,
              ease: "power2.out",
            }
          );
        },
      });
    } else {
      setCurrentTab(newTab);
    }
  };

  const handleStartChatWithPrompt = (prompt?: string) => {
    if (prompt) {
      setInitialChatPrompt(prompt);
    }
    handleTabSwitch("chat");
  };

  return (
    <div
      className={`min-h-screen relative flex flex-col selection:bg-primary/20 selection:text-primary transition-colors ${
        isDarkMode
          ? "sanctuary-bg-dark text-slate-100"
          : "sanctuary-bg-light text-slate-800"
      }`}
    >
      {/* Lively & Simple GSAP Intro Splash Animation (White & Emerald) */}
      {showIntro && <IntroSplash onFinish={() => setShowIntro(false)} />}

      {/* Ambient background soft light orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-32 left-1/4 w-[650px] h-[400px] bg-emerald-400/12 dark:bg-emerald-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-[550px] h-[380px] bg-teal-400/10 dark:bg-teal-500/12 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-10 w-[500px] h-[350px] bg-emerald-500/10 dark:bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={handleTabSwitch}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      {/* Main Content Area animated with GSAP */}
      <main className="flex-1 w-full relative z-10" ref={contentRef}>
        {currentTab === "hero" && (
          <HeroSection
            onStartChat={handleStartChatWithPrompt}
            onNavigate={handleTabSwitch}
          />
        )}

        {currentTab === "chat" && (
          <div className="container mx-auto max-w-5xl px-4 py-4 md:py-6">
            <ErrorBoundary fallbackTitle="Chat View Recovery">
              <MessageConversation
                initialPrompt={initialChatPrompt}
                onPromptConsumed={() => setInitialChatPrompt(undefined)}
                onNavigateToBreathe={() => handleTabSwitch("breathe")}
              />
            </ErrorBoundary>
          </div>
        )}

        {currentTab === "breathe" && (
          <ErrorBoundary fallbackTitle="Breathing Sanctuary Recovery">
            <BreatheSection onNavigateToChat={handleStartChatWithPrompt} />
          </ErrorBoundary>
        )}

        {currentTab === "mood" && (
          <MoodTrackerSection
            onStartChatWithMood={handleStartChatWithPrompt}
          />
        )}

        {currentTab === "guide" && (
          <GuideSection
            onStartChatWithPrompt={handleStartChatWithPrompt}
            onNavigate={handleTabSwitch}
          />
        )}

        {currentTab === "me" && <MeSection />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <SanctuaryApp />
    </LanguageProvider>
  );
}
