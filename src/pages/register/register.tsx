import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from 'react-i18next'
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import axios, { type BaseResponse } from "@utils/axios"
import Logo from "@/assets/logo.svg"
import LogoDark from "@/assets/logo-dark.svg"

interface RegisterResponse {
  token: string
  refresh_token: string
  user: {
    id: number
    name: string
    email: string
    is_admin: boolean
  }
}

export default function Register() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const validateForm = () => {
    let valid = true
    const newErrors = {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    }

    if (!name || name.length < 2) {
      newErrors.name = t('register.validation.nameMinLength')
      valid = false
    }

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t('register.validation.emailInvalid')
      valid = false
    }

    if (!password || password.length < 8) {
      newErrors.password = t('register.validation.passwordMinLength')
      valid = false
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = t('register.validation.passwordMismatch')
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const { data } = await axios.post<BaseResponse<RegisterResponse>>("/auth/register", {
        name,
        email,
        password,
      })

      if (data.code === 200) {
        toast.success(t('register.success'))
        navigate("/login")
      } else {
        toast.error(data.error || t('register.failed'))
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : err.response?.data?.error || t('register.failed')
      if (msg === "registration is disabled") {
        toast.error(t('register.registrationDisabled'))
      } else {
        toast.error(msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const { resolvedTheme } = useTheme()
  const logoSrc = resolvedTheme === "dark" ? LogoDark : Logo

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[340px] w-[480px] rounded-full bg-primary/[0.07] dark:bg-primary/[0.12] blur-3xl" />
      </div>

      <Card className="w-full max-w-[400px] rounded-2xl border-border/80 shadow-lg shadow-black/[0.03] dark:shadow-black/30">
        <CardHeader className="space-y-3 text-center pb-2">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/8 dark:bg-primary/15 border border-primary/15">
            <img src={logoSrc} alt="ZenStats" className="h-6 w-auto" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">{t('register.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium">{t('register.name')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('register.namePlaceholder')}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">{t('register.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('register.emailPlaceholder')}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">{t('register.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={errors.password ? "border-destructive" : ""}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-medium">{t('register.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={errors.confirmPassword ? "border-destructive" : ""}
              />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>
            <Button type="submit" className="w-full h-9 mt-2 shadow-xs" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? t('register.submitting') : t('register.submit')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center pt-0">
          <Button variant="link" className="h-auto p-0 text-xs" onClick={() => navigate("/login")}>
            {t('register.loginLink')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
