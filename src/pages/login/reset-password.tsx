import { useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import axios from "@utils/axios"

export default function ResetPassword() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token")

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{t('resetPassword.title')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-destructive text-center">{t('resetPassword.invalidToken')}</p>
            <Button variant="link" onClick={() => navigate("/login")}>
              {t('resetPassword.backToLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error(t('resetPassword.passwordMismatch'))
      return
    }

    if (newPassword.length < 6) {
      toast.error(t('resetPassword.passwordTooShort'))
      return
    }

    setIsLoading(true)

    try {
      await axios.post("/auth/reset-password", {
        token,
        new_password: newPassword,
      })
      setIsSuccess(true)
      toast.success(t('resetPassword.success'))
    } catch {
      toast.error(t('resetPassword.failed'))
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{t('resetPassword.title')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h2 className="text-xl font-semibold text-center">{t('resetPassword.successTitle')}</h2>
            <p className="text-muted-foreground text-center">{t('resetPassword.successMessage')}</p>
            <Button onClick={() => navigate("/login")} className="w-full">
              {t('resetPassword.goToLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">{t('resetPassword.title')}</CardTitle>
          <CardDescription className="text-center">
            {t('resetPassword.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('resetPassword.newPassword')}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('resetPassword.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? t('resetPassword.resetting') : t('resetPassword.submit')}
            </Button>
            <Button variant="link" className="w-full" onClick={() => navigate("/login")}>
              {t('resetPassword.backToLogin')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
