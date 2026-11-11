import { useEffect, useState, useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  ArrowLeft,
  RefreshCw,
  Settings,
  Filter,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Monitor,
  Smartphone,
  Tablet,
  Gauge,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import dayjs from "dayjs";
import type { DateRange } from "react-day-picker";
import axios, { type BaseResponse } from "@utils/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  metricValue,
  shiftDay,
  todayInZone,
  type PerformanceConfig,
  type PerformanceData,
  type Rating,
} from "./types";

const METRIC_NAMES = ["LCP", "INP", "CLS", "TTFB", "FCP"] as const;
type MetricName = (typeof METRIC_NAMES)[number];

const METRIC_THRESHOLDS: Record<
  string,
  { good: number; needs: number; unit: string; descKey: string }
> = {
  LCP: { good: 2500, needs: 4000, unit: "ms", descKey: "最大内容绘制 (LCP)" },
  INP: { good: 200, needs: 500, unit: "ms", descKey: "交互到下次绘制 (INP)" },
  CLS: { good: 0.1, needs: 0.25, unit: "", descKey: "累积布局偏移 (CLS)" },
  TTFB: { good: 800, needs: 1800, unit: "ms", descKey: "首字节到达时间 (TTFB)" },
  FCP: { good: 1800, needs: 3000, unit: "ms", descKey: "首次内容绘制 (FCP)" },
};

const ratingConfig: Record<
  Rating,
  { label: string; textClass: string; bgClass: string; borderClass: string; icon: typeof CheckCircle2 }
> = {
  good: {
    label: "良好",
    textClass: "text-emerald-700 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  needs_improvement: {
    label: "待改善",
    textClass: "text-amber-700 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/40",
    borderClass: "border-amber-200 dark:border-amber-800",
    icon: AlertTriangle,
  },
  poor: {
    label: "较差",
    textClass: "text-rose-700 dark:text-rose-400",
    bgClass: "bg-rose-50 dark:bg-rose-950/40",
    borderClass: "border-rose-200 dark:border-rose-800",
    icon: XCircle,
  },
  insufficient: {
    label: "数据不足",
    textClass: "text-slate-500 dark:text-slate-400",
    bgClass: "bg-slate-50 dark:bg-slate-800/40",
    borderClass: "border-slate-200 dark:border-slate-700",
    icon: HelpCircle,
  },
};

const emptyFilters = {
  hostname: "",
  path: "",
  release: "",
  device: "",
  browser: "",
  country: "",
  navigation: "",
};

