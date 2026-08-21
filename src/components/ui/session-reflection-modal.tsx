import React, { useState } from "react";
import { Sparkles, Copy, Check, X, ShieldCheck, Heart, ArrowRight } from "lucide-react";
import { Button } from "./button";
import { analyzeDialogue } from "@/services/api";

interface SessionReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Array<{ text: string; sender: { name: string; id: string } }>;
  counselorName?: string;
  userName?: string;
}

export function SessionReflectionModal({
  isOpen,
  onClose,
  messages,
  counselorName = "Maya / Liam",
  userName = "Friend",
}: SessionReflectionModalProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (isOpen && !analysis) {
      handleGenerate();
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const transcript = messages
        .map((m) => `${m.sender.name}: ${m.text}`)
        .join("\n\n");
      const result = await analyzeDialogue(transcript);
      setAnalysis(result);
    } catch (err) {
      console.error("Failed to generate session reflection:", err);
      setAnalysis("Unable to generate reflection at this moment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!analysis) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(analysis);
      } else {
        const ta = document.createElement("textarea");
        ta.value = analysis;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Copy to clipboard failed:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-emerald-500/30 bg-card/95 shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Conversation Reflection
              </h3>
              <p className="text-xs text-muted-foreground font-lato-light-italic">
                CBT-informed, non-clinical reflection with {counselorName}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-8 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs leading-relaxed text-foreground">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="relative flex size-10 items-center justify-center">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/30 opacity-75" />
                <Sparkles className="size-5 text-emerald-600 animate-spin" />
              </div>
              <p className="text-xs text-muted-foreground font-lato-light-italic">
                {counselorName} is preparing a supportive reflection...
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 whitespace-pre-line font-light">
              {analysis || "No dialogue analyzed yet."}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <span className="text-[11px] text-muted-foreground font-lato-light-italic">
            🌿 AI support • not therapy or emergency care
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isLoading || messages.length === 0}
              className="gap-1 rounded-xl text-xs text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="size-3.5 text-emerald-600" />
              <span>{isLoading ? "Reflecting..." : "Reflect Again"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!analysis || isLoading}
              className="gap-1.5 rounded-xl text-xs"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Copied" : "Copy Summary"}</span>
            </Button>
            <Button
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
