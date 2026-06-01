import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
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
import type { StatsRequest, MainGraphPoint } from "@/pages/sites/types/interfaces";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface MainGraphProps {
  query: StatsRequest;
  setQuery: Dispatch<SetStateAction<StatsRequest>>;
  api: (dateRange: StatsRequest) => Promise<BaseResponse<MainGraphPoint[]>>;
}

// Metric selector tabs like Plausible
const METRIC_OPTIONS = [
  { key: "visitors", label: "访客" },
  { key: "pageviews", label: "浏览量" },
] as const;

// Interval options
const INTERVAL_OPTIONS = [
  { key: "hourly", label: "按小时" },
  { key: "daily", label: "按天" },
  { key: "weekly", label: "按周" },
  { key: "monthly", label: "按月" },
] as const;

export default function MainGraph({ query, setQuery, api }: MainGraphProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MainGraphPoint[]>([]);
  const [intervalDropdownOpen, setIntervalDropdownOpen] = useState(false);

  // Determine active metric (default visitors)
  const activeMetric = query.metrics || "visitors";
  // Determine active interval (default based on period)
  const activeInterval = query.interval || (query.period === "day" || query.period === "realtime" ? "hourly" : "daily");

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

  // Transform data for recharts: [{timestamp, metrics: {visitors, pageviews}}] → [{time, value}]
  const chartData = data.map((point) => ({
    time: point.timestamp,
    value: (point.metrics && point.metrics[activeMetric]) ?? 0,
  }));

  // Calculate total
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  const handleIntervalChange = (interval: string) => {
    setQuery((prev) => ({ ...prev, interval: interval as StatsRequest["interval"] }));
    setIntervalDropdownOpen(false);
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {payload[0].value.toLocaleString()}{" "}
          {activeMetric === "visitors" ? "访客" : "浏览量"}
        </p>
      </div>
    );
  };

  const intervalLabel = INTERVAL_OPTIONS.find((i) => i.key === activeInterval)?.label || "按天";

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg">
      {/* Metric tabs and interval selector - Plausible style */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-1">
          {METRIC_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                activeMetric === opt.key
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              )}
              onClick={() => setQuery((prev) => ({ ...prev, metrics: opt.key }))}
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
              {INTERVAL_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.key}
                  onClick={() => handleIntervalChange(opt.key)}
                  className={cn(activeInterval === opt.key && "bg-gray-50 dark:bg-gray-800")}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {total.toLocaleString()}{" "}
          {activeMetric === "visitors" ? "访客" : "浏览量"}
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
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}