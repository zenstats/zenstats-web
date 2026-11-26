import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import axios, { type BaseResponse } from "@utils/axios";
import type {
  StatsRequest,
  AggregateResponse,
  MainGraphPoint,
  BreakdownResponse,
  CurrentVisitors,
} from "@/pages/sites/types/interfaces";
import AggregateStats from "@/pages/sites/stats/components/aggregate-stats";
import MainGraph from "@/pages/sites/stats/components/main-graph";
import BreakdownTable from "@/pages/sites/stats/components/breakdown-table";
import CurrentVisitorsComponent from "@/pages/sites/stats/components/current-visitors";
import { Button } from "@/components/ui/button";
import { ChevronDown, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ShareStatsPageProps {
  domain: string;
  slug: string;
  linkName: string;
  /** 密码保护链接的访问密码，随每个请求以 link_password 传给后端 */
  password?: string;
}

const PERIOD_OPTIONS = [
  { key: "day",   label: "Today" },
  { key: "p7",    label: "Last 7 days" },
  { key: "p30",   label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "6mo",   label: "Last 6 months" },
  { key: "12mo",  label: "Last 12 months" },
];

export default function ShareStatsPage({ domain, slug, linkName, password }: ShareStatsPageProps) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState("p30");
  const [periodLabel, setPeriodLabel] = useState("Last 30 days");
  const [activeMetric, setActiveMetric] = useState("visitors");
  const [refresh, setRefresh] = useState<Date>(new Date());

  const query: StatsRequest = useMemo(() => ({
    period,
    refresh,
  }), [period, refresh]);

  // Each breakdown panel has its own independent query state so filter clicks don't cross-contaminate
  const [pagesQuery, setPagesQuery] = useState<StatsRequest>({ period, refresh, property: "visit:page" });
  const [sourcesQuery, setSourcesQuery] = useState<StatsRequest>({ period, refresh, property: "visit:source" });

  // Keep breakdown queries in sync when period / refresh changes
  useEffect(() => {
    setPagesQuery(prev => ({ ...prev, period, refresh }));
    setSourcesQuery(prev => ({ ...prev, period, refresh }));
  }, [period, refresh]);

  // All API calls include ?slug=xxx — backend validates slug, no auth required.
  // 密码保护链接额外带 link_password，后端逐请求校验（缺失/错误则拒绝）。
  const withSlug = useCallback((params: StatsRequest) => ({
    ...params,
    slug,
    ...(password ? { link_password: password } : {}),
  }), [slug, password]);

  const api = useMemo(() => ({
    getAggregate: async (q: StatsRequest) => {
      const { metrics: _m, ...params } = q;
      const res = await axios.get<BaseResponse<AggregateResponse>>(
        `/stats/${domain}/aggregate`,
        { params: withSlug(params) },
      );
      return res.data;
    },
    getMainGraph: async (q: StatsRequest) => {
      const res = await axios.get<BaseResponse<MainGraphPoint[]>>(
        `/stats/${domain}/main-graph`,
        { params: withSlug(q) },
      );
      return res.data;
    },
    getCurrentVisitors: async (q: StatsRequest) => {
      const res = await axios.get<BaseResponse<CurrentVisitors>>(
        `/stats/${domain}/current-visitors`,
        { params: withSlug(q) },
      );
      return res.data;
    },
    getBreakdown: async (q: StatsRequest) => {
      const res = await axios.get<BaseResponse<BreakdownResponse>>(
        `/stats/${domain}/breakdown`,
        { params: withSlug(q) },
      );
      return res.data;
    },
  }), [domain, withSlug]);

  const handlePeriod = (key: string, label: string) => {
    setPeriod(key);
    setPeriodLabel(label);
    setRefresh(new Date());
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Share header bar */}
      <div className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm min-w-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold uppercase shrink-0">
              {domain.charAt(0)}
            </span>
            <span className="font-semibold text-foreground truncate">{domain}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground truncate text-xs">{linkName}</span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <CurrentVisitorsComponent
              domain={domain}
              query={query}
              api={api.getCurrentVisitors}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 bg-card border-border/80 shadow-2xs">
                  {periodLabel}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                {PERIOD_OPTIONS.map((p) => (
                  <DropdownMenuItem
                    key={p.key}
                    onClick={() => handlePeriod(p.key, p.label)}
                    className="text-xs"
                  >
                    {p.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <a
              href={`https://${domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Unified Aggregate stats + Main graph */}
        <div className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden">
          <AggregateStats
            query={query}
            activeMetric={activeMetric}
            onMetricChange={setActiveMetric}
            api={api.getAggregate}
          />
          <MainGraph
            query={{ ...query, metrics: activeMetric }}
            activeMetric={activeMetric}
            onMetricChange={setActiveMetric}
            api={api.getMainGraph}
          />
        </div>

        {/* Breakdown panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BreakdownTable
            title={t("stats.dimensions.page")}
            keyName="page"
            query={pagesQuery}
            setQuery={setPagesQuery}
            api={api.getBreakdown}
          />
          <BreakdownTable
            title={t("stats.dimensions.source")}
            keyName="source"
            query={sourcesQuery}
            setQuery={setSourcesQuery}
            api={api.getBreakdown}
          />
        </div>
      </div>
    </div>
  );
}
