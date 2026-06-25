import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@components/ui/button";
import { Switch } from "@components/ui/switch";
import { Label } from "@components/ui/label";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import { Loader2, Mail } from 'lucide-react';
import axios, { type BaseResponse } from "@utils/axios";
import { AxiosError } from "axios";

interface EmailReportConfig {
  weekly: boolean;
  monthly: boolean;
}

export default function EmailReportsSettings() {
  const { t } = useTranslation();
  const { domain } = useParams<{ domain?: string }>();
  const [weeklyEnabled, setWeeklyEnabled] = useState(false);
  const [monthlyEnabled, setMonthlyEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!domain) return;
    try {
      setLoading(true);
      const response = await axios.get<BaseResponse<EmailReportConfig>>(`/sites/${domain}/email-reports`);
      const data = response.data.data;
      setWeeklyEnabled(data?.weekly ?? false);
      setMonthlyEnabled(data?.monthly ?? false);
    } catch (e) {
      toast.error(e instanceof AxiosError ? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [domain, t]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    if (!domain) return;
    setSaving(true);
    try {
      await axios.put(`/sites/${domain}/email-reports`, {
        weekly: weeklyEnabled,
        monthly: monthlyEnabled,
      });
      toast.success(t('common.saved'));
    } catch (e) {
      toast.error(e instanceof AxiosError ? e.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.emailReports.title')}</CardTitle>
          <CardDescription>{t('settings.emailReports.desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">{t('settings.emailReports.weeklyReport')}</Label>
              <p className="text-sm text-muted-foreground">{t('settings.emailReports.weeklyDesc')}</p>
            </div>
            <Switch checked={weeklyEnabled} onCheckedChange={setWeeklyEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">{t('settings.emailReports.monthlyReport')}</Label>
              <p className="text-sm text-muted-foreground">{t('settings.emailReports.monthlyDesc')}</p>
            </div>
            <Switch checked={monthlyEnabled} onCheckedChange={setMonthlyEnabled} />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            {t('common.save')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
