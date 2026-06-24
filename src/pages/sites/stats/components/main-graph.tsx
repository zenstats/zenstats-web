import { useCallback, useEffect, useMemo, useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { BaseResponse } from "@utils/axios";
import type { StatsRequest, MainGraphPoint, Interval } from "@/pages/sites/types/interfaces";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MainGraphProps {
  query: StatsRequest;
  activeMetric: string;
  onMetricChange: (metric: string) => void;
  api: (dateRange: StatsRequest) => Promise<BaseResponse<MainGraphPoint[]>>;
}

export default function MainGraph({ query, activeMetric, onMetricChange, api }: MainGraphProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MainGraphPoint[]>([]);
  const [intervalDropdownOpen, setIntervalDropdownOpen] = useState(false);

  const METRIC_OPTIONS = useMemo(() => [
    { key: "visitors", label: t('stats.graph.visitors') },
    { key: "pageviews", label: t('stats.graph.pageviews') },
  ] as const, [t]);

  const INTERVAL_OPTIONS = useMemo(() => [
    { key: "minute", label: t('stats.graph.intervalByMinute') },
    { key: "hourly", label: t('stats.graph.intervalByHour') },
    { key: "daily", label: t('stats.graph.intervalByDay') },
    { key: "weekly", label: t('stats.graph.intervalByWeek') },
    { key: "monthly", label: t('stats.graph.intervalByMonth') },
  ] as const, [t]);

  // Determine active metric (default visitors) — from local state, not query
  const currentMetric = activeMetric || "visitors";
  // Determine active interval (default based on period)
  const activeInterval = query.interval || (query.period === "realtime" ? "minute" : query.period === "day" ? "hourly" : "daily");
  const [localInterval, setLocalInterval] = useState<Interval>(activeInterval);

  // Sync local interval from query
  useEffect(() => {
    setLocalInterval(activeInterval);
  }, [activeInterval]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const request: StatsRequest = { ...query, interval: localInterval, metrics: currentMetric };
      const result = await api(request);
      if (result.data) {
        setData(result.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [api, query, localInterval, currentMetric]);

  useEffect(() => {
    if (query.refresh !== undefined) {
      fetchData();
    }
  }, [fetchData, query.refresh]);

  // Also refetch when local interval or metric changes
  useEffect(() => {
    fetchData();
  }, [localInterval, currentMetric]);

  // Transform data for recharts: [{timestamp, metrics: {visitors, pageviews}}] → [{time, value, compareValue}]
  const compKey = `${currentMetric}_comparison`;
  const hasComparison = data.length > 0 && data[0].metrics && (compKey in data[0].metrics);
  const chartData = data.map((point) => ({
    time: point.timestamp,
    value: (point.metrics && point.metrics[currentMetric]) ?? 0,
    compareValue: hasComparison ? ((point.metrics && point.metrics[compKey]) ?? 0) : undefined,
  }));

  // Calculate totals
  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const compareTotal = hasComparison
    ? chartData.reduce((sum, d) => sum + (d.compareValue ?? 0), 0)
    : undefined;

  // Filter interval options based on period - realtime only shows minute
  const availableIntervals = query.period === "realtime"
    ? INTERVAL_OPTIONS.filter((i) => i.key === "minute")
    : INTERVAL_OPTIONS.filter((i) => i.key !== "minute");

  const handleIntervalChange = (interval: Interval) => {
    setLocalInterval(interval);
    setIntervalDropdownOpen(false);
  };

  const metricLabel =
    currentMetric === "visitors" ? t('stats.graph.visitors') :
    currentMetric === "pageviews" ? t('stats.graph.pageviews') :
    currentMetric === "visits" ? t('stats.graph.visits') :
    currentMetric === "events" ? t('stats.graph.events') :
    currentMetric === "bounce_rate" ? t('stats.graph.bounceRate') :
    currentMetric === "visit_duration" ? t('stats.graph.visitDuration') :
    currentMetric === "views_per_visit" ? t('stats.graph.viewsPerVisit') :
    currentMetric;

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; name?: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    const mainVal = payload.find((p) => p.name === "value")?.value;
    const compVal = payload.find((p) => p.name === "compareValue")?.value;
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {mainVal?.toLocaleString()}{" "}
          {metricLabel}
        </p>
        {compVal !== undefined && (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-0.5">
            {t('stats.compare.label')}: {compVal.toLocaleString()}
          </p>
        )}
      </div>
    );
  };

  const intervalLabel = INTERVAL_OPTIONS.find((i) => i.key === localInterval)?.label || t('stats.graph.intervalByDay');

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-1">
          {METRIC_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                currentMetric === opt.key
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              )}
              onClick={() => onMetricChange(opt.key)}
            >
              {opt.label}
            </button>
          ))}

          {/* Interval selector */}
          <DropdownMenu open={intervalDropdownOpen} onOpenChange={setIntervalDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ml-1">
                {intervalLabel}
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-28" align="start">
              {availableIntervals.map((opt) => (
                <DropdownMenuItem
                  key={opt.key}
                  onClick={() => handleIntervalChange(opt.key)}
                  className={cn(localInterval === opt.key && "bg-gray-50 dark:bg-gray-800")}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          <span>{total.toLocaleString()}</span>
          {hasComparison && (
            <span className="text-amber-600 dark:text-amber-400 ml-2">
              vs {compareTotal?.toLocaleString()}
            </span>
          )}
          <span className="font-normal text-gray-500 ml-1">
            {currentMetric === "visitors" ? t('stats.graph.visitors') : t('stats.graph.pageviews')}
          </span>
        </div>
      </div>

      {/* Graph */}
      <div className="px-2 pb-3">
        {loading ? (
          <Skeleton className="h-[300px] w-full rounded-md" />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="graphGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  {hasComparison && (
                    <linearGradient id="compareGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  )}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                  className="dark:stroke-gray-800"
                />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                  tickFormatter={(value: number) =>
                    value >= 1000
                      ? `${(value / 1000).toFixed(0)}k`
                      : value.toString()
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#graphGradient)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: "#6366f1",
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                />
                {hasComparison && (
                  <Area
                    type="monotone"
                    dataKey="compareValue"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    fillOpacity={1}
                    fill="url(#compareGradient)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "#f59e0b",
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}