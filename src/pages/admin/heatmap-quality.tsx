import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import axios, { type BaseResponse } from '@utils/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Quality {
  instance_id: string; started_at: string
  received: number; accepted: number; rejected: number; filtered: number; persisted: number; failed: number
  pending: number; retries: number; oldest_age_seconds: number; last_success: string | null; last_failure: string | null
}
export default function HeatmapQuality({ scroll = false }: { scroll?: boolean }) {
  const { t } = useTranslation()
  const [quality, setQuality] = useState<Quality | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function load() {
      try {
        if (document.visibilityState !== 'hidden') {
          const res = await axios.get<BaseResponse<Quality>>(scroll ? '/admin/scroll-quality' : '/admin/heatmap-quality', { signal: controller.signal, timeout: 10000 })
          if (!controller.signal.aborted) { setQuality(res.data.data); setError(false) }
        }
      } catch { if (!controller.signal.aborted) setError(true) }
      finally { if (!controller.signal.aborted) timer = setTimeout(load, 5000) }
    }
    void load()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [scroll])
  const date = (value: string | null) => value ? new Date(value).toLocaleString() : '—'
  return <Card>
    <CardHeader><CardTitle>{t(scroll ? 'heatmap.scroll.qualityTitle' : 'heatmap.qualityTitle')}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('heatmap.qualityScope')}</p>
      {error && <p role="alert">{t('heatmap.qualityUnavailable')}</p>}
      {!quality && !error && <p>{t('common.loading')}</p>}
      {quality && <>
        <p className="text-xs text-muted-foreground">{quality.instance_id} · {date(quality.started_at)}</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{(['received', 'accepted', 'persisted', 'filtered', 'rejected', 'failed'] as const).map(key => <div key={key}><p className="text-sm text-muted-foreground">{t(`admin.ingestion.counters.${key}`)}</p><p className="text-2xl font-semibold">{quality[key].toLocaleString()}</p></div>)}</div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>{t('heatmap.pending')}: {quality.pending}</span><span>{t('heatmap.oldest')}: {Math.floor(quality.oldest_age_seconds)}</span><span>{t('heatmap.retries')}: {quality.retries}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t('heatmap.lastSuccess')}: {date(quality.last_success)} · {t('heatmap.lastFailure')}: {date(quality.last_failure)}</p>
        {(quality.oldest_age_seconds > 60 || quality.last_failure && (!quality.last_success || quality.last_failure > quality.last_success)) && <p role="alert" className="rounded border border-amber-400 p-3 text-sm">{t('admin.ingestion.attention')}</p>}
      </>}
    </CardContent>
  </Card>
}
