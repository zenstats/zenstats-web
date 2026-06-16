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
      className={cn(
        "group relative flex flex-col items-start w-full text-left px-4 py-3 transition-colors",
        "border-t-2 -mt-[1px]", // top border for active indicator, negative margin to align
        active
          ? "border-indigo-500 bg-gray-50/80 dark:bg-gray-800/50"
          : "border-transparent hover:bg-gray-50/50 dark:hover:bg-gray-800/30",
        // Subtle right divider between cards (except last handled by parent)
      )}
      onClick={onClick}
    >
      {/* Label */}
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
        {label}
      </span>

      {/* Value row */}
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {isPercent && (
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">%</span>
        )}
      </div>

      {/* Change / Comparison row */}
      <div className="flex items-center gap-1.5 mt-1">
        {hasChange && !isPercent && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-px",
              isPositive
                ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30"
                : isNegative
                  ? "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
                  : "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"
            )}
          >
            {isPositive ? <TrendingUp className="h-3 w-3" /> : isNegative ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
        {comparisonValue !== undefined && comparisonValue !== null && (
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
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
      <div className="flex flex-wrap divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-200 dark:border-gray-700">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-1 min-w-[120px] px-4 py-3">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-7 w-20 mb-1.5" />
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
  ];

  return (
    <div className="flex flex-wrap divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-200 dark:border-gray-700">
      {displayOrder.map((key) => {
        const metric: AggregateMetric | undefined = data.results[key];
        if (!metric) return null;
        const config = METRIC_CONFIG[key] || { label: key };
        const numericValue =
          typeof metric.value === "number" ? metric.value : Number(metric.value) || 0;

        return (
          <div key={key} className="flex-1 min-w-[120px]">
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
