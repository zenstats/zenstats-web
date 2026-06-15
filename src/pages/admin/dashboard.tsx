import { useEffect, useState } from "react"
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, BarChart3 } from "lucide-react"
import { toast } from "sonner"
import axios, { type BaseResponse } from "@utils/axios"

interface GroupStat {
  group_id: number
  group_name: string
  user_count: number
}

interface SystemStats {
  user_count: number
  group_stats: GroupStat[]
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await axios.get<BaseResponse<SystemStats>>("/admin/stats")
        if (data.code === 200) {
          setStats(data.data)
        } else {
          toast.error(t('admin.dashboardPage.loadFailed'))
        }
      } catch {
        toast.error(t('admin.dashboardPage.loadFailed'))
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [t])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.dashboardPage.totalUsers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.user_count || 0}</div>
          </CardContent>
        </Card>
        {stats?.group_stats?.map((group) => (
          <Card key={group.group_id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{group.group_name}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{group.user_count}</div>
              <p className="text-xs text-muted-foreground">{t('admin.dashboardPage.users')}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
