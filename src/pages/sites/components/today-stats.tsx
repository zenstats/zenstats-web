import { useTranslation } from "react-i18next";
import { Users, Eye } from "lucide-react";
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
      <div ref={ref} className="flex items-center gap-4">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-3.5 w-16" />
      </div>
    ) : (
      <div ref={ref} className="grid grid-cols-2 gap-2.5 mb-2">
        <div className="bg-muted/45 rounded-xl p-2.5 space-y-1.5 border border-border/40">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-2.5 w-10" />
        </div>
        <div className="bg-muted/45 rounded-xl p-2.5 space-y-1.5 border border-border/40">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-2.5 w-10" />
        </div>
      </div>
    );
  }

  if (failed || (visitors === null && pageviews === null)) return null;

  if (variant === "list") {
    return (
      <div ref={ref} className="flex items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5 tabular-nums font-semibold text-foreground">
          <Users className="h-3.5 w-3.5 text-indigo-500" />
          {visitors?.toLocaleString() ?? "—"}
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums font-semibold text-foreground">
          <Eye className="h-3.5 w-3.5 text-emerald-500" />
          {pageviews?.toLocaleString() ?? "—"}
        </span>
      </div>
    );
  }

  return (
    <div ref={ref} className="grid grid-cols-2 gap-2.5 mb-1.5">
      <div className="rounded-xl bg-muted/45 dark:bg-muted/25 border border-border/50 px-3 py-2.5 transition-colors group-hover:bg-muted/70 dark:group-hover:bg-muted/40">
        <div className="text-base font-bold text-foreground tabular-nums leading-tight tracking-tight">
          {visitors?.toLocaleString() ?? "—"}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
          <span className="truncate">{t("sites.todayVisitors")}</span>
        </div>
      </div>
      <div className="rounded-xl bg-muted/45 dark:bg-muted/25 border border-border/50 px-3 py-2.5 transition-colors group-hover:bg-muted/70 dark:group-hover:bg-muted/40">
        <div className="text-base font-bold text-foreground tabular-nums leading-tight tracking-tight">
          {pageviews?.toLocaleString() ?? "—"}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate">{t("sites.todayPageviews")}</span>
        </div>
      </div>
    </div>
  );
}
