import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { Check, Clipboard, ExternalLink, Shield, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import axios from "@/utils/axios";

interface VerificationStatus {
  domain: string;
  is_verified: boolean;
  verification_token?: string;
  verified_at?: string;
}

export default function SiteVerifyPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { domain = "" } = useParams<{ domain: string }>();
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await axios.get(`/sites/${domain}/verification-status`);
      setStatus(response.data.data);
    } catch {
      toast.error(t('sites.verify.fetchStatusFailed'));
    } finally {
      setLoading(false);
    }
  }, [domain, t]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const verificationContent = status?.verification_token || "";

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(verificationContent);
      setCopied(true);
      toast.success(t('sites.verify.copySuccess'));
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('sites.verify.copyFailed'));
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await axios.post(`/sites/${domain}/verify`);
      toast.success(t('sites.verify.success'));
      fetchStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('sites.verify.failed');
      toast.error(message);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status?.is_verified) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="border-0 shadow-sm">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Shield className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">{t('sites.verify.verifiedTitle')}</CardTitle>
            <CardDescription className="text-base">
              {t('sites.verify.verifiedDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => navigate("/sites")}>{t('sites.verify.backToSites')}</Button>
            <Button onClick={() => navigate(`/sites/${domain}/install`)}>
              {t('sites.verify.viewInstall')}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card className="border-0 shadow-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">{t('sites.verify.title')}</CardTitle>
          <CardDescription className="text-base">
            {t('sites.verify.instruction')}
            <span className="font-medium text-foreground"> {domain} </span>
            {t('sites.verify.instructionSuffix')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{t('sites.verify.verificationFile')}</h3>
              <Button variant="outline" size="sm" onClick={copyToken}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}
                {copied ? t('sites.verify.copied') : t('sites.verify.copyToken')}
              </Button>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <p className="mb-2 text-muted-foreground">{t('sites.verify.filePath')}:</p>
              <code className="block rounded bg-slate-950 p-2 text-slate-50">/.well-known/zenstats-verification.txt</code>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-50">
              <code>{verificationContent}</code>
            </pre>
          </div>

          <div className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{t('sites.verify.steps')}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>{t('sites.verify.step1')}</li>
              <li>{t('sites.verify.step2')}</li>
              <li>{t('sites.verify.step3')}</li>
            </ol>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => navigate("/sites")}>{t('sites.verify.backToSites')}</Button>
            <Button onClick={handleVerify} disabled={verifying}>
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('sites.verify.verifying')}
                </>
              ) : (
                t('sites.verify.verifyButton')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
