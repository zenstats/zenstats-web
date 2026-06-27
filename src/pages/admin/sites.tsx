import { useEffect, useState } from "react"
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import axios, { type BaseResponse } from "@utils/axios"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Trash2, BellRing, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminSite {
  id: number
  domain: string
  remark: string
  timezone: string
  owner_name: string
  is_verified: boolean
  verified_at?: string
  created_at: string
}

interface SiteListResponse {
  sites: AdminSite[]
  total_count: number
  page: number
  page_size: number
}

interface TrafficAlertTestResult {
  domain: string
  interval: string
  period: string
  threshold: number
  anomaly_detected: boolean
  is_spike?: boolean
  current_visitors: number
  previous_visitors: number
  visitors_change: number
  current_pageviews: number
  previous_pageviews: number
  pageviews_change: number
  email_sent: boolean
  email_recipient?: string
}

export default function AdminSites() {
  const { t } = useTranslation()
  const [sites, setSites] = useState<AdminSite[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false)
  const [alertDialogOpen, setAlertDialogOpen] = useState(false)
  const [selectedSite, setSelectedSite] = useState<AdminSite | null>(null)
  const [alertEmail, setAlertEmail] = useState("")
  const [alertTesting, setAlertTesting] = useState(false)
  const [alertResult, setAlertResult] = useState<TrafficAlertTestResult | null>(null)

  const fetchSites = async () => {
    try {
      const { data } = await axios.get<BaseResponse<SiteListResponse>>("/admin/sites", {
        params: { page, page_size: 20 }
      })
      if (data.code === 200) {
        setSites(data.data.sites)
        setTotalCount(data.data.total_count)
      }
    } catch {
      toast.error(t('admin.sitesPage.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSites()
  }, [page, t])

  const handleDeleteSite = async () => {
    if (!selectedSite) return
    try {
      await axios.delete(`/admin/sites/${selectedSite.id}`)
      toast.success(t('admin.sitesPage.deleteSuccess'))
      setDeleteDialogOpen(false)
      setSelectedSite(null)
      fetchSites()
    } catch {
      toast.error(t('admin.sitesPage.deleteFailed'))
    }
  }

  const handleVerifySite = async () => {
    if (!selectedSite) return
    try {
      await axios.put(`/admin/sites/${selectedSite.id}/verify`)
      toast.success(t('admin.sitesPage.verifySuccess'))
      setVerifyDialogOpen(false)
      setSelectedSite(null)
      fetchSites()
    } catch {
      toast.error(t('admin.sitesPage.verifyFailed'))
    }
  }

  const handleTestAlert = async () => {
    if (!selectedSite) return
    setAlertTesting(true)
    setAlertResult(null)
    try {
      const params: Record<string, string> = {}
      if (alertEmail.trim()) params.email = alertEmail.trim()
      const { data } = await axios.post<BaseResponse<TrafficAlertTestResult>>(
        `/admin/sites/${selectedSite.id}/traffic-alert/test`,
        null,
        { params }
      )
      setAlertResult(data.data)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || t('admin.sitesPage.alertTestFailed'))
    } finally {
      setAlertTesting(false)
    }
  }

  const openAlertDialog = (site: AdminSite) => {
    setSelectedSite(site)
    setAlertEmail("")
    setAlertResult(null)
    setAlertDialogOpen(true)
  }

  const openDeleteDialog = (site: AdminSite) => { setSelectedSite(site); setDeleteDialogOpen(true) }
  const openVerifyDialog = (site: AdminSite) => { setSelectedSite(site); setVerifyDialogOpen(true) }

  const totalPages = Math.ceil(totalCount / 20)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.sitesPage.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">{t('common.loading')}</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.sitesPage.domain')}</TableHead>
                    <TableHead>{t('admin.sitesPage.status')}</TableHead>
                    <TableHead>{t('admin.sitesPage.remark')}</TableHead>
                    <TableHead>{t('admin.sitesPage.owner')}</TableHead>
                    <TableHead>{t('admin.sitesPage.timezone')}</TableHead>
                    <TableHead>{t('admin.sitesPage.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-mono">{site.domain}</TableCell>
                      <TableCell>
                        {site.is_verified ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t('admin.sitesPage.verified')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{t('admin.sitesPage.unverified')}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{site.remark || '-'}</TableCell>
                      <TableCell>{site.owner_name || t('admin.sitesPage.unknown')}</TableCell>
                      <TableCell>{site.timezone}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex gap-2">
                          {!site.is_verified && (
                            <Button variant="default" size="sm" onClick={() => openVerifyDialog(site)}>
                              {t('admin.sitesPage.verify')}
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => openAlertDialog(site)}>
                            <BellRing className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(site)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    {t('admin.usersPage.previous')}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {t('admin.usersPage.pageOf', { page, totalPages })}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    {t('admin.usersPage.next')}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Traffic Alert Test Dialog */}
      <Dialog open={alertDialogOpen} onOpenChange={(open) => { setAlertDialogOpen(open); if (!open) setAlertResult(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.sitesPage.alertTestTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.sitesPage.alertTestDesc', { domain: selectedSite?.domain })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('admin.sitesPage.alertTestEmail')}</Label>
              <Input
                placeholder="admin@example.com"
                value={alertEmail}
                onChange={e => setAlertEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('admin.sitesPage.alertTestEmailHint')}</p>
            </div>

            <Button onClick={handleTestAlert} disabled={alertTesting} className="w-full">
              {alertTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BellRing className="h-4 w-4 mr-2" />}
              {alertTesting ? t('admin.sitesPage.alertTesting') : t('admin.sitesPage.alertTestRun')}
            </Button>

            {alertResult && <AlertResultCard result={alertResult} t={t} />}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAlertDialogOpen(false)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.sitesPage.deleteConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p>{t('admin.sitesPage.deleteConfirm', { domain: selectedSite?.domain })}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleDeleteSite}>{t('common.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.sitesPage.verifyConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p>{t('admin.sitesPage.verifyConfirm', { domain: selectedSite?.domain })}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleVerifySite}>{t('admin.sitesPage.verify')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AlertResultCard({ result, t }: { result: TrafficAlertTestResult; t: TFunction }) {
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 })
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-3 text-sm",
      result.anomaly_detected
        ? result.is_spike ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
          : "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30"
        : "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
    )}>
      {/* Status */}
      <div className="flex items-center gap-2 font-medium">
        {result.anomaly_detected ? (
          result.is_spike
            ? <><TrendingUp className="h-4 w-4 text-red-500" /><span className="text-red-700 dark:text-red-400">{t('admin.sitesPage.alertResultSpike')}</span></>
            : <><TrendingDown className="h-4 w-4 text-blue-500" /><span className="text-blue-700 dark:text-blue-400">{t('admin.sitesPage.alertResultDrop')}</span></>
        ) : (
          <><Minus className="h-4 w-4 text-green-600" /><span className="text-green-700 dark:text-green-400">{t('admin.sitesPage.alertResultNormal')}</span></>
        )}
      </div>

      {/* Meta */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        <div>{t('admin.sitesPage.alertResultInterval')}: <span className="font-mono">{result.interval}</span></div>
        {result.period && <div>{t('admin.sitesPage.alertResultPeriod')}: <span className="font-mono">{result.period}</span></div>}
        <div>{t('admin.sitesPage.alertResultThreshold')}: {result.threshold}%</div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCell
          label={t('admin.sitesPage.alertResultVisitors')}
          current={fmt(result.current_visitors)}
          previous={fmt(result.previous_visitors)}
          change={fmtPct(result.visitors_change)}
          positive={result.visitors_change >= 0}
        />
        <MetricCell
          label={t('admin.sitesPage.alertResultPageviews')}
          current={fmt(result.current_pageviews)}
          previous={fmt(result.previous_pageviews)}
          change={fmtPct(result.pageviews_change)}
          positive={result.pageviews_change >= 0}
        />
      </div>

      {/* Email status */}
      {result.email_sent && (
        <p className="text-xs text-muted-foreground">
          ✉ {t('admin.sitesPage.alertResultEmailSent', { email: result.email_recipient })}
        </p>
      )}
    </div>
  )
}

function MetricCell({ label, current, previous, change, positive }: {
  label: string; current: string; previous: string; change: string; positive: boolean
}) {
  return (
    <div className="rounded bg-white/60 dark:bg-white/5 border border-white/80 dark:border-white/10 px-3 py-2">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="font-semibold text-base">{current}</div>
      <div className="text-xs text-muted-foreground">vs {previous}</div>
      <div className={cn("text-xs font-medium mt-0.5", positive ? "text-red-500" : "text-blue-500")}>{change}</div>
    </div>
  )
}
