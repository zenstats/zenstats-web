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

// Define interface for Hostname shield rule
interface ShieldHostnameRule {
  id: number;
  site_id: number;
  hostname: string;
  hostname_pattern: string;
  action: string;
  description: string;
  added_by: string;
  created_at: string;
  updated_at: string;
}

// API client for hostname shield management
const fetchHostnames = async (domain: string): Promise<ShieldHostnameRule[]> => {
  try {
    const response = await axios.get<BaseResponse<ShieldHostnameRule[]>>(`/sites/${domain}/shield/hostname`);
    return response.data.data || [];
  } catch (error) {
    console.error('Failed to fetch hostnames list:', error);
    throw new Error(error instanceof AxiosError ? error.response?.data.error || 'Failed to fetch hostnames list' : 'Failed to fetch hostnames list');
  }
};

const addHostname = async (domain: string, hostname: string, hostname_pattern: string, description: string): Promise<ShieldHostnameRule> => {
  try {
    const response = await axios.post<BaseResponse<ShieldHostnameRule>>(`/sites/${domain}/shield/hostname`, {
      action: 'allow',
      hostname,
      hostname_pattern,
      description
    });
    // Check business code in response
    if (response.data.code !== 200) {
      throw new Error(`${response.data.message || 'Operation failed'}: ${response.data.error || ''}`);
    }
    return response.data.data as ShieldHostnameRule;
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

export default function SettingShieldsHostname() {
  const [hostnameList, setHostnameList] = useState<ShieldHostnameRule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { t } = useTranslation();
  const { domain: domainParam } = useParams<Params>();
  const domain = domainParam!;


  const validateHostname = (input: string): boolean => {
    const domainRegex = /^(?!:\/\/)([a-z0-9-]+\.)*[a-z0-9-]+\.[a-z]{2,}$/i;
    const wildcardRegex = /^\*\.([a-z0-9-]+\.)*[a-z0-9-]+\.[a-z]{2,}$/i;

    return domainRegex.test(input) || wildcardRegex.test(input);
  };
  const [newHostnameInput, setNewHostnameInput] = useState('');
  const [newHostnameDescription, setNewHostnameDescription] = useState('');

  // Convert wildcard pattern to regex
  const convertWildcardToRegex = (input: string): string => {
    let reg: RegExp;
    if (input.startsWith('*.')) {
      const baseDomain = input.substring(2); // 去掉*.部分
      // 转义正则特殊字符，并将点替换为正则的点
      const escapedDomain = baseDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      reg = new RegExp(`^(.*\\.)?${escapedDomain}$`, 'i');
    } else {
      const escapedDomain = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      reg = new RegExp(`^${escapedDomain}$`, 'i')
    }
    return reg.source;
  };
  // Handle hostname deletion
  const handleDeleteHostname = async (id: number) => {
    if (!domain || !window.confirm(t('settings.shields.hostname.confirmUnblock'))) return;
    setLoading(true);
    setDeletingId(id);
    try {
      await axios.delete(`/sites/${domain}/shield/hostname/${id}`);
      // Refresh hostname list
      const updatedHostnames = await fetchHostnames(domain);
      setHostnameList(updatedHostnames);
      toast.success(t('settings.shields.hostname.removeSuccess'));
    } catch (error) {
      console.error('Error deleting hostname:', error);
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        const errorData = error.response?.data;
        toast.error(`${t('settings.shields.hostname.removeFailed')} (${status || 'Unknown'})`, {
          description: errorData?.message || errorData?.detail || t('common.unknownError')
        });
      } else {
        toast.error(t('settings.shields.hostname.removeFailed'), {
          description: t('common.unknownError')
        });
      }
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  };

  // Load hostname list on component mount and domain change
  useEffect(() => {
    if (!domain) return;
    const loadHostnames = async () => {
      setLoading(true);
      try {
        const hostnames = await fetchHostnames(domain);
        setHostnameList(hostnames);
      } catch (error) {
        console.error('Error loading hostname list:', error);
        toast.error(t('settings.shields.hostname.loadFailed'), {
          description: error instanceof AxiosError ? error.response?.data.error : t('common.unknownError')
        });
      } finally {
        setLoading(false);
      }
    };
    loadHostnames();
  }, [domain]);

  // Handle hostname addition
  const handleAddHostname = async () => {
    const inputValue = newHostnameInput.trim();
    const pattern = convertWildcardToRegex(inputValue);

    if (!inputValue || !domain) {
      toast.error(t('settings.shields.hostname.enterHostname'));
      return;
    }
    // Validate regex format
    try {
      new RegExp(pattern);
    } catch {
      toast.error(t('settings.shields.hostname.invalidFormat'));
      return;
    }
    setLoading(true);
    try {
      // Validate hostname format
      if (!validateHostname(inputValue)) {
        toast.error(t('settings.shields.hostname.invalidFormat'), {
          description: t('settings.shields.hostname.invalidFormatDetail')
        });
        return;
      }
      await addHostname(domain, inputValue, pattern, newHostnameDescription.trim());
      // Refresh hostname list
      const updatedHostnames = await fetchHostnames(domain);
      setHostnameList(updatedHostnames);
      setNewHostnameInput('');
      setNewHostnameDescription('');
      setIsModalOpen(false);
      toast.success(t('settings.shields.hostname.addSuccess'));
    } catch (error) {
      console.error('Error adding hostname:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add hostname';
      toast.error(t('settings.shields.hostname.addFailed'), {
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
            <CardTitle>{t('settings.shields.hostname.title')}</CardTitle>
            <CardDescription>{t('settings.shields.hostname.description')}</CardDescription>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>{t('settings.shields.hostname.addAllowedHostname')}</Button>
        </CardHeader>
        <CardContent>
          <Separator className="my-6" />

          {loading ? (
            <div className="text-center py-8">{t('settings.shields.hostname.loading')}</div>
          ) : hostnameList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t('settings.shields.hostname.noHostnames')}</div>
          ) : (
            <div className="space-y-4">
              {hostnameList.map((hostname) => (
                <div key={hostname.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{hostname.hostname}</p>
                    {hostname.description && (
                      <p className="text-sm text-gray-500 mt-1">{hostname.description}</p>
                    )}
                    <p className="text-xs text-gray-400">{t('settings.shields.hostname.addedBy', { addedBy: hostname.added_by, date: new Date(hostname.created_at).toLocaleString() })}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteHostname(hostname.id)}
                    className="text-red-500 hover:text-red-700"
                    disabled={loading}
                  >
                    {loading && hostname.id === deletingId ? t('settings.shields.hostname.deleting') : t('settings.shields.hostname.delete')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Hostname Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('settings.shields.hostname.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="hostname-input">{t('settings.shields.hostname.hostname')} <span className="text-red-500">*</span></Label>
              <Input
                id="hostname-input"
                value={newHostnameInput}
                onChange={(e) => setNewHostnameInput(e.target.value)}
                placeholder={t('settings.shields.hostname.hostnamePlaceholder')}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">{t('settings.shields.hostname.hostnameHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('settings.shields.hostname.descriptionLabel')}</Label>
              <Textarea
                id="description"
                value={newHostnameDescription}
                onChange={(e) => setNewHostnameDescription(e.target.value)}
                placeholder={t('settings.shields.hostname.descriptionPlaceholder')}
                className="resize-none"
                rows={3}
                disabled={loading}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={loading}
              >
                {t('settings.shields.hostname.cancel')}
              </Button>
              <Button onClick={handleAddHostname} disabled={loading || !newHostnameInput.trim()}>
                {loading ? t('settings.shields.hostname.adding') : t('settings.shields.hostname.addHostname')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}