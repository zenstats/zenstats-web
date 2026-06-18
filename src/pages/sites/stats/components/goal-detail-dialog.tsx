import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Filter, Tag, ArrowUpDown, Target } from "lucide-react";
import axios, { type BaseResponse } from "@utils/axios";
import type { Goal, StatsRequest, AggregateResponse } from "../../types/interfaces";
import { cn } from "@/lib/utils";

interface GoalDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
  domain: string;
  query: StatsRequest;
  aggregateApi: (params: StatsRequest) => Promise<BaseResponse<AggregateResponse>>;
  onAddFilter: (dimension: string, operator: string, label: string, values: string[]) => void;
}

interface PropRow {
  key: string;
  values: { value: string; label: string }[];
  loading: boolean;
  expanded: boolean;
}

export default function GoalDetailDialog({
  open, onOpenChange, goal, domain, query, aggregateApi, onAddFilter,
}: GoalDetailDialogProps) {
  const { t } = useTranslation();
  const [goalStats, setGoalStats] = useState<{ visitors?: number; events?: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [propRows, setPropRows] = useState<PropRow[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);

  // Fetch goal aggregate + property keys when dialog opens
  useEffect(() => {
    if (!open || !goal || !domain) return;

    // Aggregate stats for this goal
    setStatsLoading(true);
    setGoalStats(null);
    const filterValue = goal.event_name || goal.page_path || "";
    const filterProperty = goal.event_name ? "event:name" : "event:page";
    aggregateApi({
      ...query,
      metrics: "visitors,events",
      filters: JSON.stringify([["is", filterProperty, [filterValue]]]),
      refresh: new Date(),
    }).then((res) => {
      if (res.data?.results) {
        setGoalStats({
          visitors: res.data.results.visitors?.value ?? 0,
          events: res.data.results.events?.value ?? 0,
        });
      }
    }).catch(() => {}).finally(() => setStatsLoading(false));

    // Property keys
    setKeysLoading(true);
    setPropRows([]);
    const params: Record<string, string> = {
      filter_name: "prop_key",
      period: query.period || "p30",
    };
    if (query.date) params.date = query.date;
    if (query.from) params.from = query.from;
    if (query.to) params.to = query.to;

    axios.get<BaseResponse<{ value: string; label: string }[]>>(
      `/stats/${domain}/suggestions`, { params }
    ).then((res) => {
      const keys = (res.data?.data || []).filter((k) => k.value !== "screen_size");
      setPropRows(keys.map((k) => ({ key: k.value, values: [], loading: false, expanded: false })));
    }).catch(() => {}).finally(() => setKeysLoading(false));
  }, [open, goal?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePropKey = async (index: number) => {
    const row = propRows[index];
    if (row.expanded) {
      // Collapse
      const next = [...propRows];
      next[index] = { ...row, expanded: false };
      setPropRows(next);
      return;
    }

    // Expand: fetch values
    const next = [...propRows];
    next[index] = { ...row, loading: true, expanded: true };
    setPropRows(next);

    try {
      const res = await axios.get<BaseResponse<{ value: string; label: string }[]>>(
        `/stats/${domain}/suggestions`,
        {
          params: {
            filter_name: `event:props:${row.key}`,
            period: query.period || "p30",
            q: "",
          },
        }
      );
      const next2 = [...propRows];
      next2[index] = { ...next2[index], values: res.data?.data || [], loading: false, expanded: true };
      setPropRows(next2);
    } catch {
      const next2 = [...propRows];
      next2[index] = { ...next2[index], values: [], loading: false, expanded: true };
      setPropRows(next2);
    }
  };

  const handleFilterByPropValue = (propKey: string, propValue: string) => {
    onAddFilter(`event:props:${propKey}`, "is", propValue, [propValue]);
    onOpenChange(false);
  };

  if (!goal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-500" />
            {goal.display_name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Goal aggregate quick stats */}
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          ) : goalStats ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/10 p-3">
                <p className="text-xs text-muted-foreground">{t("stats.goals.detail.visitors")}</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">{(goalStats.visitors || 0).toLocaleString()}</p>
              </div>
              <div className="rounded-lg border bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/10 p-3">
                <p className="text-xs text-muted-foreground">{t("stats.goals.detail.events")}</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">{(goalStats.events || 0).toLocaleString()}</p>
              </div>
            </div>
          ) : null}

          {/* Goal definition */}
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {goal.event_name ? t("stats.goals.event") : t("stats.goals.page")}
            </p>
            <code className="text-sm font-mono font-medium">{goal.event_name || goal.page_path}</code>
            {goal.custom_props && Object.keys(goal.custom_props).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(goal.custom_props).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-0.5 rounded bg-white dark:bg-gray-900 px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground border">
                    {k}:{v}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Property keys breakdown */}
          <div>
            <p className="text-sm font-medium flex items-center gap-1.5 mb-2">
              <Tag className="h-3.5 w-3.5" />
              {t("stats.goals.detail.propertyBreakdown")}
            </p>

            {keysLoading ? (
              <div className="space-y-1">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full rounded" />)}
              </div>
            ) : propRows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("stats.goals.detail.noProperties")}
              </p>
            ) : (
              <div className="space-y-1">
                {propRows.map((row, index) => (
                  <div key={row.key} className="rounded-lg border overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                      onClick={() => togglePropKey(index)}
                    >
                      <span className="flex items-center gap-2 font-mono text-xs">
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        {row.key}
                      </span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          row.expanded && "rotate-90"
                        )}
                      />
                    </button>

                    {row.expanded && (
                      <div className="border-t bg-gray-50/50 dark:bg-gray-950/30">
                        {row.loading ? (
                          <div className="px-3 py-2">
                            <Skeleton className="h-6 w-full rounded" />
                          </div>
                        ) : row.values.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-muted-foreground">
                            {t("stats.goals.detail.noValues")}
                          </p>
                        ) : (
                          <div>
                            {row.values.map((item) => (
                              <button
                                key={item.value}
                                type="button"
                                className="w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors"
                                onClick={() => handleFilterByPropValue(row.key, item.value)}
                              >
                                <span className="font-mono">{item.label}</span>
                                <Filter className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
