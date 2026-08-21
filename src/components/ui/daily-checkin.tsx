import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Flame,
  CheckCircle2,
  Calendar,
  Heart,
  Trophy,
  Smile,
  Zap,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { chimeAudio } from "@/lib/chimeAudio";
import { cn } from "@/lib/utils";

interface CheckInRecord {
  dateString: string; // YYYY-MM-DD
  timestamp: number;
  gratitudeNote?: string;
  moodEmoji?: string;
}

interface CheckInState {
  streak: number;
  lastCheckInDate: string | null;
  history: CheckInRecord[];
}

const DAILY_AFFIRMATIONS = [
  "Today, I give myself full permission to pause, breathe, and reset without guilt.",
  "I choose to respond with calm curiosity rather than urgent reactivity.",
  "My peace of mind is sacred. I release what I cannot control.",
  "I am grounded in this present moment, capable of handling whatever comes step by step.",
  "I honor my boundaries and celebrate small, quiet victories today.",
  "Inhaling calm, exhaling tension. My body knows how to heal and rest.",
  "I meet my thoughts with gentleness and self-compassion.",
];

const STORAGE_KEY = "mindquark_daily_checkin_data";

export function DailyCheckInWidget({
  onCheckInCompleted,
}: {
  onCheckInCompleted?: (streak: number) => void;
}) {
  const [data, setData] = useState<CheckInState>({
    streak: 0,
    lastCheckInDate: null,
    history: [],
  });

  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [gratitudeInput, setGratitudeInput] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [dailyAffirmation, setDailyAffirmation] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: CheckInState = JSON.parse(stored);
        setData(parsed);
        setHasCheckedInToday(parsed.lastCheckInDate === todayStr);
      }
    } catch (e) {
      console.warn("Failed to read check-in storage:", e);
    }

    // Pick deterministic daily affirmation based on day of year
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    setDailyAffirmation(
      DAILY_AFFIRMATIONS[dayOfYear % DAILY_AFFIRMATIONS.length]
    );
  }, [todayStr]);

  // Compute 7-day rolling days
  const recentSevenDays = React.useMemo(() => {
    const days = [];
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      const isToday = iso === todayStr;
      const isChecked = data.history.some((h) => h.dateString === iso);
      const dayOfWeek = dayLabels[d.getDay()];

      days.push({
        dateStr: iso,
        label: isToday ? "Today" : dayOfWeek,
        dayNum: d.getDate(),
        isToday,
        isChecked,
      });
    }
    return days;
  }, [data.history, todayStr]);

  // Handle Check-In Action
  const handleCheckIn = () => {
    if (hasCheckedInToday) return;

    // Play therapeutic bowl sound
    chimeAudio.playPhaseChime("complete");

    // Calculate streak
    let newStreak = 1;
    if (data.lastCheckInDate) {
      const last = new Date(data.lastCheckInDate);
      const current = new Date(todayStr);
      const diffTime = current.getTime() - last.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      if (diffDays === 1) {
        newStreak = data.streak + 1;
      } else if (diffDays === 0) {
        newStreak = data.streak;
      } else {
        newStreak = 1;
      }
    }

    const newRecord: CheckInRecord = {
      dateString: todayStr,
      timestamp: Date.now(),
      gratitudeNote: gratitudeInput.trim() || undefined,
    };

    const nextState: CheckInState = {
      streak: newStreak,
      lastCheckInDate: todayStr,
      history: [...data.history.filter((h) => h.dateString !== todayStr), newRecord],
    };

    setData(nextState);
    setHasCheckedInToday(true);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3500);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch (e) {
      console.warn("Failed to persist check-in:", e);
    }

    if (onCheckInCompleted) {
      onCheckInCompleted(newStreak);
    }
  };

  return (
    <Card className="rounded-3xl border border-emerald-500/20 bg-card/85 dark:bg-card/70 backdrop-blur-xl shadow-lg shadow-emerald-500/5 overflow-hidden transition-all">
      <CardHeader className="p-5 sm:p-6 pb-4 flex flex-row items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-xs">
            <Flame className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-foreground">
                Daily Sanctuary Streak
              </CardTitle>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                <Trophy className="size-3" />
                <span>{data.streak > 0 ? `${data.streak}-Day Streak` : "Start Streak"}</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-lato-light-italic">
              Build daily mindful resilience, one day at a time
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-xs font-mono font-medium text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-5">
        {/* 7-Day Rolling Calendar Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/80">Weekly Consistency</span>
            <span>
              {recentSevenDays.filter((d) => d.isChecked).length} / 7 Days Active
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1">
            {recentSevenDays.map((day) => (
              <div
                key={day.dateStr}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all text-center select-none",
                  day.isChecked
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-xs"
                    : day.isToday
                    ? "bg-muted/60 border-primary/40 text-foreground ring-1 ring-primary/30"
                    : "bg-muted/20 border-border/50 text-muted-foreground opacity-60"
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  {day.label}
                </span>
                <span className="text-sm font-bold my-0.5">
                  {day.isChecked ? (
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  ) : (
                    day.dayNum
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Affirmation Callout */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 text-xs flex items-start gap-2.5">
          <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Daily Mindful Intention
            </div>
            <p className="text-foreground/90 font-light italic leading-relaxed">
              "{dailyAffirmation}"
            </p>
          </div>
        </div>

        {/* Check-In Input & Action */}
        {!hasCheckedInToday ? (
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80 flex items-center justify-between">
                <span>One small moment or thing you appreciate today (Optional):</span>
                <span className="text-[10px] text-muted-foreground">Gratitude Log</span>
              </label>
              <input
                type="text"
                value={gratitudeInput}
                onChange={(e) => setGratitudeInput(e.target.value)}
                placeholder="e.g., A warm cup of tea, morning sunlight, finishing a tough task..."
                className="w-full rounded-xl border border-input bg-background/80 px-3.5 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
              />
            </div>

            <Button
              onClick={handleCheckIn}
              className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 gap-2 transition-all hover:scale-101 active:scale-99"
            >
              <CheckCircle2 className="size-4" />
              <span>Complete Daily Check-In & Claim Streak</span>
            </Button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <CheckCircle2 className="size-4.5" />
              </div>
              <div>
                <div className="font-bold text-emerald-800 dark:text-emerald-200">
                  Checked in for today! ✨
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-lato-light-italic">
                  {data.streak} day{data.streak > 1 ? "s" : ""} mindful streak active. Keep nurturing your inner sanctuary!
                </div>
              </div>
            </div>

            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-background/60 px-3 py-1 rounded-full border border-emerald-500/20">
              Completed
            </span>
          </div>
        )}

        {/* Celebration Toast Modal or Micro Banner */}
        {showCelebration && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-center text-xs font-bold shadow-lg shadow-emerald-600/30 animate-in zoom-in-95 duration-200">
            🎉 Awesome! Your daily mindful streak is now {data.streak} day{data.streak > 1 ? "s" : ""}!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
