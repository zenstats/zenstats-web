import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from 'react-i18next'
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Users } from "lucide-react"
import { toast } from "sonner"
import axios, { type BaseResponse } from "@utils/axios";
import Logo from "@/assets/logo.svg"
import LogoDark from "@/assets/logo-dark.svg"

interface AuthState {
  initialized: boolean
  registration_enabled: boolean
}

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [rememberMe, setRememberMe] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [registrationEnabled, setRegistrationEnabled] = useState(true)

  const [serverError, setServerError] = useState('');
  const [errors, setErrors] = useState({
    email: "",
    password: ""
  })

  interface LoginResponse {
    token: string;
    refresh_token: string;
    user: {
      id: number;
      name: string;
      email: string;
      is_admin: boolean;
      email_verified: boolean;
    }
  }

  const validateForm = () => {
    let valid = true
    const newErrors = {
      email: "",
      password: ""
    }

    if (!email) {
      newErrors.email = t('login.validation.emailRequired')
      valid = false
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t('login.validation.emailInvalid')
      valid = false
    }

    if (!password) {
      newErrors.password = t('login.validation.passwordRequired')
      valid = false
    } else if (password.length < 6) {
      newErrors.password = t('login.validation.passwordMinLength')
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return;
    setServerError('');

    setIsLoading(true)


    try {
      axios.post<BaseResponse<LoginResponse>>("/auth/login", { "email": email, "password": password }).then((res) => {
        setIsLoading(false)
        if (res.data.code !== 200) {
          toast.error(t('login.loginFailed'), {
            description: res.data.error,
          })
          setServerError(res.data.error || "")
          return;
        } else {
          toast.success(t('login.loginSuccess'))
          if (rememberMe) {
            localStorage.setItem("rememberedEmail", email)
          } else {
            localStorage.removeItem("rememberedEmail")
          }
          localStorage.setItem("token", res.data.data.token)
          localStorage.setItem("refreshToken", res.data.data.refresh_token)
          localStorage.setItem("name", res.data.data.user.name)
          localStorage.setItem("email", res.data.data.user.email)
          localStorage.setItem("is_admin", res.data.data.user.is_admin.toString())
          localStorage.setItem("email_verified", res.data.data.user.email_verified.toString())

          if (!res.data.data.user.email_verified && !res.data.data.user.is_admin) {
            navigate("/pending-verification")
          } else {
            navigate("/sites")
          }

        }
      }).catch((err) => {
        const msg = err instanceof Error ? err.message : t('login.unknownError')
        toast.error(t('login.loginFailed'), {
          description: msg,
        })
        setServerError(msg)
      })

    } catch (err) {
      const msg = err instanceof Error ? err.message : t('login.unknownError')
      toast.error(t('login.loginFailed'), {
        description: msg,
      })
      setServerError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const { data } = await axios.get<BaseResponse<AuthState>>("/auth/state");
        // 如果系统未初始化，跳转到 setup 页面
        if (!data.data.initialized) {
          navigate("/setup");
          return;
        }

        setRegistrationEnabled(data.data.registration_enabled);

        // 原有的 token 检查逻辑
        const token = localStorage.getItem("token");
        if (token) {
          navigate("/sites");
        }
        // 原有的记住我逻辑
        const rememberedEmail = localStorage.getItem("rememberedEmail");
        if (rememberedEmail) {
          setEmail(rememberedEmail);
          setRememberMe(true);
        }
      } catch (err) {
        console.error("Failed to check system status:", err);
        // 可以添加 toast 提示或静默处理
      }
    };

    checkAuthState();
  }, [])

  const { resolvedTheme } = useTheme()
  const logoSrc = resolvedTheme === "dark" ? LogoDark : Logo

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10 overflow-hidden">
      {/* Subtle ambient radial glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[340px] w-[480px] rounded-full bg-primary/[0.07] dark:bg-primary/[0.12] blur-3xl" />
      </div>

      <Card className="w-full max-w-[400px] rounded-2xl border-border/80 shadow-lg shadow-black/[0.03] dark:shadow-black/30">
        <CardHeader className="space-y-3 text-center pb-2">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/8 dark:bg-primary/15 border border-primary/15">
            <img src={logoSrc} alt="ZenStats" className="h-6 w-auto" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">{t('login.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {serverError && (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive">
              {serverError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">{t('login.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium">{t('login.password')}</Label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t('login.forgotPassword')}
                </button>
              </div>
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
            <div className="flex items-center space-x-2 pt-0.5">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={() => setRememberMe(!rememberMe)}
              />
              <Label htmlFor="remember-me" className="text-xs font-normal text-muted-foreground cursor-pointer">
                {t('login.rememberMe')}
              </Label>
            </div>
            <Button type="submit" className="w-full h-9 shadow-xs" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 pt-0">
          {registrationEnabled ? (
            <Button variant="link" className="h-auto p-0 text-xs" onClick={() => navigate("/register")}>
              {t('login.registerLink')}
            </Button>
          ) : (
            <p className="w-full text-xs text-center text-muted-foreground">
              {t('login.registrationClosed')}
            </p>
          )}
          <div className="relative w-full py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/70"></div>
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-card px-2.5 text-muted-foreground">{t('login.or')}</span>
            </div>
          </div>
          <Button variant="outline" className="w-full h-9 text-xs gap-1.5 shadow-2xs" onClick={() => navigate("/sub-login")}>
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            {t('login.subAccountLogin')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}