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
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <span
          className={cn(
            "text-sm font-semibold text-gray-900 dark:text-gray-100 transition-transform",
            pulse && "scale-110"
          )}
        >
          {data.total}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t('stats.currentVisitors')}
        </span>
      </div>
    </div>
  );
}