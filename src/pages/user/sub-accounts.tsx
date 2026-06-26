import { useEffect, useState } from "react"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import axios, { type BaseResponse } from "@utils/axios"
import { isSubAccount } from "@utils/auth"

interface SubAccount {
  id: number
  email: string
  name: string
  role: string
  status: string
  last_seen: string | null
  created_at: string
  updated_at: string
}

interface SubAccountListResponse {
  sub_accounts: SubAccount[]
  has_permission: boolean
  max_sub_accounts: number
  current_count: number
}

export default function UserSubAccounts() {
  const { t } = useTranslation()
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([])
  const [hasPermission, setHasPermission] = useState(true)
  const [maxSubAccounts, setMaxSubAccounts] = useState(0)
  const [currentCount, setCurrentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ email: "", name: "", password: "" })
  const subAccount = isSubAccount()

  const fetchSubAccounts = async () => {
    try {
      const { data } = await axios.get<BaseResponse<SubAccountListResponse>>("/user/sub-accounts")
      if (data.code === 200) {
        setSubAccounts(data.data.sub_accounts)
        setHasPermission(data.data.has_permission)
        setMaxSubAccounts(data.data.max_sub_accounts)
        setCurrentCount(data.data.current_count)
      }
    } catch {
      toast.error(t('subAccounts.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubAccounts()
  }, [])

  const handleCreateSubAccount = async () => {
    try {
      await axios.post("/user/sub-accounts", formData)
      toast.success(t('subAccounts.createSuccess'))
      setDialogOpen(false)
      setFormData({ email: "", name: "", password: "" })
      fetchSubAccounts()
    } catch {
      toast.error(t('subAccounts.createFailed'))
    }
  }

  const handleDeleteSubAccount = async (id: number) => {
    if (!confirm(t('common.confirm'))) return
    try {
      await axios.delete(`/user/sub-accounts/${id}`)
      toast.success(t('subAccounts.deleteSuccess'))
      fetchSubAccounts()
    } catch {
      toast.error(t('subAccounts.deleteFailed'))
    }
  }

  if (loading) {
    return <div className="text-center py-4">{t('common.loading')}</div>
  }

  if (!hasPermission) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            {t('subAccounts.noPermission')}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {t('subAccounts.upgradeHint')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('subAccounts.title')}</CardTitle>
            <CardDescription>
              {t('subAccounts.description', { current: currentCount, max: maxSubAccounts === -1 ? "∞" : maxSubAccounts })}
            </CardDescription>
          </div>
          {!subAccount && (maxSubAccounts === -1 || currentCount < maxSubAccounts) && (
            <Button onClick={() => setDialogOpen(true)}>{t('subAccounts.create')}</Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('subAccounts.email')}</TableHead>
                <TableHead>{t('subAccounts.name')}</TableHead>
                <TableHead>{t('subAccounts.status')}</TableHead>
                {!subAccount && <TableHead className="w-[1%] whitespace-nowrap">{t('subAccounts.actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {subAccounts.map((sa) => (
                <TableRow key={sa.id}>
                  <TableCell>{sa.email}</TableCell>
                  <TableCell>{sa.name}</TableCell>
                  <TableCell>
                    <Badge variant={sa.status === "active" ? "default" : "destructive"}>
                      {sa.status}
                    </Badge>
                  </TableCell>
                  {!subAccount && (
                    <TableCell className="whitespace-nowrap">
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteSubAccount(sa.id)}>
                        {t('common.delete')}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!subAccount && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('subAccounts.createTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('subAccounts.email')}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('subAccounts.emailPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('subAccounts.name')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('subAccounts.namePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('subAccounts.password')}</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateSubAccount} className="w-full">{t('subAccounts.create')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
