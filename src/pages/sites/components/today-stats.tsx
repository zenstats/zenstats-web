import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { useInView, useSiteOverview } from "@/lib/site-overview";

interface Props {
  domain: string;
  variant?: "card" | "list";
}

export default function TodaySiteStats({ domain, variant = "card" }: Props) {
  const { t } = useTranslation();
  // 进入视口后才请求；结果与 SiteSparkline 共享同一份缓存/请求（见 lib/site-overview）
  const [ref, inView] = useInView<HTMLDivElement>();
  const { data, loading, failed } = useSiteOverview(domain, inView);
  const visitors = data?.visitors ?? null;
  const pageviews = data?.pageviews ?? null;

  if (loading) {
    return variant === "list" ? (
      <div ref={ref} className="flex items-center gap-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    ) : (
      <div ref={ref} className="grid grid-cols-2 gap-3 mb-2">
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

  if (failed || (visitors === null && pageviews === null)) return null;

  if (variant === "list") {
    return (
      <div ref={ref} className="flex items-center gap-2 text-sm">
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
    <div ref={ref} className="grid grid-cols-2 gap-3 mb-2">
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
