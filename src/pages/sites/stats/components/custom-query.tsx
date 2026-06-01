import { useState, useCallback } from "react";
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
import { Play, Plus, X, RotateCcw } from "lucide-react";

// Dimension options for property selector (API-supported only)
const DIMENSION_OPTIONS = [
  { group: "事件", items: [
    { value: "event:name", label: "事件名称" },
    { value: "event:page", label: "页面路径" },
  ]},
  { group: "访问", items: [
    { value: "visit:source", label: "来源" },
    { value: "visit:country", label: "国家/地区" },
    { value: "visit:region", label: "地区" },
    { value: "visit:city", label: "城市" },
    { value: "visit:browser", label: "浏览器" },
    { value: "visit:os", label: "操作系统" },
    { value: "visit:device", label: "设备类型" },
    { value: "visit:screen_size", label: "屏幕尺寸" },
    { value: "visit:entry_page", label: "入口页面" },
    { value: "visit:exit_page", label: "退出页面" },
  ]},
];

// Metric options
const METRIC_OPTIONS = [
  { value: "visitors", label: "独立访客 (UV)" },
  { value: "pageviews", label: "浏览量 (PV)" },
  { value: "bounce_rate", label: "跳出率" },
  { value: "visit_duration", label: "平均访问时长" },
  { value: "views_per_visit", label: "每次访问页面数" },
  { value: "events", label: "事件数" },
];

// Filter operators
const OPERATORS = [
  { value: "is", label: "是 (=)" },
  { value: "is_not", label: "不是 (≠)" },
  { value: "contains", label: "包含" },
  { value: "contains_not", label: "不包含" },
  { value: "matches", label: "匹配" },
  { value: "matches_not", label: "不匹配" },
];

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
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function CustomQuery({
  query: baseQuery,
  domain,
  breakdownApi,
  aggregateApi,
}: CustomQueryProps) {
  // Query form state
  const [property, setProperty] = useState("event:name");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["visitors", "events"]);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [limit, setLimit] = useState(100);
  const [resultType, setResultType] = useState<"breakdown" | "aggregate">("breakdown");

  // Results state
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState<Record<string, unknown>[] | null>(null);
  const [aggregateResult, setAggregateResult] = useState<Record<string, AggregateMetric> | null>(null);
  const [resultColumns, setResultColumns] = useState<string[]>([]);
  const [hasExecuted, setHasExecuted] = useState(false);

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

  const executeQuery = useCallback(async () => {
    setLoading(true);
    setHasExecuted(true);
    try {
      const filtersStr = buildFiltersString();
      const params: StatsRequest = {
        ...baseQuery,
        property,
        metrics: selectedMetrics.join(","),
        limit,
        filters: filtersStr,
        refresh: new Date(),
      };

      if (resultType === "breakdown") {
        const result = await breakdownApi(params);
        if (result.data && typeof result.data === "object" && "data" in (result.data as object)) {
          const bdData = result.data as { columns?: string[]; data: Record<string, unknown>[] };
          setResultData(bdData.data);
          if (bdData.data.length > 0) {
            setResultColumns(bdData.columns || Object.keys(bdData.data[0]));
          }
        }
        setAggregateResult(null);
      } else {
        const result = await aggregateApi(params);
        if (result.data && typeof result.data === "object" && "results" in (result.data as object)) {
          setAggregateResult((result.data as AggregateResponse).results);
        }
        setResultData(null);
      }
    } catch (error) {
      console.error("查询失败:", error);
    } finally {
      setLoading(false);
    }
  }, [baseQuery, property, selectedMetrics, limit, resultType, filters, breakdownApi, aggregateApi]);

  const handleReset = () => {
    setProperty("event:name");
    setSelectedMetrics(["visitors", "events"]);
    setFilters([]);
    setLimit(100);
    setResultType("breakdown");
    setResultData(null);
    setAggregateResult(null);
    setHasExecuted(false);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Query Form */}
      <div className="p-4 space-y-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            自定义查询
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 px-2 text-xs">
              <RotateCcw className="h-3 w-3 mr-1" />
              重置
            </Button>
            <Button size="sm" onClick={executeQuery} className="h-7 px-3 text-xs">
              <Play className="h-3 w-3 mr-1" />
              执行查询
            </Button>
          </div>
        </div>

        {/* Query type and property */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">查询类型</Label>
            <Select value={resultType} onValueChange={(v) => setResultType(v as "breakdown" | "aggregate")}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakdown">分解查询 (Breakdown)</SelectItem>
                <SelectItem value="aggregate">聚合查询 (Aggregate)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {resultType === "breakdown" && (
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">分组维度 (Property)</Label>
              <Select value={property} onValueChange={setProperty}>
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
              限制条数 {resultType === "breakdown" && "(Limit)"}
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
          <Label className="text-xs text-gray-500 mb-2 block">指标 (Metrics)</Label>
          <div className="flex flex-wrap gap-2">
            {METRIC_OPTIONS.map((metric) => (
              <button
                key={metric.value}
                onClick={() => toggleMetric(metric.value)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors",
                  selectedMetrics.includes(metric.value)
                    ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                    : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                )}
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-gray-500">筛选条件 (Filters)</Label>
            <Button variant="ghost" size="sm" onClick={addFilter} className="h-6 px-2 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              添加条件
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
                    placeholder="输入值，多值用逗号分隔"
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
          <div className="text-xs text-gray-400 mb-1">API 请求预览</div>
          <code className="text-xs text-gray-600 dark:text-gray-300 font-mono break-all">
            GET /api/stats/{domain}/{resultType === "breakdown" ? "breakdown" : "aggregate"}
            ?property={resultType === "breakdown" ? property : ""}
            &metrics={selectedMetrics.join(",")}
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
            配置查询参数后点击"执行查询"查看结果
          </div>
        ) : resultType === "breakdown" && resultData ? (
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
                    <td className="py-2 px-2 text-gray-400">{index + 1}</td>
                    {resultColumns.map((col) => (
                      <td
                        key={col}
                        className={cn(
                          "py-2 px-2",
                          col === resultColumns[0]
                            ? "text-left font-medium text-gray-900 dark:text-gray-100"
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
                查询无结果
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
            查询无结果
          </div>
        )}
      </div>
    </div>
  );
}