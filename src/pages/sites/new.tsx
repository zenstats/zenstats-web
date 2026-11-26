import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useNavigate } from "react-router-dom"
import { useTranslation } from 'react-i18next';
import { toast } from "sonner"
import { Loader2, Globe, ArrowLeft } from "lucide-react"
import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import axios from "@utils/axios";

type FormValues = {
  domain: string;
  description: string;
  rateLimitUnit: string;
  limit_minute: number;
  rate_seconds?: number;
}

export default function NewSitePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      limit_minute: 1000,
      rateLimitUnit: "second"
    }
  })

  const rateLimitUnit = watch("rateLimitUnit")


  const onSubmit = async (data: FormValues) => {
    setIsLoading(true)
    switch (data.rateLimitUnit) {
      case "minute":
        data.rate_seconds = 60
        break
      case "hour":
        data.rate_seconds = 3600
        break
      case "unlimited":
        data.rate_seconds = 0
        data.limit_minute = 0
        break
      default:
        data.rate_seconds = 1
    }

    try {
      axios.post("/sites", data).then(() => {
        setIsLoading(false)
        toast.success(t('sites.new.createSuccess'))
        navigate(`/sites/${encodeURIComponent(data.domain)}/verify`)
      }).catch((err) => {
        toast.error(t('sites.new.createFailed'), {
          description: err instanceof Error ? err.message : t('sites.new.unknownError'),
        })
      })

    } catch {
      toast.error(t('sites.new.createFailed'), {
          description: t('sites.new.unknownError'),
        })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[340px] w-[480px] rounded-full bg-primary/[0.07] dark:bg-primary/[0.12] blur-3xl" />
      </div>

      <div className="w-full max-w-[440px] space-y-3">
        <button
          type="button"
          onClick={() => navigate("/sites")}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t('sites.title')}</span>
        </button>

        <Card className="w-full rounded-2xl border-border/80 shadow-lg shadow-black/[0.03] dark:shadow-black/30">
          <CardHeader className="space-y-2 pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/15 shrink-0">
                <Globe className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight">{t('sites.new.title')}</CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="domain" className="text-xs font-medium">{t('sites.new.domain')}</Label>
                <Input
                  {...register("domain", {
                    required: t('sites.new.validation.domainRequired'),
                    pattern: {
                      value: /^(?:localhost|[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,})$/,
                      message: t('sites.new.validation.domainInvalid')
                    }
                  })}
                  placeholder="example.com"
                  type="text"
                  className={errors.domain ? "border-destructive" : ""}
                />
                {errors.domain && <p className="text-xs text-destructive">{errors.domain.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-medium">{t('sites.new.description')}</Label>
                <Textarea
                  {...register("description", {
                    maxLength: {
                      value: 200,
                      message: t('sites.new.validation.descriptionMaxLength')
                    }
                  })}
                  placeholder={t('sites.new.descriptionPlaceholder')}
                  className={errors.description ? "border-destructive" : ""}
                />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="limit_minute" className="text-xs font-medium">{t('sites.new.rateLimit')}</Label>
                <div className="flex gap-2">
                  {rateLimitUnit !== "unlimited" && (
                    <Input
                      {...register("limit_minute", {
                        valueAsNumber: true,
                        min: 0
                      })}
                      placeholder="Limit count"
                      type="number"
                      className={errors.limit_minute ? "border-destructive" : ""}
                    />
                  )}
                  <Controller
                    name="rateLimitUnit"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        defaultValue="second"
                      >
                        <SelectTrigger className={rateLimitUnit === "unlimited" ? "w-full" : "w-[150px]"}>
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unlimited">{t('sites.new.unlimited')}</SelectItem>
                          <SelectItem value="second">{t('sites.new.perSecond')}</SelectItem>
                          <SelectItem value="minute">{t('sites.new.perMinute')}</SelectItem>
                          <SelectItem value="hour">{t('sites.new.perHour')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" size="sm" className="h-9 px-4" onClick={() => navigate("/sites")}>
                  {t('sites.new.cancel')}
                </Button>
                <Button type="submit" size="sm" className="h-9 px-4 shadow-xs" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading ? t('sites.new.submitting') : t('sites.new.createSite')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}