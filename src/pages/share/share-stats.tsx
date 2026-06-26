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
}

const PERIOD_OPTIONS = [
  { key: "day",   label: "Today" },
  { key: "p7",    label: "Last 7 days" },
  { key: "p30",   label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "6mo",   label: "Last 6 months" },
  { key: "12mo",  label: "Last 12 months" },
];

export default function ShareStatsPage({ domain, slug, linkName }: ShareStatsPageProps) {
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

  // All API calls include ?slug=xxx — backend validates slug, no auth required
  const withSlug = useCallback((params: StatsRequest) => ({
    ...params,
    slug,
  }), [slug]);

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
      <div className="border-b bg-muted/30 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">{domain}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{linkName}</span>
        </div>
        <a
          href={`https://${domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {domain}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Stats toolbar */}
      <div className="border-b px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CurrentVisitorsComponent
            domain={domain}
            query={query}
            api={api.getCurrentVisitors}
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                {periodLabel}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
        </div>
      </div>

      {/* Aggregate stats */}
      <AggregateStats
        query={query}
        activeMetric={activeMetric}
        onMetricChange={setActiveMetric}
        api={api.getAggregate}
      />

      {/* Main graph */}
      <div className="border-b">
        <MainGraph
          query={{ ...query, metrics: activeMetric }}
          activeMetric={activeMetric}
          onMetricChange={setActiveMetric}
          api={api.getMainGraph}
        />
      </div>

      {/* Breakdown panels */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
  );
}
