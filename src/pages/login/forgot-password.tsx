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
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{t('forgotPassword.title')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Mail className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-center">{t('forgotPassword.checkEmail')}</h2>
            <p className="text-muted-foreground text-center">
              {t('forgotPassword.emailSentMessage', { email })}
            </p>
            <Button variant="link" onClick={() => navigate("/login")}>
              {t('forgotPassword.backToLogin')}
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
          <CardTitle className="text-2xl text-center">{t('forgotPassword.title')}</CardTitle>
          <CardDescription className="text-center">
            {t('forgotPassword.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('forgotPassword.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? t('forgotPassword.sending') : t('forgotPassword.submit')}
            </Button>
            <Button variant="link" className="w-full" onClick={() => navigate("/login")}>
              {t('forgotPassword.backToLogin')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
