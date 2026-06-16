import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Separator } from "@components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Skeleton } from "@components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api, { type BaseResponse } from "@utils/axios";
import {
  Upload,
  FileSpreadsheet,
  BarChart3,
  Calendar,
  Database,
  CheckCircle2,
} from "lucide-react";
import type {
  ImportUploadResponse,
  ImportAggregateResponse,
  ImportBreakdownRow,
  ImportBreakdownResponse,
} from "./interface";

const REPORT_TYPES = [
  { value: "auto", label: "Auto Detect" },
  { value: "visitors", label: "Visitors" },
  { value: "pages", label: "Pages" },
  { value: "sources", label: "Sources" },
  { value: "browsers", label: "Browsers" },
  { value: "os", label: "Operating Systems" },
  { value: "devices", label: "Devices" },
  { value: "locations", label: "Locations" },
  { value: "entry_pages", label: "Entry Pages" },
  { value: "exit_pages", label: "Exit Pages" },
];

const BREAKDOWN_PROPERTIES = [
  { value: "visit:source", label: "Source" },
  { value: "visit:country", label: "Country" },
  { value: "visit:browser", label: "Browser" },
  { value: "visit:os", label: "Operating System" },
  { value: "visit:device", label: "Device" },
  { value: "visit:entry_page", label: "Entry Page" },
  { value: "visit:exit_page", label: "Exit Page" },
  { value: "event:page", label: "Page" },
  { value: "event:hostname", label: "Hostname" },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m > 0) return `${m}M ${s}S`;
  return `${s}S`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="group relative flex flex-col gap-1 p-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
        {value}
      </span>
      {sub && (
        <span className="text-xs text-gray-400">{sub}</span>
      )}
      <div className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-transparent group-hover:bg-gray-200 dark:group-hover:bg-gray-700" />
    </div>
  );
}

