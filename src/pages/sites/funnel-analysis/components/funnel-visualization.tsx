import { cn } from "@/lib/utils";
import type { FunnelStepResult } from "../../types/interfaces";

interface FunnelVisualizationProps {
  steps: FunnelStepResult[];
  totalVisitors: number;
}

export default function FunnelVisualization({ steps, totalVisitors }: FunnelVisualizationProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const widthPercent = totalVisitors > 0
          ? (step.visitors / totalVisitors) * 100
          : 0;

        const isLast = index === steps.length - 1;
        const dropOffPercent = index > 0 && steps[index - 1].visitors > 0
          ? ((steps[index - 1].visitors - step.visitors) / steps[index - 1].visitors) * 100
          : 0;

        return (
          <div key={step.step_order} className="relative">
            {/* Step label */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  {step.step_order}
                </span>
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {step.goal_name}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-mono font-medium">
                  {step.visitors.toLocaleString()}
                </span>
                <span className="text-muted-foreground">
                  {step.conversion_rate.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Funnel bar */}
            <div className="relative h-10 bg-muted rounded-md overflow-hidden">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-md transition-all duration-500",
                  isLast ? "bg-emerald-500" : "bg-primary"
                )}
                style={{ width: `${Math.max(widthPercent, 2)}%` }}
              />
              {/* Bar label */}
              <div className="absolute inset-0 flex items-center px-3">
                <span className="text-xs font-medium text-white mix-blend-difference">
                  {widthPercent.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Drop-off indicator */}
            {!isLast && dropOffPercent > 0 && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <span className="text-red-500">↓</span>
                <span>
                  -{step.drop_off.toLocaleString()} ({dropOffPercent.toFixed(1)}% drop)
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
