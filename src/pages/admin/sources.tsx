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

interface SourceItem {
  id: number
  domain: string
  name: string
}

export default function AdminSources() {
  const { t } = useTranslation()
  const [sources, setSources] = useState<SourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SourceItem | null>(null)
  const [formData, setFormData] = useState({ domain: "", name: "" })

  const fetchSources = async () => {
    try {
      const { data } = await axios.get<BaseResponse<SourceItem[]>>("/admin/sources")
      if (data.code === 200) {
        setSources(data.data)
      }
    } catch {
      toast.error(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSources() }, [])

  const openCreate = () => {
    setEditingItem(null)
    setFormData({ domain: "", name: "" })
    setDialogOpen(true)
  }

  const openEdit = (item: SourceItem) => {
    setEditingItem(item)
    setFormData({ domain: item.domain, name: item.name })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingItem) {
        await axios.put(`/admin/sources/${editingItem.id}`, formData)
        toast.success(t('adminSources.updateSuccess'))
      } else {
        await axios.post("/admin/sources", formData)
        toast.success(t('adminSources.createSuccess'))
      }
      setDialogOpen(false)
      fetchSources()
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('common.confirm'))) return
    try {
      await axios.delete(`/admin/sources/${id}`)
      toast.success(t('adminSources.deleteSuccess'))
      fetchSources()
    } catch {
      toast.error(t('common.error'))
    }
  }

  if (loading) return <div className="text-center py-4">{t('common.loading')}</div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('adminSources.title')}</CardTitle>
            <CardDescription>{t('adminSources.description')}</CardDescription>
          </div>
          <Button onClick={openCreate}>{t('adminSources.addSource')}</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('adminSources.domain')}</TableHead>
                <TableHead>{t('adminSources.name')}</TableHead>
                <TableHead>{t('adminSources.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.domain}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>{t('common.edit')}</Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(item.id)}>{t('common.delete')}</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? t('adminSources.editSource') : t('adminSources.addSource')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('adminSources.domain')}</Label>
              <Input value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} placeholder="google.com" />
            </div>
            <div className="space-y-2">
              <Label>{t('adminSources.name')}</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Google" />
            </div>
            <Button onClick={handleSave} className="w-full">{editingItem ? t('common.save') : t('adminSources.addSource')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
