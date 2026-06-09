import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { BaseResponse } from "@utils/axios";
import type { StatsRequest, AggregateMetric, AggregateResponse } from "@/pages/sites/types/interfaces";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Play, Plus, X, RotateCcw, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const DEFAULT_BREAKDOWN_METRICS = ["visitors", "events"];
const BREAKDOWN_UNSUPPORTED_METRICS = new Set(["views_per_visit"]);
const EVENT_ONLY_DIMENSIONS = new Set(["event:name"]);
const SESSION_ONLY_METRICS = new Set(["pageviews", "bounce_rate", "visit_duration", "views_per_visit"]);
const PAGE_SIZE = 50;

function filterColumnsWithData(columns: string[], data: Record<string, unknown>[]): string[] {
  return columns.filter((col) => data.some((row) => row[col] != null && row[col] !== ""));
}

function isMetricAvailable(metric: string, resultType: "breakdown" | "aggregate", property: string) {
  if (resultType !== "breakdown") return true;
  if (BREAKDOWN_UNSUPPORTED_METRICS.has(metric)) return false;
  if (EVENT_ONLY_DIMENSIONS.has(property) && SESSION_ONLY_METRICS.has(metric)) return false;
  return true;
}

function sanitizeMetrics(metrics: string[], resultType: "breakdown" | "aggregate", property: string) {
  const available = metrics.filter((metric) => isMetricAvailable(metric, resultType, property));
  return available.length > 0 ? available : ["visitors"];
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
  breakdownApi: (params: StatsRequest) => Promise<BaseResponse<unknown>>;
  aggregateApi: (params: StatsRequest) => Promise<BaseResponse<AggregateResponse>>;
  exportApi: (params: StatsRequest) => Promise<Blob>;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function CustomQuery({
  query: baseQuery,
  domain,
  breakdownApi,
  aggregateApi,
  exportApi,
}: CustomQueryProps) {
  const { t } = useTranslation();

  const DIMENSION_OPTIONS = useMemo(() => [
    { group: t('stats.categories.events'), items: [
      { value: "event:name", label: t('stats.customQuery.dimensions.eventName') },
      { value: "event:page", label: t('stats.customQuery.dimensions.pagePath') },
    ]},
    { group: t('stats.categories.visit'), items: [
      { value: "visit:source", label: t('stats.customQuery.dimensions.source') },
      { value: "visit:country", label: t('stats.customQuery.dimensions.country') },
      { value: "visit:region", label: t('stats.customQuery.dimensions.region') },
      { value: "visit:city", label: t('stats.customQuery.dimensions.city') },
      { value: "visit:browser", label: t('stats.customQuery.dimensions.browser') },
      { value: "visit:os", label: t('stats.customQuery.dimensions.os') },
      { value: "visit:device", label: t('stats.customQuery.dimensions.device') },
      { value: "visit:entry_page", label: t('stats.customQuery.dimensions.entryPage') },
      { value: "visit:exit_page", label: t('stats.customQuery.dimensions.exitPage') },
    ]},
  ], [t]);

  const METRIC_OPTIONS = useMemo(() => [
    { value: "visitors", label: t('stats.customQuery.metrics.visitors') },
    { value: "pageviews", label: t('stats.customQuery.metrics.pageviews') },
    { value: "bounce_rate", label: t('stats.customQuery.metrics.bounceRate') },
    { value: "visit_duration", label: t('stats.customQuery.metrics.visitDuration') },
    { value: "views_per_visit", label: t('stats.customQuery.metrics.viewsPerVisit') },
    { value: "events", label: t('stats.customQuery.metrics.events') },
  ], [t]);

  const OPERATORS = useMemo(() => [
    { value: "is", label: t('stats.customQuery.operators.is') },
    { value: "is_not", label: t('stats.customQuery.operators.isNot') },
    { value: "contains", label: t('stats.customQuery.operators.contains') },
    { value: "contains_not", label: t('stats.customQuery.operators.containsNot') },
    { value: "matches", label: t('stats.customQuery.operators.matches') },
    { value: "matches_not", label: t('stats.customQuery.operators.matchesNot') },
  ], [t]);

  // Query form state
  const [property, setProperty] = useState("event:name");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(DEFAULT_BREAKDOWN_METRICS);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [limit, setLimit] = useState(100);
  const [resultType, setResultType] = useState<"breakdown" | "aggregate">("breakdown");

  // Results state
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState<Record<string, unknown>[] | null>(null);
  const [aggregateResult, setAggregateResult] = useState<Record<string, AggregateMetric> | null>(null);
  const [resultColumns, setResultColumns] = useState<string[]>([]);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const effectiveMetrics = sanitizeMetrics(selectedMetrics, resultType, property);

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
    if (!isMetricAvailable(metric, resultType, property)) return;
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    );
  };

  const handlePropertyChange = (value: string) => {
    setProperty(value);
    setSelectedMetrics((prev) => sanitizeMetrics(prev, resultType, value));
  };

  const handleResultTypeChange = (value: "breakdown" | "aggregate") => {
    setResultType(value);
    setSelectedMetrics((prev) => sanitizeMetrics(prev, value, property));
  };

  useEffect(() => {
    setSelectedMetrics((prev) => sanitizeMetrics(prev, resultType, property));
  }, [property, resultType]);

  const buildFiltersString = (): string | undefined => {
    const validFilters = filters.filter((f) => f.value.trim());
    if (validFilters.length === 0) return undefined;

    if (validFilters.length === 1) {
      const f = validFilters[0];
      return JSON.stringify([[f.operator, f.property, [f.value.trim()]]]);
    }

    return JSON.stringify([
      "and",
      validFilters.map((f) => [f.operator, f.property, [f.value.trim()]]),
    ]);
  };

  const lastQueryRef = useRef<{
    property: string;
    selectedMetrics: string[];
    filtersStr: string | undefined;
    resultType: "breakdown" | "aggregate";
  } | null>(null);

  const fetchBreakdownPage = useCallback(async (p: number) => {
    const last = lastQueryRef.current;
    if (!last) return;
    setLoading(true);
    try {
      const params: StatsRequest = {
        ...baseQuery,
        property: last.property,
        metrics: sanitizeMetrics(last.selectedMetrics, last.resultType, last.property).join(","),
        limit: PAGE_SIZE,
        page: p,
        filters: last.filtersStr,
        refresh: new Date(),
      };
      const result = await breakdownApi(params);
      if (result.data && typeof result.data === "object" && "data" in (result.data as object)) {
        const bdData = result.data as { columns?: string[]; data: Record<string, unknown>[] };
        setResultData(bdData.data);
        if (bdData.data.length > 0) {
          const cols = bdData.columns || Object.keys(bdData.data[0]);
          setResultColumns(filterColumnsWithData(cols, bdData.data));
        }
        setHasMore(bdData.data.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("查询失败:", error);
    } finally {
      setLoading(false);
    }
  }, [baseQuery, breakdownApi]);

  const executeQuery = useCallback(async () => {
    setLoading(true);
    setHasExecuted(true);
    setPage(1);
    const filtersStr = buildFiltersString();
    lastQueryRef.current = { property, selectedMetrics, filtersStr, resultType };
    try {
      const params: StatsRequest = {
        ...baseQuery,
        property,
        metrics: sanitizeMetrics(selectedMetrics, resultType, property).join(","),
        limit: resultType === "breakdown" ? PAGE_SIZE : limit,
        page: resultType === "breakdown" ? 1 : undefined,
        filters: filtersStr,
        refresh: new Date(),
      };

      if (resultType === "breakdown") {
        const result = await breakdownApi(params);
        if (result.data && typeof result.data === "object" && "data" in (result.data as object)) {
          const bdData = result.data as { columns?: string[]; data: Record<string, unknown>[] };
          setResultData(bdData.data);
          if (bdData.data.length > 0) {
            const cols = bdData.columns || Object.keys(bdData.data[0]);
            setResultColumns(filterColumnsWithData(cols, bdData.data));
          }
          setHasMore(bdData.data.length === PAGE_SIZE);
        }
        setAggregateResult(null);
      } else {
        const result = await aggregateApi(params);
        if (result.data && typeof result.data === "object" && "results" in (result.data as object)) {
          setAggregateResult((result.data as AggregateResponse).results);
        }
        setResultData(null);
        setHasMore(false);
      }
    } catch (error) {
      console.error("查询失败:", error);
    } finally {
      setLoading(false);
    }
  }, [baseQuery, property, selectedMetrics, limit, resultType, filters, breakdownApi, aggregateApi]);

  const handleReset = () => {
    setProperty("event:name");
    setSelectedMetrics(DEFAULT_BREAKDOWN_METRICS);
    setFilters([]);
    setLimit(100);
    setResultType("breakdown");
    setResultData(null);
    setAggregateResult(null);
    setHasExecuted(false);
    setPage(1);
    setHasMore(false);
    lastQueryRef.current = null;
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchBreakdownPage(newPage);
  };

  const handleExportCSV = async () => {
    if (!lastQueryRef.current) return;
    const last = lastQueryRef.current;
    try {
      const params: StatsRequest = {
        ...baseQuery,
        property: last.property,
        metrics: sanitizeMetrics(last.selectedMetrics, last.resultType, last.property).join(","),
        filters: last.filtersStr,
        refresh: new Date(),
      };
      const blob = await exportApi(params);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${domain}_${last.property}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("导出失败:", error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Query Form */}
      <div className="p-4 space-y-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('stats.customQuery.title')}
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 px-2 text-xs">
              <RotateCcw className="h-3 w-3 mr-1" />
              {t('stats.customQuery.reset')}
            </Button>
            <Button size="sm" onClick={executeQuery} className="h-7 px-3 text-xs">
              <Play className="h-3 w-3 mr-1" />
              {t('stats.customQuery.execute')}
            </Button>
          </div>
        </div>

        {/* Query type and property */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">{t('stats.customQuery.queryType')}</Label>
            <Select value={resultType} onValueChange={(v) => handleResultTypeChange(v as "breakdown" | "aggregate")}>
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
              <Select value={property} onValueChange={handlePropertyChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIMENSION_OPTIONS.map((group) => (
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
            <Label className="text-xs text-gray-500 mb-1 block">
              {t('stats.customQuery.limit')} {resultType === "breakdown" && "(Limit)"}
            </Label>
            <Input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="h-8 text-xs"
              min={1}
              max={1000}
            />
          </div>
        </div>

        {/* Metrics selector */}
        <div>
          <Label className="text-xs text-gray-500 mb-2 block">{t('stats.customQuery.metricsLabel')}</Label>
          <div className="flex flex-wrap gap-2">
            {METRIC_OPTIONS.map((metric) => {
              const disabled = !isMetricAvailable(metric.value, resultType, property);
              return (
              <button
                key={metric.value}
                onClick={() => toggleMetric(metric.value)}
                disabled={disabled}
                title={disabled ? t('stats.customQuery.metricUnavailable') : undefined}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors",
                  disabled && "cursor-not-allowed opacity-40",
                  selectedMetrics.includes(metric.value)
                    ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                    : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                )}
              >
                {metric.label}
              </button>
            );})}
          </div>
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
                    <span className="text-xs text-gray-400 w-8 shrink-0 text-center">
                      AND
                    </span>
                  )}
                  {index === 0 && filters.length > 1 && (
                    <span className="w-8 shrink-0" />
                  )}

                  {/* Filter property */}
                  <Select
                    value={filter.property}
                    onValueChange={(v) => updateFilter(filter.id, "property", v)}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1 min-w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIMENSION_OPTIONS.map((group) => (
                        <SelectGroup key={group.group}>
                          <SelectLabel>{group.group}</SelectLabel>
                          {group.items.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.value}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Operator */}
                  <Select
                    value={filter.operator}
                    onValueChange={(v) => updateFilter(filter.id, "operator", v)}
                  >
                    <SelectTrigger className="h-8 text-xs w-[100px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Value */}
                  <Input
                    value={filter.value}
                    onChange={(e) => updateFilter(filter.id, "value", e.target.value)}
                    placeholder={t('stats.customQuery.filterPlaceholder')}
                    className="h-8 text-xs flex-1"
                  />

                  {/* Remove */}
                  <button
                    onClick={() => removeFilter(filter.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Query preview */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md px-3 py-2">
          <div className="text-xs text-gray-400 mb-1">{t('stats.customQuery.apiPreview')}</div>
          <code className="text-xs text-gray-600 dark:text-gray-300 font-mono break-all">
            GET /api/stats/{domain}/{resultType === "breakdown" ? "breakdown" : "aggregate"}
            ?property={resultType === "breakdown" ? property : ""}
            &metrics={effectiveMetrics.join(",")}
            {filters.filter(f => f.value.trim()).length > 0 && `&filters=${buildFiltersString()}`}
            &limit={limit}
          </code>
        </div>
      </div>

      {/* Results */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-4 w-1/5" />
              </div>
            ))}
          </div>
        ) : !hasExecuted ? (
          <div className="text-center py-8 text-sm text-gray-400">
            {t('stats.customQuery.configHint')}
          </div>
        ) : resultType === "breakdown" && resultData ? (
          <div>
            {/* Results header with export */}
            {resultData.length > 0 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400">
                  {t('stats.customQuery.pageInfo', { page, count: resultData.length })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-7 px-2 text-xs gap-1.5"
                >
                  <Download className="h-3 w-3" />
                  {t('stats.customQuery.exportCsv')}
                </Button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left py-2 px-2 font-medium text-gray-500">#</th>
                    {resultColumns.map((col) => (
                      <th key={col} className="text-right py-2 px-2 font-medium text-gray-500">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultData.map((row, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                    >
                      <td className="py-2 px-2 text-gray-400">{(page - 1) * PAGE_SIZE + index + 1}</td>
                      {resultColumns.map((col) => (
                        <td
                          key={col}
                          className={cn(
                            "py-2 px-2",
                            col === resultColumns[0]
                              ? "text-right font-medium text-gray-900 dark:text-gray-100"
                              : "text-right text-gray-700 dark:text-gray-300 tabular-nums"
                          )}
                        >
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
                <div className="text-center py-4 text-sm text-gray-400">
                  {t('stats.customQuery.noResults')}
                </div>
              )}
            </div>
            {/* Pagination */}
            {(page > 1 || hasMore) && (
              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1 || loading}
                  className="h-7 px-2 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-gray-500 min-w-[4rem] text-center">
                  {t('stats.customQuery.pageOf', { page })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={loading || !hasMore}
                  className="h-7 px-2 text-xs"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        ) : resultType === "aggregate" && aggregateResult ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Object.entries(aggregateResult).map(([key, metric]) => (
              <div key={key} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
                  {METRIC_OPTIONS.find((m) => m.value === key)?.label || key}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {typeof metric.value === "number" ? metric.value.toLocaleString() : metric.value}
                </div>
                {metric.change !== null && metric.change !== undefined && (
                  <div
                    className={cn(
                      "text-xs mt-1",
                      metric.change >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {metric.change >= 0 ? "+" : ""}
                    {metric.change.toFixed(1)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-gray-400">
            {t('stats.customQuery.noResults')}
          </div>
        )}
      </div>
    </div>
  );
}