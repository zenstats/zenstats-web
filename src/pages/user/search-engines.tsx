import { useEffect, useState } from "react"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import axios, { type BaseResponse } from "@utils/axios"
import { isSubAccount } from "@utils/auth"

interface CustomSearchEngine {
  id: number
  domain: string
  name: string
  created_at: string
  updated_at: string
}

interface SearchEngineListResponse {
  engines: CustomSearchEngine[]
  has_permission: boolean
}

export default function UserSearchEngines() {
  const { t } = useTranslation()
  const [engines, setEngines] = useState<CustomSearchEngine[]>([])
  const [hasPermission, setHasPermission] = useState(true)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEngine, setEditingEngine] = useState<CustomSearchEngine | null>(null)
  const [formData, setFormData] = useState({ domain: "", name: "" })
  const subAccount = isSubAccount()

  const fetchEngines = async () => {
    try {
      const { data } = await axios.get<BaseResponse<SearchEngineListResponse>>("/user/search-engines")
      if (data.code === 200) {
        setEngines(data.data.engines)
        setHasPermission(data.data.has_permission)
      }
    } catch {
      toast.error(t('searchEngines.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEngines()
  }, [])

  const openCreateDialog = () => {
    setEditingEngine(null)
    setFormData({ domain: "", name: "" })
    setDialogOpen(true)
  }

  const openEditDialog = (engine: CustomSearchEngine) => {
    setEditingEngine(engine)
    setFormData({ domain: engine.domain, name: engine.name })
    setDialogOpen(true)
  }

  const handleSaveEngine = async () => {
    try {
      if (editingEngine) {
        await axios.put(`/user/search-engines/${editingEngine.id}`, formData)
        toast.success(t('searchEngines.updateSuccess'))
      } else {
        await axios.post("/user/search-engines", formData)
        toast.success(t('searchEngines.createSuccess'))
      }
      setDialogOpen(false)
      fetchEngines()
    } catch {
      toast.error(t('searchEngines.saveFailed'))
    }
  }

  const handleDeleteEngine = async (engineId: number) => {
    if (!confirm(t('common.confirm'))) return
    try {
      await axios.delete(`/user/search-engines/${engineId}`)
      toast.success(t('searchEngines.deleteSuccess'))
      fetchEngines()
    } catch {
      toast.error(t('searchEngines.deleteFailed'))
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
            {t('searchEngines.noPermission')}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {t('searchEngines.upgradeHint')}
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
            <CardTitle>{t('searchEngines.title')}</CardTitle>
            <CardDescription>
              {t('searchEngines.description')}
            </CardDescription>
          </div>
          {!subAccount && (
            <Button onClick={openCreateDialog}>{t('searchEngines.addEngine')}</Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('searchEngines.domain')}</TableHead>
                <TableHead>{t('searchEngines.name')}</TableHead>
                {!subAccount && <TableHead>{t('searchEngines.actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {engines.map((engine) => (
                <TableRow key={engine.id}>
                  <TableCell>{engine.domain}</TableCell>
                  <TableCell>{engine.name}</TableCell>
                  {!subAccount && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(engine)}>
                          {t('common.edit')}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteEngine(engine.id)}>
                          {t('common.delete')}
                        </Button>
                      </div>
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
              <DialogTitle>{editingEngine ? t('searchEngines.editEngine') : t('searchEngines.addEngine')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('searchEngines.domain')}</Label>
                <Input
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder={t('searchEngines.domainPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('searchEngines.name')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('searchEngines.namePlaceholder')}
                />
              </div>
              <Button onClick={handleSaveEngine} className="w-full">
                {editingEngine ? t('common.save') : t('searchEngines.addEngine')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
