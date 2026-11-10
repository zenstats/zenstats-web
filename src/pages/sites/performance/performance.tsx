import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, ArrowLeft, RefreshCw, Settings } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import axios, { type BaseResponse } from "@utils/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  metricValue,
  shiftDay,
  todayInZone,
  type PerformanceConfig,
  type PerformanceData,
  type Rating,
} from "./types";

const names = ["LCP", "INP", "CLS", "TTFB", "FCP"];
const ratingClass: Record<Rating, string> = {
  good: "text-emerald-700 dark:text-emerald-400",
  needs_improvement: "text-amber-700 dark:text-amber-400",
  poor: "text-red-700 dark:text-red-400",
  insufficient: "text-muted-foreground",
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
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to={`/sites/${domain}/stats`}
            className="text-sm text-muted-foreground hover:underline"
          >
            <ArrowLeft className="mr-1 inline h-4 w-4" />
            {domain}
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Activity className="h-5 w-5 text-violet-600" />
            {t("performance.title")}
          </h1>
        </div>
        <Button asChild variant="outline">
          <Link to={`/sites/${domain}/settings/performance`}>
            <Settings className="mr-2 h-4 w-4" />
            {t("performance.settings")}
          </Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("performance.description")}
      </p>
      {configError && (
        <div role="alert">
          <p>{t("performance.failed")}</p>
          <Button onClick={() => setConfigRevision((r) => r + 1)}>
            {t("common.retry")}
          </Button>
        </div>
      )}
      {!config && !configError && <p>{t("common.loading")}</p>}
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
  const today = todayInZone(config.timezone),
    earliest = shiftDay(today, 1 - config.raw_days);
  const metric = names.includes(params.get("metric") || "")
    ? params.get("metric")!
    : "LCP";
  const [start, setStart] = useState(earliest),
    [end, setEnd] = useState(today);
  const [filters, setFilters] = useState(() => ({
    ...emptyFilters,
    path: params.get("path") || "",
  }));
  const [selection, setSelection] = useState(filters);
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(false),
    [revision, setRevision] = useState(0);
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
  return (
    <>
      {!config.enabled && (
        <p className="rounded border border-amber-300 p-3 text-sm">
          {t("performance.disabled")}
        </p>
      )}
      <form
        className="space-y-3 rounded-lg border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSelection({ ...filters });
          setRevision((r) => r + 1);
        }}
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            {t("performance.start")}
            <Input
              aria-label={t("performance.start")}
              type="date"
              min={earliest}
              max={end}
              value={start}
              onChange={(e) => e.target.value && setStart(e.target.value)}
            />
          </label>
          <label className="text-sm">
            {t("performance.end")}
            <Input
              aria-label={t("performance.end")}
              type="date"
              min={start}
              max={today}
              value={end}
              onChange={(e) => e.target.value && setEnd(e.target.value)}
            />
          </label>
          <label className="text-sm">
            {t("performance.metric")}
            <select
              aria-label={t("performance.metric")}
              className="block rounded border bg-background p-2"
              value={metric}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                next.set("metric", e.target.value);
                setParams(next);
              }}
            >
              {names.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            {t("performance.device")}
            <select
              aria-label={t("performance.device")}
              className="block rounded border bg-background p-2"
              value={filters.device}
              onChange={(e) =>
                setFilters({ ...filters, device: e.target.value })
              }
            >
              <option value="">{t("performance.all")}</option>
              {["mobile", "tablet", "desktop"].map((d) => (
                <option key={d} value={d}>
                  {t(`heatmap.device.${d}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            {t("performance.navigation")}
            <select
              aria-label={t("performance.navigation")}
              className="block rounded border bg-background p-2"
              value={filters.navigation}
              onChange={(e) =>
                setFilters({ ...filters, navigation: e.target.value })
              }
            >
              <option value="">{t("performance.all")}</option>
              {[
                "navigate",
                "reload",
                "back-forward",
                "back-forward-cache",
                "prerender",
                "restore",
              ].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(["path", "hostname", "release", "browser", "country"] as const).map(
            (key) => (
              <label key={key} className="text-sm">
                {t(`performance.${key}`)}
                <Input
                  aria-label={t(`performance.${key}`)}
                  maxLength={
                    key === "country" ? 2 : key === "path" ? 1000 : 120
                  }
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
                />
              </label>
            ),
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">{t("performance.apply")}</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRevision((r) => r + 1)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("heatmap.refresh")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setFilters(emptyFilters);
              setSelection(emptyFilters);
            }}
          >
            {t("performance.clear")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("performance.rangeHelp", {
              days: config.raw_days,
              timezone: config.timezone,
            })}
          </p>
        </div>
      </form>
      {loading && <p>{t("common.loading")}</p>}
      {error && (
        <div role="alert" className="rounded border p-4">
          <p>{t("performance.failed")}</p>
          <Button variant="outline" onClick={() => setRevision((r) => r + 1)}>
            {t("common.retry")}
          </Button>
        </div>
      )}
      {current && (
        <>
          <div className="flex flex-wrap gap-4 rounded-lg border bg-card p-4">
            <strong className={ratingClass[current.overall]}>
              {t("performance.overall")}:{" "}
              {t(`performance.ratings.${current.overall}`)}
            </strong>
            <span>
              {t("performance.navigations")}:{" "}
              {current.sampled_navigations.toLocaleString()}
            </span>
            <span>
              {t("performance.eligible")}:{" "}
              {current.eligible_navigations.toLocaleString()}
            </span>
          </div>
          {!current.sampled_navigations && <p>{t("performance.empty")}</p>}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {current.metrics.map((m) => (
              <section
                key={m.name}
                aria-label={m.name}
                className="space-y-2 rounded-lg border bg-card p-4"
              >
                <h2 className="font-semibold">
                  {m.name}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {m.name === "TTFB" || m.name === "FCP"
                      ? t("performance.auxiliary")
                      : "Core"}
                  </span>
                </h2>
                <p className="text-2xl font-semibold">
                  {metricValue(m.p75, m.name)}
                </p>
                <p className={`text-sm ${ratingClass[m.rating]}`}>
                  P75 · {t(`performance.ratings.${m.rating}`)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("performance.samples")}: {m.samples.toLocaleString()} ·{" "}
                  {t("performance.coverage")}: {m.coverage.toFixed(1)}%
                </p>
                <div
                  className="flex h-2 overflow-hidden rounded bg-muted"
                  aria-hidden="true"
                >
                  {m.samples > 0 && (
                    <>
                      <span
                        className="bg-emerald-500"
                        style={{ width: `${(m.good / m.samples) * 100}%` }}
                      />
                      <span
                        className="bg-amber-400"
                        style={{
                          width: `${(m.needs_improvement / m.samples) * 100}%`,
                        }}
                      />
                      <span
                        className="bg-red-500"
                        style={{ width: `${(m.poor / m.samples) * 100}%` }}
                      />
                    </>
                  )}
                </div>
                <p className="text-xs">
                  {t("performance.distribution", {
                    good: m.good,
                    needs: m.needs_improvement,
                    poor: m.poor,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("performance.missing", {
                    missing: m.missing_navigations,
                    supported: m.supported_navigations,
                    clipped: m.clipped,
                  })}
                </p>
                {m.small_sample && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {t("performance.small")}
                  </p>
                )}
              </section>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("performance.quality", {
              late: current.late_init_navigations,
              background: current.background_init_navigations,
            })}
          </p>
          {(current.mixed_sampling || current.mixed_config) && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {t("performance.mixed")}
            </p>
          )}
          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="font-medium">
              {t("performance.trend")} · {metric}
            </h2>
            {current.trend.length > 0 ? (
              <>
                <div className="h-56" aria-label={t("performance.trend")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={current.trend}
                      margin={{ top: 8, right: 15, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="day"
                        tickFormatter={(value) => String(value).slice(5)}
                      />
                      <YAxis width={65} />
                      <Tooltip
                        formatter={(value) =>
                          metricValue(Number(value), metric)
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="p75"
                        name="P75"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  {current.trend.map((p) => (
                    <span key={p.day}>
                      {p.day}: {metricValue(p.p75, metric)} · n={p.samples}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("performance.noMetric")}
              </p>
            )}
          </section>
          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="font-medium">
              {t("performance.pages")} · {metric}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("performance.pagesHelp")}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2">{t("performance.page")}</th>
                    <th className="p-2">P75</th>
                    <th className="p-2">{t("performance.samples")}</th>
                    <th className="p-2">{t("performance.goodShare")}</th>
                  </tr>
                </thead>
                <tbody>
                  {current.pages.map((p) => (
                    <tr
                      key={p.hostname + p.path}
                      className="border-b last:border-0"
                    >
                      <td className="max-w-xl break-all p-2">
                        <button
                          className="text-left text-primary hover:underline"
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
                          }}
                        >
                          {p.hostname}
                          {p.path}
                        </button>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {metricValue(p.p75, metric)}
                      </td>
                      <td className="p-2">
                        {p.samples}
                        {p.samples < 100 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {t("performance.smallLabel")}
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        {p.samples
                          ? `${((p.good / p.samples) * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!current.pages.length && (
              <p className="text-sm text-muted-foreground">
                {t("performance.noMetric")}
              </p>
            )}
          </section>
          <p className="text-xs text-muted-foreground">
            {t("performance.updated")}:{" "}
            {new Date(current.generated_at).toLocaleString()}
          </p>
        </>
      )}
      <p className="rounded border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
        {t("performance.interpretation")}
      </p>
    </>
  );
}