export default function ImportPage() {
  const { domain = "" } = useParams<{ domain?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] =
    useState<ImportUploadResponse | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .slice(0, 10);
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [property, setProperty] = useState("visit:source");

  const [aggLoading, setAggLoading] = useState(false);
  const [aggData, setAggData] = useState<ImportAggregateResponse | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownData, setBreakdownData] = useState<ImportBreakdownRow[]>([]);
  const [tsLoading, setTsLoading] = useState(false);
  const [tsData, setTsData] = useState<{ date: string; visitors: number; pageviews: number }[]>([]);

  const client = api;

  const fetchAggregate = useCallback(async () => {
    if (!domain) return;
    setAggLoading(true);
    try {
      const res = await client.get<
        BaseResponse<ImportAggregateResponse>
      >(`/sites/${domain}/import/aggregate`, {
        params: { from: dateFrom, to: dateTo },
      });
      if (res.data.data) setAggData(res.data.data);
    } catch {
      // ignore
    } finally {
      setAggLoading(false);
    }
  }, [client, domain, dateFrom, dateTo]);

  const fetchBreakdown = useCallback(async () => {
    if (!domain) return;
    setBreakdownLoading(true);
    try {
      const res = await client.get<BaseResponse<ImportBreakdownResponse>>(
        `/sites/${domain}/import/breakdown`,
        { params: { from: dateFrom, to: dateTo, property, limit: 9 } }
      );
      if (res.data.data?.data) setBreakdownData(res.data.data.data);
      else setBreakdownData([]);
    } catch {
      setBreakdownData([]);
    } finally {
      setBreakdownLoading(false);
    }
  }, [client, domain, dateFrom, dateTo, property]);

  const fetchTimeSeries = useCallback(async () => {
    if (!domain) return;
    setTsLoading(true);
    try {
      const res = await client.get<
        BaseResponse<{ date: string; visitors: number; pageviews: number }[]>
      >(`/sites/${domain}/import/timeseries`, {
        params: { from: dateFrom, to: dateTo },
      });
      if (Array.isArray(res.data.data)) setTsData(res.data.data);
    } catch {
      setTsData([]);
    } finally {
      setTsLoading(false);
    }
  }, [client, domain, dateFrom, dateTo]);

  useEffect(() => {
    fetchAggregate();
    fetchBreakdown();
    fetchTimeSeries();
  }, [fetchAggregate, fetchBreakdown, fetchTimeSeries]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setImportResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] || null;
    if (file && file.name.endsWith(".csv")) {
      setSelectedFile(file);
      setImportResult(null);
    } else {
      toast.error("Please select a CSV file");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Please select a CSV file first");
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (reportType && reportType !== "auto") formData.append("report_type", reportType);

      const res = await client.post<BaseResponse<ImportUploadResponse>>(
        `/sites/${domain}/import/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data.data) {
        setImportResult(res.data.data);
        toast.success(
          `Imported ${res.data.data.rows_imported} rows (${res.data.data.report_type})`
        );
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchAggregate();
        fetchBreakdown();
        fetchTimeSeries();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const maxBreakdownValue =
    breakdownData.length > 0
      ? Math.max(...breakdownData.map((r) => r.visitors))
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto p-4 md:p-10 space-y-6">
        <div className="space-y-2">
          <div
            className="text-sm text-blue-500 hover:underline cursor-pointer w-fit"
            onClick={() =>
              navigate(domain ? `/sites/${domain}/stats` : "/sites")
            }
          >
            ← {t("settings.layout.backToDashboard")}
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("import.title")}
          </h2>
          <p className="text-muted-foreground">{t("import.description")}</p>
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t("import.uploadCard.title")}
            </CardTitle>
            <CardDescription>
              {t("import.uploadCard.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                "hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20",
                "border-gray-300 dark:border-gray-600"
              )}
            >
              <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedFile
                  ? selectedFile.name
                  : t("import.uploadCard.dropHint")}
              </p>
              <p className="text-xs text-gray-400 mt-1">CSV, max 50MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-48">
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("import.uploadCard.autoDetect")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((rt) => (
                      <SelectItem key={rt.value} value={rt.value}>
                        {rt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleImport}
                disabled={importing || !selectedFile}
              >
                {importing ? (
                  <>{t("common.loading")}...</>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {t("import.uploadCard.import")}
                  </>
                )}
              </Button>
            </div>

            {importResult && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-green-800 dark:text-green-300">
                  {t("import.uploadCard.importSuccess", {
                    rows: importResult.rows_imported,
                    type: importResult.report_type,
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t("import.stats.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-36"
                />
                <span className="text-gray-400">-</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-36"
                />
              </div>
            </div>

            {aggLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3">
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                ))}
              </div>
            ) : aggData ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
                <StatCard
                  label={t("stats.metrics.visitors")}
                  value={formatNumber(aggData.visitors)}
                />
                <StatCard
                  label={t("stats.metrics.pageviews")}
                  value={formatNumber(aggData.pageviews)}
                />
                <StatCard
                  label={t("stats.metrics.visits")}
                  value={formatNumber(aggData.visits)}
                />
                <StatCard
                  label={t("stats.metrics.bounceRate")}
                  value={aggData.bounce_rate.toFixed(1) + "%"}
                />
                <StatCard
                  label={t("stats.metrics.visitDuration")}
                  value={formatDuration(aggData.visit_duration)}
                  sub={t("stats.metrics.viewsPerVisit") + ": " + aggData.views_per_visit.toFixed(2)}
                />
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-gray-400">
                {t("import.stats.noData")}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  {t("import.breakdown.title")}
                </CardTitle>
                <Select value={property} onValueChange={setProperty}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BREAKDOWN_PROPERTIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {breakdownLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-2/5" />
                      <Skeleton className="h-4 w-1/5" />
                    </div>
                  ))}
                </div>
              ) : breakdownData.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  {t("import.breakdown.noData")}
                </div>
              ) : (
                <div>
                  {breakdownData.map((row, i) => {
                    const barWidth =
                      maxBreakdownValue > 0
                        ? (row.visitors / maxBreakdownValue) * 100
                        : 0;
                    return (
                      <div key={i} className="relative group">
                        <div
                          className="absolute inset-y-0 left-0 bg-indigo-50 dark:bg-indigo-950/30 transition-all duration-300"
                          style={{ width: `${barWidth}%` }}
                        />
                        <div className="relative flex items-center justify-between px-2 py-2 border-b border-gray-50 dark:border-gray-800/50 last:border-b-0">
                          <span className="text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
                            {row.name}
                          </span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums w-16 text-right">
                              {row.visitors.toLocaleString()}
                            </span>
                            {row.pageviews > 0 && (
                              <span className="text-xs text-gray-400 tabular-nums w-16 text-right hidden sm:block">
                                {row.pageviews.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                {t("import.timeseries.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-1/5" />
                      <Skeleton className="h-4 w-1/5" />
                    </div>
                  ))}
                </div>
              ) : tsData.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  {t("import.timeseries.noData")}
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left py-2 font-medium text-gray-500">
                          {t("import.timeseries.date")}
                        </th>
                        <th className="text-right py-2 font-medium text-gray-500">
                          {t("stats.metrics.visitors")}
                        </th>
                        <th className="text-right py-2 font-medium text-gray-500 hidden sm:table-cell">
                          {t("stats.metrics.pageviews")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tsData.map((point, i) => (
                        <tr
                          key={i}
                          className="border-b border-gray-50 dark:border-gray-800/50 last:border-b-0"
                        >
                          <td className="py-2 text-gray-900 dark:text-gray-100">
                            {point.date}
                          </td>
                          <td className="py-2 text-right font-medium tabular-nums">
                            {point.visitors.toLocaleString()}
                          </td>
                          <td className="py-2 text-right text-gray-500 tabular-nums hidden sm:table-cell">
                            {point.pageviews.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
