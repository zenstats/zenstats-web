import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios, { type BaseResponse } from "@utils/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  RefreshCw,
  Eye,
  CheckCircle2,
  TrendingDown,
  Camera,
  Layers,
  Sliders,
  Globe,
  Tag,
  AlertTriangle,
} from "lucide-react";
import {
  layoutKey,
  pageIdentity,
  pageKey,
  type HeatmapConfig,
  type ScrollData,
  type ScrollPage,
  type Snapshot,
} from "./types";

function dayInZone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"]
    .map((k) => parts.find((p) => p.type === k)?.value)
    .join("-");
}

function shiftDay(day: string, days: number) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function ScrollWorkspace({
  base,
  config,
  readOnly,
}: {
  base: string;
  config: HeatmapConfig;
  readOnly: boolean;
}) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const scope = params.get("scope") === "key" ? "key" : "url";
  const key = scope === "key" ? params.get("key") || "" : "";
  const path = scope === "url" ? params.get("path") || "" : "";

  // 日期范围限制：滚动热力图首版最多支持 7 天（或 config.raw_days）
  const maxDays = Math.min(config.raw_days || 7, 7);
  const today = dayInZone(config.timezone);
  const earliest = shiftDay(today, 1 - maxDays);
  const [start, setStart] = useState(earliest);
  const [end, setEnd] = useState(today);

  // 日期预设与自定义日历 Dialog
  const [selectedOptionName, setSelectedOptionName] = useState<string>(
    t("heatmap.lastDays", { days: maxDays }),
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>({
    from: new Date(earliest + "T00:00:00"),
    to: new Date(today + "T00:00:00"),
  });

  const [pages, setPages] = useState<ScrollPage[]>([]);
  const [selected, setSelected] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotID, setSnapshotID] = useState<number>();
  const [data, setData] = useState<ScrollData | null>(null);
  const [image, setImage] = useState("");
  const [error, setError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);

  // 激活的深度（0 ~ 79，共 80 个分段，每段 1.25%）
  const [active, setActive] = useState(39);
  const [opacity, setOpacity] = useState(0.5);
  const [captureURL, setCaptureURL] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [showCapturePanel, setShowCapturePanel] = useState(false);

  const page = pages.find((p) => pageKey(p) === selected);
  const matching = useMemo(
    () => snapshots.filter((s) => layoutKey(s, scope) === selected),
    [snapshots, scope, selected],
  );
  const snapshot = matching.find((s) => s.id === snapshotID) ?? matching[0];

  const [loadedKey, setLoadedKey] = useState("");
  const requestKey = JSON.stringify([
    base,
    scope,
    key,
    path,
    start,
    end,
    selected,
  ]);
  const current = loadedKey === requestKey ? data : null;

  // 日期快捷选项处理
  const handleDatePreset = (preset: "today" | "yesterday" | "lastDays" | "custom") => {
    if (preset === "today") {
      setStart(today);
      setEnd(today);
      setSelectedOptionName(t("heatmap.today"));
      setSelectedDateRange({
        from: new Date(today + "T00:00:00"),
        to: new Date(today + "T00:00:00"),
      });
    } else if (preset === "yesterday") {
      const y = shiftDay(today, -1);
      setStart(y);
      setEnd(y);
      setSelectedOptionName(t("heatmap.yesterday"));
      setSelectedDateRange({
        from: new Date(y + "T00:00:00"),
        to: new Date(y + "T00:00:00"),
      });
    } else if (preset === "lastDays") {
      setStart(earliest);
      setEnd(today);
      setSelectedOptionName(t("heatmap.lastDays", { days: maxDays }));
      setSelectedDateRange({
        from: new Date(earliest + "T00:00:00"),
        to: new Date(today + "T00:00:00"),
      });
    } else if (preset === "custom") {
      setIsDatePickerOpen(true);
    }
  };

  const handleDayClick = (day: Date) => {
    const range = { ...selectedDateRange };
    if (!range.from || (range.from && range.to)) {
      range.from = day;
      range.to = undefined;
    } else if (range.from && !range.to) {
      if (day < range.from) {
        range.to = range.from;
        range.from = day;
      } else {
        range.to = day;
      }
    }
    setSelectedDateRange(range);

    if (range.from && range.to) {
      const fromStr = dayjs(range.from).format("YYYY-MM-DD");
      const toStr = dayjs(range.to).format("YYYY-MM-DD");
      setStart(fromStr);
      setEnd(toStr);
      setSelectedOptionName(`${fromStr} ~ ${toStr}`);
      setIsDatePickerOpen(false);
    }
  };

  // 请求滚动页面列表与快照
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setPages([]);
    setData(null);
    Promise.all([
      axios.get<BaseResponse<ScrollPage[]>>(base + "/scroll/pages", {
        params: { start, end, scope, key, path },
        signal: controller.signal,
        timeout: 10000,
      }),
      axios.get<BaseResponse<Snapshot[]>>(base + "/snapshots", {
        signal: controller.signal,
        timeout: 10000,
      }),
    ])
      .then(([p, s]) => {
        if (controller.signal.aborted) return;
        setPages(p.data.data);
        setSnapshots(s.data.data);
        setSelected((old) =>
          p.data.data.some((p) => pageKey(p) === old)
            ? old
            : p.data.data[0]
              ? pageKey(p.data.data[0])
              : "",
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [base, start, end, scope, key, path, revision]);

  // 请求特定页面的滚动深度数据
  useEffect(() => {
    setData(null);
    if (!page) return;
    const controller = new AbortController();
    setError(false);
    axios
      .get<BaseResponse<ScrollData>>(base + "/scroll/data", {
        params: { start, end, scope, page: JSON.stringify(pageIdentity(page)) },
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
      });
    return () => controller.abort();
  }, [base, start, end, scope, page, requestKey]);

  // 加载页面快照底图
  useEffect(() => {
    setImage("");
    setImageError(false);
    if (!snapshot) return;
    const controller = new AbortController();
    let objectURL = "";
    axios
      .get(base + `/snapshots/${snapshot.id}/image`, {
        responseType: "blob",
        signal: controller.signal,
        timeout: 10000,
      })
      .then((res) => {
        if (!controller.signal.aborted) {
          objectURL = URL.createObjectURL(res.data);
          setImage(objectURL);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setImageError(true);
      });
    return () => {
      controller.abort();
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [base, snapshot]);

  // 初始化截图 URL
  useEffect(() => {
    const example =
      scope === "key"
        ? config.groups.find((g) => g.key === page?.aggregation_key)
            ?.example_url
        : "";
    setCaptureURL(
      example ||
        (page && scope === "url" ? `https://${page.hostname}${page.path}` : ""),
    );
  }, [page, scope, config.groups]);

  async function capture() {
    if (!page || !captureURL) return;
    setCapturing(true);
    setImageError(false);
    try {
      const { data: res } = await axios.post<BaseResponse<Snapshot>>(
        base + "/capture",
        { url: captureURL, page: pageIdentity(page), scope },
        { timeout: 45000 },
      );
      setSnapshots((old) => [res.data, ...old]);
      setSnapshotID(res.data.id);
      setShowCapturePanel(false);
    } catch {
      setImageError(true);
    } finally {
      setCapturing(false);
    }
  }

  const band = current?.regions[active];

  return (
    <section className="space-y-5" aria-label={t("heatmap.scroll.title")}>
      {/* 滚动采集未开启时的轻提示 */}
      {!config.scroll_enabled && (
        <div className="flex items-center gap-3 p-3.5 rounded-lg border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>{t("heatmap.scroll.disabled")}</span>
        </div>
      )}

      {/* 顶部现代化统一工具栏：范围、日期、刷新、页面布局选择 */}
      <Card className="border border-gray-200/80 dark:border-gray-800/80 shadow-xs">
        <CardContent className="p-4 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* 左侧：聚合维度切换（By URL vs By Key） */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t("heatmap.viewBy")}:
              </span>
              <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set("scope", "url");
                    next.delete("key");
                    next.delete("path");
                    setParams(next);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    scope === "url"
                      ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-xs font-semibold"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400",
                  )}
                >
                  <Globe className="h-3.5 w-3.5 text-blue-500" />
                  <span>{t("heatmap.byURL")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set("scope", "key");
                    next.delete("key");
                    next.delete("path");
                    setParams(next);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    scope === "key"
                      ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-xs font-semibold"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400",
                  )}
                >
                  <Tag className="h-3.5 w-3.5 text-indigo-500" />
                  <span>{t("heatmap.byKey")}</span>
                </button>
              </div>
            </div>

            {/* 右侧：全局统一日期选择器与刷新 */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 text-xs font-normal border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                  >
                    <CalendarIcon className="h-3.5 w-3.5 text-gray-500" />
                    <span>{selectedOptionName}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleDatePreset("today")}>
                    {t("heatmap.today")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDatePreset("yesterday")}>
                    {t("heatmap.yesterday")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDatePreset("lastDays")}>
                    {t("heatmap.lastDays", { days: maxDays })}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDatePreset("custom")}>
                    {t("stats.period.custom")}...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-gray-500 border-gray-200 dark:border-gray-800"
                onClick={() => setRevision((r) => r + 1)}
                title={t("heatmap.refresh")}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* 页面与布局筛选卡片 */}
          {pages.length > 0 && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
                  {t("heatmap.pageLayout")}:
                </span>
                <div className="flex-1 min-w-0">
                  <Select
                    value={selected}
                    onValueChange={(val) => setSelected(val)}
                  >
                    <SelectTrigger className="w-full h-8 text-xs font-mono">
                      <SelectValue placeholder={t("heatmap.pageLayout")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {pages.map((p) => {
                        const dev =
                          p.viewport_width < 768
                            ? "mobile"
                            : p.viewport_width < 1024
                              ? "tablet"
                              : "desktop";
                        const label = `${scope === "key" ? p.aggregation_key : p.hostname + p.path} · ${p.version}/${p.variant} · ${t(`heatmap.device.${dev}`)} · ${p.sampled_views} ${t("heatmap.scroll.views")}`;
                        return (
                          <SelectItem key={pageKey(p)} value={pageKey(p)} className="text-xs font-mono">
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 自定义日期弹窗 */}
      <Dialog open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
        <DialogContent className="sm:max-w-auto w-auto p-0" showCloseButton={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>{t("stats.selectDateRange")}</DialogTitle>
          </DialogHeader>
          <Calendar
            mode="range"
            showOutsideDays={false}
            numberOfMonths={2}
            onDayClick={handleDayClick}
            selected={selectedDateRange}
            disabled={{
              before: new Date(earliest + "T00:00:00"),
              after: new Date(today + "T00:00:00"),
            }}
          />
        </DialogContent>
      </Dialog>

      {/* 加载中与空状态 */}
      {loading && (
        <div className="p-12 text-center text-xs text-gray-400 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
          <span>{t("common.loading")}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-400">
          {t("heatmap.loadFailed")}
        </div>
      )}

      {!loading && !pages.length && !error && (
        <div className="p-12 text-center text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <Layers className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="font-medium text-sm text-gray-800 dark:text-gray-200 mb-1">{t("heatmap.scroll.empty")}</p>
          <p className="text-gray-400">{t("heatmap.scroll.help", { days: maxDays })}</p>
        </div>
      )}

      {/* 滚动分析主体数据展示 */}
      {current && (
        <>
          {/* 四大核心指标卡 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <Card className="border border-gray-200/80 dark:border-gray-800/80">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {t("heatmap.scroll.sampled")}
                  </p>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {current.sampled_views.toLocaleString()}
                  </h4>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <Eye className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200/80 dark:border-gray-800/80">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {t("heatmap.scroll.valid")}
                  </p>
                  <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {current.valid_views.toLocaleString()}
                  </h4>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200/80 dark:border-gray-800/80">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {t("heatmap.scroll.average")}
                  </p>
                  <h4 className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {current.average_max_depth.toFixed(1)}%
                  </h4>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                  <TrendingDown className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200/80 dark:border-gray-800/80">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {t("heatmap.scroll.fold")}
                  </p>
                  <h4 className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {current.average_fold.toFixed(1)}%
                  </h4>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <Sliders className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 四阶触达里程碑水牌 (25% / 50% / 75% / 100%) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[25, 50, 75, 100].map((depth) => {
              const targetIndex = Math.min(79, Math.round((depth / 100) * 80) - 1);
              const isSelected = Math.abs(active - targetIndex) <= 2;
              const p = current.regions.find((r) => r.depth === depth);
              const rate = current.valid_views && p ? p.rate : 0;

              return (
                <button
                  key={depth}
                  type="button"
                  className={cn(
                    "p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group",
                    isSelected
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-xs ring-1 ring-blue-500/50"
                      : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700",
                  )}
                  onClick={() => setActive(targetIndex)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {t("heatmap.scroll.reach", { depth })}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-gray-500">
                      Top {depth}%
                    </Badge>
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-2 font-mono">
                    {current.valid_views && p ? `${rate.toFixed(1)}%` : "—"}
                  </p>
                  {/* 微型进度条 */}
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* 深度滑块与精确探测器 */}
          <Card className="border border-gray-200/80 dark:border-gray-800/80 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    {t("heatmap.scroll.depth")}
                  </span>
                  {band && (
                    <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs">
                      {band.depth.toFixed(1)}%
                    </Badge>
                  )}
                </div>

                {/* 详细指标 */}
                {band && (
                  <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-3">
                    <span>
                      到达样本: <strong className="font-mono text-blue-600 dark:text-blue-400">{band.views.toLocaleString()}</strong> / {current.valid_views.toLocaleString()}
                    </span>
                    <span>
                      触达率: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{band.rate.toFixed(1)}%</strong>
                    </span>
                    <span>
                      流失率: <strong className="font-mono text-rose-600 dark:text-rose-400">{(100 - band.rate).toFixed(1)}%</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* 滑块 */}
              <div className="flex items-center gap-4 pt-1">
                <span className="text-[11px] font-mono text-muted-foreground">0%</span>
                <Slider
                  min={0}
                  max={79}
                  value={[active]}
                  onValueChange={(val) => setActive(val[0] ?? 0)}
                  aria-label={t("heatmap.scroll.depth")}
                  className="flex-1"
                />
                <span className="text-[11px] font-mono text-muted-foreground">100%</span>
              </div>
            </CardContent>
          </Card>

          {/* 异常排除与混合采样提示 */}
          {(current.dynamic_views > 0 || current.clipped_views > 0 || current.unsupported_views > 0 || current.late_init_views > 0 || current.mixed_sampling) && (
            <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 px-1">
              <p>
                {t("heatmap.scroll.exclusions", {
                  dynamic: current.dynamic_views,
                  clipped: current.clipped_views,
                  unsupported: current.unsupported_views,
                  late: current.late_init_views,
                })}
              </p>
              {current.mixed_sampling && (
                <p className="text-amber-600 dark:text-amber-400">
                  {t("heatmap.scroll.mixed")}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* 底图快照控制与热力画布 */}
      {page && (
        <Card className="border border-gray-200/80 dark:border-gray-800/80 shadow-xs overflow-hidden">
          {/* 画布顶部工具栏：快照选择、透明度、截图生成 */}
          <div className="p-3.5 bg-gray-50/70 dark:bg-gray-900/40 border-b border-gray-200/80 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              {matching.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {t("heatmap.snapshot")}:
                  </span>
                  <Select
                    value={snapshot?.id ? String(snapshot.id) : ""}
                    onValueChange={(val) => setSnapshotID(Number(val))}
                  >
                    <SelectTrigger className="h-7 min-w-[170px] text-xs">
                      <SelectValue placeholder={t("heatmap.snapshot")} />
                    </SelectTrigger>
                    <SelectContent>
                      {matching.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                          {new Date(s.created_at).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 透明度调节 */}
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  {t("heatmap.opacity")}:
                </span>
                <div className="w-20 flex items-center">
                  <Slider
                    min={0.1}
                    max={0.9}
                    step={0.05}
                    value={[opacity]}
                    onValueChange={(val) => setOpacity(val[0] ?? 0.65)}
                    aria-label={t("heatmap.opacity")}
                  />
                </div>
                <span className="font-mono text-[11px] text-gray-400 w-8">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
            </div>

            {/* 截图捕获按钮 */}
            {!readOnly && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                  onClick={() => setShowCapturePanel(!showCapturePanel)}
                >
                  <Camera className="h-3.5 w-3.5 text-blue-500" />
                  <span>{t("heatmap.capture")}</span>
                </Button>
              </div>
            )}
          </div>

          {/* 展开的截图捕获表单 */}
          {showCapturePanel && !readOnly && (
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-200/60 dark:border-blue-900/40">
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void capture();
                }}
              >
                <Input
                  type="url"
                  required
                  aria-label={t("heatmap.exampleURL")}
                  placeholder="https://example.com/page"
                  value={captureURL}
                  onChange={(e) => setCaptureURL(e.target.value)}
                  className="h-8 text-xs max-w-md bg-white dark:bg-gray-900"
                />
                <Button
                  size="sm"
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={capturing || !config.screenshot_available || !captureURL}
                >
                  {t(capturing ? "heatmap.capturing" : "heatmap.capture")}
                </Button>
              </form>
            </div>
          )}

          {/* 无快照提示 */}
          {!snapshot && (
            <div className="p-12 text-center text-xs text-gray-500">
              <Camera className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="font-medium text-sm text-gray-800 dark:text-gray-200 mb-1">{t("heatmap.noSnapshot")}</p>
              <p className="text-gray-400">请点击右上方按钮生成页面底图，即可叠加滚动深度渐变</p>
            </div>
          )}

          {imageError && (
            <div className="p-4 text-xs text-rose-600 text-center">
              {t("heatmap.loadFailed")}
            </div>
          )}

          {/* 热力画布主体 */}
          {image && current && (
            <div
              className="relative overflow-hidden bg-slate-900/5 select-none"
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                const hoverDepth = Math.min(
                  79,
                  Math.max(
                    0,
                    Math.floor(((e.clientY - r.top) / r.height) * 80),
                  ),
                );
                setActive(hoverDepth);
              }}
            >
              {/* 背景快照底图 */}
              <img
                src={image}
                alt={`${page.hostname}${page.path}`}
                className="block h-auto w-full pointer-events-none"
              />

              {/* 80 阶滚动触达渐变彩带 */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{ opacity }}
              >
                {current.regions.map((r, i) => (
                  <div
                    key={i}
                    data-testid="scroll-band"
                    style={{
                      height: "1.25%",
                      backgroundColor: `hsl(${220 * (r.rate / 100)} 90% 45%)`,
                    }}
                  />
                ))}
              </div>

              {/* 25% / 50% / 75% 参考虚线与刻度标牌 */}
              {[25, 50, 75].map((depth) => (
                <div
                  key={depth}
                  className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-white/70 dark:border-black/70 flex items-center justify-end pr-3"
                  style={{ top: `${depth}%` }}
                >
                  <span className="bg-black/60 dark:bg-white/80 text-white dark:text-black font-mono text-[10px] px-1.5 py-0.2 rounded shadow-xs">
                    {depth}% 深度
                  </span>
                </div>
              ))}

              {/* 平均首屏黄金折叠线 (The Fold) */}
              <div
                className="pointer-events-none absolute left-0 right-0 border-t-2 border-blue-500 shadow-sm flex items-center justify-between px-4"
                style={{ top: `${Math.min(99, current.average_fold)}%` }}
              >
                <span className="bg-blue-600 text-white font-semibold text-[11px] px-2 py-0.5 rounded-full shadow-md">
                  📌 {t("heatmap.scroll.fold")}: {current.average_fold.toFixed(1)}%
                </span>
              </div>

              {/* 动态随动游标标尺线 */}
              {band && (
                <div
                  className="pointer-events-none absolute left-0 right-0 border-t-2 border-amber-400 shadow-md flex items-center justify-end pr-4 transition-all duration-75"
                  style={{ top: `${(active / 80) * 100}%` }}
                >
                  <span className="bg-amber-500 text-slate-950 font-mono font-bold text-[11px] px-2 py-0.5 rounded-full shadow-lg">
                    当前光标: {band.depth.toFixed(1)}% · 触达率 {band.rate.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </section>
  );
}
