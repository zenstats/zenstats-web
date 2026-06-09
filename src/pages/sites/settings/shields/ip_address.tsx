import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Separator } from "@components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@components/ui/dialog";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { Textarea } from "@components/ui/textarea";
import axios, { type BaseResponse } from "@utils/axios";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

// Define interface for IP shield rule
interface ShieldIPRule {
  id: number;
  site_id: number;
  ip: string;
  action: string;
  description: string;
  added_by: string;
  created_at: string;
  updated_at: string;
}

// API client for shield management
const fetchShieldIPs = async (domain: string): Promise<ShieldIPRule[]> => {
  try {
    const response = await axios.get<BaseResponse<ShieldIPRule[]>>(`/sites/${domain}/shield/ip`);
    return response.data.data || [];
  } catch (error) {
    console.error('Failed to fetch IP list:', error);
    throw new Error(error instanceof AxiosError ? error.response?.data.error || 'Failed to fetch IP list' : 'Failed to fetch IP list');
  }
};

const addShieldIP = async (domain: string, ip: string, description: string): Promise<ShieldIPRule> => {
  try {
    const response = await axios.post<BaseResponse<ShieldIPRule>>(`/sites/${domain}/shield/ip`, {
      ip,
      description,
      action: 'deny'
    });
    // Check business code in response
    if (response.data.code !== 200) {
      throw new Error(`${response.data.message || 'Operation failed'}: ${response.data.error || ''}`);
    }
    return response.data.data as ShieldIPRule;
  } catch (error) {
    console.error('Failed to add hostname:', error);
    // Extract error message from response
    let errorMsg = 'Failed to add hostname';
    let errorDetail = '';
    // Handle both Axios errors and business custom errors
    if (error instanceof AxiosError) {
      // Handle HTTP errors
      const responseData = error.response?.data || {};
      errorMsg = responseData.message || errorMsg;
      errorDetail = responseData.error || '';
    } else if (error instanceof Error) {
      console.log('error', error)
      errorMsg = error.message || errorMsg;
    }
    if (errorDetail.includes('duplicate key value violates unique constraint')) {
      errorMsg = 'Hostname rule already exists';
      errorDetail = 'A rule with this hostname pattern already exists for this site';
    }
    console.log(errorMsg, errorDetail)
    throw new Error(`${errorMsg}: ${errorDetail}`.trim());
  }
};

interface Params extends Record<string, string | undefined> {
  domain?: string;
}

export default function SettingShieldsIpAddress() {

  const [ipList, setIpList] = useState<ShieldIPRule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [newIpDescription, setNewIpDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { t } = useTranslation();
  const { domain: domainParam } = useParams<Params>();
  const domain = domainParam!;
  // Handle IP deletion
  const handleDeleteIP = async (id: number) => {
    if (!domain || !window.confirm(t('settings.shields.ip.confirmUnblock'))) return;
    setLoading(true);
    setDeletingId(id);
    try {
      await axios.delete(`/sites/${domain}/shield/ip/${id}`);
      // Refresh IP list
      const updatedIPs = await fetchShieldIPs(domain);
      setIpList(updatedIPs);
      toast.success(t('settings.shields.ip.unblockSuccess'));
    } catch (error) {
      console.error('Error deleting IP address:', error);
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        const errorData = error.response?.data;
        toast.error(`${t('settings.shields.ip.unblockFailed')} (${status || 'Unknown'})`, {
          description: errorData?.message || errorData?.error || t('common.unknownError')
        });
      } else {
        toast.error(t('settings.shields.ip.unblockFailed'), {
          description: t('common.unknownError')
        });
      }
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  };

  // Load IP list on component mount and domain change
  useEffect(() => {
    if (!domain) return;
    const loadIPs = async () => {
      setLoading(true);
      try {
        const ips = await fetchShieldIPs(domain);
        setIpList(ips);
      } catch (error) {
        console.error('Error loading IP list:', error);
        toast.error(t('settings.shields.ip.loadFailed'), {
          description: error instanceof AxiosError ? error.response?.data.error : t('common.unknownError')
        });
      } finally {
        setLoading(false);
      }
    };
    loadIPs();
  }, [domain]);


  // Handle IP addition
  const handleAddIP = async () => {
    if (!newIp.trim() || !domain) return;
    setLoading(true);
    try {
      await addShieldIP(domain, newIp.trim(), newIpDescription.trim());
      // Refresh IP list
      const updatedIPs = await fetchShieldIPs(domain);
      setIpList(updatedIPs);
      // Show success toast and reset form
      setNewIp('');
      setNewIpDescription('');
      setIsModalOpen(false);
      toast.success(t('settings.shields.ip.addSuccess'));
    } catch (error) {
      console.error('Error adding IP address:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add IP address';
      toast.error(t('settings.shields.ip.addFailed'), {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  // Validate domain exists
  if (!domainParam) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>{t('settings.shields.ip.title')}</CardTitle>
            <CardDescription>{t('settings.shields.ip.description')}</CardDescription>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>{t('settings.shields.ip.addBlockedIp')}</Button>
        </CardHeader>
        <CardContent>
          <Separator className="my-6" />

          {loading ? (
            <div className="text-center py-8">{t('settings.shields.ip.loading')}</div>
          ) : ipList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t('settings.shields.ip.noIps')}</div>
          ) : (
            <div className="space-y-4">
              {ipList.map((ip) => (
                <div key={ip.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{ip.ip}</p>
                    {ip.description && (
                      <p className="text-sm text-gray-500 mt-1">{ip.description}</p>
                    )}
                    <p className="text-xs text-gray-400">{t('settings.shields.ip.addedBy', { addedBy: ip.added_by, date: new Date(ip.created_at).toLocaleString() })}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteIP(ip.id)}
                    className="text-red-500 hover:text-red-700"
                    disabled={loading}
                  >
                    {loading && ip.id === deletingId ? t('settings.shields.ip.deleting') : t('settings.shields.ip.delete')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add IP Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('settings.shields.ip.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ip-address">{t('settings.shields.ip.ipAddress')}</Label>
              <Input
                id="ip-address"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                placeholder={t('settings.shields.ip.ipPlaceholder')}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ip-description">{t('settings.shields.ip.descriptionLabel')}</Label>
              <Textarea
                id="ip-description"
                value={newIpDescription}
                onChange={(e) => setNewIpDescription(e.target.value)}
                placeholder={t('settings.shields.ip.descriptionPlaceholder')}
                className="resize-none"
                rows={3}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={loading}
            >
              {t('settings.shields.ip.cancel')}
            </Button>
            <Button onClick={handleAddIP} disabled={loading || !newIp.trim()}>
              {loading ? t('settings.shields.ip.adding') : t('settings.shields.ip.addIp')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
