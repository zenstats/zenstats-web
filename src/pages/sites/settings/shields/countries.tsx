import 'flag-icons/css/flag-icons.min.css';
import { useState, useEffect, useMemo } from 'react';

import { COUNTRY_LIST } from '@/constants/countries';
import { useParams } from 'react-router-dom';
import { Separator } from "@components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SearchSelect from "@components/search-select";

import axios, { type BaseResponse } from "@utils/axios";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

// Define interface for Country shield rule
interface ShieldCountryRule {
  id: number;
  site_id: number;
  country_code: string;
  country_name: string;
  action: string;
  description: string;
  added_by: string;
  created_at: string;
  updated_at: string;
}

// API client for country shield management
const fetchCountries = async (domain: string): Promise<ShieldCountryRule[]> => {
  try {
    const response = await axios.get<BaseResponse<ShieldCountryRule[]>>(`/sites/${domain}/shield/country`);
    return response.data.data || [];
  } catch (error) {
    console.error('Failed to fetch countries list:', error);
    throw new Error(error instanceof AxiosError ? error.response?.data.error || 'Failed to fetch countries list' : 'Failed to fetch countries list');
  }
};

const addCountry = async (domain: string, countryCode: string, description: string): Promise<ShieldCountryRule> => {
  try {
    const response = await axios.post<BaseResponse<ShieldCountryRule>>(`/sites/${domain}/shield/country`, {
      country_code: countryCode,
      description,
      action: 'deny'
    });
    // Check business code in response
    if (response.data.code !== 200) {
      throw new Error(`${response.data.message || 'Operation failed'}: ${response.data.error || ''}`);
    }
    return response.data.data as ShieldCountryRule;
  } catch (error) {
     console.error('Failed to add hostname:', error);
    let errorMsg = 'Failed to add hostname';
    let errorDetail = '';
    if (error instanceof AxiosError) {
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

export default function SettingShieldsCountries() {
  const [countryList, setCountryList] = useState<ShieldCountryRule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCountryCode, setNewCountryCode] = useState('');
  const [newCountryDescription, setNewCountryDescription] = useState('');
  const countryOptions = useMemo(() => COUNTRY_LIST.map(country => ({
      value: country.code.toUpperCase(),
      label: <><span className={`fi fi-${country.code.toLowerCase()} mr-2`}></span>{country.name} ({country.code.toUpperCase()})</>,
      searchLabel: `${country.name} (${country.code.toUpperCase()})`
    })), []);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { t } = useTranslation();
  const { domain: domainParam } = useParams<Params>();
  const domain = domainParam!;

  // Handle country deletion
  const handleDeleteCountry = async (id: number) => {
    if (!domain || !window.confirm(t('settings.shields.countries.confirmUnblock'))) return;
    setLoading(true);
    setDeletingId(id);
    try {
      await axios.delete(`/sites/${domain}/shield/country/${id}`);
      // Refresh country list
      const updatedCountries = await fetchCountries(domain);
      setCountryList(updatedCountries);
      toast.success(t('settings.shields.countries.unblockSuccess'));
    } catch (error) {
      console.error('Error deleting country:', error);
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        const errorData = error.response?.data;
        toast.error(`${t('settings.shields.countries.unblockFailed')} (${status || 'Unknown'})`, {
          description: errorData?.message || errorData?.error || t('common.unknownError')
        });
      } else {
        toast.error(t('settings.shields.countries.unblockFailed'), {
          description: t('common.unknownError')
        });
      }
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  };

  // Load country list on component mount and domain change
  useEffect(() => {
    if (!domain) return;
    const loadCountries = async () => {
      setLoading(true);
      try {
        const countries = await fetchCountries(domain);
        setCountryList(countries);
      } catch (error) {
        console.error('Error loading country list:', error);
        toast.error(t('settings.shields.countries.loadFailed'), {
          description: error instanceof AxiosError ? error.response?.data.error : t('common.unknownError')
        });
      } finally {
        setLoading(false);
      }
    };
    loadCountries();
  }, [domain]);

  // Handle country addition
  const handleAddCountry = async () => {
    if (!newCountryCode.trim() || !domain) return;
    setLoading(true);
    try {
      await addCountry(domain, newCountryCode.trim().toUpperCase(), newCountryDescription.trim());
      // Refresh country list
      const updatedCountries = await fetchCountries(domain);
      setCountryList(updatedCountries);
      // Show success toast and reset form
      setNewCountryCode('');
      setNewCountryDescription('');
      setIsModalOpen(false);
      toast.success(t('settings.shields.countries.addSuccess'));
    } catch (error) {
      console.error('Error adding country:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add country';
      toast.error(t('settings.shields.countries.addFailed'), {
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

  const getCountryName = (code: string) => {
    const country = COUNTRY_LIST.find(c => c.code === code);
    return country ? country.name : code;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>{t('settings.shields.countries.title')}</CardTitle>
            <CardDescription>{t('settings.shields.countries.description')}</CardDescription>
          </div>
          <Button onClick={() => {
            setIsModalOpen(true);
          }}>{t('settings.shields.countries.addBlockedCountry')}</Button>
        </CardHeader>
        <CardContent>
          <Separator className="my-6" />

          {loading ? (
            <div className="text-center py-8">{t('settings.shields.countries.loading')}</div>
          ) : countryList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t('settings.shields.countries.noCountries')}</div>
          ) : (
            <div className="space-y-4">
              {countryList.map((country) => (
                <div key={country.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      <span className={`fi fi-${country.country_code.toLowerCase()} mr-2`}></span>{getCountryName(country.country_code)} ({country.country_code})
                    </p>
                    {country.description && (
                      <p className="text-sm text-gray-500 mt-1">{country.description}</p>
                    )}
                    <p className="text-xs text-gray-400">{t('settings.shields.countries.addedBy', { addedBy: country.added_by, date: new Date(country.created_at).toLocaleString() })}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteCountry(country.id)}
                    className="text-red-500 hover:text-red-700"
                    disabled={loading}
                  >
                    {loading && country.id === deletingId ? t('settings.shields.countries.deleting') : t('settings.shields.countries.delete')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('settings.shields.countries.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="country-code">{t('settings.shields.countries.countryCode')}</Label>
              <SearchSelect
                className="w-full"
                options={countryOptions}
                value={newCountryCode}
                onValueChange={setNewCountryCode}
                placeholder={t('settings.shields.countries.selectCountry')}
                searchPlaceholder={t('settings.shields.countries.searchCountry')}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">{t('settings.shields.countries.codeHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country-description">{t('settings.shields.countries.descriptionLabel')}</Label>
              <Textarea
                id="country-description"
                value={newCountryDescription}
                onChange={(e) => setNewCountryDescription(e.target.value)}
                placeholder={t('settings.shields.countries.descriptionPlaceholder')}
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
              {t('settings.shields.countries.cancel')}
            </Button>
            <Button onClick={handleAddCountry} disabled={loading || !newCountryCode.trim()}>
              {loading ? t('settings.shields.countries.adding') : t('settings.shields.countries.addCountry')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}