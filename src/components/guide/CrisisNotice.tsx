import React from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CrisisNotice: React.FC<{ text: string; onDismiss?: () => void }> = ({
  text,
  onDismiss,
}) => (
  <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 space-y-2">
    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-300 text-sm font-semibold">
      <ShieldAlert className="size-4" />
      <span>Your safety comes first</span>
    </div>
    <p className="text-xs text-foreground/80 leading-relaxed">{text}</p>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
      <a
        href="https://988lifeline.org/"
        target="_blank"
        rel="noreferrer"
        className="text-rose-600 dark:text-rose-300 underline underline-offset-2"
      >
        988 Lifeline (US/Canada)
      </a>
      <a
        href="https://findahelpline.com/"
        target="_blank"
        rel="noreferrer"
        className="text-rose-600 dark:text-rose-300 underline underline-offset-2"
      >
        Find a helpline (worldwide)
      </a>
    </div>
    {onDismiss && (
      <Button
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="text-muted-foreground hover:text-foreground text-xs h-7 px-2 -ml-1"
      >
        Dismiss and keep editing
      </Button>
    )}
  </div>
);
