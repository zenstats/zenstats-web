import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { BaseResponse } from "@utils/axios";
import type { StatsRequest, AggregateMetric, QueryV2Request, QueryV2Response } from "@/pages/sites/types/interfaces";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Play, Plus, X, RotateCcw, Download, ChevronLeft, ChevronRight,
  Code2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import axios from "@utils/axios";

const DEFAULT_METRICS = ["visitors", "events"];
const PAGE_SIZE = 50;

function filterColumnsWithData(columns: string[], data: Record<string, unknown>[]): string[] {
  return columns.filter((col) => data.some((row) => row[col] != null && row[col] !== ""));
}

interface FilterRow {
  id: string;
  property: string;
  operator: string;
  value: string;
}

interface CustomQueryProps {
  query: StatsRequest;
  domain: string;
  queryV2Api: (req: QueryV2Request) => Promise<BaseResponse<QueryV2Response>>;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function CustomQuery({ query: baseQuery, domain, queryV2Api }: CustomQueryProps) {
  const { t } = useTranslation();

  const DIMENSION_OPTIONS = useMemo(() => [
    { group: t('stats.categories.events'), items: [
      { value: "event:name", label: t('stats.customQuery.dimensions.eventName') },
      { value: "event:page", label: t('stats.customQuery.dimensions.pagePath') },
      { value: "event:hostname", label: t('stats.customQuery.dimensions.hostname') },
      { value: "event:goal", label: t('stats.customQuery.dimensions.goal') },
    ]},
    { group: t('stats.categories.visit'), items: [
      { value: "visit:source", label: t('stats.customQuery.dimensions.source') },
      { value: "visit:country", label: t('stats.customQuery.dimensions.country') },
      { value: "visit:region", label: t('stats.customQuery.dimensions.region') },
      { value: "visit:city", label: t('stats.customQuery.dimensions.city') },
      { value: "visit:browser", label: t('stats.customQuery.dimensions.browser') },
      { value: "visit:os", label: t('stats.customQuery.dimensions.os') },
      { value: "visit:device", label: t('stats.customQuery.dimensions.device') },
      { value: "visit:screen_size", label: t('stats.customQuery.dimensions.screenSize') },
      { value: "visit:entry_page", label: t('stats.customQuery.dimensions.entryPage') },
      { value: "visit:entry_page_hostname", label: t('stats.customQuery.dimensions.entryPageHostname') },
      { value: "visit:exit_page", label: t('stats.customQuery.dimensions.exitPage') },
      { value: "visit:exit_page_hostname", label: t('stats.customQuery.dimensions.exitPageHostname') },
    ]},
  ], [t]);

  const METRIC_OPTIONS = useMemo(() => [
    { value: "visitors", label: t('stats.customQuery.metrics.visitors') },
    { value: "pageviews", label: t('stats.customQuery.metrics.pageviews') },
    { value: "visits", label: t('stats.customQuery.metrics.visits') },
    { value: "events", label: t('stats.customQuery.metrics.events') },
    { value: "bounce_rate", label: t('stats.customQuery.metrics.bounceRate') },
    { value: "visit_duration", label: t('stats.customQuery.metrics.visitDuration') },
    { value: "views_per_visit", label: t('stats.customQuery.metrics.viewsPerVisit') },
    { value: "scroll_depth", label: t('stats.customQuery.metrics.scrollDepth') },
    { value: "time_on_page", label: t('stats.customQuery.metrics.timeOnPage') },
    { value: "exit_rate", label: t('stats.customQuery.metrics.exitRate') },
    { value: "conversion_rate", label: t('stats.customQuery.metrics.conversionRate') },
  ], [t]);

  const OPERATORS = useMemo(() => [
    { value: "is", label: t('stats.customQuery.operators.is') },
    { value: "is_not", label: t('stats.customQuery.operators.isNot') },
    { value: "contains", label: t('stats.customQuery.operators.contains') },
    { value: "contains_not", label: t('stats.customQuery.operators.containsNot') },
    { value: "matches", label: t('stats.customQuery.operators.matches') },
    { value: "matches_not", label: t('stats.customQuery.operators.matchesNot') },
  ], [t]);

  const [propKeys, setPropKeys] = useState<{ value: string; label: string }[]>([]);
  const CUSTOM_PROPS_PREFIX = "event:props:";

  const effectiveDimensionOptions = useMemo(() => {
    const groups = [...DIMENSION_OPTIONS];
    if (propKeys.length > 0) {
      groups.push({
        group: t('stats.categories.customProps'),
        items: propKeys.map((pk) => ({
          value: CUSTOM_PROPS_PREFIX + pk.value,
          label: pk.value,
        })),
      });
    }
    return groups;
  }, [DIMENSION_OPTIONS, propKeys, t]);

  useEffect(() => {
    if (!domain) return;
    const params: Record<string, string> = {
      filter_name: "prop_key",
      period: baseQuery.period || "p30",
    };
    if (baseQuery.date) params.date = baseQuery.date;
    if (baseQuery.from) params.from = baseQuery.from;
    if (baseQuery.to) params.to = baseQuery.to;

    axios.get<BaseResponse<{ value: string; label: string }[]>>(
      "/stats/" + domain + "/suggestions",
      { params },
    )
      .then((res) => {
        if (res.data?.data && Array.isArray(res.data.data)) {
          setPropKeys(res.data.data);
        }
      })
      .catch(() => {});
  }, [domain, baseQuery.period, baseQuery.date, baseQuery.from, baseQuery.to]);

  // Query form state
  const [resultType, setResultType] = useState<"breakdown" | "aggregate">("breakdown");
  const [property, setProperty] = useState("event:name");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(DEFAULT_METRICS);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [limit, setLimit] = useState(100);
  const [orderByMetric, setOrderByMetric] = useState("");
  const [orderByDir, setOrderByDir] = useState<"desc" | "asc">("desc");

  // UI state
  const [formExpanded, setFormExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState<Record<string, unknown>[] | null>(null);
  const [aggregateResult, setAggregateResult] = useState<Record<string, AggregateMetric> | null>(null);
  const [resultColumns, setResultColumns] = useState<string[]>([]);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const addFilter = () => {
    setFilters((prev) => [
      ...prev,
      { id: generateId(), property: "event:name", operator: "is", value: "" },
    ]);
  };

  const removeFilter = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFilter = (id: string, field: keyof FilterRow, value: string) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const toggleMetric = (metric: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    );
  };

  // 按后端 API 的指标/维度约束校验当前组合，返回 {指标: 错误信息}。
  // event:goal 拆分在后端按"每个目标一次带 goal 过滤的聚合"处理，故等价于
  // 「聚合 + 隐式 event:goal 过滤」，据此统一套用聚合规则。
  const metricIssues = useMemo<Record<string, string>>(() => {
    let dim = resultType === "breakdown" ? property : "";
    const fset = new Set(filters.filter((f) => f.value.trim()).map((f) => f.property));
    if (resultType === "breakdown" && property === "event:goal") {
      dim = "";
      fset.add("event:goal");
    }
    const has = (d: string) => fset.has(d);
    const isEventOnlyProp = (p: string) =>
      p === "event:name" || p === "event:goal" || p.startsWith("event:props:");
    const sessionScoped = new Set(["pageviews", "bounce_rate", "visit_duration", "views_per_visit", "visits"]);

    const issues: Record<string, string> = {};
    for (const m of selectedMetrics) {
      let err = "";
      switch (m) {
        case "time_on_page":
          if (has("event:goal")) err = t('stats.customQuery.issues.timeOnPageGoalFilter');
          else if (has("event:name")) err = t('stats.customQuery.issues.timeOnPageNameFilter');
          else if (dim && dim !== "event:page") err = t('stats.customQuery.issues.pageBreakdownOnly', { metric: m });
          else if (!dim && !has("event:page")) err = t('stats.customQuery.issues.needsPage', { metric: m });
          break;
        case "conversion_rate":
          if (!has("event:goal")) err = t('stats.customQuery.issues.needsGoal', { metric: m });
          break;
        case "exit_rate":
          if (dim && dim !== "event:page") err = t('stats.customQuery.issues.pageBreakdownOnly', { metric: m });
          else if (!dim && !has("event:page")) err = t('stats.customQuery.issues.needsPage', { metric: m });
          break;
        case "scroll_depth":
          if (dim && dim !== "event:page") err = t('stats.customQuery.issues.pageBreakdownOnly', { metric: m });
          break;
        case "views_per_visit":
          if (has("event:page")) err = t('stats.customQuery.issues.viewsPerVisitPageFilter');
          else if (dim) err = t('stats.customQuery.issues.noBreakdown', { metric: m });
          break;
        default:
          if (dim && isEventOnlyProp(dim) && sessionScoped.has(m)) {
            err = t('stats.customQuery.issues.sessionMetricEventDim', { metric: m, dim });
          }
      }
      if (err) issues[m] = err;
    }
    return issues;
  }, [selectedMetrics, resultType, property, filters, t]);

  const hasMetricIssues = Object.keys(metricIssues).length > 0;

  const buildFiltersArray = useCallback((): unknown | undefined => {
    const validFilters = filters.filter((f) => f.value.trim());
    if (validFilters.length === 0) return undefined;

    if (validFilters.length === 1) {
      const f = validFilters[0];
      return [[f.operator, f.property, [f.value.trim()]]];
    }
    return [
      "and",
      validFilters.map((f) => [f.operator, f.property, [f.value.trim()]]),
    ];
  }, [filters]);

  const lastQueryRef = useRef<{
    property: string;
    selectedMetrics: string[];
    filtersArray: unknown | undefined;
    resultType: "breakdown" | "aggregate";
    limit: number;
    offset: number;
    orderByMetric: string;
    orderByDir: "desc" | "asc";
  } | null>(null);

  const buildV2Request = useCallback((overrides?: { offset?: number; limit?: number }): QueryV2Request => {
    const last = lastQueryRef.current;
    const filtersArray = last?.filtersArray ?? buildFiltersArray();
    const metrics = last?.selectedMetrics ?? selectedMetrics;
    const dimensions = last?.resultType === "breakdown" && last?.property
      ? [last.property]
      : [];
    const orderBy: [string, string][] = [];
    if (last?.orderByMetric && last.orderByMetric !== "none") {
      orderBy.push([last.orderByMetric, last.orderByDir || "desc"]);
    }

    return {
      period: baseQuery.period,
      from: baseQuery.from,
      to: baseQuery.to,
      date: baseQuery.date,
      metrics,
      dimensions,
      filters: filtersArray,
      order_by: orderBy.length > 0 ? orderBy : undefined,
      limit: overrides?.limit ?? limit,
      offset: overrides?.offset ?? offset,
    };
  }, [baseQuery, selectedMetrics, limit, offset, buildFiltersArray]);

  const executeQuery = useCallback(async () => {
    // 按 API 约束提前拦截非法指标/维度组合，给出清晰提示（避免后端 400/500）
    if (hasMetricIssues) {
      setHasExecuted(true);
      setError(Object.values(metricIssues)[0]);
      return;
    }
    setLoading(true);
    setHasExecuted(true);
    setError(null);
    setOffset(0);
    const filtersArray = buildFiltersArray();
    lastQueryRef.current = {
      property,
      selectedMetrics,
      filtersArray,
      resultType,
      limit: resultType === "breakdown" ? PAGE_SIZE : limit,
      offset: 0,
      orderByMetric,
      orderByDir,
    };
    try {
      const req = buildV2Request({ offset: 0, limit: resultType === "breakdown" ? PAGE_SIZE : limit });
      const result = await queryV2Api(req);
      const data = result.data;
      if (resultType === "aggregate" && data?.results) {
        setAggregateResult(data.results);
        setResultData(null);
        setHasMore(false);
      } else if (data?.data) {
        setResultData(data.data as Record<string, unknown>[]);
        setAggregateResult(null);
        if (data.data.length > 0) {
          const cols = data.columns || Object.keys(data.data[0]);
          setResultColumns(filterColumnsWithData(cols, data.data as Record<string, unknown>[]));
        }
        if (data.total_rows) setTotalRows(data.total_rows);
        else setTotalRows(data.data.length);
        setHasMore(data.data.length === PAGE_SIZE);
      }
      setFormExpanded(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [buildV2Request, property, selectedMetrics, limit, resultType, orderByMetric, orderByDir, queryV2Api, hasMetricIssues, metricIssues]);

  const fetchPage = useCallback(async (newOffset: number) => {
    const last = lastQueryRef.current;
    if (!last) return;
    setLoading(true);
    try {
      const req = buildV2Request({ offset: newOffset, limit: PAGE_SIZE });
      const result = await queryV2Api(req);
      const data = result.data;
      if (data?.data) {
        setResultData(data.data as Record<string, unknown>[]);
        setOffset(newOffset);
        if (data.data.length > 0) {
          const cols = data.columns || Object.keys(data.data[0]);
          setResultColumns(filterColumnsWithData(cols, data.data as Record<string, unknown>[]));
        }
        if (data.total_rows) setTotalRows(data.total_rows);
        setHasMore(data.data.length === PAGE_SIZE);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [buildV2Request, queryV2Api]);

  const handleReset = () => {
    setProperty("event:name");
    setSelectedMetrics(DEFAULT_METRICS);
    setFilters([]);
    setLimit(100);
    setOrderByMetric("");
    setOrderByDir("desc");
    setResultType("breakdown");
    setResultData(null);
    setAggregateResult(null);
    setHasExecuted(false);
    setError(null);
    setOffset(0);
    setHasMore(false);
    setTotalRows(0);
    lastQueryRef.current = null;
    setFormExpanded(true);
  };

  const handlePageChange = (newOffset: number) => {
    fetchPage(newOffset);
  };

  const handleExportCSV = async () => {
    if (!lastQueryRef.current) return;
    try {
      const req = buildV2Request({ offset: 0, limit: 10000 });
      const result = await queryV2Api(req);
      if (!result.data?.data) return;
      const data = result.data.data as Record<string, unknown>[];
      if (data.length === 0) return;
      const cols = result.data.columns || Object.keys(data[0]);
      const csvRows = [cols.join(",")];
      for (const row of data) {
        csvRows.push(cols.map(c => {
          const v = row[c];
          if (typeof v === "string" && v.includes(",")) return `"${v}"`;
          return String(v ?? "");
        }).join(","));
      }
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const d = baseQuery.date;
      const from = baseQuery.from, to = baseQuery.to;
      const datePart = from && to ? `${from}_${to}` : (d || new Date().toISOString().slice(0, 10));
      link.download = `${domain}_${lastQueryRef.current.property}_${datePart}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const queryPreview = useMemo(() => {
    const filtersArray = buildFiltersArray();
    const metrics = selectedMetrics;
    const dimensions = resultType === "breakdown" ? [property] : [];
    const orderBy: [string, string][] = [];
    if (orderByMetric && orderByMetric !== "none") orderBy.push([orderByMetric, orderByDir]);
    const body = JSON.stringify({
      period: baseQuery.period || "p30",
      from: baseQuery.from,
      to: baseQuery.to,
      date: baseQuery.date,
      metrics,
      dimensions,
      filters: filtersArray,
      order_by: orderBy.length > 0 ? orderBy : undefined,
      limit: limit,
    }, null, 2);
    return { url: `/api/v2/query/${domain}`, body };
  }, [domain, baseQuery, selectedMetrics, property, resultType, limit, orderByMetric, orderByDir, buildFiltersArray, filters]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              {t('stats.customQuery.title')}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {t('stats.customQuery.desc')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasExecuted && (
              <Button variant="outline" size="sm" onClick={handleReset} className="h-8 px-3 text-xs">
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                {t('stats.customQuery.reset')}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setFormExpanded(!formExpanded)}
              variant="ghost"
              className="h-8 px-3 text-xs"
            >
              {formExpanded ? t('stats.customQuery.hideForm') : t('stats.customQuery.showForm')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {formExpanded && (
          <div className="space-y-4 p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg border border-gray-100 dark:border-gray-800">
            {/* Query type, property, limit */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">{t('stats.customQuery.queryType')}</Label>
                <Select value={resultType} onValueChange={(v) => setResultType(v as "breakdown" | "aggregate")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakdown">{t('stats.customQuery.breakdownQuery')}</SelectItem>
                    <SelectItem value="aggregate">{t('stats.customQuery.aggregateQuery')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {resultType === "breakdown" && (
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">{t('stats.customQuery.groupBy')}</Label>
                  <Select value={property} onValueChange={setProperty}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {effectiveDimensionOptions.map((group) => (
                        <SelectGroup key={group.group}>
                          <SelectLabel>{group.group}</SelectLabel>
                          {group.items.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.value} ({item.label})
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-xs text-gray-500 mb-1 block">{t('stats.customQuery.limit')}</Label>
                <Input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="h-8 text-xs"
                  min={1}
                  max={10000}
                />
              </div>

              {resultType === "breakdown" && (
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">{t('stats.customQuery.orderBy')}</Label>
                  <div className="flex gap-2">
                    <Select value={orderByMetric} onValueChange={setOrderByMetric}>
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {METRIC_OPTIONS.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={orderByDir} onValueChange={(v) => setOrderByDir(v as "desc" | "asc")}>
                      <SelectTrigger className="h-8 text-xs w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">↓</SelectItem>
                        <SelectItem value="asc">↑</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Metrics selector */}
            <div>
              <Label className="text-xs text-gray-500 mb-2 block">{t('stats.customQuery.metricsLabel')}</Label>
              <div className="flex flex-wrap gap-1.5">
                {METRIC_OPTIONS.map((metric) => {
                  const selected = selectedMetrics.includes(metric.value);
                  const invalid = selected && !!metricIssues[metric.value];
                  return (
                  <button
                    key={metric.value}
                    onClick={() => toggleMetric(metric.value)}
                    title={invalid ? metricIssues[metric.value] : undefined}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors",
                      invalid
                        ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                        : selected
                        ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                        : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                  >
                    {metric.label}
                  </button>
                );})}
              </div>
              {hasMetricIssues && (
                <ul className="mt-2 space-y-1">
                  {Object.entries(metricIssues).map(([m, msg]) => (
                    <li key={m} className="text-xs text-amber-600 dark:text-amber-400">• {msg}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Filters */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-gray-500">{t('stats.customQuery.filters')}</Label>
                <Button variant="ghost" size="sm" onClick={addFilter} className="h-6 px-2 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  {t('stats.customQuery.addFilter')}
                </Button>
              </div>

              {filters.length > 0 && (
                <div className="space-y-2">
                  {filters.map((filter, index) => (
                    <div key={filter.id} className="flex items-center gap-2">
                      {index > 0 && (
                        <span className="text-xs text-gray-400 w-8 shrink-0 text-center font-mono">AND</span>
                      )}
                      {index === 0 && filters.length > 1 && <span className="w-8 shrink-0" />}

                      <Select value={filter.property} onValueChange={(v) => updateFilter(filter.id, "property", v)}>
                        <SelectTrigger className="h-8 text-xs flex-1 min-w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {effectiveDimensionOptions.map((group) => (
                            <SelectGroup key={group.group}>
                              <SelectLabel>{group.group}</SelectLabel>
                              {group.items.map((item) => (
                                <SelectItem key={item.value} value={item.value}>{item.value}</SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={filter.operator} onValueChange={(v) => updateFilter(filter.id, "operator", v)}>
                        <SelectTrigger className="h-8 text-xs w-[100px] shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, "value", e.target.value)}
                        placeholder={t('stats.customQuery.filterPlaceholder')}
                        className="h-8 text-xs flex-1"
                      />

                      <button onClick={() => removeFilter(filter.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* API preview */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-md px-3 py-2">
              <div className="text-xs text-gray-400 mb-1">{t('stats.customQuery.apiPreview')}</div>
              <code className="text-xs text-gray-600 dark:text-gray-300 font-mono break-all whitespace-pre-wrap">
                POST {queryPreview.url}{"\n"}
                {queryPreview.body}
              </code>
            </div>

            {/* Execute button */}
            <Button onClick={executeQuery} disabled={loading || hasMetricIssues} className="w-full" size="sm">
              <Play className="h-4 w-4 mr-1.5" />
              {t('stats.customQuery.execute')}
            </Button>
          </div>
        )}

        {/* Results area */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        {loading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-4 w-1/5" />
              </div>
            ))}
          </div>
        ) : !hasExecuted ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            <Code2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{t('stats.customQuery.configHint')}</p>
          </div>
        ) : resultType === "breakdown" && resultData ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">
                {totalRows > 0
                  ? t('stats.customQuery.totalRows', { total: totalRows })
                  : t('stats.customQuery.rows', { count: resultData.length })}
              </span>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-7 px-2 text-xs gap-1.5">
                <Download className="h-3 w-3" />
                {t('stats.customQuery.exportCsv')}
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left py-2.5 px-3 font-medium text-gray-500 w-[50px]">#</th>
                    {resultColumns.map((col) => (
                      <th key={col} className="text-right py-2.5 px-3 font-medium text-gray-500">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultData.map((row, index) => (
                    <tr key={index} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-gray-400 tabular-nums">{offset + index + 1}</td>
                      {resultColumns.map((col) => (
                        <td key={col} className={cn(
                          "py-2.5 px-3",
                          col === resultColumns[0]
                            ? "text-right font-medium text-gray-900 dark:text-gray-100"
                            : "text-right text-gray-700 dark:text-gray-300 tabular-nums"
                        )}>
                          {typeof row[col] === "number"
                            ? (row[col] as number).toLocaleString()
                            : String(row[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {resultData.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">{t('stats.customQuery.noResults')}</div>
              )}
            </div>
            {(offset > 0 || hasMore) && (
              <div className="flex items-center justify-center gap-3 mt-4 pt-3">
                <Button variant="outline" size="sm" onClick={() => handlePageChange(offset - PAGE_SIZE)} disabled={offset <= 0 || loading} className="h-8 px-3 text-xs gap-1">
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {t('stats.customQuery.prev')}
                </Button>
                <span className="text-xs text-gray-500 min-w-[5rem] text-center tabular-nums">
                  {offset + 1}–{offset + resultData.length}
                </span>
                <Button variant="outline" size="sm" onClick={() => handlePageChange(offset + PAGE_SIZE)} disabled={loading || !hasMore} className="h-8 px-3 text-xs gap-1">
                  {t('stats.customQuery.next')}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        ) : resultType === "aggregate" && aggregateResult ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Object.entries(aggregateResult).map(([key, metric]) => (
              <div key={key} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                <div className="text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-medium">
                  {METRIC_OPTIONS.find((m) => m.value === key)?.label || key}
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                  {typeof metric.value === "number" ? metric.value.toLocaleString() : metric.value}
                </div>
                {metric.change !== null && metric.change !== undefined && (
                  <div className={cn("text-xs mt-1.5 font-medium", metric.change >= 0 ? "text-green-600" : "text-red-600")}>
                    {metric.change >= 0 ? "+" : ""}{metric.change.toFixed(1)}% {t('stats.customQuery.vsPrevious')}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">{t('stats.customQuery.noResults')}</div>
        )}
      </CardContent>
    </Card>
  );
}
