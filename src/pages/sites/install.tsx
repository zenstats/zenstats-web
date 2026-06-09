import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { Check, Clipboard, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SiteInstallPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { domain = "" } = useParams<{ domain: string }>();
  const [copied, setCopied] = useState(false);

  const scriptSnippet = useMemo(
    () => {
      const scriptUrl = `${window.location.origin}/js/zenstats.js`;
      return `<script defer crossorigin="anonymous" data-domain="${domain}" src="${scriptUrl}"></script>`;
    },
    [domain],
  );

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(scriptSnippet);
      setCopied(true);
      toast.success(t('sites.install.copySuccess'));
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('sites.install.copyFailed'));
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card className="border-0 shadow-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">{t('sites.install.title')}</CardTitle>
          <CardDescription className="text-base">
            {t('sites.install.instruction')}
            <span className="font-medium text-foreground"> {domain} </span>
            {t('sites.install.instructionSuffix')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{t('sites.install.trackingCode')}</h3>
              <Button variant="outline" size="sm" onClick={copySnippet}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}
                {copied ? t('sites.install.copied') : t('sites.install.copyCode')}
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-50">
              <code>{scriptSnippet}</code>
            </pre>
          </div>

          <div className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{t('sites.install.nextSteps')}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>{t('sites.install.step1')}</li>
              <li>{t('sites.install.step2')}</li>
              <li>{t('sites.install.step3')}</li>
            </ol>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => navigate("/sites")}>{t('sites.install.backToSites')}</Button>
            <Button onClick={() => navigate(`/sites/${domain}/stats`)}>
              {t('sites.install.viewStats')}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}