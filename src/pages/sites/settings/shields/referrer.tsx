import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@components/ui/dialog";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import axios, { type BaseResponse } from "@utils/axios";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

interface ShieldReferrerRule {
  id: number;
  site_id: number;
  hostname: string;
  action: string;
  description: string;
  created_at: string;
}

const fetchReferrers = async (domain: string): Promise<ShieldReferrerRule[]> => {
  const response = await axios.get<BaseResponse<ShieldReferrerRule[]>>(`/sites/${domain}/shield/referrer`);
  return response.data.data || [];
};

const addReferrer = async (domain: string, hostname: string, description: string): Promise<ShieldReferrerRule> => {
  const response = await axios.post<BaseResponse<ShieldReferrerRule>>(`/sites/${domain}/shield/referrer`, {
    hostname,
    description,
    action: 'deny'
  });
  return response.data.data as ShieldReferrerRule;
};

const removeReferrer = async (domain: string, ruleId: number): Promise<void> => {
  await axios.delete(`/sites/${domain}/shield/referrer/${ruleId}`);
};

export default function SettingShieldsReferrer() {
  const { t } = useTranslation();
  const { domain } = useParams<{ domain?: string }>();
  const [rules, setRules] = useState<ShieldReferrerRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newHostname, setNewHostname] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRules = async () => {
    if (!domain) return;
    try {
      setLoading(true);
      const data = await fetchReferrers(domain);
      setRules(data);
    } catch (e) {
      toast.error(e instanceof AxiosError ? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRules(); }, [domain]);

  const handleAdd = async () => {
    if (!domain || !newHostname.trim()) return;
    setSubmitting(true);
    try {
      await addReferrer(domain, newHostname.trim(), newDescription.trim());
      toast.success(t('settings.shields.referrer.addSuccess'));
      setDialogOpen(false);
      setNewHostname('');
      setNewDescription('');
      loadRules();
    } catch (e) {
      toast.error(e instanceof AxiosError ? e.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (ruleId: number) => {
    if (!domain) return;
    try {
      await removeReferrer(domain, ruleId);
      toast.success(t('settings.shields.referrer.removeSuccess'));
      loadRules();
    } catch (e) {
      toast.error(e instanceof AxiosError ? e.message : t('common.error'));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.shields.referrer.title')}</CardTitle>
          <CardDescription>{t('settings.shields.referrer.desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setDialogOpen(true)}>{t('common.add')}</Button>
          </div>
          {loading ? (
            <p className="text-muted-foreground">{t('common.loading')}...</p>
          ) : rules.length === 0 ? (
            <p className="text-muted-foreground">{t('common.empty')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">{t('settings.shields.referrer.hostname')}</th>
                  <th className="py-2">{t('settings.shields.referrer.description')}</th>
                  <th className="py-2">{t('settings.shields.referrer.createdAt')}</th>
                  <th className="py-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {rules.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2 font-mono">{r.hostname}</td>
                    <td className="py-2">{r.description || '-'}</td>
                    <td className="py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="py-2">
                      <Button variant="destructive" size="sm" onClick={() => handleRemove(r.id)}>
                        {t('common.delete')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.shields.referrer.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('settings.shields.referrer.hostname')}</Label>
              <Input value={newHostname} onChange={e => setNewHostname(e.target.value)} placeholder="spam-domain.com" />
            </div>
            <div>
              <Label>{t('settings.shields.referrer.description')}</Label>
              <Input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder={t('common.optional')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAdd} disabled={submitting}>{t('common.add')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
