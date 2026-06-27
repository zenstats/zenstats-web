import { useEffect, useState } from "react"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import axios, { type BaseResponse } from "@utils/axios"
import { isSubAccount } from "@utils/auth"

interface SubAccount {
  id: number
  email: string
  name: string
  role: string
  permissions: string[]
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

// ---- Permission definitions ----

const PERM_GROUPS = [
  {
    key: "operations",
    perms: ["goals:write", "funnels:write", "segments:write", "shared_links:write"],
  },
  {
    key: "protection",
    perms: ["shields:write"],
  },
  {
    key: "notifications",
    perms: ["email_reports:write", "traffic_alerts:write"],
  },
]

const ALL_PERMS = PERM_GROUPS.flatMap((g) => g.perms)

const PRESETS: Record<string, string[]> = {
  viewer: [],
  editor: ["goals:write", "funnels:write", "segments:write", "shared_links:write"],
  admin: ALL_PERMS,
}

function inferRole(perms: string[]): string {
  const sorted = [...perms].sort()
  for (const [role, preset] of Object.entries(PRESETS)) {
    if (JSON.stringify([...preset].sort()) === JSON.stringify(sorted)) return role
  }
  return "custom"
}

// ---- Permission selector component ----

interface PermSelectorProps {
  value: string[]
  onChange: (perms: string[]) => void
}

function PermSelector({ value, onChange }: PermSelectorProps) {
  const { t } = useTranslation()

  const toggle = (perm: string) => {
    onChange(value.includes(perm) ? value.filter((p) => p !== perm) : [...value, perm])
  }

  return (
    <div className="space-y-3">
      {/* Preset buttons */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">{t('subAccounts.presets')}</p>
        <div className="flex flex-wrap gap-2">
          {(["viewer", "editor", "admin"] as const).map((role) => {
            const active = inferRole(value) === role
            return (
              <Button
                key={role}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => onChange([...PRESETS[role]])}
              >
                {t(`subAccounts.roles.${role}`)}
              </Button>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Grouped checkboxes */}
      {PERM_GROUPS.map((group) => (
        <div key={group.key} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t(`subAccounts.permGroups.${group.key}`)}
          </p>
          {group.perms.map((perm) => (
            <label key={perm} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={value.includes(perm)}
                onCheckedChange={() => toggle(perm)}
              />
              <span className="text-sm">{t(`subAccounts.perms.${perm}`, perm)}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  )
}

// ---- Main page ----

export default function UserSubAccounts() {
  const { t } = useTranslation()
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([])
  const [hasPermission, setHasPermission] = useState(true)
  const [maxSubAccounts, setMaxSubAccounts] = useState(0)
  const [currentCount, setCurrentCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    email: "", name: "", password: "", permissions: [] as string[],
  })

  const [editTarget, setEditTarget] = useState<SubAccount | null>(null)
  const [editForm, setEditForm] = useState({
    name: "", status: "active", permissions: [] as string[],
  })

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

  useEffect(() => { fetchSubAccounts() }, [])

  const handleCreate = async () => {
    try {
      const role = inferRole(createForm.permissions)
      await axios.post("/user/sub-accounts", { ...createForm, role })
      toast.success(t('subAccounts.createSuccess'))
      setCreateOpen(false)
      setCreateForm({ email: "", name: "", password: "", permissions: [] })
      fetchSubAccounts()
    } catch {
      toast.error(t('subAccounts.createFailed'))
    }
  }

  const openEdit = (sa: SubAccount) => {
    setEditTarget(sa)
    setEditForm({ name: sa.name, status: sa.status, permissions: sa.permissions ?? [] })
  }

  const handleEdit = async () => {
    if (!editTarget) return
    try {
      const role = inferRole(editForm.permissions)
      await axios.put(`/user/sub-accounts/${editTarget.id}`, { ...editForm, role })
      toast.success(t('common.saved'))
      setEditTarget(null)
      fetchSubAccounts()
    } catch {
      toast.error(t('common.saveFailed'))
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('common.confirmDelete'))) return
    try {
      await axios.delete(`/user/sub-accounts/${id}`)
      toast.success(t('subAccounts.deleteSuccess'))
      fetchSubAccounts()
    } catch {
      toast.error(t('subAccounts.deleteFailed'))
    }
  }

  const permLabel = (perms: string[]) => {
    if (!perms || perms.length === 0) return t('subAccounts.noPerms')
    const role = inferRole(perms)
    if (role !== "custom") return t(`subAccounts.roles.${role}`)
    return t('subAccounts.permCount', { count: perms.length })
  }

  const roleBadgeVariant = (perms: string[]) => {
    const role = inferRole(perms ?? [])
    if (role === "admin") return "default" as const
    if (role === "editor") return "secondary" as const
    if (role === "custom") return "secondary" as const
    return "outline" as const
  }

  if (loading) return <div className="text-center py-4">{t('common.loading')}</div>

  if (!hasPermission) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">{t('subAccounts.noPermission')}</p>
          <p className="text-sm text-muted-foreground mt-2">{t('subAccounts.upgradeHint')}</p>
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
            <Button onClick={() => setCreateOpen(true)}>{t('subAccounts.create')}</Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('subAccounts.email')}</TableHead>
                <TableHead>{t('subAccounts.name')}</TableHead>
                <TableHead>{t('subAccounts.permissions')}</TableHead>
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
                    <Badge variant={roleBadgeVariant(sa.permissions)}>
                      {permLabel(sa.permissions)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={sa.status === "active" ? "default" : "destructive"}>
                      {sa.status === "active" ? t('admin.usersPage.statusActive') : t('admin.usersPage.statusSuspended')}
                    </Badge>
                  </TableCell>
                  {!subAccount && (
                    <TableCell className="whitespace-nowrap space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(sa)}>
                        {t('common.edit')}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(sa.id)}>
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

      {/* Create dialog */}
      {!subAccount && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('subAccounts.createTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('subAccounts.email')}</Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder={t('subAccounts.emailPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('subAccounts.name')}</Label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder={t('subAccounts.namePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('subAccounts.password')}</Label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('subAccounts.permissions')}</Label>
                <PermSelector
                  value={createForm.permissions}
                  onChange={(perms) => setCreateForm({ ...createForm, permissions: perms })}
                />
              </div>
              <Button onClick={handleCreate} className="w-full">{t('subAccounts.create')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit dialog */}
      {editTarget && (
        <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null) }}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('subAccounts.editTitle')} — {editTarget.email}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('subAccounts.name')}</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('subAccounts.status')}</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('admin.usersPage.statusActive')}</SelectItem>
                    <SelectItem value="suspended">{t('admin.usersPage.statusSuspended')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('subAccounts.permissions')}</Label>
                <PermSelector
                  value={editForm.permissions}
                  onChange={(perms) => setEditForm({ ...editForm, permissions: perms })}
                />
              </div>
              <Button onClick={handleEdit} className="w-full">{t('common.save')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
