import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Users } from "lucide-react"
import { toast } from "sonner"
import axios, { type BaseResponse } from "@utils/axios"

interface SubLoginResponse {
  token: string
  refresh_token: string
  user: {
    id: number
    email: string
    name: string
    role: string
    permissions: string[]
    parent_user_id: number
  }
}

export default function SubLogin() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data } = await axios.post<BaseResponse<SubLoginResponse>>("/auth/sub-login", {
        email,
        password,
      })

      if (data.code === 200) {
        const { token, refresh_token, user } = data.data
        localStorage.setItem("token", token)
        localStorage.setItem("refreshToken", refresh_token)
        localStorage.setItem("name", user.name)
        localStorage.setItem("email", user.email)
        localStorage.setItem("user_type", "sub_account")
        localStorage.setItem("sub_account_id", String(user.id))
        localStorage.setItem("role", user.role)
        localStorage.setItem("permissions", JSON.stringify(user.permissions ?? []))
        localStorage.setItem("parent_user_id", String(user.parent_user_id))
        // 清除普通用户残留字段，防止子账号误获管理员权限或跳过邮箱验证逻辑
        localStorage.removeItem("is_admin")
        localStorage.removeItem("email_verified")

        toast.success(t('subLogin.loginSuccess'))
        navigate("/sites")
      } else {
        toast.error(t('subLogin.loginFailed'))
      }
    } catch {
      toast.error(t('subLogin.loginFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[340px] w-[480px] rounded-full bg-primary/[0.07] dark:bg-primary/[0.12] blur-3xl" />
      </div>
      <Card className="w-full max-w-[400px] rounded-2xl border-border/80 shadow-lg shadow-black/[0.03] dark:shadow-black/30">
        <CardHeader className="space-y-2 text-center pb-2">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/15">
            <Users className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">{t('subLogin.title')}</CardTitle>
          <CardDescription className="text-xs">
            {t('subLogin.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">{t('subLogin.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">{t('subLogin.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full h-9 shadow-xs" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? t('subLogin.loggingIn') : t('subLogin.submit')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center pt-0">
          <Button variant="link" className="h-auto p-0 text-xs" onClick={() => navigate("/login")}>
            {t('subLogin.backToLogin')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
