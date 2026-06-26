import { useEffect, useState } from "react"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import axios, { type BaseResponse } from "@utils/axios"

interface AdminUser {
  id: number
  email: string
  name: string
  is_admin: boolean
  status: string
  group_id: number
  group_name: string
  created_at: string
  updated_at: string
}

interface AdminGroup {
  id: number
  name: string
}

interface UserListResponse {
  users: AdminUser[]
  total_count: number
  page: number
  page_size: number
}

export default function AdminUsers() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [groups, setGroups] = useState<AdminGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<number>(0)
  const [selectedStatus, setSelectedStatus] = useState<string>("")

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get<BaseResponse<UserListResponse>>("/admin/users", {
        params: { page, page_size: 20 }
      })
      if (data.code === 200) {
        setUsers(data.data.users)
        setTotalCount(data.data.total_count)
      }
    } catch {
      toast.error(t('admin.usersPage.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchGroups = async () => {
    try {
      const { data } = await axios.get<BaseResponse<{ groups: AdminGroup[] }>>("/admin/groups")
      if (data.code === 200) {
        setGroups(data.data.groups)
      }
    } catch {
      toast.error(t('admin.usersPage.loadGroupsFailed'))
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchGroups()
  }, [page, t])

  const handleEditUser = async () => {
    if (!selectedUser) return

    try {
      if (selectedGroupId !== 0) {
        await axios.put(`/admin/users/${selectedUser.id}/group`, { group_id: selectedGroupId })
      }
      if (selectedStatus) {
        await axios.put(`/admin/users/${selectedUser.id}/status`, { status: selectedStatus })
      }
      toast.success(t('admin.usersPage.updateSuccess'))
      setEditDialogOpen(false)
      fetchUsers()
    } catch {
      toast.error(t('admin.usersPage.updateFailed'))
    }
  }

  const openEditDialog = (user: AdminUser) => {
    setSelectedUser(user)
    setSelectedGroupId(user.group_id || 0)
    setSelectedStatus(user.status)
    setEditDialogOpen(true)
  }

  const totalPages = Math.ceil(totalCount / 20)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.usersPage.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">{t('common.loading')}</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.usersPage.email')}</TableHead>
                    <TableHead>{t('admin.usersPage.name')}</TableHead>
                    <TableHead>{t('admin.usersPage.group')}</TableHead>
                    <TableHead>{t('admin.usersPage.status')}</TableHead>
                    <TableHead className="w-[1%] whitespace-nowrap">{t('admin.usersPage.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.group_name || t('admin.usersPage.notAvailable')}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "default" : "destructive"}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                          {t('common.edit')}
                        </Button>
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.usersPage.editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('admin.usersPage.group')}</Label>
              <Select
                value={selectedGroupId.toString()}
                onValueChange={(value) => setSelectedGroupId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.usersPage.selectGroup')} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('admin.usersPage.status')}</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.usersPage.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('admin.usersPage.statusActive')}</SelectItem>
                  <SelectItem value="suspended">{t('admin.usersPage.statusSuspended')}</SelectItem>
                  <SelectItem value="expired">{t('admin.usersPage.statusExpired')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleEditUser} className="w-full">{t('admin.usersPage.saveChanges')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
