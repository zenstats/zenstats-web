import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import axios, { type BaseResponse } from "@utils/axios";
import dayjs from "dayjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Mail, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailLog {
  id: number;
  recipient: string;
  subject: string;
  email_type: string;
  status: string;
  error?: string;
  site_id?: number;
  created_at: string;
}

interface EmailLogListResponse {
  logs: EmailLog[];
  total_count: number;
  page: number;
  page_size: number;
}

const PAGE_SIZE = 20;
const STATUSES = ["", "sent", "failed", "skipped"];
const TYPES = ["", "verification", "password_reset", "email_report", "traffic_alert"];

function statusClass(status: string): string {
  switch (status) {
    case "sent":
      return "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400";
    case "failed":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";
    case "skipped":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function AdminEmailLogs() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: PAGE_SIZE };
      if (status) params.status = status;
      if (type) params.type = type;
      const res = await axios.get<BaseResponse<EmailLogListResponse>>("/admin/email-logs", { params });
      setLogs(res.data.data?.logs || []);
      setTotalCount(res.data.data?.total_count || 0);
    } catch {
      setLogs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, status, type]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {t("admin.emailLogs.title", "Email Logs")}
          <span className="text-sm font-normal text-muted-foreground">({totalCount})</span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder={t("admin.emailLogs.status", "Status")} />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s || "all"} value={s || "all"}>
                  {s ? t(`admin.emailLogs.statuses.${s}`, s) : t("admin.emailLogs.allStatuses", "All statuses")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type || "all"} onValueChange={(v) => { setType(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder={t("admin.emailLogs.type", "Type")} />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((ty) => (
                <SelectItem key={ty || "all"} value={ty || "all"}>
                  {ty ? t(`admin.emailLogs.types.${ty}`, ty) : t("admin.emailLogs.allTypes", "All types")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchLogs()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {t("admin.emailLogs.empty", "No email records yet.")}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.emailLogs.recipient", "Recipient")}</TableHead>
                  <TableHead>{t("admin.emailLogs.subject", "Subject")}</TableHead>
                  <TableHead>{t("admin.emailLogs.type", "Type")}</TableHead>
                  <TableHead>{t("admin.emailLogs.statusCol", "Status")}</TableHead>
                  <TableHead>{t("admin.emailLogs.time", "Time")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="max-w-[180px] truncate" title={log.recipient}>{log.recipient}</TableCell>
                    <TableCell className="max-w-[220px] truncate" title={log.subject}>{log.subject}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {t(`admin.emailLogs.types.${log.email_type}`, log.email_type)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", statusClass(log.status))}
                        title={log.error || undefined}
                      >
                        {t(`admin.emailLogs.statuses.${log.status}`, log.status)}
                      </span>
                      {log.status === "failed" && log.error && (
                        <div className="text-xs text-red-500 mt-0.5 max-w-[240px] truncate" title={log.error}>
                          {log.error}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {dayjs(log.created_at).format("YYYY-MM-DD HH:mm:ss")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4 pt-3">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-8 px-3 text-xs gap-1">
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {t("common.back", "Prev")}
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="h-8 px-3 text-xs gap-1">
                  {t("common.next", "Next")}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
