import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@components/ui/button";
import { Switch } from "@components/ui/switch";
import { Label } from "@components/ui/label";
import { Input } from "@components/ui/input";
import { Slider } from "@components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import { Loader2, BellRing } from 'lucide-react';
import axios, { type BaseResponse } from "@utils/axios";
import { AxiosError } from "axios";

interface TrafficAlertConfig {
  enabled: boolean;
  threshold: number;
  recipients: string;
  interval: string;
}

export default function TrafficAlertSettings() {
  const { t } = useTranslation();
  const { domain } = useParams<{ domain?: string }>();
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(50);
  const [recipients, setRecipients] = useState("");
  const [interval, setInterval] = useState("hourly");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recipientsError, setRecipientsError] = useState("");

  const loadConfig = useCallback(async () => {
    if (!domain) return;
    try {
      setLoading(true);
      const response = await axios.get<BaseResponse<TrafficAlertConfig>>(`/sites/${domain}/traffic-alert`);
      const data = response.data.data;
      setEnabled(data?.enabled ?? false);
      setThreshold(data?.threshold ?? 50);
      setRecipients(data?.recipients ?? "");
      setInterval(data?.interval ?? "hourly");
    } catch (e) {
      toast.error(e instanceof AxiosError ? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [domain, t]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    if (!domain) return;
    // 前端校验收件人
    if (recipients.trim()) {
      const emails = recipients.split(',').map(e => e.trim()).filter(Boolean);
      const invalid = emails.find(e => !/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(e));
      if (invalid) {
        setRecipientsError(`Invalid email: ${invalid}`);
        return;
      }
    }
    setRecipientsError("");
    setSaving(true);
    try {
      await axios.put(`/sites/${domain}/traffic-alert`, {
        enabled,
        threshold,
        recipients,
        interval,
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
          <CardTitle>{t('settings.trafficAlert.title')}</CardTitle>
          <CardDescription>{t('settings.trafficAlert.desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">{t('settings.trafficAlert.enable')}</Label>
              <p className="text-sm text-muted-foreground">{t('settings.trafficAlert.enableDesc')}</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label>{t('settings.trafficAlert.interval')}</Label>
            <Select value={interval} onValueChange={setInterval} disabled={!enabled}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">{t('settings.trafficAlert.intervalHourly')}</SelectItem>
                <SelectItem value="daily">{t('settings.trafficAlert.intervalDaily')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('settings.trafficAlert.intervalDesc')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t('settings.trafficAlert.threshold')}: {threshold}%</Label>
            <Slider
              value={[threshold]}
              onValueChange={([v]: number[]) => setThreshold(v)}
              min={10}
              max={200}
              step={5}
              disabled={!enabled}
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.trafficAlert.thresholdDesc')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t('settings.trafficAlert.recipients')}</Label>
            <Input
              value={recipients}
              onChange={e => { setRecipients(e.target.value); setRecipientsError(''); }}
              onBlur={() => {
                if (!recipients.trim()) { setRecipientsError(''); return; }
                const emails = recipients.split(',').map(e => e.trim()).filter(Boolean);
                const invalid = emails.find(e => !/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(e));
                setRecipientsError(invalid ? `Invalid email: ${invalid}` : '');
              }}
              placeholder="admin@example.com, user@example.com"
              disabled={!enabled}
              className={recipientsError ? "border-red-500" : ""}
            />
            {recipientsError && (
              <p className="text-xs text-red-500">{recipientsError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('settings.trafficAlert.recipientsDesc')}
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BellRing className="mr-2 h-4 w-4" />
            )}
            {t('common.save')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
