import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "./button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[300px] w-full flex-col items-center justify-center p-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-4">
            <ShieldAlert className="size-8" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {this.props.fallbackTitle || "An unexpected view error occurred"}
          </h3>
          <p className="max-w-md text-xs text-muted-foreground mb-4">
            {this.state.error?.message || "MindQuark encountered a temporary render issue. Your conversation and data are safe."}
          </p>
          <Button
            onClick={this.handleReset}
            className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <RefreshCw className="size-4" />
            <span>Recover View</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
