import React, { useState, useEffect } from "react";
import { Sparkles, MessageCircleHeart, HeartPulse, Wind, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getProfileConfig, subscribeProfileConfig, type ProfileConfig } from "@/lib/profileStore";

export type NavTab = "hero" | "chat" | "breathe" | "mood" | "me";

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
  { id: "hero", label: "Explore", icon: Sparkles },
  { id: "chat", label: "Chat", icon: MessageCircleHeart },
  { id: "breathe", label: "Breathe", icon: Wind, iconClass: "text-teal-400" },
  { id: "mood", label: "Mood", icon: HeartPulse, iconClass: "text-emerald-400" },
  { id: "me", label: "Me" },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [profile, setProfile] = useState<ProfileConfig>(getProfileConfig);

  useEffect(() => {
    return subscribeProfileConfig(setProfile);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-emerald-900/10 dark:border-emerald-500/15 bg-background/85 dark:bg-card/80 backdrop-blur-xl transition-all shadow-xs">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo with emerald badge */}
        <div
          onClick={() => onTabChange("hero")}
          className="flex cursor-pointer items-center gap-2.5 transition-transform hover:scale-105"
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

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2 bg-emerald-500/5 dark:bg-emerald-950/30 p-1 rounded-full border border-emerald-500/10">
          {NAV_ITEMS.map((item) => {
            const isActive = currentTab === item.id;
            const Icon = item.icon;

            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => onTabChange(item.id)}
                className={`rounded-full text-xs sm:text-sm h-8 sm:h-8.5 px-3.5 sm:px-4 gap-1.5 transition-all ${
                  isActive
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-emerald-500/10"
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
                  Icon && <Icon className={`size-3.5 ${item.iconClass || ""}`} />
                )}
                <span>{item.label}</span>
              </Button>
            );
          })}
        </nav>

        {/* Theme Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleDarkMode}
            className="size-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-emerald-500/10"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
};
