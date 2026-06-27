import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">{t('subLogin.title')}</CardTitle>
          <CardDescription className="text-center">
            {t('subLogin.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('subLogin.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('subLogin.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? t('subLogin.loggingIn') : t('subLogin.submit')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button variant="link" className="w-full text-sm" onClick={() => navigate("/login")}>
            {t('subLogin.backToLogin')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
