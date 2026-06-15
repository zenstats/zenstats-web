import { useEffect, useState } from "react"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import axios, { type BaseResponse } from "@utils/axios"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Trash2 } from "lucide-react"

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

export default function AdminSites() {
  const { t } = useTranslation()
  const [sites, setSites] = useState<AdminSite[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false)
  const [selectedSite, setSelectedSite] = useState<AdminSite | null>(null)

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

  const openDeleteDialog = (site: AdminSite) => {
    setSelectedSite(site)
    setDeleteDialogOpen(true)
  }

  const openVerifyDialog = (site: AdminSite) => {
    setSelectedSite(site)
    setVerifyDialogOpen(true)
  }

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
                          <Badge variant="secondary">
                            {t('admin.sitesPage.unverified')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{site.remark || '-'}</TableCell>
                      <TableCell>{site.owner_name || t('admin.sitesPage.unknown')}</TableCell>
                      <TableCell>{site.timezone}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!site.is_verified && (
                            <Button variant="default" size="sm" onClick={() => openVerifyDialog(site)}>
                              {t('admin.sitesPage.verify')}
                            </Button>
                          )}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    {t('admin.usersPage.previous')}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {t('admin.usersPage.pageOf', { page, totalPages })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    {t('admin.usersPage.next')}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.sitesPage.deleteConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p>{t('admin.sitesPage.deleteConfirm', { domain: selectedSite?.domain })}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteSite}>
              {t('common.delete')}
            </Button>
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
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleVerifySite}>
              {t('admin.sitesPage.verify')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
