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
import timeZones from "@/constants/time-zones.json";
import { Loader2 } from "lucide-react";
import { AxiosError } from "axios";

type TimeZoneFormValues = {
  timeZone: string;
};

type RateLimitFormValues = {
  limit_minute: number;
  rateLimitUnit: string;
};

export function SettingsGeneralForm() {
  const [isTimeZoneLoading, setIsTimeZoneLoading] = useState(false);
  const [isRateLimitLoading, setIsRateLimitLoading] = useState(false);
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

  // 当 site 变化时，更新时区表单
  useEffect(() => {
    if (site) {
      timeZoneForm.setValue("timeZone", site.timezone || "");
    }
  }, [site, timeZoneForm]);

  // 当 site 变化时，更新速率限制表单
  useEffect(() => {
    if (site) {
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
  }, [site, rateLimitForm]);

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
            err instanceof AxiosError ? err.response?.data.error : t('common.unknownError'),
        });
      });
  }

  function onSubmitRateLimit(data: RateLimitFormValues) {
    // 提交速率限制修改
    setIsRateLimitLoading(true);

    // Convert rateLimitUnit to rate_seconds for API
    let rate_seconds = 1; // default to second
    if (data.rateLimitUnit === "minute") rate_seconds = 60;
    if (data.rateLimitUnit === "hour") rate_seconds = 3600;

    const submitData = {
      limit_minute: data.limit_minute,
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
            err instanceof AxiosError ? err.response?.data.error : t('common.unknownError'),
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
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
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
                      <select
                        value={rateLimitForm.watch("rateLimitUnit")}
                        onChange={(e) =>
                          rateLimitForm.setValue(
                            "rateLimitUnit",
                            e.target.value,
                          )
                        }
                        className="w-[150px] rounded-md border border-gray-300 px-3 py-2"
                      >
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
    </div>
  );
}
