import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import { Button } from "@components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@components/ui/form";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCallback, useEffect, useState } from "react";
import axios, { type BaseResponse } from "@utils/axios";
import type { Site } from "../types/interfaces";
import { useParams } from "react-router-dom";
import { Input } from "@components/ui/input";
import { Textarea } from "@components/ui/textarea";
import timeZones from "@/constants/time-zones.json";
import { Loader2 } from "lucide-react";

type TimeZoneFormValues = {
  timeZone: string;
};

type RateLimitFormValues = {
  limit_minute: number;
  rateLimitUnit: string;
};

type AllowedOriginsFormValues = {
  allowed_origins: string;
};

export function SettingsGeneralForm() {
  const [isTimeZoneLoading, setIsTimeZoneLoading] = useState(false);
  const [isRateLimitLoading, setIsRateLimitLoading] = useState(false);
  const [isAllowedOriginsLoading, setIsAllowedOriginsLoading] = useState(false);
  const { t } = useTranslation();

  const timeZoneFormSchema = z.object({
    timeZone: z.string({
      required_error: t('settings.general.timezoneRequired'),
    }),
  });

  const rateLimitFormSchema = z.object({
    limit_minute: z.coerce
      .number({
        required_error: t('settings.general.rateLimitRequired'),
        invalid_type_error: t('settings.general.rateLimitInvalid'),
      })
      .int(t('settings.general.rateLimitMustBeInteger'))
      .min(0, t('settings.general.rateLimitCannotBeNegative')),
    rateLimitUnit: z.string({
      required_error: t('settings.general.rateLimitUnitRequired'),
    }),
  });

  const allowedOriginsFormSchema = z.object({
    allowed_origins: z.string(),
  });

  const { domain } = useParams();
  const [site, setSite] = useState<Site | null>(null);
  const timeZoneForm = useForm<TimeZoneFormValues>({
    resolver: zodResolver(timeZoneFormSchema),
    mode: "onChange",
    defaultValues: {
      timeZone: "",
    },
  });

  const rateLimitForm = useForm<RateLimitFormValues>({
    resolver: zodResolver(rateLimitFormSchema),
    mode: "onChange",
    defaultValues: {
      limit_minute: 1000,
      rateLimitUnit: "second",
    },
  });

  const allowedOriginsForm = useForm<AllowedOriginsFormValues>({
    resolver: zodResolver(allowedOriginsFormSchema),
    mode: "onChange",
    defaultValues: {
      allowed_origins: "",
    },
  });

  // 当 site 变化时，更新时区表单
  useEffect(() => {
    if (site) {
      timeZoneForm.setValue("timeZone", site.timezone || "");
    }
  }, [site, timeZoneForm]);

  // 当 site 变化时，更新速率限制表单
  useEffect(() => {
    if (site) {
      // 如果是不限制（rate_seconds 和 limit_minute 都为 0），显示为 unlimited
      if (site.rate_seconds === 0 && site.limit_minute === 0) {
        rateLimitForm.setValue("limit_minute", 0);
        rateLimitForm.setValue("rateLimitUnit", "unlimited");
      } else {
        rateLimitForm.setValue("limit_minute", site.limit_minute ?? 1000);

        // 根据 rate_seconds 设置速率限制单位
        if (site.rate_seconds === 3600) {
          rateLimitForm.setValue("rateLimitUnit", "hour");
        } else if (site.rate_seconds === 60) {
          rateLimitForm.setValue("rateLimitUnit", "minute");
        } else {
          rateLimitForm.setValue("rateLimitUnit", "second");
        }
      }
    }
  }, [site, rateLimitForm]);

  // 当 site 变化时，更新允许的来源表单
  useEffect(() => {
    if (site) {
      // 后端逗号分隔 → 前端换行分隔
      const displayValue = (site.allowed_origins || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .join('\n');
      allowedOriginsForm.setValue("allowed_origins", displayValue);
    }
  }, [site, allowedOriginsForm]);

  function onSubmitTimeZone(data: TimeZoneFormValues) {
    // 提交时区修改
    setIsTimeZoneLoading(true);

    axios
      .put(`/sites/${domain}`, { timezone: data.timeZone })
      .then(() => {
        setIsTimeZoneLoading(false);
        toast.success(t('settings.general.timezoneSuccess'));
      })
      .catch((err) => {
        setIsTimeZoneLoading(false);
        console.log(err);
        toast.error(t('settings.general.timezoneFailed'), {
          description:
            err instanceof Error ? err.message : t('common.unknownError'),
        });
      });
  }

  function onSubmitRateLimit(data: RateLimitFormValues) {
    // 提交速率限制修改
    setIsRateLimitLoading(true);

    let rate_seconds = 1;
    let limit_minute = data.limit_minute;

    if (data.rateLimitUnit === "unlimited") {
      rate_seconds = 0;
      limit_minute = 0;
    } else if (data.rateLimitUnit === "minute") {
      rate_seconds = 60;
    } else if (data.rateLimitUnit === "hour") {
      rate_seconds = 3600;
    }

    const submitData = {
      limit_minute,
      rate_seconds,
    };

    axios
      .put(`/sites/${domain}`, submitData)
      .then(() => {
        setIsRateLimitLoading(false);
        toast.success(t('settings.general.rateLimitSuccess'));
      })
      .catch((err) => {
        setIsRateLimitLoading(false);
        console.log(err);
        toast.error(t('settings.general.rateLimitFailed'), {
          description:
            err instanceof Error ? err.message : t('common.unknownError'),
        });
      });
  }

  function onSubmitAllowedOrigins(data: AllowedOriginsFormValues) {
    // 提交允许的来源修改
    setIsAllowedOriginsLoading(true);

    // 前端换行分隔 → 后端逗号分隔
    const allowedOrigins = data.allowed_origins
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .join(', ');

    axios
      .put(`/sites/${domain}`, { allowed_origins: allowedOrigins })
      .then(() => {
        setIsAllowedOriginsLoading(false);
        toast.success(t('settings.general.allowedOriginsSuccess'));
      })
      .catch((err) => {
        setIsAllowedOriginsLoading(false);
        console.log(err);
        toast.error(t('settings.general.allowedOriginsFailed'), {
          description:
            err instanceof Error ? err.message : t('common.unknownError'),
        });
      });
  }

  const fetchSites = useCallback(async () => {
    try {
      const res = await axios.get<BaseResponse<Site>>(`/sites/${domain}`);
      setSite(res.data.data);
    } catch (error) {
      console.error("Failed to fetch sites:", error);
    }
  }, [domain, setSite]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  return (
    <div className="space-y-6">
      {/* 时区设置表单 */}
      <Form {...timeZoneForm}>
        <form
          onSubmit={timeZoneForm.handleSubmit(onSubmitTimeZone)}
          className="space-y-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.general.timezoneTitle')}</CardTitle>
              <CardDescription>{t('settings.general.timezoneDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={timeZoneForm.control}
                name="timeZone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.general.reportTimezone')}</FormLabel>
                    <select
                      value={field.value}
                      onChange={field.onChange}
                      className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2"
                    >
                      <option value="" disabled>
                        {t('settings.general.selectTimezone')}
                      </option>
                      {timeZones.map((timeZone) => (
                        <option key={timeZone.value} value={timeZone.value}>
                          {timeZone.label}
                        </option>
                      ))}
                    </select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={isTimeZoneLoading}
                className="mt-6"
              >
                {isTimeZoneLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isTimeZoneLoading ? t('settings.general.submitting') : t('settings.general.updateTimezone')}
              </Button>
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* 速率限制表单 */}
      <Form {...rateLimitForm}>
        <form
          onSubmit={rateLimitForm.handleSubmit(onSubmitRateLimit)}
          className="space-y-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.general.rateLimitTitle')}</CardTitle>
              <CardDescription>{t('settings.general.rateLimitDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={rateLimitForm.control}
                name="limit_minute"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.general.rateLimit')}</FormLabel>
                    <div className="flex gap-2">
                      {rateLimitForm.watch("rateLimitUnit") !== "unlimited" && (
                        <Input
                          {...field}
                          type="number"
                          placeholder={t('settings.general.limitPlaceholder')}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, "");
                            field.onChange(value);
                          }}
                          className={
                            rateLimitForm.formState.errors.limit_minute
                              ? "border-red-500"
                              : ""
                          }
                        />
                      )}
                      <select
                        value={rateLimitForm.watch("rateLimitUnit")}
                        onChange={(e) =>
                          rateLimitForm.setValue(
                            "rateLimitUnit",
                            e.target.value,
                          )
                        }
                        className="w-[150px] rounded-md border border-input bg-background text-foreground px-3 py-2"
                      >
                        <option value="unlimited">{t('settings.general.unlimited')}</option>
                        <option value="second">{t('settings.general.perSecond')}</option>
                        <option value="minute">{t('settings.general.perMinute')}</option>
                        <option value="hour">{t('settings.general.perHour')}</option>
                      </select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={rateLimitForm.control}
                name="rateLimitUnit"
                render={({ field }) => <input type="hidden" {...field} />}
              />
              <Button
                type="submit"
                disabled={isRateLimitLoading}
                className="mt-6"
              >
                {isRateLimitLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isRateLimitLoading ? t('settings.general.submitting') : t('settings.general.updateRateLimit')}
              </Button>
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* 允许的来源表单 */}
      <Form {...allowedOriginsForm}>
        <form
          onSubmit={allowedOriginsForm.handleSubmit(onSubmitAllowedOrigins)}
          className="space-y-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.general.allowedOriginsTitle')}</CardTitle>
              <CardDescription>{t('settings.general.allowedOriginsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={allowedOriginsForm.control}
                name="allowed_origins"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.general.allowedOrigins')}</FormLabel>
                    <Textarea
                      {...field}
                      placeholder={t('settings.general.allowedOriginsPlaceholder')}
                      className="min-h-[100px]"
                    />
                    <p className="text-sm text-muted-foreground">
                      {t('settings.general.allowedOriginsHint')}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={isAllowedOriginsLoading}
                className="mt-6"
              >
                {isAllowedOriginsLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isAllowedOriginsLoading ? t('settings.general.submitting') : t('settings.general.updateAllowedOrigins')}
              </Button>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
