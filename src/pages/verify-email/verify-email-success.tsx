import { useNavigate } from "react-router-dom"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

export default function VerifyEmailSuccess() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleGoToLogin = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("name")
    localStorage.removeItem("email")
    localStorage.removeItem("is_admin")
    localStorage.removeItem("email_verified")
    navigate("/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">{t('verifyEmail.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h2 className="text-xl font-semibold text-center">{t('verifyEmail.successTitle')}</h2>
          <p className="text-muted-foreground text-center">{t('verifyEmail.successMessage')}</p>
          <Button onClick={handleGoToLogin} className="w-full">
            {t('verifyEmail.goToLogin')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
