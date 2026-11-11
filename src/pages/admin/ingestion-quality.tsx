import HeatmapQuality from "./heatmap-quality"
import GeoIPQuality, { type GeoIPStatus } from "./geoip-quality"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Activity, RefreshCw } from "lucide-react"
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import axios, { type BaseResponse } from "@utils/axios"

type Counters = Record<string, number>
interface WriterStats {
  queued_rows: number
  inflight_rows: number
  written_rows: number
  failed_rows: number
  retry_attempts: number
  failed_attempts: number
  succeeded_batches: number
  failed_batches: number
  last_success_at: string | null
  last_failure_at: string | null
  last_duration_ms: number
}
interface QualitySnapshot {
  geoip?: GeoIPStatus
  instance_id: string
  started_at: string
  timestamp: string
  counters: Counters
  pending: { events: number; oldest_age_seconds: number; stages: Record<string, number> }
  reasons: { stage: string; outcome: string; reason: string; count: number }[]
  writers: Record<string, WriterStats>
  history: { timestamp: string; counters: Counters }[]
}

const counterKeys = ["received", "accepted", "persisted", "filtered", "rejected", "failed"] as const
const colors: Record<string, string> = { received: "#2563eb", persisted: "#16a34a", failed: "#dc2626", filtered: "#d97706" }

