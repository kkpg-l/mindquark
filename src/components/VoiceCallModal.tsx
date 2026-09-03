import React, { useState, useRef, useEffect } from "react";
import { Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type VoiceCallPhase = "form" | "creating" | "calling";

export interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  counselorName: string;
  callPhase: VoiceCallPhase;
  callPhone: string;
  onPhoneChange: (value: string) => void;
  callConsent: boolean;
  onConsentChange: (value: boolean) => void;
  callError: string | null;
  callStatusText: string | null;
  onStartCall: () => void;
}

const CLOSING_DELAY_MS = 150;

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  isOpen,
  onClose,
  counselorName,
  callPhase,
  callPhone,
  onPhoneChange,
  callConsent,
  onConsentChange,
  callError,
  callStatusText,
  onStartCall,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timer if modal closes unexpectedly or reopens while closing
  useEffect(() => {
    return () => {
      if (closingTimerRef.current !== null) {
        clearTimeout(closingTimerRef.current);
      }
    };
  }, []);

  const startClosing = () => {
    if (isClosing) return;
    setIsClosing(true);
    if (closingTimerRef.current !== null) {
      clearTimeout(closingTimerRef.current);
    }
    // Fallback: if onAnimationEnd never fires, force-close after animation + margin
    closingTimerRef.current = setTimeout(() => {
      closingTimerRef.current = null;
      setIsClosing(false);
      onClose();
    }, CLOSING_DELAY_MS + 50);
  };

  const handleExitAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (!event.animationName.includes("exit")) return;
    if (closingTimerRef.current !== null) {
      clearTimeout(closingTimerRef.current);
      closingTimerRef.current = null;
    }
    setIsClosing(false);
    onClose();
  };

  if (!isOpen && !isClosing) {
    return null;
  }

  return (
    <div
      aria-label="Call Me dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/45 ${isClosing ? "animate-out fade-out duration-150" : ""}`}
      role="dialog"
    >
      <div
        className={`w-full max-w-sm rounded-2xl border border-emerald-500/30 bg-[#f8fbf9] p-5 shadow-2xl dark:bg-[#04120f] ${isClosing ? "animate-out fade-out zoom-out-95 duration-150" : "animate-in fade-in-50 zoom-in-95 duration-200"}`}
        onAnimationEnd={handleExitAnimationEnd}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950 dark:text-emerald-50">
            <Phone className="size-4 text-emerald-600" />
            <span>Call Me · {counselorName}</span>
          </div>
          <button
            aria-label="Close call dialog"
            className="rounded-lg p-1 text-emerald-950/50 transition-colors hover:text-emerald-950 dark:text-emerald-50/50 dark:hover:text-emerald-50 cursor-pointer"
            onClick={startClosing}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        {callPhase === "calling" ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/15 ring-4 ring-emerald-500/10">
              <Phone className="size-6 animate-pulse text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-1">
              <p
                aria-live="polite"
                className="text-sm font-semibold text-emerald-950 dark:text-emerald-50"
              >
                {callStatusText || "Dialing in progress..."}
              </p>
              <p className="text-xs text-emerald-900/70 dark:text-emerald-100/70 leading-relaxed">
                Your phone will ring shortly. You can minimize this window and continue chatting here.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={startClosing}
              className="rounded-xl border-emerald-500/30 text-xs px-4 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/10 cursor-pointer"
            >
              Keep Chatting (Minimize)
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-emerald-900/70 dark:text-emerald-100/70">
              {counselorName} will call you for a gentle, supportive check-in (about 5–10
              minutes). This is an AI companion call — not a medical or emergency service. Your
              number is used only to place this call and is never stored.
            </p>
            <div className="space-y-1">
              <input
                className="w-full rounded-xl border border-emerald-500/30 bg-white px-3 py-2 text-sm text-emerald-950 placeholder:text-emerald-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-50 dark:placeholder:text-emerald-50/40"
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="+1 212 555 0123"
                type="tel"
                value={callPhone}
              />
              <p className="text-[10px] text-emerald-900/50 dark:text-emerald-100/50 px-1">
                Format: +[country code][number], e.g. +1 212 555 0123 or +86 138 0000 0000
              </p>
            </div>
            <label className="flex cursor-pointer items-start gap-2 text-xs text-emerald-900/70 dark:text-emerald-100/70">
              <input
                checked={callConsent}
                className="mt-0.5 accent-emerald-600 cursor-pointer"
                onChange={(e) => onConsentChange(e.target.checked)}
                type="checkbox"
              />
              <span>
                I consent to receive an AI voice call at this number. In crisis, call or text
                988 (US/Canada).
              </span>
            </label>
            {callError && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{callError}</p>}
            <Button
              className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
              disabled={callPhase === "creating"}
              onClick={onStartCall}
              type="button"
            >
              {callPhase === "creating" ? "Scheduling your call..." : "Call me now 📞"}
            </Button>
          </div>
        )}
      </div>

    </div>
  );
};
