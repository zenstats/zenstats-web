import { useEffect, useState, useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import axios, { type BaseResponse } from "@utils/axios";
import { isSubAccount } from "@utils/auth";
import HeatmapCanvas from "./heatmap-canvas";
import ScrollWorkspace from "./scroll-workspace";
import {
  deviceClass,
  layoutKey,
  pageIdentity,
  pageKey,
  type HeatmapConfig,
  type HeatmapData,
  type PageCount,
  type Snapshot,
} from "./types";
import {
  Flame,
  Globe,
  Layout,
  Smartphone,
  Tablet,
  Monitor,
  Camera,
  Upload,
  Trash2,
  RefreshCw,
  Settings,
  ArrowLeft,
  Sliders,
  ExternalLink,
  Copy,
  Check,
  Tag,
  MousePointerClick,
  Layers,
  Sparkles,
  Calendar as CalendarIcon,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

function dateInZone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (name: string) => parts.find((p) => p.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

const initialDate = new Date().toISOString().slice(0, 10);

export default function Heatmap() {
  const { domain = "" } = useParams();
  const { t } = useTranslation();
  const base = `/sites/${encodeURIComponent(domain)}/heatmap`;
  const [config, setConfig] = useState<HeatmapConfig | null>(null);
  const readOnly = isSubAccount() || config?.can_write === false;
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "scroll" ? "scroll" : "click";
  const scope = searchParams.get("scope") === "key" ? "key" : "url";
  const filterKey = scope === "key" ? searchParams.get("key") || "" : "";
  const filterPath = scope === "url" ? searchParams.get("path") || "" : "";

  const [captureURL, setCaptureURL] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [pages, setPages] = useState<PageCount[]>([]);
  const [selected, setSelected] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotID, setSnapshotID] = useState<number | null>(null);
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loadedDataKey, setLoadedDataKey] = useState("");
  const [loadedImageID, setLoadedImageID] = useState<number | null>(null);
  const [image, setImage] = useState("");
  const [imageError, setImageError] = useState(false);
  const [start, setStart] = useState(initialDate);
  const [end, setEnd] = useState(initialDate);
  const [range, setRange] = useState({ start: initialDate, end: initialDate });
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [opacity, setOpacity] = useState(0.7);
  const [showCapturePanel, setShowCapturePanel] = useState(false);
  const [copiedElement, setCopiedElement] = useState<string | null>(null);

  // 全局统一日期筛选器状态
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedCalendarRange, setSelectedCalendarRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  const selectedDateLabel = useMemo(() => {
    if (!config) return `${start} ~ ${end}`;
    const timezone = config.timezone;
    const today = dateInZone(new Date(), timezone);
    const yesterday = dateInZone(new Date(Date.now() - 86400000), timezone);
    const last7 = dateInZone(new Date(Date.now() - 6 * 86400000), timezone);
    const last30 = dateInZone(new Date(Date.now() - 29 * 86400000), timezone);

    if (start === today && end === today) {
      return t("heatmap.today");
    }
    if (start === yesterday && end === yesterday) {
      return t("heatmap.yesterday");
    }
    if (start === last7 && end === today) {
      return t("heatmap.lastDays", { days: 7 });
    }
    if (start === last30 && end === today) {
      return t("heatmap.lastDays", { days: 30 });
    }
    return `${start} ~ ${end}`;
  }, [start, end, config, t]);

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
    setRange({ start: s, end: e });
    setRevision((v) => v + 1);
  };

  const dataRequestKey = JSON.stringify([
    scope,
    filterKey,
    filterPath,
    selected,
    range.start,
    range.end,
  ]);
  const currentData = loadedDataKey === dataRequestKey ? data : null;
  const page = pages.find((p) => pageKey(p) === selected);
  const matching = snapshots.filter((p) => layoutKey(p, scope) === selected);
  const snapshot = matching.find((s) => s.id === snapshotID) ?? matching[0];
  const snapshotImageID = snapshot?.id;

  useEffect(() => {
    const controller = new AbortController();
    setReady(false);
    setError(false);
    setConfig(null);
    setPages([]);
    setSelected("");
    setData(null);
    setSnapshots([]);
    axios
      .get<BaseResponse<HeatmapConfig>>(base + "/config", {
        signal: controller.signal,
        timeout: 10000,
      })
      .then(({ data: res }) => {
        if (controller.signal.aborted) return;
        setConfig(res.data);
        const today = dateInZone(new Date(), res.data.timezone);
        const week = dateInZone(
          new Date(Date.now() - 6 * 86400000),
          res.data.timezone,
        );
        setStart(week);
        setEnd(today);
        setRange({ start: week, end: today });
        setReady(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [base]);

  useEffect(() => {
    if (!ready || mode !== "click") return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setData(null);
    setPages([]);
    setSnapshots([]);
    Promise.all([
      axios.get<BaseResponse<PageCount[]>>(base + "/pages", {
        params: { ...range, scope, key: filterKey, path: filterPath },
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
          p.data.data.some((item) => pageKey(item) === old)
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
  }, [base, ready, range, revision, scope, filterKey, filterPath, mode]);

  useEffect(() => {
    setData(null);
    if (!ready || !page || mode !== "click") return;
    const controller = new AbortController();
    axios
      .get<BaseResponse<HeatmapData>>(base + "/data", {
        params: {
          ...range,
          page: JSON.stringify(pageIdentity(page)),
          scope,
        },
        signal: controller.signal,
        timeout: 20000,
      })
      .then((res) => {
        if (!controller.signal.aborted) {
          setData(res.data.data);
          setLoadedDataKey(
            JSON.stringify([
              scope,
              filterKey,
              filterPath,
              selected,
              range.start,
              range.end,
            ]),
          );
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [base, ready, selected, range, page, scope, filterKey, filterPath, mode]);

  useEffect(() => {
    setImage("");
    setImageError(false);
    if (!snapshotImageID) return;
    const controller = new AbortController();
    let objectURL = "";
    axios
      .get<Blob>(`${base}/snapshots/${snapshotImageID}/image`, {
        responseType: "blob",
        signal: controller.signal,
        timeout: 10000,
      })
      .then((res) => {
        if (controller.signal.aborted) return;
        objectURL = URL.createObjectURL(res.data);
        setImage(objectURL);
        setLoadedImageID(snapshotImageID);
      })
      .catch(() => {
        if (!controller.signal.aborted) setImageError(true);
      });
    return () => {
      controller.abort();
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [base, snapshotImageID]);

  useEffect(() => {
    if (!page) {
      setCaptureURL("");
      return;
    }
    const example =
      scope === "key"
        ? config?.groups?.find(
            (g) => g.key === page.aggregation_key && g.example_url,
          )?.example_url
        : "";
    setCaptureURL(
      example ||
        (scope === "url" ? `https://${page.hostname}${page.path}` : ""),
    );
  }, [page, scope, config]);

  async function capture() {
    if (!page || !captureURL) return;
    setCapturing(true);
    try {
      const res = await axios.post<BaseResponse<Snapshot>>(
        base + "/capture",
        { url: captureURL, page: pageIdentity(page), scope },
        { timeout: 45000 },
      );
      setSnapshots((old) => [res.data.data, ...old]);
      setSnapshotID(res.data.data.id);
      toast.success(t("heatmap.captureSuccess"));
      setShowCapturePanel(false);
    } catch {
      /* axios reports errors */
    } finally {
      setCapturing(false);
    }
  }

  async function upload(file?: File) {
    if (!page || !file || scope === "key") return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("heatmap.imageLimit"));
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append("page", JSON.stringify(pageIdentity(page)));
    form.append("image", file);
    try {
      const res = await axios.post<BaseResponse<Snapshot>>(
        base + "/snapshots",
        form,
      );
      setSnapshots((old) => [res.data.data, ...old]);
      setSnapshotID(res.data.data.id);
      toast.success(t("common.saveSuccess"));
    } catch {
      /* axios reports request errors */
    } finally {
      setUploading(false);
    }
  }

  function preset(days: number, yesterday = false) {
    const timezone = config?.timezone ?? "UTC",
      now = Date.now() - (yesterday ? 86400000 : 0);
    const next = {
      start: dateInZone(new Date(now - (days - 1) * 86400000), timezone),
      end: dateInZone(new Date(now), timezone),
    };
    setStart(next.start);
    setEnd(next.end);
    setRange(next);
  }

  const handleCopyElement = (el: string) => {
    navigator.clipboard.writeText(el);
    setCopiedElement(el);
    setTimeout(() => setCopiedElement(null), 1500);
  };

  const getDeviceIcon = (dev: string) => {
    switch (dev) {
      case "mobile":
        return <Smartphone className="h-4 w-4 text-emerald-500" />;
      case "tablet":
        return <Tablet className="h-4 w-4 text-blue-500" />;
      default:
        return <Monitor className="h-4 w-4 text-indigo-500" />;
    }
  };

  const maxElementCount = useMemo(() => {
    if (!currentData?.elements?.length) return 1;
    return Math.max(1, ...currentData.elements.map((e) => e.count));
  }, [currentData?.elements]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link
              to={`/sites/${domain}/stats`}
              className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{domain}</span>
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-orange-500" />
              {t(mode === "scroll" ? "heatmap.scroll.title" : "heatmap.title")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {config && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs px-2.5 py-0.5",
                  config.enabled
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                )}
              >
                {t(config.enabled ? "heatmap.enabled" : "heatmap.disabled")}
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 gap-1.5 text-xs text-gray-600 dark:text-gray-300"
            >
              <Link to={`/sites/${domain}/settings/heatmap`}>
                <Settings className="h-3.5 w-3.5" />
                {t("heatmap.settings")}
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={() => {
                if (ready) {
                  setRevision((v) => v + 1);
                } else {
                  window.location.reload();
                }
              }}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Current Active Filter Banner (e.g. scope=key&key=pricing-template) */}
        {(filterKey || filterPath) && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 rounded-lg">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="font-medium text-indigo-900 dark:text-indigo-200">
                {t("heatmap.currentFilter")}:
              </span>
              <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 font-mono text-xs px-2 py-0.5">
                {filterKey || filterPath}
              </Badge>
              <span className="text-xs text-indigo-700 dark:text-indigo-400 hidden sm:inline">
                ({scope === "key" ? t("heatmap.byKey") : t("heatmap.byURL")})
              </span>
            </div>
            <Link
              to={`/sites/${domain}/heatmap`}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              {t("heatmap.showAll")}
            </Link>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm"
          >
            <span>{t("heatmap.loadFailed")}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (ready ? setRevision((v) => v + 1) : window.location.reload())}
              className="h-7 text-xs border-red-200 hover:bg-red-100 dark:border-red-800"
            >
              {t("heatmap.refresh")}
            </Button>
          </div>
        )}

        {!config && !error && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center text-sm text-gray-500">
            {t("common.loading")}
          </div>
        )}

        {config && (
          <div className="flex gap-2" role="group" aria-label={t("heatmap.scroll.mode")}>
            {(["click", "scroll"] as const).map(value => (
              <Button
                key={value}
                variant={mode === value ? "default" : "outline"}
                aria-pressed={mode === value}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set("mode", value);
                  setSearchParams(next);
                }}
              >
                {t(`heatmap.scroll.${value}Mode`)}
              </Button>
            ))}
          </div>
        )}
        {config && mode === "scroll" && (
          <ScrollWorkspace key={base} base={base} config={config} readOnly={readOnly} />
        )}
        {config && mode === "click" && (
          <>
            {/* Top Toolbar Card: Scope Tabs, Date Presets & Picker */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* View By Toggle Tabs */}
                <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchParams({ scope: "url" });
                      setSelected("");
                      setData(null);
                      setImage("");
                      setSnapshotID(null);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                      scope === "url"
                        ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    )}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>{t("heatmap.byURL")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchParams({ scope: "key" });
                      setSelected("");
                      setData(null);
                      setImage("");
                      setSnapshotID(null);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                      scope === "key"
                        ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    )}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    <span>{t("heatmap.byKey")}</span>
                  </button>
                </div>

                {/* Date Selection: Global-standard Period Dropdown & Dialog */}
                <div className="flex items-center gap-2">
                  <DropdownMenu open={isDateDropdownOpen} onOpenChange={setIsDateDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                          "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700",
                          "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                        )}
                      >
                        <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />
                        <span>{selectedDateLabel}</span>
                        <ChevronDown className="h-3 w-3 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48" align="end">
                      <DropdownMenuItem onClick={() => preset(1)}>
                        {t("heatmap.today")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => preset(1, true)}>
                        {t("heatmap.yesterday")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => preset(7)}>
                        {t("heatmap.lastDays", { days: 7 })}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => preset(30)}>
                        {t("heatmap.lastDays", { days: 30 })}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setIsDatePickerOpen(true);
                          setSelectedCalendarRange({
                            from: start ? new Date(start) : undefined,
                            to: end ? new Date(end) : undefined,
                          });
                          setIsDateDropdownOpen(false);
                        }}
                        className="text-indigo-600 dark:text-indigo-400"
                      >
                        {t("stats.period.customRange", "自定义时间范围")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Refresh Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => setRevision((v) => v + 1)}
                    disabled={loading}
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                  </Button>
                </div>

                {/* Date Picker Dialog (Double-month Range Picker like stats.tsx) */}
                <Dialog open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <DialogContent className="sm:max-w-auto w-auto p-0" showCloseButton={false}>
                    <DialogHeader className="sr-only">
                      <DialogTitle>{t("stats.selectDateRange", "选择日期范围")}</DialogTitle>
                    </DialogHeader>
                    <Calendar
                      mode="range"
                      showOutsideDays={false}
                      numberOfMonths={2}
                      onDayClick={handleDayClick}
                      selected={selectedCalendarRange}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    />
                    <div className="flex items-center justify-end gap-2 p-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsDatePickerOpen(false);
                          setSelectedCalendarRange({ from: undefined, to: undefined });
                        }}
                      >
                        {t("stats.cancel", "取消")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (selectedCalendarRange.from && selectedCalendarRange.to) {
                            applyCustomRange(selectedCalendarRange.from, selectedCalendarRange.to);
                          }
                          setIsDatePickerOpen(false);
                        }}
                      >
                        {t("stats.confirm", "确认")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Scope specific helper notice */}
              {scope === "key" && (
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-800">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>{t("heatmap.groupLayoutHelp")}</span>
                </p>
              )}

              {/* Page / Layout Select Bar */}
              {pages.length > 0 && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 shrink-0">
                      <Layout className="h-3.5 w-3.5 text-gray-400" />
                      <span>{t("heatmap.pageLayout")}</span>
                    </label>
                    <div className="flex-1 max-w-2xl">
                      <select
                        aria-label={t("heatmap.pageLayout")}
                        className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={selected}
                        onChange={(e) => {
                          setSelected(e.target.value);
                          setSnapshotID(null);
                        }}
                      >
                        {pages.map((p) => {
                          const dev = deviceClass(p);
                          return (
                            <option key={pageKey(p)} value={pageKey(p)}>
                              {scope === "key"
                                ? `${p.aggregation_key} · ${p.hostname}`
                                : `${p.hostname}${p.path}`}{" "}
                              · {p.version}/{p.variant} · {t(`heatmap.device.${dev}`)} · {p.clicks}{" "}
                              clicks
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Empty State */}
            {!loading && pages.length === 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center space-y-3">
                <MousePointerClick className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("heatmap.empty")}
                </p>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  {t("heatmap.dateHelp", { timezone: config.timezone })}
                </p>
              </div>
            )}

            {page && (
              <>
                {page.version === "unknown" && (
                  <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                    <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>{t("heatmap.unknownVersion")}</span>
                  </div>
                )}

                {/* Main Content Layout: Canvas (Left) + Analytics Sidebar (Right) */}
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  {/* Left Column: Canvas Toolbar + Visual Heatmap */}
                  <div className="space-y-4">
                    {/* Canvas Controls Header */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Device Badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300">
                          {getDeviceIcon(deviceClass(page))}
                          <span>{t(`heatmap.device.${deviceClass(page)}`)}</span>
                          <span className="text-gray-400 text-[10px]">
                            ({page.viewport_width}×{page.viewport_height})
                          </span>
                        </div>

                        {/* Snapshot Version Selector */}
                        {matching.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-gray-500 dark:text-gray-400">
                              {t("heatmap.snapshot")}:
                            </span>
                            <select
                              aria-label={t("heatmap.snapshot")}
                              className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-700 dark:text-gray-200 focus:outline-none"
                              value={snapshot?.id ?? ""}
                              onChange={(e) => setSnapshotID(Number(e.target.value))}
                            >
                              {matching.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {new Date(s.created_at).toLocaleString()}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Right side controls: Opacity slider & Capture actions */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Opacity Slider */}
                        <div className="flex items-center gap-2">
                          <Sliders className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500">{t("heatmap.opacity")}</span>
                          <input
                            aria-label={t("heatmap.opacity")}
                            type="range"
                            min={0.1}
                            max={1}
                            step={0.05}
                            value={opacity}
                            onChange={(e) => setOpacity(Number(e.target.value))}
                            className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                          <span className="text-xs font-mono text-gray-500 w-8">
                            {Math.round(opacity * 100)}%
                          </span>
                        </div>

                        {/* Screenshot Actions */}
                        {!readOnly && (
                          <div className="flex items-center gap-1.5 border-l border-gray-100 dark:border-gray-800 pl-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => setShowCapturePanel((v) => !v)}
                            >
                              <Camera className="h-3.5 w-3.5 text-indigo-500" />
                              <span>{t("heatmap.capture")}</span>
                            </Button>

                            {scope !== "key" && (
                              <label className="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                                <input
                                  className="sr-only"
                                  type="file"
                                  accept="image/png,image/jpeg"
                                  disabled={uploading}
                                  onChange={(e) => {
                                    void upload(e.target.files?.[0]);
                                    e.target.value = "";
                                  }}
                                />
                                <Upload className="h-3.5 w-3.5 text-gray-400" />
                                <span>{t(uploading ? "common.loading" : "heatmap.upload")}</span>
                              </label>
                            )}

                            {snapshot && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={async () => {
                                  if (!window.confirm(t("heatmap.deleteConfirm"))) return;
                                  try {
                                    await axios.delete(`${base}/snapshots/${snapshot.id}`);
                                    setSnapshots((old) => old.filter((s) => s.id !== snapshot.id));
                                    toast.success(t("common.deleteSuccess"));
                                  } catch {
                                    /* axios reports errors */
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Screenshot Capture Form Panel (collapsible or toggleable) */}
                    {showCapturePanel && !readOnly && (
                      <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-indigo-100 dark:border-indigo-900 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                            <Camera className="h-3.5 w-3.5 text-indigo-600" />
                            {t("heatmap.capture")}
                          </span>
                          <button
                            onClick={() => setShowCapturePanel(false)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
                          >
                            ×
                          </button>
                        </div>
                        <form
                          className="flex flex-col sm:flex-row items-center gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void capture();
                          }}
                        >
                          <Input
                            type="url"
                            required
                            value={captureURL}
                            onChange={(e) => setCaptureURL(e.target.value)}
                            placeholder={`https://${page.hostname}/pricing`}
                            className="h-8 text-xs flex-1"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            disabled={capturing || !config.screenshot_available || !captureURL}
                            className="h-8 text-xs w-full sm:w-auto"
                          >
                            {capturing ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : null}
                            {t(capturing ? "heatmap.capturing" : "heatmap.capture")}
                          </Button>
                        </form>
                        <p className="text-[11px] text-gray-500">
                          {t(
                            config.screenshot_available
                              ? "heatmap.captureHelp"
                              : "heatmap.captureUnavailable"
                          )}
                        </p>
                      </div>
                    )}

                    {snapshot?.source_url && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        <span>{t("heatmap.sourceURL")}:</span>
                        <a
                          href={snapshot.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                        >
                          {snapshot.source_url}
                        </a>
                      </div>
                    )}

                    {/* Heatmap Canvas Container */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-3 min-h-[400px] flex flex-col justify-center items-center">
                      {!snapshot && (
                        <div className="text-center p-12 space-y-3 max-w-sm">
                          <Camera className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto" />
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t("heatmap.noSnapshot")}
                          </p>
                          <p className="text-xs text-gray-400">
                            {t("heatmap.snapshotHelp", {
                              width: page.viewport_width,
                              height: page.viewport_height,
                              device: t(`heatmap.device.${deviceClass(page)}`),
                              version: page.version,
                            })}
                          </p>
                          {!readOnly && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowCapturePanel(true)}
                              className="mt-2 text-xs"
                            >
                              <Camera className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                              {t("heatmap.capture")}
                            </Button>
                          )}
                        </div>
                      )}

                      {imageError && (
                        <p role="alert" className="text-sm text-red-500 p-4">
                          {t("heatmap.loadFailed")}
                        </p>
                      )}

                      {snapshot && !image && !imageError && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 p-8">
                          <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                          <span>{t("common.loading")}</span>
                        </div>
                      )}

                      {snapshot && loadedImageID === snapshot.id && image && currentData && (
                        <div className="w-full flex justify-center">
                          <HeatmapCanvas
                            image={image}
                            page={snapshot}
                            data={currentData}
                            opacity={opacity}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Click Metrics & Elements Ranking Sidebar */}
                  <div className="space-y-4">
                    {/* Aggregate Clicks Card */}
                    <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                            <MousePointerClick className="h-4 w-4 text-indigo-600" />
                            {t("heatmap.clicks")}
                          </CardTitle>
                          {currentData && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              ID Deduplicated
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {!currentData ? (
                          <div className="h-16 flex items-center justify-center text-xs text-gray-400">
                            {t("common.loading")}
                          </div>
                        ) : (
                          <>
                            <div>
                              <div className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 tabular-nums">
                                {currentData.clicks.toLocaleString()}
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                {t("heatmap.sampledCounts")}
                              </p>
                            </div>

                            {currentData.unmapped > 0 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-md border border-gray-100 dark:border-gray-800">
                                {t("heatmap.unmapped", { count: currentData.unmapped })}
                              </div>
                            )}

                            {currentData.truncated && (
                              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-900">
                                {t("heatmap.truncated")}
                              </p>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Element Rankings Card (with progress bars like BreakdownTable) */}
                    <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-violet-600" />
                          {t("heatmap.elements")}
                        </CardTitle>
                        <p className="text-[11px] text-gray-400">
                          {t("heatmap.elementsHelp")}
                        </p>
                      </CardHeader>
                      <CardContent className="pt-1">
                        {!currentData ? (
                          <div className="py-6 text-center text-xs text-gray-400">
                            {t("common.loading")}
                          </div>
                        ) : currentData.elements.length === 0 ? (
                          <div className="py-8 text-center text-xs text-gray-400">
                            暂无元素统计 (请配置 data-zs-id)
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                            {currentData.elements.map((e, index) => {
                              const pct = Math.round((e.count / maxElementCount) * 100);
                              const isCopied = copiedElement === e.element;
                              return (
                                <div
                                  key={e.element}
                                  className="group relative rounded-md overflow-hidden p-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-800"
                                >
                                  {/* Progress bar background fill */}
                                  <div
                                    className="absolute inset-y-0 left-0 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-md transition-all -z-0"
                                    style={{ width: `${pct}%` }}
                                  />

                                  <div className="relative z-10 flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-[10px] text-gray-400 w-4 text-center shrink-0">
                                        {index + 1}
                                      </span>
                                      <span
                                        className="font-mono text-gray-800 dark:text-gray-200 truncate font-medium cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                                        title={e.element}
                                        onClick={() => handleCopyElement(e.element)}
                                      >
                                        {e.element}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyElement(e.element)}
                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-opacity"
                                      >
                                        {isCopied ? (
                                          <Check className="h-3 w-3 text-green-600" />
                                        ) : (
                                          <Copy className="h-3 w-3" />
                                        )}
                                      </button>
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums shrink-0">
                                      {e.count.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