export default function IngestionQuality() {
  const { t, i18n } = useTranslation()
  const [snapshot, setSnapshot] = useState<QualitySnapshot | null>(null)
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [revision, setRevision] = useState(0)
  const [instanceChanged, setInstanceChanged] = useState(false)
  const previousInstance = useRef<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    const load = async () => {
      if (document.visibilityState === "hidden") {
        timer = setTimeout(load, 5000)
        return
      }
      setRefreshing(true)
      try {
        const { data } = await axios.get<BaseResponse<QualitySnapshot>>("/admin/ingestion-quality", { signal: controller.signal, timeout: 10000 })
        if (controller.signal.aborted) return
        if (data.code !== 200) throw new Error("Collection quality request failed")
        const next = data.data
        if (previousInstance.current && previousInstance.current !== next.instance_id) setInstanceChanged(true)
        previousInstance.current = next.instance_id
        setSnapshot(next)
        setError(false)
      } catch {
        if (!controller.signal.aborted) setError(true)
      } finally {
        if (!controller.signal.aborted) {
          setRefreshing(false)
          timer = setTimeout(load, 5000)
        }
      }
    }
    void load()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [revision])

  const number = (value: number) => value.toLocaleString(i18n.language)
  const dateTime = (value: string | null) => value ? new Date(value).toLocaleString(i18n.language) : "—"
  const time = (value: string) => new Date(value).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" })
  const points = snapshot?.history.map(point => ({ timestamp: point.timestamp, ...point.counters })) ?? []
  const recentFailed = snapshot?.history.slice(-5).reduce((sum, point) => sum + point.counters.failed, 0) ?? 0
  const delayed = (snapshot?.pending.oldest_age_seconds ?? 0) > 60
  const writerFailed = Object.values(snapshot?.writers ?? {}).some(writer => writer.last_failure_at && (!writer.last_success_at || Date.parse(writer.last_failure_at) > Date.parse(writer.last_success_at)))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-medium"><Activity className="h-5 w-5" />{t("admin.ingestion.title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.ingestion.description")}</p>
        </div>
        <Button variant="outline" size="sm" disabled={refreshing} onClick={() => setRevision(value => value + 1)}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />{t("admin.ingestion.refresh")}
        </Button>
      </div>
      <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">{t("admin.ingestion.scope")}</p>
      {instanceChanged && <p role="status" className="rounded-md border border-amber-400 p-3 text-sm">{t("admin.ingestion.instanceChanged")}</p>}
      {error && <p role="alert" className="rounded-md border border-red-400 p-3 text-sm text-red-600">{t("admin.ingestion.loadFailed")}</p>}
      {!snapshot && !error && <p className="py-12 text-center text-muted-foreground">{t("common.loading")}</p>}
      {snapshot && <>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>{t("admin.ingestion.instance")}: {snapshot.instance_id.slice(0, 8)}</span>
          <span>{t("admin.ingestion.started")}: {dateTime(snapshot.started_at)}</span>
          <span>{t("admin.ingestion.updated")}: {dateTime(snapshot.timestamp)}</span>
        </div>
        {(recentFailed > 0 || delayed || writerFailed) && <p role="alert" className="rounded-md border border-amber-400 bg-amber-50/50 p-3 text-sm dark:bg-amber-950/20">{t("admin.ingestion.attention")}</p>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {counterKeys.map(key => <Card key={key}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t(`admin.ingestion.counters.${key}`)}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-semibold tabular-nums">{number(snapshot.counters[key])}</div></CardContent>
          </Card>)}
        </div>
        <p className="text-xs text-muted-foreground">{t("admin.ingestion.counterNote")}</p>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("admin.ingestion.pending")}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              <div><p className="text-sm text-muted-foreground">{t("admin.ingestion.pendingCount")}</p><p className="text-2xl font-semibold">{number(snapshot.pending.events)}</p></div>
              <div><p className="text-sm text-muted-foreground">{t("admin.ingestion.oldest")}</p><p className="text-2xl font-semibold">{number(Math.floor(snapshot.pending.oldest_age_seconds))} s</p></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {["queued", "processing", "buffered", "writing"].map(stage => <span key={stage}>{t(`admin.ingestion.stages.${stage}`)}: {number(snapshot.pending.stages[stage] ?? 0)}</span>)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("admin.ingestion.trend")}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64" role="img" aria-label={t("admin.ingestion.trend")}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ left: 0, right: 12, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="timestamp" tickFormatter={time} minTickGap={40} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} width={45} tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={value => time(String(value))} />
                  <Legend />
                  {Object.entries(colors).map(([key, color]) => <Line key={key} dataKey={key} name={t(`admin.ingestion.counters.${key}`)} stroke={color} dot={false} strokeWidth={2} isAnimationActive={false} />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("admin.ingestion.writers")}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>{t("admin.ingestion.table")}</TableHead>{["queued_rows", "inflight_rows", "written_rows", "failed_rows", "retry_attempts"].map(key => <TableHead key={key}>{t(`admin.ingestion.writer.${key}`)}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{Object.entries(snapshot.writers).map(([name, writer]) => <TableRow key={name}><TableCell>{t(`admin.ingestion.tables.${name}`)}</TableCell><TableCell>{number(writer.queued_rows)}</TableCell><TableCell>{number(writer.inflight_rows)}</TableCell><TableCell>{number(writer.written_rows)}</TableCell><TableCell>{number(writer.failed_rows)}</TableCell><TableCell>{number(writer.retry_attempts)}</TableCell></TableRow>)}</TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">{t("admin.ingestion.writerNote")}</p>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">{Object.entries(snapshot.writers).map(([name, writer]) => <p key={name}>{t(`admin.ingestion.tables.${name}`)} · {t("admin.ingestion.lastSuccess")}: {dateTime(writer.last_success_at)} · {t("admin.ingestion.lastFailure")}: {dateTime(writer.last_failure_at)}</p>)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("admin.ingestion.reasons")}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>{["stage", "outcome", "reason", "count"].map(key => <TableHead key={key}>{t(`admin.ingestion.${key}`)}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{snapshot.reasons.map(row => <TableRow key={`${row.stage}-${row.outcome}-${row.reason}`}><TableCell>{t(`admin.ingestion.stages.${row.stage}`, row.stage)}</TableCell><TableCell>{t(`admin.ingestion.counters.${row.outcome}`, row.outcome)}</TableCell><TableCell>{t(`admin.ingestion.reasonLabels.${row.reason}`, row.reason)}</TableCell><TableCell>{number(row.count)}</TableCell></TableRow>)}</TableBody>
            </Table>
            {snapshot.reasons.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t("admin.ingestion.emptyReasons")}</p>}
            <p className="mt-3 text-xs text-muted-foreground">{t("admin.ingestion.requests", { total: number(snapshot.counters.requests), invalid: number(snapshot.counters.invalid_requests) })}</p>
          </CardContent>
        </Card>
      </>}
      <GeoIPQuality status={snapshot?.geoip} />
      <HeatmapQuality />
      <HeatmapQuality scroll />
      <HeatmapQuality performance />
    </div>
  )
}
