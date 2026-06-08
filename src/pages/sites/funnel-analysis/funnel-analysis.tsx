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
import type {
  Funnel,
  FunnelDetail,
  FunnelAnalysisResult,
} from "../types/interfaces";
import FunnelVisualization from "./components/funnel-visualization";

const PERIOD_OPTIONS = [
  { key: "day", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "p7", label: "Last 7 days", separator: true },
  { key: "p14", label: "Last 14 days" },
  { key: "p30", label: "Last 30 days" },
];

export default function FunnelAnalysisPage() {
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
      toast.error("Failed to load funnels");
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
      toast.error("Failed to load funnel details");
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
      toast.error("Failed to run funnel analysis");
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
                Funnel Analysis
              </h1>
              <p className="text-sm text-muted-foreground">
                Analyze conversion rates through your defined funnels.
              </p>
            </div>

            {/* Funnel selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-between">
                  <span className="truncate">
                    {funnelDetail?.name || "Select Funnel"}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[250px]">
                {funnels.length === 0 ? (
                  <DropdownMenuItem disabled>No funnels available</DropdownMenuItem>
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
                  Manage Funnels...
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
                    {opt.label}
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
                <p className="text-lg font-medium">Select a funnel to analyze</p>
                <p className="text-sm mt-1">
                  Choose a funnel from the dropdown above or{" "}
                  <button
                    onClick={() => navigate(`/sites/${domain}/settings/funnels`)}
                    className="text-primary hover:underline"
                  >
                    create a new one
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
                    <CardDescription>Total Visitors</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      {analysisResult.total_visitors.toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Conversion Rate</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      {analysisResult.conversion_rate.toFixed(1)}%
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Steps</CardDescription>
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
                <CardTitle>Funnel Visualization</CardTitle>
                <CardDescription>
                  Visual representation of user drop-off through each step.
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
                    No data available for this funnel.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Detailed steps table */}
            <Card>
              <CardHeader>
                <CardTitle>Step Details</CardTitle>
                <CardDescription>
                  Detailed metrics for each step in the funnel.
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
                        <TableHead className="w-[60px]">Step</TableHead>
                        <TableHead>Goal</TableHead>
                        <TableHead className="text-right">Visitors</TableHead>
                        <TableHead className="text-right">Drop-off</TableHead>
                        <TableHead className="text-right">Conversion</TableHead>
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
                    No data available.
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
