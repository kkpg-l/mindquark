import React, { useState } from "react";
import { Sparkles, X, BrainCircuit, Check, Copy } from "lucide-react";
import { Button } from "./button";
import { requestCbtReframe } from "@/services/api";

interface CbtReframeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialThought: string;
}

export function CbtReframeModal({
  isOpen,
  onClose,
  initialThought,
}: CbtReframeModalProps) {
  const [thought, setThought] = useState(initialThought);
  const [distortionType, setDistortionType] = useState("all-or-nothing");
  const [reframeResult, setReframeResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (isOpen && initialThought) {
      setThought(initialThought);
      handleReframe(initialThought, distortionType);
    }
  }, [isOpen, initialThought]);

  const handleReframe = async (targetThought = thought, distortion = distortionType) => {
    if (!targetThought.trim()) return;
    setIsLoading(true);
    try {
      const result = await requestCbtReframe(targetThought, distortion);
      setReframeResult(result);
    } catch (err) {
      console.error("Reframe error:", err);
      setReframeResult("Unable to formulate reframe at this moment. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!reframeResult) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(reframeResult);
      } else {
        const ta = document.createElement("textarea");
        ta.value = reframeResult;
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
      <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-3xl border border-emerald-500/30 bg-card/95 shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <BrainCircuit className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                CBT-Informed Reflection Studio
              </h3>
              <p className="text-xs text-muted-foreground font-lato-light-italic">
                Explore automatic thoughts with a balanced, non-clinical perspective
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

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Automatic Negative Thought:
            </label>
            <textarea
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-input bg-card p-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
              placeholder="e.g. I made a mistake today, so I must be an absolute failure..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Suspected Cognitive Distortion:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "all-or-nothing", label: "All-or-Nothing Thinking" },
                { id: "catastrophizing", label: "Catastrophizing" },
                { id: "overgeneralization", label: "Overgeneralization" },
                { id: "mind-reading", label: "Mind-Reading" },
                { id: "self-blame", label: "Self-Blame & Personalization" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setDistortionType(item.id);
                    handleReframe(thought, item.id);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border transition-all ${
                    distortionType === item.id
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Result */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Balanced Reflection:
            </label>
            {isLoading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                <Sparkles className="size-4 animate-spin text-emerald-600" />
                <span>              Formulating a supportive reflection...</span>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 text-foreground whitespace-pre-line leading-relaxed font-light">
                {reframeResult || "Click Reframe to generate"}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!reframeResult || isLoading}
            className="gap-1.5 rounded-xl text-xs"
          >
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            <span>{copied ? "Copied" : "Copy Reframe"}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReframe()}
              disabled={isLoading || !thought.trim()}
              className="rounded-xl text-xs"
            >
              Reflect Again
            </Button>
            <Button
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Apply & Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
