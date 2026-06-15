import { useEffect, useState } from "react"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Save } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import axios from "@utils/axios"

interface ConfigItem {
  key: string
  value: string
}

interface ConfigGroup {
  group: string
  items: ConfigItem[]
}

export default function AdminSettings() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // General settings
  const [baseUrl, setBaseUrl] = useState("")
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  
  // SMTP settings
  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState("")
  const [smtpUsername, setSmtpUsername] = useState("")
  const [smtpPassword, setSmtpPassword] = useState("")
  const [smtpFrom, setSmtpFrom] = useState("")

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const response = await axios.get<{ data: ConfigGroup[] }>("/admin/configs")
      const groups = response.data.data

      groups.forEach((group) => {
        group.items.forEach((item) => {
          switch (item.key) {
            case "general.base_url":
              setBaseUrl(item.value)
              break
            case "general.registration_enabled":
              setRegistrationEnabled(item.value !== "false")
              break
            case "smtp.host":
              setSmtpHost(item.value)
              break
            case "smtp.port":
              setSmtpPort(item.value)
              break
            case "smtp.username":
              setSmtpUsername(item.value)
              break
            case "smtp.password":
              setSmtpPassword(item.value)
              break
            case "smtp.from":
              setSmtpFrom(item.value)
              break
          }
        })
      })
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.response?.data?.message || t('admin.settingsPage.loadFailed')
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveGeneral = async () => {
    setIsSaving(true)
    try {
      await axios.put("/admin/configs", {
        items: [
          { key: "general.base_url", value: baseUrl },
          { key: "general.registration_enabled", value: registrationEnabled.toString() }
        ]
      })
      toast.success(t('admin.settingsPage.saveSuccess'))
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.response?.data?.message || t('admin.settingsPage.saveFailed')
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveSmtp = async () => {
    setIsSaving(true)
    try {
      await axios.put("/admin/configs", {
        items: [
          { key: "smtp.host", value: smtpHost },
          { key: "smtp.port", value: smtpPort },
          { key: "smtp.username", value: smtpUsername },
          { key: "smtp.password", value: smtpPassword },
          { key: "smtp.from", value: smtpFrom }
        ]
      })
      toast.success(t('admin.settingsPage.saveSuccess'))
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.response?.data?.message || t('admin.settingsPage.saveFailed')
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{t('admin.settingsPage.general')}</TabsTrigger>
          <TabsTrigger value="smtp">{t('admin.settingsPage.smtp')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.settingsPage.general')}</CardTitle>
              <CardDescription>{t('admin.settingsPage.generalDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="baseUrl">{t('admin.settingsPage.baseUrl')}</Label>
                <Input
                  id="baseUrl"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://stats.example.com"
                />
                <p className="text-sm text-muted-foreground">
                  {t('admin.settingsPage.baseUrlHint')}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('admin.settingsPage.registrationEnabled')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('admin.settingsPage.registrationEnabledHint')}
                  </p>
                </div>
                <Switch
                  checked={registrationEnabled}
                  onCheckedChange={setRegistrationEnabled}
                />
              </div>
              <Button onClick={handleSaveGeneral} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {t('common.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="smtp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.settingsPage.smtp')}</CardTitle>
              <CardDescription>{t('admin.settingsPage.smtpDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">{t('admin.settingsPage.smtpHost')}</Label>
                  <Input
                    id="smtpHost"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">{t('admin.settingsPage.smtpPort')}</Label>
                  <Input
                    id="smtpPort"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpUsername">{t('admin.settingsPage.smtpUsername')}</Label>
                <Input
                  id="smtpUsername"
                  value={smtpUsername}
                  onChange={(e) => setSmtpUsername(e.target.value)}
                  placeholder="your-email@gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPassword">{t('admin.settingsPage.smtpPassword')}</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpFrom">{t('admin.settingsPage.smtpFrom')}</Label>
                <Input
                  id="smtpFrom"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  placeholder="ZenStats <noreply@example.com>"
                />
              </div>
              <Button onClick={handleSaveSmtp} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {t('common.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
