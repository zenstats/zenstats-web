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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

// ---------------------------------------------------------------------------
// Feature flag definitions — must match tracker/compile.js exactly
// ---------------------------------------------------------------------------
const FEATURES = [
  { id: 'ex', i18nKey: 'exclusions',     flag: 'COMPILE_EXCLUSIONS' },
  { id: 'fd', i18nKey: 'fileDownloads',  flag: 'COMPILE_FILE_DOWNLOADS' },
  { id: 'ha', i18nKey: 'hash',           flag: 'COMPILE_HASH' },
  { id: 'ma', i18nKey: 'manual',         flag: 'COMPILE_MANUAL' },
  { id: 'ol', i18nKey: 'outboundLinks',  flag: 'COMPILE_OUTBOUND_LINKS' },
  { id: 'te', i18nKey: 'taggedEvents',   flag: 'COMPILE_TAGGED_EVENTS' },
] as const;

type FeatureId = (typeof FEATURES)[number]['id'];

// ---------------------------------------------------------------------------
// Canonical file name — must match tracker/compile.js exactly
// Abbreviated feature IDs: ex, fd, ha, ma, ol, te
// Backward-compat: all features → script.js / script.hash.js
// Collision disambiguation: script.ha → script.ha.bare.js (since script.hash.js already exists)
// ---------------------------------------------------------------------------
const BACKWARD_COMPAT_TARGETS = new Set(['script', 'script.hash'])

function getScriptFileName(enabled: FeatureId[]): string {
  if (enabled.length === 0) return 'script.bare.js'

  const allIds = FEATURES.map(f => f.id)
  // All features except hash → backward-compat "script.js"
  if (enabled.every(id => id !== 'ha') && allIds.filter(id => id !== 'ha').every(id => enabled.includes(id))) {
    return 'script.js'
  }
  // All features including hash → backward-compat "script.hash.js"
  if (allIds.every(id => enabled.includes(id))) {
    return 'script.hash.js'
  }

  const sorted = [...enabled].sort()
  const name = `script.${sorted.join('.')}`

  // Disambiguation: script.ha collides with backward-compat script.hash
  if (BACKWARD_COMPAT_TARGETS.has(name)) {
    return name + '.bare.js'
  }

  return name + '.js'
}

// ---------------------------------------------------------------------------
// Human-readable label for the selected combination
// ---------------------------------------------------------------------------
function getScriptLabel(enabled: FeatureId[], t: (key: string) => string): string {
  if (enabled.length === 0) return t('sites.install.features.none')
  if (enabled.length === FEATURES.length) return t('sites.install.features.all')
  return enabled
    .map(id => {
      const f = FEATURES.find(f => f.id === id)
      return f ? t(`sites.install.features.${f.i18nKey}.label`) : id
    })
    .join(' + ')
}

export default function SiteInstallPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { domain = "" } = useParams<{ domain: string }>();
  const [copied, setCopied] = useState(false);

  // All features except hash enabled by default
  // Hash mode is off by default — modern SPAs use pushState, not #/ routes
  const [enabledFeatures, setEnabledFeatures] = useState<FeatureId[]>(
    FEATURES.filter(f => f.id !== 'ha').map(f => f.id)
  );

  const toggleFeature = (id: FeatureId, checked: boolean) => {
    setEnabledFeatures(prev =>
      checked
        ? [...prev, id]
        : prev.filter(f => f !== id)
    )
  }

  const fileName = useMemo(() => getScriptFileName(enabledFeatures), [enabledFeatures])

  const scriptSnippet = useMemo(
    () => {
      const scriptUrl = `${window.location.origin}/js/${fileName}`;
      return `<script defer crossorigin="anonymous" data-domain="${domain}" src="${scriptUrl}"></script>`;
    },
    [domain, fileName],
  );

  const isFullVersion = enabledFeatures.length === FEATURES.length

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
          {/* Feature checkboxes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('sites.install.featureLabel')}</Label>
            <div className="rounded-lg border p-4 space-y-4">
              {FEATURES.map((feat) => {
                const checked = enabledFeatures.includes(feat.id)
                return (
                  <div key={feat.id} className="flex items-start gap-3">
                    <Checkbox
                      id={`feat-${feat.id}`}
                      checked={checked}
                      onCheckedChange={(val) => toggleFeature(feat.id, val === true)}
                      className="mt-0.5"
                    />
                    <div>
                      <Label
                        htmlFor={`feat-${feat.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {t(`sites.install.features.${feat.i18nKey}.label`)}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t(`sites.install.features.${feat.i18nKey}.desc`)}
                      </p>
                    </div>
                  </div>
                )
              })}

              {/* Selected script summary */}
              <div className="border-t pt-3 text-xs text-muted-foreground">
                {isFullVersion ? (
                  <span className="text-emerald-600 font-medium">{t('sites.install.features.recommended')}</span>
                ) : (
                  <>
                    {t('sites.install.features.selectedScript', {
                      name: getScriptLabel(enabledFeatures, t),
                    })}
                  </>
                )}
              </div>
            </div>
          </div>

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
