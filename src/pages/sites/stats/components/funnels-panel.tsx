import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Filter, TrendingUp, Users, ExternalLink, ChevronRight } from "lucide-react";
import axios, { type BaseResponse } from "@utils/axios";
import type { StatsRequest } from "../../types/interfaces";
import type { Funnel, FunnelDetail, FunnelAnalysisResult } from "../../types/interfaces";
import FunnelVisualization from "../../funnel-analysis/components/funnel-visualization";

interface FunnelsPanelProps {
  query: StatsRequest;
  domain: string;
}

export default function FunnelsPanel({ query, domain }: FunnelsPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<number | null>(null);
  const [funnelDetail, setFunnelDetail] = useState<FunnelDetail | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FunnelAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  // Fetch funnels list
  const fetchFunnels = useCallback(async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const res = await axios.get<BaseResponse<Funnel[]>>(`/sites/${domain}/funnels`);
      const list = res.data.data || [];
      setFunnels(list);
      // Auto-select first funnel if none selected
      if (list.length > 0 && !selectedFunnelId) {
        setSelectedFunnelId(list[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch funnels:", error);
    } finally {
      setLoading(false);
    }
  }, [domain]);

  // Fetch funnel detail
  const fetchFunnelDetail = useCallback(async (funnelId: number) => {
    if (!domain) return;
    try {
      const res = await axios.get<BaseResponse<FunnelDetail>>(`/sites/${domain}/funnels/${funnelId}`);
      setFunnelDetail(res.data.data || null);
    } catch {
      // ignore
    }
  }, [domain]);

  // Run funnel analysis
  const runAnalysis = useCallback(async (funnelId: number) => {
    if (!domain) return;
    setAnalyzing(true);
    try {
      const params = new URLSearchParams({
        period: query.period,
        date: query.date || "",
      });
      if (query.from) params.set("from", query.from);
      if (query.to) params.set("to", query.to);

      const res = await axios.get<BaseResponse<FunnelAnalysisResult>>(
        `/stats/${domain}/funnel/${funnelId}?${params.toString()}`
      );
      setAnalysisResult(res.data.data || null);
    } catch (error) {
      console.error("Failed to run analysis:", error);
    } finally {
      setAnalyzing(false);
    }
  }, [domain, query]);

  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  useEffect(() => {
    if (selectedFunnelId) {
      fetchFunnelDetail(selectedFunnelId);
      runAnalysis(selectedFunnelId);
    }
  }, [selectedFunnelId, fetchFunnelDetail, runAnalysis]);

  const handleFunnelChange = (id: string) => {
    setSelectedFunnelId(parseInt(id));
  };

  return (
    <Card className="dark:bg-gray-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t("stats.funnels.title")}
            </CardTitle>
            <CardDescription>{t("stats.funnels.description")}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {funnels.length > 0 && (
              <Select
                value={selectedFunnelId?.toString() || ""}
                onValueChange={handleFunnelChange}
              >
                <SelectTrigger className="h-9 text-sm w-[200px]">
                  <SelectValue placeholder={t("stats.funnels.selectFunnel")} />
                </SelectTrigger>
                <SelectContent>
                  {funnels.map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/sites/${domain}/funnel-analysis${selectedFunnelId ? `?funnel=${selectedFunnelId}` : ""}`)}
              className="gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t("stats.funnels.fullAnalysis")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/sites/${domain}/settings/funnels`)}
              className="gap-1.5"
            >
              {t("stats.funnels.manage")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : funnels.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Filter className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium">{t("stats.funnels.noFunnels")}</p>
            <p className="text-xs mt-1">{t("stats.funnels.noFunnelsHint")}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate(`/sites/${domain}/settings/funnels`)}
            >
              {t("stats.funnels.createFunnel")}
            </Button>
          </div>
        ) : analyzing ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : analysisResult ? (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">{t("stats.funnels.totalVisitors")}</div>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  {analysisResult.total_visitors.toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">{t("stats.funnels.conversionRate")}</div>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  {analysisResult.conversion_rate.toFixed(1)}%
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">{t("stats.funnels.steps")}</div>
                <div className="text-2xl font-bold">{analysisResult.steps.length}</div>
              </div>
            </div>

            {/* Funnel visualization */}
            <FunnelVisualization
              steps={analysisResult.steps}
              totalVisitors={analysisResult.total_visitors}
            />

            {/* Steps detail */}
            {funnelDetail && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
                {funnelDetail.steps.map((step, i) => (
                  <span key={step.step_order} className="flex items-center gap-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {step.step_order}
                    </span>
                    <span>{step.goal_name}</span>
                    {i < funnelDetail.steps.length - 1 && (
                      <ChevronRight className="h-3 w-3 mx-0.5" />
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {t("stats.funnels.noData")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
