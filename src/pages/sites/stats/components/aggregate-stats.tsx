import { useCallback, useEffect, useMemo, useState } from "react";
import type { BaseResponse } from "@utils/axios";
import type {
  StatsRequest,
  AggregateResponse,
  AggregateMetric,
} from "@/pages/sites/types/interfaces";
import { Skeleton } from "@components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface AggregateStatsProps {
  query: StatsRequest;
  activeMetric: string;
  onMetricChange: (metric: string) => void;
  api: (dateRange: StatsRequest) => Promise<BaseResponse<AggregateResponse>>;
}

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number | null;
  comparisonValue?: number | null;
  isPercent?: boolean;
  onClick?: () => void;
  active?: boolean;
}

function StatCard({ label, value, change, comparisonValue, isPercent, onClick, active }: StatCardProps) {
  const isPositive = (change ?? 0) > 0;
  const isNegative = (change ?? 0) < 0;
  const hasChange = change !== undefined && change !== null;

  return (
    <button
      type="button"
      className={cn(
        "group relative flex flex-col items-start w-full h-full text-left px-4 py-3.5 transition-all",
        active
          ? "bg-primary/[0.04] dark:bg-primary/[0.09]"
          : "hover:bg-muted/45 dark:hover:bg-muted/25",
      )}
      onClick={onClick}
    >
      {/* Active top indicator bar */}
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-[2.5px] transition-opacity",
          active ? "bg-primary opacity-100" : "bg-primary/40 opacity-0 group-hover:opacity-50"
        )}
      />

      {/* Label */}
      <span
        className={cn(
          "text-[11px] font-medium tracking-wide mb-1.5 transition-colors",
          active ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground/80"
        )}
      >
        {label}
      </span>

      {/* Value row */}
      <div className="flex items-baseline gap-1 flex-wrap">
        <span className="text-2xl font-bold text-foreground tracking-tight tabular-nums leading-none">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {isPercent && (
          <span className="text-xs font-medium text-muted-foreground">%</span>
        )}
      </div>

      {/* Change / Comparison row */}
      <div className="flex items-center gap-1.5 mt-2 min-h-[18px]">
        {hasChange && !isPercent && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold rounded-full px-1.5 py-0.5 tabular-nums",
              isPositive
                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                : isNegative
                  ? "text-rose-700 dark:text-rose-400 bg-rose-500/10"
                  : "text-muted-foreground bg-muted"
            )}
          >
            {isPositive ? <TrendingUp className="h-3 w-3" /> : isNegative ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
        {comparisonValue !== undefined && comparisonValue !== null && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            vs {typeof comparisonValue === "number" ? comparisonValue.toLocaleString() : comparisonValue}
          </span>
        )}
      </div>
    </button>
  );
}

// Metric display helpers

function formatMetricValue(key: string, value: number): string {
  if (key === "visit_duration") {
    const minutes = Math.floor(value / 60);
    const seconds = Math.round(value % 60);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  }
  if (key === "bounce_rate") {
    return value.toFixed(1);
  }
  if (key === "views_per_visit") {
    return value.toFixed(2);
  }
  if (key === "time_on_page") {
    const minutes = Math.floor(value / 60);
    const seconds = Math.round(value % 60);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  }
  if (key === "scroll_depth") {
    return value.toFixed(1);
  }
  if (key === "exit_rate") {
    return value.toFixed(1);
  }
  return value.toLocaleString();
}

export default function AggregateStats({
  query,
  activeMetric,
  onMetricChange,
  api,
}: AggregateStatsProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AggregateResponse | null>(null);

  const METRIC_CONFIG: Record<string, { label: string; isPercent?: boolean }> = useMemo(() => ({
    visitors: { label: t('stats.metrics.visitors') },
    pageviews: { label: t('stats.metrics.pageviews') },
    bounce_rate: { label: t('stats.metrics.bounceRate'), isPercent: true },
    visit_duration: { label: t('stats.metrics.visitDuration') },
    views_per_visit: { label: t('stats.metrics.viewsPerVisit') },
    events: { label: t('stats.metrics.events') },
    time_on_page: { label: t('stats.metrics.timeOnPage') },
    scroll_depth: { label: t('stats.metrics.scrollDepth'), isPercent: true },
    exit_rate: { label: t('stats.metrics.exitRate'), isPercent: true },
  }), [t]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api(query);
      if (result.data) {
        setData(result.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [api, query]);

  useEffect(() => {
    if (query.refresh !== undefined) {
      fetchData();
    }
  }, [fetchData, query.refresh]);

  if (loading) {
    return (
      <div className="flex flex-wrap divide-x divide-border/60 border-b border-border/70 bg-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-1 min-w-[130px] px-4 py-3.5">
            <Skeleton className="h-3 w-16 mb-2.5" />
            <Skeleton className="h-7 w-20 mb-2" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (!data?.results) return null;

  const displayOrder = [
    "visitors",
    "pageviews",
    "bounce_rate",
    "visit_duration",
    "views_per_visit",
    "time_on_page",
    "scroll_depth",
    "exit_rate",
  ];

  return (
    <div className="flex flex-wrap divide-x divide-border/60 border-b border-border/70 bg-card">
      {displayOrder.map((key) => {
        const metric: AggregateMetric | undefined = data.results[key];
        if (!metric) return null;
        const config = METRIC_CONFIG[key] || { label: key };
        const numericValue =
          typeof metric.value === "number" ? metric.value : Number(metric.value) || 0;

        return (
          <div key={key} className="flex-1 min-w-[130px]">
            <StatCard
              label={config.label}
              value={formatMetricValue(key, numericValue)}
              change={metric.change}
              comparisonValue={metric.comparison_value}
              isPercent={config.isPercent}
              active={activeMetric === key}
              onClick={() => onMetricChange(key)}
            />
          </div>
        );
      })}
    </div>
  );
}
