import { useCallback, useEffect, useState } from "react";
import type { BaseResponse } from "@utils/axios";
import type { CurrentVisitors as CurrentVisitorsType, StatsRequest } from "@/pages/sites/types/interfaces";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface CurrentVisitorsProps {
  domain: string;
  query: StatsRequest;
  api: (dateRange: StatsRequest) => Promise<BaseResponse<CurrentVisitorsType>>;
}

export default function CurrentVisitors({ query, api }: CurrentVisitorsProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<CurrentVisitorsType | null>(null);
  const [pulse, setPulse] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await api(query);
      if (result.data) {
        setData(result.data);
        setPulse(true);
        setTimeout(() => setPulse(false), 1000);
      }
    } catch (error) {
      console.error(error);
    }
  }, [api, query]);

  useEffect(() => {
    fetchData();
    // Poll every 30 seconds for realtime data
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!data) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] dark:bg-emerald-500/[0.14] px-3 h-8">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span
        className={cn(
          "text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-300 transition-transform",
          pulse && "scale-110"
        )}
      >
        {data.total}
      </span>
      {/* 文案在窄屏隐藏（只保留绿点 + 数字），否则会被挤成竖排逐字换行 */}
      <span className="hidden sm:inline whitespace-nowrap text-xs font-medium text-emerald-700/80 dark:text-emerald-300/80">
        {t('stats.currentVisitors')}
      </span>
    </div>
  );
}