"use client";

import { cn } from "@multica/ui/lib/utils";
import { CheckCircle2, XCircle, Circle, Loader2 } from "lucide-react";

export type StepStatus = "pending" | "in-progress" | "completed" | "failed";

export interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  status: StepStatus;
}

export interface ProgressTrackerChoice {
  outcome: "success" | "partial" | "failed" | "cancelled";
  summary: string;
  at: string;
  identifiers?: Record<string, string>;
}

export interface ProgressTrackerProps {
  id: string;
  steps: ProgressStep[];
  elapsedTime?: number;
  choice?: ProgressTrackerChoice;
}

function formatElapsed(ms: number): string {
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

const OUTCOME = {
  success: { label: "Complete", cls: "bg-green-50 text-green-700 border-green-200" },
  partial: { label: "Partial", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  failed: { label: "Failed", cls: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground border-border" },
} satisfies Record<ProgressTrackerChoice["outcome"], { label: string; cls: string }>;

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-500" />;
    case "failed":
      return <XCircle className="w-4 h-4 flex-shrink-0 text-destructive" />;
    case "in-progress":
      return <Loader2 className="w-4 h-4 flex-shrink-0 text-primary animate-spin motion-reduce:animate-none" />;
    default:
      return <Circle className="w-4 h-4 flex-shrink-0 text-muted-foreground/30" />;
  }
}

export function ProgressTracker({ id, steps, elapsedTime, choice }: ProgressTrackerProps) {
  const isActive = !choice && steps.some((s) => s.status === "in-progress");

  // First in-progress → first failed → first pending
  const currentId =
    steps.find((s) => s.status === "in-progress")?.id ??
    steps.find((s) => s.status === "failed")?.id ??
    steps.find((s) => s.status === "pending")?.id;

  const outcomeData = choice ? OUTCOME[choice.outcome] : null;

  return (
    <article
      id={id}
      role="status"
      aria-live="polite"
      aria-busy={isActive}
      className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden"
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex items-center gap-2 min-w-0">
          {isActive && (
            <Loader2 className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground animate-spin motion-reduce:animate-none" />
          )}
          <span className="text-sm font-medium truncate">
            {choice ? "Upload complete" : "Uploading…"}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {elapsedTime !== undefined && elapsedTime > 0 && (
            <time
              dateTime={`PT${(elapsedTime / 1000).toFixed(1)}S`}
              className="text-xs text-muted-foreground tabular-nums bg-muted px-1.5 py-0.5 rounded-sm"
            >
              {formatElapsed(elapsedTime)}
            </time>
          )}
          {outcomeData && (
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded border", outcomeData.cls)}>
              {outcomeData.label}
            </span>
          )}
        </div>
      </div>

      {/* Step list */}
      <ol className="px-3 py-2 space-y-0.5" aria-label="Upload progress steps">
        {steps.map((step) => {
          const isCurrent = !choice && step.id === currentId;
          return (
            <li
              key={step.id}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex items-start gap-2.5 rounded-md px-2 py-1.5 select-none transition-colors duration-150",
                isCurrent ? "bg-muted/60" : "bg-transparent"
              )}
            >
              <div className="mt-0.5">
                <StepIcon status={step.status} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm leading-snug",
                    step.status === "completed" && !choice && "text-muted-foreground",
                    step.status === "pending" && "text-muted-foreground",
                    step.status === "failed" && "text-destructive font-medium"
                  )}
                >
                  {step.label}
                </p>
                {/* Description: always in receipt, only for active/failed in live mode */}
                {step.description && (isCurrent || !!choice || step.status === "failed") && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </article>
  );
}
