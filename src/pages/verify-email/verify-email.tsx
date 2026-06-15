import { useEffect, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import axios from "@utils/axios"

export default function VerifyEmail() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [error, setError] = useState("")

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) {
      setStatus("error")
      setError("No verification token provided")
      return
    }

    // The backend will handle the actual verification via the /api/auth/verify-email endpoint
    // This page is shown after the user clicks the link in their email
    // The backend will redirect to /verify-email-success after verification
    // But since we're an SPA, we need to call the API directly
    axios.get(`/auth/verify-email?token=${token}`)
      .then(() => {
        setStatus("success")
        setTimeout(() => {
          navigate("/verify-email-success")
        }, 2000)
      })
      .catch((err) => {
        setStatus("error")
        setError(err instanceof Error ? err.message : "Verification failed")
      })
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">{t('verifyEmail.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">{t('verifyEmail.verifying')}</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-green-600">{t('verifyEmail.success')}</p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-red-500" />
              <p className="text-red-600">{error}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
