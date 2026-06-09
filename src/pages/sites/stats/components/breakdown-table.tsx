import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { BaseResponse } from "@utils/axios";
import type { StatsRequest, BreakdownResponse } from "@/pages/sites/types/interfaces";
import { Skeleton } from "@components/ui/skeleton";
import BreakdownDetailDialog from "./breakdown-detail";
import { useTranslation } from "react-i18next";

interface BreakdownTableProps {
  title: string;
  keyName: string;
  limit?: number;
  query: StatsRequest;
  setQuery: Dispatch<SetStateAction<StatsRequest>>;
  api: (dateRange: StatsRequest) => Promise<BaseResponse<BreakdownResponse>>;
  exportApi?: (dateRange: StatsRequest) => Promise<Blob>;
  icon?: React.ReactNode;
}

export default function BreakdownTable({
  title,
  limit = 9,
  query,
  setQuery,
  api,
  exportApi,
  icon,
}: BreakdownTableProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BreakdownResponse | null>(null);
  const { t } = useTranslation();
  const [showMore, setShowMore] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

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

  const rows = data?.data || [];
  const columns = data?.columns || (rows.length > 0 ? Object.keys(rows[0]) : []);
  const displayRows = showMore ? rows : rows.slice(0, limit);

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
    const filterValue = JSON.stringify([["is", property, [rowValue]]]);
    setQuery((prev) => ({ ...prev, filters: filterValue }));
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden min-h-[200px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-400">{icon}</span>}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-4">
          {metricColumns.map((col) => (
            <span
              key={col}
              className="text-xs text-gray-400 uppercase tracking-wider font-medium"
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
        <div className="p-8 text-center text-sm text-gray-400">{t('stats.breakdown.noData')}</div>
      ) : (
        <div>
          {displayRows.map((row, index) => {
            const keyValue = String(row[keyColumn] ?? "");
            const firstMetric =
              metricColumns.length > 0 ? row[metricColumns[0]] : 0;
            const numericMetric =
              typeof firstMetric === "number" ? firstMetric : Number(firstMetric) || 0;
            const barWidth = maxVisits > 0 ? (numericMetric / maxVisits) * 100 : 0;

            return (
              <div key={index} className="relative group">
                {/* Background bar */}
                <div
                  className="absolute inset-y-0 left-0 bg-indigo-50 dark:bg-indigo-950/30 transition-all duration-300"
                  style={{ width: `${barWidth}%` }}
                />

                {/* Content row */}
                <div className="relative flex items-center justify-between px-4 py-2 border-b border-gray-50 dark:border-gray-800/50 last:border-b-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs text-gray-400 w-5 text-right shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => handleFilterClick(keyValue)}
                        className="text-sm text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate max-w-[200px] text-left"
                        title={keyValue}
                      >
                        {keyValue}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {metricColumns.map((col) => (
                      <span
                        key={col}
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums w-16 text-right"
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

          {/* More / Detail buttons */}
          {rows.length > limit && (
            <div className="flex items-center border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setShowMore(!showMore)}
                className="flex-1 px-4 py-2.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {showMore ? t('stats.breakdown.collapse') : t('stats.breakdown.expand', { count: rows.length })}
              </button>
              <button
                onClick={() => setDetailOpen(true)}
                className="px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-l border-gray-100 dark:border-gray-800"
              >
                {t('stats.breakdown.details')}
              </button>
            </div>
          )}
          {/* Show detail button even when rows <= limit (no expand needed) */}
          {rows.length <= limit && (
            <div className="flex items-center justify-end border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setDetailOpen(true)}
                className="px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {t('stats.breakdown.details')}
              </button>
            </div>
          )}
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