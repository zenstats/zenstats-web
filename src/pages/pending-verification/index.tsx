import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Mail } from "lucide-react"
import { toast } from "sonner"
import axios, { type BaseResponse } from "@utils/axios"

export default function PendingVerification() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/login", { replace: true })
      return
    }
    const emailVerified = localStorage.getItem("email_verified") === "true"
    const isAdmin = localStorage.getItem("is_admin") === "true"
    if (emailVerified || isAdmin) {
      navigate("/sites", { replace: true })
    }
  }, [navigate])

  // 轮询验证状态：用户在另一个标签页完成验证后自动检测并跳转
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return

    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get<BaseResponse<{ email_verified: boolean; is_admin: boolean }>>("/auth/verification-status")
        const status = data.data
        if (status?.email_verified || status?.is_admin) {
          localStorage.setItem("email_verified", "true")
          if (status?.is_admin) localStorage.setItem("is_admin", "true")
          navigate("/sites", { replace: true })
        }
      } catch {
        // 轮询失败静默忽略，等待下次重试
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [navigate])

  const handleResend = async () => {
    setIsSending(true)
    try {
      await axios.post("/auth/send-verification")
      toast.success(t('pendingVerification.emailSent'))
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.response?.data?.message || t('pendingVerification.sendFailed')
      toast.error(msg)
    } finally {
      setIsSending(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("name")
    localStorage.removeItem("email")
    localStorage.removeItem("is_admin")
    localStorage.removeItem("email_verified")
    navigate("/login")
  }

  return (
    <div className="flex items-center justify-center h-full">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
          <CardTitle className="text-2xl">{t('pendingVerification.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {t('pendingVerification.description')}
          </p>
          <Button onClick={handleResend} disabled={isSending} className="w-full">
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('pendingVerification.resend')}
          </Button>
          <Button variant="outline" onClick={handleLogout} className="w-full">
            {t('pendingVerification.logout')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
