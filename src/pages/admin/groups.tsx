import { useEffect, useState } from "react"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import axios, { type BaseResponse } from "@utils/axios"

interface AdminGroup {
  id: number
  name: string
  description: string
  max_sites: number
  max_monthly_events: number
  max_api_keys: number
  max_sub_accounts: number
  custom_search_engines: boolean
  is_default: boolean
  price: number
  user_count: number
  created_at: string
  updated_at: string
}

export default function AdminGroups() {
  const { t } = useTranslation()
  const [groups, setGroups] = useState<AdminGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<AdminGroup | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    max_sites: 3,
    max_monthly_events: 10000,
    max_api_keys: 2,
    max_sub_accounts: 0,
    custom_search_engines: false,
    is_default: false,
    price: 0,
  })

  const fetchGroups = async () => {
    try {
      const { data } = await axios.get<BaseResponse<{ groups: AdminGroup[] }>>("/admin/groups")
      if (data.code === 200) {
        setGroups(data.data.groups)
      }
    } catch {
      toast.error(t('admin.groupsPage.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [t])

  const openCreateDialog = () => {
    setEditingGroup(null)
    setFormData({
      name: "",
      description: "",
      max_sites: 3,
      max_monthly_events: 10000,
      max_api_keys: 2,
      max_sub_accounts: 0,
      custom_search_engines: false,
      is_default: false,
      price: 0,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (group: AdminGroup) => {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      description: group.description,
      max_sites: group.max_sites,
      max_monthly_events: group.max_monthly_events,
      max_api_keys: group.max_api_keys,
      max_sub_accounts: group.max_sub_accounts,
      custom_search_engines: group.custom_search_engines,
      is_default: group.is_default,
      price: group.price,
    })
    setDialogOpen(true)
  }

  const handleSaveGroup = async () => {
    try {
      if (editingGroup) {
        await axios.put(`/admin/groups/${editingGroup.id}`, formData)
        toast.success(t('admin.groupsPage.updateSuccess'))
      } else {
        await axios.post("/admin/groups", formData)
        toast.success(t('admin.groupsPage.createSuccess'))
      }
      setDialogOpen(false)
      fetchGroups()
    } catch {
      toast.error(t('admin.groupsPage.saveFailed'))
    }
  }

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm(t('admin.groupsPage.deleteConfirm'))) return

    try {
      await axios.delete(`/admin/groups/${groupId}`)
      toast.success(t('admin.groupsPage.deleteSuccess'))
      fetchGroups()
    } catch {
      toast.error(t('admin.groupsPage.deleteFailed'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{t('admin.groupsPage.title')}</h3>
        <Button onClick={openCreateDialog}>{t('admin.groupsPage.createPlan')}</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {group.name}
                    {group.is_default && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{t('admin.groupsPage.default')}</span>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">${group.price}</div>
                  <div className="text-xs text-muted-foreground">{t('admin.groupsPage.perMonth')}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t('admin.groupsPage.sites')}</span>
                  <span>{group.max_sites === -1 ? t('admin.groupsPage.unlimited') : group.max_sites}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('admin.groupsPage.monthlyEvents')}</span>
                  <span>{group.max_monthly_events === -1 ? t('admin.groupsPage.unlimited') : group.max_monthly_events.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('admin.groupsPage.apiKeys')}</span>
                  <span>{group.max_api_keys === -1 ? t('admin.groupsPage.unlimited') : group.max_api_keys}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('admin.groupsPage.subAccounts')}</span>
                  <span>{group.max_sub_accounts === -1 ? t('admin.groupsPage.unlimited') : group.max_sub_accounts}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('admin.groupsPage.customSearchEngines')}</span>
                  <span>{group.custom_search_engines ? t('admin.groupsPage.yes') : t('admin.groupsPage.no')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('admin.groupsPage.users')}</span>
                  <span>{group.user_count}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(group)}>
                  {t('common.edit')}
                </Button>
                {!group.is_default && (
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteGroup(group.id)}>
                    {t('common.delete')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingGroup ? t('admin.groupsPage.editPlan') : t('admin.groupsPage.createPlan')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('admin.groupsPage.name')}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.groupsPage.description')}</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.groupsPage.maxSites')}</Label>
              <Input
                type="number"
                value={formData.max_sites}
                onChange={(e) => setFormData({ ...formData, max_sites: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.groupsPage.maxMonthlyEvents')}</Label>
              <Input
                type="number"
                value={formData.max_monthly_events}
                onChange={(e) => setFormData({ ...formData, max_monthly_events: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.groupsPage.maxApiKeys')}</Label>
              <Input
                type="number"
                value={formData.max_api_keys}
                onChange={(e) => setFormData({ ...formData, max_api_keys: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.groupsPage.maxSubAccounts')}</Label>
              <Input
                type="number"
                value={formData.max_sub_accounts}
                onChange={(e) => setFormData({ ...formData, max_sub_accounts: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.groupsPage.price')}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t('admin.groupsPage.customSearchEnginesLabel')}</Label>
                <Switch
                  checked={formData.custom_search_engines}
                  onCheckedChange={(checked) => setFormData({ ...formData, custom_search_engines: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t('admin.groupsPage.defaultPlan')}</Label>
                <Switch
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
              </div>
            </div>
          </div>
          <Button onClick={handleSaveGroup} className="w-full mt-4">
            {editingGroup ? t('admin.groupsPage.saveChanges') : t('admin.groupsPage.createPlan')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
