import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { Sparkles, MessageCircleHeart, HeartPulse, Wind, Moon, Sun, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getProfileConfig, subscribeProfileConfig, type ProfileConfig } from "@/lib/profileStore";

export type NavTab = "hero" | "chat" | "breathe" | "mood" | "guide" | "me";

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconClass?: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: "hero", label: "Explore", icon: Sparkles, iconClass: "text-emerald-500/90 dark:text-emerald-400" },
  { id: "chat", label: "Chat", icon: MessageCircleHeart, iconClass: "text-teal-500/90 dark:text-teal-400" },
  { id: "breathe", label: "Breathe", icon: Wind, iconClass: "text-teal-500/90 dark:text-teal-400" },
  { id: "mood", label: "Mood", icon: HeartPulse, iconClass: "text-emerald-500/90 dark:text-emerald-400" },
  { id: "guide", label: "Guide", icon: Compass, iconClass: "text-emerald-500/90 dark:text-emerald-400" },
  { id: "me", label: "Me" },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [profile, setProfile] = useState<ProfileConfig>(getProfileConfig);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  // Sliding pill geometry; null until first measurement so it never flashes misplaced.
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    return subscribeProfileConfig(setProfile);
  }, []);

  const measurePill = useCallback(() => {
    const el = activeRef.current;
    if (!el) return;
    setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, []);

  // Layout effect: measure before paint so the pill lands correctly on tab change.
  useLayoutEffect(() => {
    measurePill();
  }, [measurePill, currentTab]);

  useEffect(() => {
    window.addEventListener("resize", measurePill);
    return () => window.removeEventListener("resize", measurePill);
  }, [measurePill]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-emerald-900/10 dark:border-emerald-500/15 bg-background/85 dark:bg-card/80 backdrop-blur-xl shadow-xs">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo with emerald badge */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onTabChange("hero")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onTabChange("hero");
            }
          }}
          className="flex cursor-pointer items-center gap-2.5 transition-transform duration-200 ease-out-soft hover:scale-105"
        >
          <div className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-md shadow-emerald-500/20">
            <Sparkles className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base md:text-lg tracking-tight leading-tight text-foreground">
              MindQuark <span className="text-emerald-600 dark:text-emerald-400 font-normal text-xs md:text-sm font-lato-light-italic">Sanctuary</span>
            </span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline font-lato-light-italic">
              24/7 AI Mental Health & Coaching
            </span>
          </div>
        </div>

        {/* Navigation Tabs with sliding pill indicator */}
        <nav className="relative flex items-center gap-1 sm:gap-2 bg-emerald-500/5 dark:bg-emerald-950/30 p-1 rounded-full border border-emerald-500/10">
          {/* Single pill, positioned against the nav track (not the tab), so
              translateX is measured once and never double-counts. Width is
              animated too — acceptable here because the pill is absolutely
              positioned (out of flow), so it never triggers document reflow. */}
          {pill && (
            <span
              aria-hidden="true"
              className="absolute top-0 left-0 h-full rounded-full bg-emerald-600 shadow-sm shadow-emerald-600/20 transition-[transform,width] duration-300 ease-out-soft"
              style={{ transform: `translateX(${pill.left}px)`, width: `${pill.width}px` }}
            />
          )}
          {NAV_ITEMS.map((item) => {
            const isActive = currentTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                ref={isActive ? activeRef : null}
                onClick={() => onTabChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`relative z-10 inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full py-1.5 px-3 text-xs sm:text-sm transition-[color,transform] duration-150 ease-out-soft active:scale-[0.97] ${
                  isActive
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.id === "me" ? (
                  <Avatar className="size-5 ring-1 ring-white/30">
                    <AvatarImage src={profile.userAvatar} />
                    <AvatarFallback className="text-[10px] bg-emerald-700 text-white">
                      {profile.userName[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  Icon && (
                    <Icon
                      className={`size-3.5 transition-colors ${
                        isActive ? "text-white" : item.iconClass || ""
                      }`}
                    />
                  )
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Theme Toggle — icon lives inside the button; key-swap replays a soft enter */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleDarkMode}
            className="size-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-emerald-500/10"
            aria-label="Toggle theme"
          >
            <span
              key={isDarkMode ? "sun" : "moon"}
              className="inline-flex animate-in fade-in-50 zoom-in-95 duration-200"
            >
              {isDarkMode ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
};
