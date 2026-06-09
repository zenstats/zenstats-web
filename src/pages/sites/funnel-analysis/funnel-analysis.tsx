import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ChevronDown,
  RefreshCw,
  Filter,
  TrendingUp,
  Users,
  ArrowLeft,
} from "lucide-react";
import axios, { type BaseResponse } from "@utils/axios";
import dayjs from "dayjs";
import { useTranslation } from 'react-i18next';
import type {
  Funnel,
  FunnelDetail,
  FunnelAnalysisResult,
} from "../types/interfaces";
import FunnelVisualization from "./components/funnel-visualization";

const PERIOD_OPTIONS = [
  { key: "day", labelKey: "funnelAnalysis.period.today" },
  { key: "yesterday", labelKey: "funnelAnalysis.period.yesterday" },
  { key: "p7", labelKey: "funnelAnalysis.period.last7Days", separator: true },
  { key: "p14", labelKey: "funnelAnalysis.period.last14Days" },
  { key: "p30", labelKey: "funnelAnalysis.period.last30Days" },
];

export default function FunnelAnalysisPage() {
  const { t } = useTranslation();
  const { domain } = useParams<{ domain: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<number | null>(null);
  const [funnelDetail, setFunnelDetail] = useState<FunnelDetail | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FunnelAnalysisResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [period, setPeriod] = useState(searchParams.get("period") || "p30");
  const date = searchParams.get("date") || dayjs().format("YYYY-MM-DD");

  // Fetch funnels list
  const fetchFunnels = useCallback(async () => {
    if (!domain) return;
    try {
      const res = await axios.get<BaseResponse<Funnel[]>>(`/sites/${domain}/funnels`);
      setFunnels(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch funnels:", error);
      toast.error(t('funnelAnalysis.fetchFunnelsFailed'));
    }
  }, [domain]);

  // Fetch funnel detail
  const fetchFunnelDetail = useCallback(async (funnelId: number) => {
    if (!domain) return;
    try {
      const res = await axios.get<BaseResponse<FunnelDetail>>(`/sites/${domain}/funnels/${funnelId}`);
      setFunnelDetail(res.data.data);
    } catch (error) {
      console.error("Failed to fetch funnel detail:", error);
      toast.error(t('funnelAnalysis.fetchDetailFailed'));
    }
  }, [domain]);

  // Run analysis
  const runAnalysis = useCallback(async () => {
    if (!domain || !selectedFunnelId) return;

    setAnalyzing(true);
    try {
      const params = new URLSearchParams({
        period,
        date,
      });

      const res = await axios.get<BaseResponse<FunnelAnalysisResult>>(
        `/stats/${domain}/funnel/${selectedFunnelId}?${params.toString()}`
      );
      setAnalysisResult(res.data.data);
    } catch (error) {
      console.error("Failed to run analysis:", error);
      toast.error(t('funnelAnalysis.analysisFailed'));
    } finally {
      setAnalyzing(false);
    }
  }, [domain, selectedFunnelId, period, date]);

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await fetchFunnels();
      setLoading(false);
    };
    loadInitialData();
  }, [fetchFunnels]);

  // Handle funnel selection from URL or dropdown
  useEffect(() => {
    const funnelParam = searchParams.get("funnel");
    if (funnelParam) {
      const id = parseInt(funnelParam);
      if (!isNaN(id) && id !== selectedFunnelId) {
        setSelectedFunnelId(id);
      }
    }
  }, [searchParams]);

  // Fetch detail when funnel changes
  useEffect(() => {
    if (selectedFunnelId) {
      fetchFunnelDetail(selectedFunnelId);
      runAnalysis();
    }
  }, [selectedFunnelId, fetchFunnelDetail, runAnalysis]);

  // Re-run analysis when period/date changes
  useEffect(() => {
    if (selectedFunnelId) {
      runAnalysis();
    }
  }, [period, date, runAnalysis]);

  const handleFunnelSelect = (funnelId: number) => {
    setSelectedFunnelId(funnelId);
    setSearchParams({ funnel: funnelId.toString(), period, date });
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    setSearchParams({ funnel: selectedFunnelId?.toString() || "", period: newPeriod, date });
  };

  const handleRefresh = () => {
    runAnalysis();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/sites/${domain}/stats`)}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t('funnelAnalysis.title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('funnelAnalysis.description')}
              </p>
            </div>

            {/* Funnel selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-between">
                  <span className="truncate">
                    {funnelDetail?.name || t('funnelAnalysis.selectFunnel')}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[250px]">
                {funnels.length === 0 ? (
                  <DropdownMenuItem disabled>{t('funnelAnalysis.noFunnels')}</DropdownMenuItem>
                ) : (
                  funnels.map((funnel) => (
                    <DropdownMenuItem
                      key={funnel.id}
                      onClick={() => handleFunnelSelect(funnel.id)}
                      className={selectedFunnelId === funnel.id ? "bg-accent" : ""}
                    >
                      {funnel.name}
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/sites/${domain}/settings/funnels`)}>
                  {t('funnelAnalysis.manageFunnels')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Controls bar */}
          <div className="flex items-center gap-4 mt-4">
            {/* Period selector */}
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.key} value={opt.key}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={analyzing || !selectedFunnelId}
              className="h-9 w-9"
            >
              <RefreshCw className={`h-4 w-4 ${analyzing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        ) : !selectedFunnelId ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">{t('funnelAnalysis.selectFunnelHint')}</p>
                <p className="text-sm mt-1">
                  {t('funnelAnalysis.createNew')}
                  <button
                    onClick={() => navigate(`/sites/${domain}/settings/funnels`)}
                    className="text-primary hover:underline"
                  >
                    {t('funnelAnalysis.createNewLink')}
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary cards */}
            {analysisResult && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>{t('funnelAnalysis.totalVisitors')}</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      {analysisResult.total_visitors.toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>{t('funnelAnalysis.conversionRate')}</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      {analysisResult.conversion_rate.toFixed(1)}%
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>{t('funnelAnalysis.steps')}</CardDescription>
                    <CardTitle className="text-2xl">
                      {analysisResult.steps.length}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>
            )}

            {/* Funnel visualization */}
            <Card>
              <CardHeader>
                <CardTitle>{t('funnelAnalysis.funnelVisualization')}</CardTitle>
                <CardDescription>
                  {t('funnelAnalysis.visualizationDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyzing ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : analysisResult?.steps ? (
                  <FunnelVisualization
                    steps={analysisResult.steps}
                    totalVisitors={analysisResult.total_visitors}
                  />
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    {t('funnelAnalysis.noData')}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Detailed steps table */}
            <Card>
              <CardHeader>
                <CardTitle>{t('funnelAnalysis.stepDetails')}</CardTitle>
                <CardDescription>
                  {t('funnelAnalysis.stepDetailsDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyzing ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : analysisResult?.steps ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">{t('funnelAnalysis.step')}</TableHead>
                        <TableHead>{t('funnelAnalysis.goal')}</TableHead>
                        <TableHead className="text-right">{t('funnelAnalysis.visitors')}</TableHead>
                        <TableHead className="text-right">{t('funnelAnalysis.dropOff')}</TableHead>
                        <TableHead className="text-right">{t('funnelAnalysis.conversion')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisResult.steps.map((step) => (
                        <TableRow key={step.step_order}>
                          <TableCell>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                              {step.step_order}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{step.goal_name}</TableCell>
                          <TableCell className="text-right font-mono">
                            {step.visitors.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-500">
                            {step.drop_off > 0 ? `-${step.drop_off.toLocaleString()}` : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {step.conversion_rate.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    {t('funnelAnalysis.noDataAvailable')}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
