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
  const defaultIntervalForPeriod = useCallback((p?: string): Interval => {
    if (p === "realtime") return "minute";
    if (p === "day" || p === "yesterday") return "hourly";
    if (p === "6mo" || p === "12mo" || p === "year") return "monthly";
    return "daily";
  }, []);

  // 按周期过滤颗粒度选项：
  // - realtime 只有按分钟；
  // - 长周期（6mo/12mo/year，或 custom 跨度 > 45 天）隐藏按小时——桶数过多，
  //   后端也会以 maxTimeSeriesBuckets 拒绝此类组合。
  const customSpanDays = useMemo(() => {
    if (query.period !== "custom" || !query.from || !query.to) return 0;
    const ms = new Date(query.to).getTime() - new Date(query.from).getTime();
    return Number.isFinite(ms) ? ms / 86_400_000 : 0;
  }, [query.period, query.from, query.to]);

  const hourlyTooCoarse =
    ["6mo", "12mo", "year"].includes(query.period) || customSpanDays > 45;

  const availableIntervals = useMemo(() => {
    if (query.period === "realtime") {
      return INTERVAL_OPTIONS.filter((i) => i.key === "minute");
    }
    return INTERVAL_OPTIONS.filter(
      (i) => i.key !== "minute" && !(hourlyTooCoarse && i.key === "hourly")
    );
  }, [query.period, hourlyTooCoarse, INTERVAL_OPTIONS]);

  const defaultInterval = defaultIntervalForPeriod(query.period);

  const [localInterval, setLocalInterval] = useState<Interval>(
    query.interval || defaultInterval
  );

  // 严格推导当前周期与范围下合法有效的 interval，杜绝切换实时/时间时携带非法或滞后 interval 发起请求
  const effectiveInterval: Interval = useMemo(() => {
    if (query.interval && availableIntervals.some((i) => i.key === query.interval)) {
      return query.interval;
    }
    if (localInterval && availableIntervals.some((i) => i.key === localInterval)) {
      return localInterval;
    }
    return defaultInterval;
  }, [query.interval, availableIntervals, localInterval, defaultInterval]);

  // 同步 localInterval 状态
  useEffect(() => {
    if (localInterval !== effectiveInterval) {
      setLocalInterval(effectiveInterval);
    }
  }, [effectiveInterval, localInterval]);

  // 获取时序数据，增加取消保护防止快速切换周期导致的异步乱序覆盖
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    const request: StatsRequest = {
      ...query,
      interval: effectiveInterval,
      metrics: currentMetric,
    };

    api(request)
      .then((result) => {
        if (!isCancelled && result?.data) {
          setData(result.data);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error("Failed to fetch main-graph data:", error);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [api, query, effectiveInterval, currentMetric]);

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
      <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl shadow-xl px-3.5 py-2.5">
        <p className="text-[11px] font-medium text-muted-foreground mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
          <p className="text-sm font-bold text-foreground tabular-nums">
            {mainVal?.toLocaleString()}{" "}
            <span className="font-normal text-xs text-muted-foreground">{metricLabel}</span>
          </p>
        </div>
        {compVal !== undefined && (
          <div className="flex items-center gap-2 mt-1">
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 tabular-nums">
              {t('stats.compare.label')}: {compVal.toLocaleString()}
            </p>
          </div>
        )}
      </div>
    );
  };

  const intervalLabel =
    INTERVAL_OPTIONS.find((i) => i.key === effectiveInterval)?.label ||
    t("stats.graph.intervalByDay");

  return (
    <div className="bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg bg-muted/60 border border-border/50 p-0.5">
            {METRIC_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                  currentMetric === opt.key
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => onMetricChange(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Interval selector */}
          <DropdownMenu open={intervalDropdownOpen} onOpenChange={setIntervalDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg border border-transparent hover:border-border/60 hover:bg-muted/40 transition-colors"
              >
                {intervalLabel}
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-32 rounded-xl" align="start">
              {availableIntervals.map((opt) => (
                <DropdownMenuItem
                  key={opt.key}
                  onClick={() => handleIntervalChange(opt.key)}
                  className={cn("text-xs", effectiveInterval === opt.key && "bg-accent text-accent-foreground font-medium")}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="text-xs sm:text-sm font-semibold text-foreground tabular-nums">
          <span>{total.toLocaleString()}</span>
          {hasComparison && (
            <span className="text-amber-600 dark:text-amber-400 ml-2">
              vs {compareTotal?.toLocaleString()}
            </span>
          )}
          <span className="font-normal text-muted-foreground ml-1">
            {currentMetric === "visitors" ? t('stats.graph.visitors') : t('stats.graph.pageviews')}
          </span>
        </div>
      </div>

      {/* Graph */}
      <div className="px-3 pb-4">
        {loading ? (
          <Skeleton className="h-[300px] w-full rounded-xl" />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="graphGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  {hasComparison && (
                    <linearGradient id="compareGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  )}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                  tickFormatter={(value: number) =>
                    value >= 1000
                      ? `${(value / 1000).toFixed(0)}k`
                      : value.toString()
                  }
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={2.2}
                  fillOpacity={1}
                  fill="url(#graphGradient)"
                  dot={false}
                  activeDot={{
                    r: 4.5,
                    fill: "#6366f1",
                    stroke: "var(--card)",
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
                      stroke: "var(--card)",
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