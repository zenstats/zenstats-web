import { useEffect, useState } from "react"
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Globe, Zap, Key, Users, Search } from "lucide-react"
import axios, { type BaseResponse } from "@utils/axios"
import { toast } from "sonner"

interface QuotaInfo {
  group_name: string
  max_sites: number
  max_monthly_events: number
  max_api_keys: number
  max_sub_accounts: number
  custom_search_engines: boolean
  current_sites: number
  current_monthly_events: number
  current_api_keys: number
  current_sub_accounts: number
}

function QuotaBar({ label, icon: Icon, current, max }: {
  label: string
  icon: React.ElementType
  current: number
  max: number
}) {
  const { t } = useTranslation()
  const isUnlimited = max === -1
  const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100)
  const isWarning = percentage >= 80
  const isCritical = percentage >= 95

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {isUnlimited ? t('quota.unlimited') : `${current} / ${max}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default function UserQuota() {
  const { t } = useTranslation()
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const { data } = await axios.get<BaseResponse<QuotaInfo>>("/user/quota")
        if (data.code === 200) {
          setQuota(data.data)
        }
      } catch {
        toast.error(t('quota.loadFailed'))
      } finally {
        setLoading(false)
      }
    }
    fetchQuota()
  }, [t])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!quota) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground text-center">{t('quota.loadFailed')}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('quota.title')}</h1>
        <div className="border-b border-gray-200 mt-4"></div>
      </div>

      <div className="grid gap-6">
        {/* Plan Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('quota.currentPlan')}</CardTitle>
                <CardDescription>{t('quota.planDescription')}</CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {quota.group_name}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader>
            <CardTitle>{t('quota.usage')}</CardTitle>
            <CardDescription>{t('quota.usageDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <QuotaBar
              label={t('quota.sites')}
              icon={Globe}
              current={quota.current_sites}
              max={quota.max_sites}
            />
            <QuotaBar
              label={t('quota.monthlyEvents')}
              icon={Zap}
              current={quota.current_monthly_events}
              max={quota.max_monthly_events}
            />
            <QuotaBar
              label={t('quota.apiKeys')}
              icon={Key}
              current={quota.current_api_keys}
              max={quota.max_api_keys}
            />
            <QuotaBar
              label={t('quota.subAccounts')}
              icon={Users}
              current={quota.current_sub_accounts}
              max={quota.max_sub_accounts}
            />
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>{t('quota.features')}</CardTitle>
            <CardDescription>{t('quota.featuresDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5" />
              <span className="text-sm">{t('quota.customSearchEngines')}</span>
              <Badge variant={quota.custom_search_engines ? "default" : "secondary"}>
                {quota.custom_search_engines ? t('quota.enabled') : t('quota.disabled')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
