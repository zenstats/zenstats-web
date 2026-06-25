import { useEffect, useState } from "react";
import axios, { type BaseResponse } from "@utils/axios";
import { useTranslation } from "react-i18next";
import type { AggregateResponse } from "@/pages/sites/types/interfaces";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  domain: string;
  variant?: "card" | "list";
}

export default function TodaySiteStats({ domain, variant = "card" }: Props) {
  const { t } = useTranslation();
  const [visitors, setVisitors] = useState<number | null>(null);
  const [pageviews, setPageviews] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios
      .get<BaseResponse<AggregateResponse>>(`/stats/${domain}/aggregate`, {
        params: { period: "day", metrics: "visitors,pageviews" },
      })
      .then((res) => {
        if (cancelled || !res.data?.data?.results) return;
        setVisitors(res.data.data.results.visitors?.value ?? 0);
        setPageviews(res.data.data.results.pageviews?.value ?? 0);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [domain]);

  if (loading) {
    return variant === "list" ? (
      <div className="flex items-center gap-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-3 mb-2">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5 space-y-1">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-2.5 w-8" />
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5 space-y-1">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-2.5 w-8" />
        </div>
      </div>
    );
  }

  if (visitors === null && pageviews === null) return null;

  if (variant === "list") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="tabular-nums font-medium text-gray-700 dark:text-gray-300">
          👥 {visitors?.toLocaleString() ?? "—"}
        </span>
        <span className="text-gray-400">·</span>
        <span className="tabular-nums font-medium text-gray-700 dark:text-gray-300">
          📄 {pageviews?.toLocaleString() ?? "—"}
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 mb-2">
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums leading-none">
          {visitors?.toLocaleString() ?? "—"}
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
          {t("sites.todayVisitors")}
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums leading-none">
          {pageviews?.toLocaleString() ?? "—"}
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
          {t("sites.todayPageviews")}
        </div>
      </div>
    </div>
  );
}
