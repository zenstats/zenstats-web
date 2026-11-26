import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Mail } from "lucide-react"
import { toast } from "sonner"
import axios from "@utils/axios"

export default function ForgotPassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await axios.post("/auth/forgot-password", { email })
      setEmailSent(true)
      toast.success(t('forgotPassword.emailSent'))
    } catch {
      toast.error(t('forgotPassword.failed'))
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10 overflow-hidden">
        <Card className="w-full max-w-[400px] rounded-2xl border-border/80 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Mail className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">{t('forgotPassword.checkEmail')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('forgotPassword.emailSentMessage', { email })}
            </p>
            <Button variant="link" className="h-auto p-0 text-xs" onClick={() => navigate("/login")}>
              {t('forgotPassword.backToLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[340px] w-[480px] rounded-full bg-primary/[0.07] dark:bg-primary/[0.12] blur-3xl" />
      </div>
      <Card className="w-full max-w-[400px] rounded-2xl border-border/80 shadow-lg shadow-black/[0.03] dark:shadow-black/30">
        <CardHeader className="space-y-2 text-center pb-2">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/15">
            <Mail className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">{t('forgotPassword.title')}</CardTitle>
          <CardDescription className="text-xs">
            {t('forgotPassword.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">{t('forgotPassword.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <Button type="submit" className="w-full h-9 shadow-xs" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? t('forgotPassword.sending') : t('forgotPassword.submit')}
            </Button>
            <div className="text-center pt-1">
              <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => navigate("/login")}>
                {t('forgotPassword.backToLogin')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
