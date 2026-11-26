import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { BaseResponse } from "@utils/axios";
import type { StatsRequest, BreakdownResponse } from "@/pages/sites/types/interfaces";
import { Skeleton } from "@components/ui/skeleton";
import BreakdownDetailDialog from "./breakdown-detail";
import { useTranslation } from "react-i18next";
import { Flame, Gauge } from "lucide-react";

interface BreakdownTableProps {
  title: string;
  keyName: string;
  limit?: number;
  query: StatsRequest;
  setQuery: Dispatch<SetStateAction<StatsRequest>>;
  onAddFilter?: (dimension: string, operator: string, label: string, values: string[]) => void;
  api: (dateRange: StatsRequest) => Promise<BaseResponse<BreakdownResponse>>;
  exportApi?: (dateRange: StatsRequest) => Promise<Blob>;
  icon?: React.ReactNode;
}

export default function BreakdownTable({
  title,
  limit = 50,
  query,
  setQuery,
  onAddFilter,
  api,
  exportApi,
  icon,
}: BreakdownTableProps) {
  const INITIAL_DISPLAY = 9;
  const { domain } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BreakdownResponse | null>(null);
  const { t } = useTranslation();
  const [showMore, setShowMore] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api({ ...query, limit });
      if (result.data) {
        setData(result.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [api, query, limit]);

  useEffect(() => {
    if (query.refresh !== undefined) {
      fetchData();
    }
  }, [fetchData, query.refresh]);

  const rows = data?.data || [];
  const columns = data?.columns || (rows.length > 0 ? Object.keys(rows[0]) : []);
  const displayRows = showMore ? rows : rows.slice(0, INITIAL_DISPLAY);

  // First column is the dimension key, rest are metrics
  const keyColumn = columns[0] || "";
  const metricColumns = columns.slice(1);

  // Max value for bar width
  const maxVisits =
    rows.length > 0
      ? Math.max(
          ...rows.map((r) => {
            // Find first numeric metric for bar
            for (const col of metricColumns) {
              const val = r[col];
              if (typeof val === "number") return val;
            }
            return 0;
          })
        )
      : 0;

  const handleFilterClick = (rowValue: string) => {
    const property = query.property || "visit:source";
    if (onAddFilter) {
      onAddFilter(property, "is", title, [rowValue]);
    } else {
      setQuery((prev) => {
        let existing: unknown[] = [];
        try {
          existing = JSON.parse(prev.filters || "[]");
          if (!Array.isArray(existing)) existing = [];
        } catch {
          existing = [];
        }
        const next = [...existing, ["is", property, [rowValue]]];
        return {
          ...prev,
          filters: JSON.stringify(next),
          refresh: new Date(),
        };
      });
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border/80 shadow-2xs overflow-hidden flex flex-col justify-between min-h-[220px]">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            {icon && (
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/8 dark:bg-primary/15 text-primary">
                {icon}
              </span>
            )}
            <h3 className="text-sm font-semibold text-foreground">
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-4">
            {metricColumns.map((col) => (
              <span
                key={col}
                className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold"
              >
                {col}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-4 w-1/5" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted-foreground">{t('stats.breakdown.noData')}</div>
        ) : (
          <div className="py-1">
            {displayRows.map((row, index) => {
              const keyValue = String(row[keyColumn] ?? "");
              const firstMetric =
                metricColumns.length > 0 ? row[metricColumns[0]] : 0;
              const numericMetric =
                typeof firstMetric === "number" ? firstMetric : Number(firstMetric) || 0;
              const barWidth = maxVisits > 0 ? (numericMetric / maxVisits) * 100 : 0;

              return (
                <div key={index} className="relative group px-2 py-0.5">
                  {/* Inset horizontal data bar */}
                  <div
                    className="absolute inset-y-1 left-2 rounded-lg bg-primary/[0.08] dark:bg-primary/[0.16] group-hover:bg-primary/[0.13] dark:group-hover:bg-primary/[0.22] transition-all duration-300"
                    style={{ width: `calc(${Math.max(barWidth, 1.5)}% - 16px)` }}
                  />

                  {/* Content row */}
                  <div className="relative flex items-center justify-between px-2.5 py-1.5 rounded-lg">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-[11px] font-mono text-muted-foreground/80 w-4 text-right shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleFilterClick(keyValue)}
                          className="text-xs sm:text-sm font-medium text-foreground/90 hover:text-primary truncate max-w-[220px] text-left transition-colors"
                          title={keyValue}
                        >
                          {keyValue}
                        </button>
                        {query.property === "event:page" && domain && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/sites/${domain}/heatmap?scope=url&path=${encodeURIComponent(keyValue)}`);
                              }}
                              title={t("heatmap.actionTooltip", "查看该页面点击与滚动热力图")}
                              className="p-1 text-muted-foreground hover:text-orange-500 transition-colors rounded-md hover:bg-orange-500/10"
                            >
                              <Flame className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/sites/${domain}/performance?path=${encodeURIComponent(keyValue)}`);
                              }}
                              title={t("performance.actionTooltip", "查看该页面 Web Vitals 性能分析")}
                              className="p-1 text-muted-foreground hover:text-emerald-500 transition-colors rounded-md hover:bg-emerald-500/10"
                            >
                              <Gauge className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {metricColumns.map((col) => (
                        <span
                          key={col}
                          className="text-xs sm:text-sm font-semibold text-foreground/90 tabular-nums w-16 text-right"
                        >
                          {typeof row[col] === "number"
                            ? row[col].toLocaleString()
                            : String(row[col] ?? "")}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer: More / Detail buttons */}
      {!loading && rows.length > INITIAL_DISPLAY && (
        <div className="flex items-center border-t border-border/60 bg-muted/15">
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className="flex-1 px-4 py-2.5 text-xs font-medium text-primary hover:bg-muted/50 transition-colors"
          >
            {showMore ? t('stats.breakdown.collapse') : t('stats.breakdown.expand', { count: rows.length })}
          </button>
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors border-l border-border/60"
          >
            {t('stats.breakdown.details')}
          </button>
        </div>
      )}
      {!loading && rows.length > 0 && rows.length <= INITIAL_DISPLAY && (
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/15">
          <span className="px-4 py-2.5 text-xs text-muted-foreground">
            {t('stats.breakdown.totalItems', { count: rows.length })}
          </span>
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
          >
            {t('stats.breakdown.details')}
          </button>
        </div>
      )}

      {/* Detail Dialog */}
      <BreakdownDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={title}
        query={query}
        api={api}
        exportApi={exportApi}
        onFilterClick={handleFilterClick}
      />
    </div>
  );
}