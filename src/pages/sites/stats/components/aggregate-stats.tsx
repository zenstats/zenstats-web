import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { BaseResponse } from "@utils/axios";
import type {
  StatsRequest,
  AggregateResponse,
  AggregateMetric,
} from "@/pages/sites/types/interfaces";
import { Skeleton } from "@components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface AggregateStatsProps {
  query: StatsRequest;
  setQuery: Dispatch<SetStateAction<StatsRequest>>;
  api: (dateRange: StatsRequest) => Promise<BaseResponse<AggregateResponse>>;
}

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number | null;
  isPercent?: boolean;
  onClick?: () => void;
  active?: boolean;
}

function StatCard({ label, value, change, isPercent, onClick, active }: StatCardProps) {
  const isPositive = (change ?? 0) > 0;
  const isNegative = (change ?? 0) < 0;

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-1 p-3 rounded-lg transition-colors cursor-pointer",
        "hover:bg-gray-50 dark:hover:bg-gray-800/50",
        active && "bg-gray-50 dark:bg-gray-800/50"
      )}
      onClick={onClick}
    >
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {change !== undefined && change !== null && (
          <span
            className={cn(
              "text-xs font-medium",
              isPercent
                ? ""
                : isPositive
                  ? "text-green-600 dark:text-green-400"
                  : isNegative
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-400"
            )}
          >
            {isPercent
              ? `${value}`
              : `${isPositive ? "+" : ""}${change?.toFixed(1)}%`}
          </span>
        )}
      </div>
      {/* bottom border indicator */}
      <div
        className={cn(
          "absolute bottom-0 left-3 right-3 h-0.5 rounded-full transition-colors",
          active
            ? "bg-indigo-500"
            : "bg-transparent group-hover:bg-gray-200 dark:group-hover:bg-gray-700"
        )}
      />
    </div>
  );
}

// Metric display config

function formatMetricValue(key: string, value: number): string {
  if (key === "visit_duration") {
    // Format seconds to M S
    const minutes = Math.floor(value / 60);
    const seconds = Math.round(value % 60);
    return minutes > 0 ? `${minutes}M ${seconds}S` : `${seconds}S`;
  }
  if (key === "bounce_rate") {
    return `${value.toFixed(1)}%`;
  }
  if (key === "views_per_visit") {
    return value.toFixed(2);
  }
  return value.toLocaleString();
}

export default function AggregateStats({
  query,
  setQuery,
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-3">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-6 w-24 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (!data?.results) return null;

  // Display metrics in order
  const displayOrder = [
    "visitors",
    "pageviews",
    "bounce_rate",
    "visit_duration",
    "views_per_visit",
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
      {displayOrder.map((key) => {
        const metric: AggregateMetric | undefined = data.results[key];
        if (!metric) return null;
        const config = METRIC_CONFIG[key] || { label: key };
        const numericValue =
          typeof metric.value === "number" ? metric.value : Number(metric.value) || 0;

        return (
          <StatCard
            key={key}
            label={config.label}
            value={formatMetricValue(key, numericValue)}
            change={metric.change}
            isPercent={config.isPercent}
            active={query.metrics === key}
            onClick={() => setQuery((prev) => ({ ...prev, metrics: key }))}
          />
        );
      })}
    </div>
  );
}