export default function PerformancePage() {
  const { domain = "" } = useParams();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const base = `/sites/${encodeURIComponent(domain)}/performance`;
  const [config, setConfig] = useState<PerformanceConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [configRevision, setConfigRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setConfig(null);
    setConfigError(false);
    axios
      .get<BaseResponse<PerformanceConfig>>(base + "/config", {
        signal: controller.signal,
        timeout: 10000,
      })
      .then((res) => {
        if (!controller.signal.aborted) setConfig(res.data.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setConfigError(true);
      });
    return () => controller.abort();
  }, [base, configRevision]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      {/* 顶部标题栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/sites/${domain}/stats`}
            className="flex items-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {domain}
          </Link>
          <div className="h-4 w-px bg-border" />
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Gauge className="h-4 w-4" />
            </span>
            {t("performance.title", "Core Web Vitals")}
          </h1>
        </div>

        <Button asChild variant="outline" size="sm" className="shadow-xs">
          <Link to={`/sites/${domain}/settings/performance`}>
            <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
            {t("performance.settings", "性能监控设置")}
          </Link>
        </Button>
      </div>

      {configError && (
        <Card className="border-rose-200 bg-rose-50/50 p-6 dark:border-rose-900/50 dark:bg-rose-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600 dark:text-rose-400" />
            <div className="space-y-2">
              <h3 className="font-semibold text-rose-900 dark:text-rose-200">
                {t("performance.failed", "性能配置加载失败")}
              </h3>
              <p className="text-sm text-rose-700 dark:text-rose-300">
                无法连接到性能配置服务，请检查网络连接或稍后重试。
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfigRevision((r) => r + 1)}
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                {t("common.retry", "重试")}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!config && !configError && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-44 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {config && (
        <Workspace
          key={base}
          base={base}
          config={config}
          params={params}
          setParams={setParams}
        />
      )}
    </div>
  );
}

function Workspace({
  base,
  config,
  params,
  setParams,
}: {
  base: string;
  config: PerformanceConfig;
  params: URLSearchParams;
  setParams: (next: URLSearchParams) => void;
}) {
  const { t } = useTranslation();
  const today = todayInZone(config.timezone);
  const earliest = shiftDay(today, 1 - config.raw_days);
  const metric = (METRIC_NAMES.includes((params.get("metric") as any) || "")
    ? params.get("metric")!
    : "LCP") as MetricName;

  const [start, setStart] = useState(earliest);
  const [end, setEnd] = useState(today);
  const [filters, setFilters] = useState(() => ({
    ...emptyFilters,
    path: params.get("path") || "",
  }));
  const [selection, setSelection] = useState(filters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 全局统一日期筛选器状态
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedCalendarRange, setSelectedCalendarRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  const [data, setData] = useState<PerformanceData | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  const requestKey = JSON.stringify([
    base,
    start,
    end,
    metric,
    selection,
    revision,
  ]);
  const current = loadedKey === requestKey ? data : null;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setData(null);
    axios
      .get<BaseResponse<PerformanceData>>(base + "/data", {
        params: { start, end, metric, ...selection },
        signal: controller.signal,
        timeout: 10000,
      })
      .then((res) => {
        if (!controller.signal.aborted) {
          setData(res.data.data);
          setLoadedKey(requestKey);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [base, start, end, metric, selection, revision, requestKey]);

  // 日期快捷选项计算
  const selectedDateLabel = useMemo(() => {
    const timezone = config.timezone;
    const curToday = todayInZone(timezone);
    const yesterday = shiftDay(curToday, -1);
    const last7 = shiftDay(curToday, -6);

    if (start === curToday && end === curToday) {
      return t("heatmap.today", "今天");
    }
    if (start === yesterday && end === yesterday) {
      return t("heatmap.yesterday", "昨天");
    }
    if (start === last7 && end === curToday) {
      return t("heatmap.lastDays", { days: 7, defaultValue: "最近 7 天" });
    }
    if (start === earliest && end === curToday) {
      return `${t("performance.rangeFull", "全部")} (${config.raw_days}天)`;
    }
    return `${start} ~ ${end}`;
  }, [start, end, config, earliest, t]);

  const handleDayClick = (day: Date) => {
    const { from, to } = selectedCalendarRange;
    const newRange = { ...selectedCalendarRange };
    if (!from && !to) {
      newRange.from = day;
    } else if (!from && to) {
      newRange.from = day;
      if (day > to) newRange.to = day;
    } else if (from && !to) {
      newRange.to = day;
      if (day < from) newRange.from = day;
    } else if (from && to) {
      if (day < from) newRange.from = day;
      if (day > to) newRange.to = day;
    }
    setSelectedCalendarRange(newRange);
  };

  const applyCustomRange = (from: Date, to: Date) => {
    const s = dayjs(from).format("YYYY-MM-DD");
    const e = dayjs(to).format("YYYY-MM-DD");
    setStart(s);
    setEnd(e);
    setRevision((v) => v + 1);
  };

  const setMetricParam = (m: string) => {
    const next = new URLSearchParams(params);
    next.set("metric", m);
    setParams(next);
  };

  const activeFiltersCount = Object.entries(filters).filter(
    ([k, v]) => v && k !== "path",
  ).length + (filters.path ? 1 : 0);

  return (
    <div className="space-y-6">
      {!config.enabled && (
        <Card className="border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold">{t("performance.disabled", "性能采集尚未开启")}</span>
              <span className="ml-2">
                请前往
                <Link
                  to={`/sites/${encodeURIComponent(params.get("domain") || "")}/settings/performance`}
                  className="mx-1 underline hover:text-amber-900 dark:hover:text-amber-200"
                >
                  性能设置
                </Link>
                开启并在页面 Tracker 中嵌入 <code>data-performance="true"</code>。
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* 控制工具栏与筛选面板 */}
      <Card className="shadow-xs">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* 左侧主要筛选：日期、设备、导航 */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* 日期选择器 Dropdown */}
              <DropdownMenu
                open={isDateDropdownOpen}
                onOpenChange={setIsDateDropdownOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 border-dashed font-normal shadow-xs"
                  >
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedDateLabel}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem
                    onClick={() => {
                      setStart(today);
                      setEnd(today);
                      setRevision((r) => r + 1);
                    }}
                  >
                    {t("heatmap.today", "今天")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const y = shiftDay(today, -1);
                      setStart(y);
                      setEnd(y);
                      setRevision((r) => r + 1);
                    }}
                  >
                    {t("heatmap.yesterday", "昨天")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const s = shiftDay(today, -6);
                      setStart(s);
                      setEnd(today);
                      setRevision((r) => r + 1);
                    }}
                  >
                    {t("heatmap.lastDays", { days: 7, defaultValue: "最近 7 天" })}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setStart(earliest);
                      setEnd(today);
                      setRevision((r) => r + 1);
                    }}
                  >
                    全部可查周期 ({config.raw_days} 天)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedCalendarRange({
                        from: dayjs(start).toDate(),
                        to: dayjs(end).toDate(),
                      });
                      setIsDatePickerOpen(true);
                    }}
                  >
                    {t("heatmap.customRange", "自定义日期范围...")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 设备筛选 */}
              <div className="flex items-center rounded-lg border bg-muted/20 p-0.5 text-xs">
                {[
                  { key: "", label: t("performance.all", "全部设备"), icon: Monitor },
                  { key: "desktop", label: "桌面", icon: Monitor },
                  { key: "mobile", label: "移动", icon: Smartphone },
                  { key: "tablet", label: "平板", icon: Tablet },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setFilters({ ...filters, device: key });
                      setSelection({ ...selection, device: key });
                      setRevision((r) => r + 1);
                    }}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-medium transition",
                      filters.device === key
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* 导航类型快速选择 */}
              <Select
                value={filters.navigation || "all"}
                onValueChange={(val) => {
                  const actualVal = val === "all" ? "" : val;
                  setFilters({ ...filters, navigation: actualVal });
                  setSelection({ ...selection, navigation: actualVal });
                  setRevision((r) => r + 1);
                }}
              >
                <SelectTrigger
                  aria-label={t("performance.navigation", "导航类型")}
                  className="h-9 w-[165px] text-xs shadow-xs px-3 bg-background"
                >
                  <SelectValue placeholder={t("performance.allNav", "所有导航类型")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    {t("performance.allNav", "所有导航类型")}
                  </SelectItem>
                  <SelectItem value="navigate" className="text-xs">
                    初次载入 (navigate)
                  </SelectItem>
                  <SelectItem value="reload" className="text-xs">
                    页面刷新 (reload)
                  </SelectItem>
                  <SelectItem value="back-forward" className="text-xs">
                    历史前进/后退
                  </SelectItem>
                  <SelectItem value="back-forward-cache" className="text-xs">
                    往返缓存 (bfcache)
                  </SelectItem>
                  <SelectItem value="prerender" className="text-xs">
                    预渲染 (prerender)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 右侧动作按钮 */}
            <div className="flex items-center gap-2">
              <Button
                variant={showAdvanced ? "secondary" : "outline"}
                size="sm"
                className="h-9 gap-1.5 text-xs shadow-xs"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Filter className="h-3.5 w-3.5" />
                <span>高级过滤</span>
                {activeFiltersCount > 0 && (
                  <Badge variant="default" className="ml-1 h-4 px-1 text-[10px]">
                    {activeFiltersCount}
                  </Badge>
                )}
                {showAdvanced ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs shadow-xs"
                onClick={() => setRevision((r) => r + 1)}
                disabled={loading}
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", loading && "animate-spin")}
                />
                <span className="hidden sm:inline">{t("heatmap.refresh", "刷新")}</span>
              </Button>

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setFilters(emptyFilters);
                    setSelection(emptyFilters);
                    setRevision((r) => r + 1);
                  }}
                >
                  {t("performance.clear", "重置")}
                </Button>
              )}
            </div>
          </div>

          {/* 高级筛选折叠区 */}
          {showAdvanced && (
            <div className="rounded-lg border bg-muted/30 p-3 pt-3.5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {(
                  [
                    { key: "path", label: "页面路径 (如 /pricing)", max: 1000 },
                    { key: "hostname", label: "主机名 (hostname)", max: 120 },
                    { key: "release", label: "发布版本 (release)", max: 120 },
                    { key: "browser", label: "浏览器 (Chrome/Safari)", max: 120 },
                    { key: "country", label: "国家代码 (如 CN/US)", max: 2 },
                  ] as const
                ).map(({ key, label, max }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      {label}
                    </label>
                    <Input
                      className="h-8 text-xs bg-background"
                      placeholder="不限"
                      maxLength={max}
                      value={filters[key]}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          [key]:
                            key === "country"
                              ? e.target.value.toUpperCase()
                              : e.target.value,
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setSelection({ ...filters });
                          setRevision((r) => r + 1);
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-xs text-muted-foreground">
                <span>支持路径段通配符（例如 <code>/blog/*</code>）</span>
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => {
                    setSelection({ ...filters });
                    setRevision((r) => r + 1);
                  }}
                >
                  应用筛选
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 自定义日期弹窗 */}
      <Dialog open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
        <DialogContent className="max-w-fit p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold">
              {t("heatmap.customRange", "选择日期范围")}
            </DialogTitle>
          </DialogHeader>
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={selectedCalendarRange}
            onDayClick={handleDayClick}
            disabled={(date) =>
              date > new Date() || date < dayjs(earliest).toDate()
            }
          />
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="text-xs text-muted-foreground">
              {selectedCalendarRange.from && selectedCalendarRange.to ? (
                <span>
                  {dayjs(selectedCalendarRange.from).format("YYYY-MM-DD")} ~{" "}
                  {dayjs(selectedCalendarRange.to).format("YYYY-MM-DD")}
                </span>
              ) : (
                <span>请依次点击起始与结束日期</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDatePickerOpen(false)}
              >
                {t("common.cancel", "取消")}
              </Button>
              <Button
                size="sm"
                disabled={!selectedCalendarRange.from || !selectedCalendarRange.to}
                onClick={() => {
                  if (selectedCalendarRange.from && selectedCalendarRange.to) {
                    applyCustomRange(
                      selectedCalendarRange.from,
                      selectedCalendarRange.to,
                    );
                    setIsDatePickerOpen(false);
                  }
                }}
              >
                {t("common.confirm", "应用")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 错误提示 */}
      {error && (
        <Card className="border-rose-200 bg-rose-50/50 p-6 dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            <div className="space-y-2">
              <h4 className="font-semibold text-rose-900 dark:text-rose-200">
                {t("performance.failed", "查询性能数据失败")}
              </h4>
              <p className="text-sm text-rose-700 dark:text-rose-300">
                可能由于时间跨度过大或参数错误，请重试或收紧过滤条件。
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevision((r) => r + 1)}
              >
                {t("common.retry", "重试")}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 加载骨架屏 */}
      {loading && !current && (
        <div className="space-y-4">
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {/* 数据内容呈现区 */}
      {current && (
        <>
          {/* 总体运行态势概览条 */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">全局评级:</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-semibold gap-1.5 px-2.5 py-1",
                    ratingConfig[current.overall].textClass,
                    ratingConfig[current.overall].bgClass,
                    ratingConfig[current.overall].borderClass,
                  )}
                >
                  {(() => {
                    const IconComp = ratingConfig[current.overall].icon;
                    return <IconComp className="h-3.5 w-3.5" />;
                  })()}
                  {ratingConfig[current.overall].label}
                </Badge>
              </div>

              <div className="h-4 w-px bg-border hidden sm:block" />

              <div>
                <span className="text-xs text-muted-foreground mr-1.5">
                  采样导航:
                </span>
                <span className="font-semibold">
                  {current.sampled_navigations.toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-xs text-muted-foreground mr-1.5">
                  前台有效导航:
                </span>
                <span className="font-semibold">
                  {current.eligible_navigations.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              数据更新于: {new Date(current.generated_at).toLocaleTimeString()}
            </div>
          </div>

          {/* 采样导航为空时的提示 */}
          {!current.sampled_navigations && (
            <Card className="p-8 text-center border-dashed">
              <Gauge className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold text-base mb-1">
                {t("performance.empty", "当前筛选条件下暂无采样数据")}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                可能当前日期区间内访问量较少，或筛选的主机名/路径未命中采样规则。
              </p>
            </Card>
          )}

          {/* 5大性能指标卡（点击卡片即可直接切换折线图） */}
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
            {current.metrics.map((m) => {
              const isSelected = metric === m.name;
              const threshold = METRIC_THRESHOLDS[m.name];
              const isCore = m.name !== "TTFB" && m.name !== "FCP";
              const rConf = ratingConfig[m.rating];
              const RatingIcon = rConf.icon;

              return (
                <div
                  key={m.name}
                  onClick={() => setMetricParam(m.name)}
                  className={cn(
                    "group relative cursor-pointer flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition-all duration-200 hover:shadow-md",
                    isSelected
                      ? "ring-2 ring-indigo-500 border-indigo-500/50 dark:ring-indigo-400 bg-indigo-500/[0.02]"
                      : "hover:border-border/80",
                  )}
                >
                  <div className="space-y-2">
                    {/* 头部标题与核心标签 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold tracking-tight text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {m.name}
                        </span>
                        <Badge
                          variant={isCore ? "default" : "secondary"}
                          className={cn(
                            "text-[10px] h-4.5 px-1.5 font-normal",
                            isCore
                              ? "bg-indigo-600 text-white dark:bg-indigo-500"
                              : "text-muted-foreground",
                          )}
                        >
                          {isCore ? "核心 CWV" : "辅助"}
                        </Badge>
                      </div>

                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] h-5 px-1.5 font-medium gap-1",
                          rConf.textClass,
                          rConf.bgClass,
                          rConf.borderClass,
                        )}
                      >
                        <RatingIcon className="h-3 w-3" />
                        {rConf.label}
                      </Badge>
                    </div>

                    {/* 指标 P75 大数值 */}
                    <div className="flex items-baseline gap-1.5 pt-1">
                      <span className="text-2xl font-bold tracking-tight">
                        {metricValue(m.p75, m.name)}
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        P75 阈值
                      </span>
                    </div>

                    {/* 达标基准线说明 */}
                    {threshold && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <span>良好标准:</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                          ≤{threshold.good}
                          {threshold.unit}
                        </span>
                      </div>
                    )}

                    {/* 样本分布三色比例条 */}
                    <div className="space-y-1.5 pt-1">
                      <div
                        className="flex h-2 w-full overflow-hidden rounded-full bg-muted/60"
                        title={`良好: ${m.good} | 待改善: ${m.needs_improvement} | 较差: ${m.poor}`}
                      >
                        {m.samples > 0 ? (
                          <>
                            <div
                              className="bg-emerald-500 transition-all duration-300"
                              style={{
                                width: `${(m.good / m.samples) * 100}%`,
                              }}
                            />
                            <div
                              className="bg-amber-400 transition-all duration-300"
                              style={{
                                width: `${(m.needs_improvement / m.samples) * 100}%`,
                              }}
                            />
                            <div
                              className="bg-rose-500 transition-all duration-300"
                              style={{
                                width: `${(m.poor / m.samples) * 100}%`,
                              }}
                            />
                          </>
                        ) : (
                          <div className="w-full bg-muted" />
                        )}
                      </div>

                      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {m.samples
                            ? `${((m.good / m.samples) * 100).toFixed(0)}%`
                            : "0%"}
                        </span>
                        <span className="text-amber-600 dark:text-amber-400">
                          {m.samples
                            ? `${((m.needs_improvement / m.samples) * 100).toFixed(0)}%`
                            : "0%"}
                        </span>
                        <span className="text-rose-600 dark:text-rose-400">
                          {m.samples
                            ? `${((m.poor / m.samples) * 100).toFixed(0)}%`
                            : "0%"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 底部样本量与覆盖率 */}
                  <div className="mt-3 border-t pt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      样本: <strong className="text-foreground">{m.samples.toLocaleString()}</strong>
                    </span>
                    <span>
                      覆盖: <strong className="text-foreground">{m.coverage.toFixed(1)}%</strong>
                    </span>
                  </div>

                  {m.small_sample && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-3 w-3" />
                      <span>样本量少于 100，判定仅供参考</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 采样质量提示（延迟初始化、后台初始化、采样混合） */}
          {(current.late_init_navigations > 0 ||
            current.background_init_navigations > 0 ||
            current.mixed_sampling ||
            current.mixed_config) && (
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-amber-200/80 bg-amber-50/40 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="flex-1 space-y-1">
                {current.late_init_navigations > 0 && (
                  <span>
                    发现 {current.late_init_navigations} 次导航统计脚本初始化延迟超过 2 秒；
                  </span>
                )}
                {current.background_init_navigations > 0 && (
                  <span>
                    {current.background_init_navigations} 次后台标签页初始化（已隔离剔除，不计入有效指标）。
                  </span>
                )}
                {(current.mixed_sampling || current.mixed_config) && (
                  <span>
                    所选时间段内发生了采样率或配置调整，当前聚合指标反映实际采集结果。
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 趋势图表（每日 P75 走势） */}
          <Card className="shadow-xs">
            <div className="border-b px-5 py-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  <span>每日 P75 趋势走势</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {metric}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  反映所选周期内真实访客经历的第 75 百分位体验随时间的变化趋势
                </p>
              </div>

              {METRIC_THRESHOLDS[metric] && (
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span>达标线: ≤{METRIC_THRESHOLDS[metric].good}{METRIC_THRESHOLDS[metric].unit}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    <span>P75 观测值</span>
                  </div>
                </div>
              )}
            </div>

            <CardContent className="p-5">
              {current.trend.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={current.trend}
                        margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="perfGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#6366f1"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="95%"
                              stopColor="#6366f1"
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#88888820"
                        />
                        <XAxis
                          dataKey="day"
                          tickLine={false}
                          axisLine={{ stroke: "#88888830" }}
                          tick={{ fontSize: 11, fill: "#888888" }}
                          tickFormatter={(v) => String(v).slice(5)}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: "#888888" }}
                          width={55}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="rounded-lg border bg-popover/95 p-3 shadow-lg backdrop-blur-xs text-xs space-y-1">
                                <div className="font-semibold text-foreground">
                                  {label}
                                </div>
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                  <span>{metric} P75:</span>
                                  <span className="font-mono font-bold">
                                    {metricValue(d.p75, metric)}
                                  </span>
                                </div>
                                <div className="text-muted-foreground">
                                  有效样本数: {d.samples}
                                </div>
                              </div>
                            );
                          }}
                        />
                        {METRIC_THRESHOLDS[metric] && (
                          <ReferenceLine
                            y={METRIC_THRESHOLDS[metric].good}
                            stroke="#10b981"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                          />
                        )}
                        <Area
                          type="monotone"
                          dataKey="p75"
                          name="P75"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          fill="url(#perfGradient)"
                          connectNulls={true}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground border-t pt-3">
                    {current.trend.map((p) => (
                      <span key={p.day} className="font-mono">
                        {p.day}:{" "}
                        <strong className="text-foreground">
                          {metricValue(p.p75, metric)}
                        </strong>{" "}
                        (n={p.samples})
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {t("performance.noMetric", "该指标在所选区间内暂无有效趋势样本。")}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 慢速页面排行表 */}
          <Card className="shadow-xs">
            <div className="border-b px-5 py-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>慢速页面排行 · {metric}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  按当前指标 P75 从劣到优展示前 50 个高频访问页面，点击页面地址可直接过滤
                </p>
              </div>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-xs font-medium text-muted-foreground">
                      <th className="py-3 px-4 font-semibold">页面 URL</th>
                      <th className="py-3 px-4 font-semibold whitespace-nowrap">P75 观测值</th>
                      <th className="py-3 px-4 font-semibold whitespace-nowrap">有效样本</th>
                      <th className="py-3 px-4 font-semibold whitespace-nowrap w-48">良好体验占比</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {current.pages.map((p) => {
                      const goodPercent = p.samples
                        ? (p.good / p.samples) * 100
                        : 0;

                      return (
                        <tr
                          key={p.hostname + p.path}
                          className="hover:bg-muted/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono text-xs max-w-md break-all">
                            <button
                              type="button"
                              className="text-left text-primary hover:underline font-medium"
                              onClick={() => {
                                setFilters({
                                  ...filters,
                                  hostname: p.hostname,
                                  path: p.path,
                                });
                                setSelection({
                                  ...selection,
                                  hostname: p.hostname,
                                  path: p.path,
                                });
                                setRevision((r) => r + 1);
                              }}
                              title="点击按该页面过滤"
                            >
                              <span className="text-muted-foreground">{p.hostname}</span>
                              <span className="text-foreground">{p.path}</span>
                            </button>
                          </td>

                          <td className="py-3 px-4 font-mono font-semibold whitespace-nowrap">
                            {metricValue(p.p75, metric)}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-mono">{p.samples}</span>
                            {p.samples < 100 && (
                              <Badge
                                variant="outline"
                                className="ml-2 text-[10px] text-amber-600 border-amber-300 dark:border-amber-800"
                              >
                                小样本
                              </Badge>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    goodPercent >= 75
                                      ? "bg-emerald-500"
                                      : goodPercent >= 50
                                        ? "bg-amber-400"
                                        : "bg-rose-500",
                                  )}
                                  style={{ width: `${goodPercent}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs text-muted-foreground">
                                {goodPercent.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!current.pages.length && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {t("performance.noMetric", "当前筛选条件下暂无页面数据。")}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 底部指标判定标准与合规指引 */}
      <Card className="border-dashed bg-muted/20">
        <CardContent className="p-4 text-xs leading-relaxed text-muted-foreground space-y-1.5">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>性能判定标准与计算口径说明</span>
          </div>
          <p>
            {t(
              "performance.interpretation",
              "覆盖率＝有效指标样本／前台采样导航。未收到的指标保留缺失，无交互 INP 不补零；API 支持只表示浏览器能力检测通过，并不保证上报完成。整体良好判定要求核心 CWV 指标（LCP、INP、CLS）各自至少具备 100 个有效样本。指标遵循完整文档导航，SPA 路由切换不产生新的 CWV 导航。设备由服务端 UA 解析归类。良好阈值基准：LCP ≤ 2500ms、INP ≤ 200ms、CLS ≤ 0.1；辅助指标 FCP ≤ 1800ms、TTFB ≤ 800ms。",
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
