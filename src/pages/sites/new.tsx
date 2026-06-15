import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useNavigate } from "react-router-dom"
import { useTranslation } from 'react-i18next';
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
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
    <div className="flex items-center justify-center h-full">
      <Card className="w-full max-w-md p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center">{t('sites.new.title')}</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain">{t('sites.new.domain')}</Label>
            <Input
              {...register("domain", {
                required: t('sites.new.validation.domainRequired'),
                pattern: {
                  value: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/,
                  message: t('sites.new.validation.domainInvalid')
                }
              })}
              placeholder="example.com"
              type="text"
              className={errors.domain ? "border-red-500" : ""}
            />
            {errors.domain && <p className="text-sm text-red-500">{errors.domain.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('sites.new.description')}</Label>
            <Textarea
              {...register("description", {
                maxLength: {
                  value: 200,
                  message: t('sites.new.validation.descriptionMaxLength')
                }
              })}
              placeholder={t('sites.new.descriptionPlaceholder')}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="limit_minute">{t('sites.new.rateLimit')}</Label>
            <div className="flex gap-2">
              {rateLimitUnit !== "unlimited" && (
                <Input
                  {...register("limit_minute", {
                    valueAsNumber: true,
                    min: 0
                  })}
                  placeholder="Limit count"
                  type="number"
                  className={errors.limit_minute ? "border-red-500" : ""}
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
                    <SelectTrigger className="w-[150px]">
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate("/sites")}>{t('sites.new.cancel')}</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? t('sites.new.submitting') : t('sites.new.createSite')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}