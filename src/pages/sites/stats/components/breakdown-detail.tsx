import { useCallback, useEffect, useState } from "react";
import type { BaseResponse } from "@utils/axios";
import type { StatsRequest, BreakdownResponse } from "@/pages/sites/types/interfaces";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BreakdownDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  query: StatsRequest;
  api: (dateRange: StatsRequest) => Promise<BaseResponse<BreakdownResponse>>;
  exportApi?: (dateRange: StatsRequest) => Promise<Blob>;
  onFilterClick?: (value: string) => void;
}

const PAGE_SIZE = 50;

export default function BreakdownDetailDialog({
  open,
  onOpenChange,
  title,
  query,
  api,
  exportApi,
  onFilterClick,
}: BreakdownDetailDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BreakdownResponse | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const fetchData = useCallback(async (p: number) => {
    try {
      setLoading(true);
      const request: StatsRequest = {
        ...query,
        limit: PAGE_SIZE,
        page: p,
        refresh: undefined,
      };
      const result = await api(request);
      if (result.data) {
        setData(result.data);
        // Estimate total count: if we got a full page, there's likely more
        if (result.data.data.length === PAGE_SIZE) {
          setTotalCount(null); // unknown, need to keep paging
        } else {
          setTotalCount((p - 1) * PAGE_SIZE + result.data.data.length);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [api, query]);

  useEffect(() => {
    if (open) {
      setPage(1);
      fetchData(1);
    }
  }, [open, fetchData]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchData(newPage);
  };

  const handleExportCSV = async () => {
    if (!exportApi) return;
    try {
      const blob = await exportApi(query);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
    }
  };

  const columns =
    data?.columns || (data?.data && data.data.length > 0 ? Object.keys(data.data[0]) : []);
  const keyColumn = columns[0] || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0"
        showCloseButton={false}
      >
        <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">{title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={!exportApi}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                {t('stats.breakdown.exportCsv')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <span className="text-lg leading-none">×</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Table content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-4 w-1/5" />
                </div>
              ))}
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400">{t('stats.breakdown.noData')}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 sticky top-0">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                    #
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider first:text-left"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((row, index) => {
                  const keyValue = String(row[keyColumn] ?? "");
                  return (
                    <tr
                      key={index}
                      className="border-b border-gray-50 dark:border-gray-800/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-4 py-2 text-xs text-gray-400">
                        {(page - 1) * PAGE_SIZE + index + 1}
                      </td>
                      {columns.map((col) => {
                        const value = row[col];
                        const isFirstCol = col === keyColumn;
                        return (
                          <td
                            key={col}
                            className={`px-4 py-2 ${
                              isFirstCol
                                ? "text-left font-medium text-gray-900 dark:text-gray-100"
                                : "text-right text-gray-700 dark:text-gray-300 tabular-nums"
                            }`}
                          >
                            {isFirstCol && onFilterClick ? (
                              <button
                                onClick={() => onFilterClick(keyValue)}
                                className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors max-w-[300px] truncate inline-block text-left"
                                title={keyValue}
                              >
                                {typeof value === "number"
                                  ? value.toLocaleString()
                                  : String(value ?? "")}
                              </button>
                            ) : (
                              <span className="max-w-[200px] truncate inline-block" title={String(value ?? "")}>
                                {typeof value === "number"
                                  ? value.toLocaleString()
                                  : String(value ?? "")}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <span className="text-xs text-gray-400">
            {data ? t('stats.breakdown.pageInfo', { page, count: data.data.length }) : ""}
            {totalCount !== null ? t('stats.breakdown.totalItems', { count: totalCount }) : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-gray-500 min-w-[3rem] text-center">
              {t('stats.breakdown.pageOf', { page })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={loading || (data?.data.length ?? 0) < PAGE_SIZE}
              className="h-8 px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}