import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { Check, Clipboard, Code2, ExternalLink } from "lucide-react";
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
import { Input } from "@/components/ui/input";

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

const validLabel = (value: string) => /^[a-zA-Z0-9_.:/@-]{1,120}$/.test(value);
const escapeAttribute = (value: string) => value.replace(/[&"<>']/g, char => ({
  '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;', "'": '&#39;',
})[char]!);

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

export default function SiteInstallPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { domain = "" } = useParams<{ domain: string }>();
  const [copied, setCopied] = useState(false);
  const [heatmap, setHeatmap] = useState(false);
  const [performance, setPerformance] = useState(false);
  const [release, setRelease] = useState('release-1');
  const [aggregationKey, setAggregationKey] = useState('');
  const [variant, setVariant] = useState('default');
  const optionalValid = (!(heatmap || performance) || validLabel(release.trim())) &&
    (!heatmap || (validLabel(variant.trim()) && (!aggregationKey.trim() || validLabel(aggregationKey.trim()))));

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
      const attributes = [`data-domain="${escapeAttribute(domain)}"`, `src="${escapeAttribute(scriptUrl)}"`];
      if (heatmap) {
        attributes.push('data-heatmap="true"', `data-heatmap-version="${escapeAttribute(release.trim())}"`);
        if (aggregationKey.trim()) attributes.push(`data-heatmap-key="${escapeAttribute(aggregationKey.trim())}"`);
        attributes.push(`data-heatmap-variant="${escapeAttribute(variant.trim())}"`);
      }
      if (performance) attributes.push('data-performance="true"', `data-performance-version="${escapeAttribute(release.trim())}"`);
      const separator = heatmap || performance ? '\n  ' : ' ';
      return `<script defer crossorigin="anonymous"${separator}${attributes.join(separator)}></script>`;
    },
    [domain, fileName, heatmap, performance, release, aggregationKey, variant],
  );

  const isFullVersion = enabledFeatures.length === FEATURES.length

  const copySnippet = async () => {
    if (!optionalValid) return;
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
    <div className={embedded ? "" : "mx-auto max-w-3xl px-4 py-10"}>
      <Card className={embedded ? "" : "border-0 shadow-sm"}>
        <CardHeader className={embedded ? "space-y-1.5" : "space-y-3 text-center"}>
          {!embedded && (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-6 w-6" />
            </div>
          )}
          <CardTitle className={embedded ? "text-xl flex items-center gap-2" : "text-2xl"}>
            {embedded && <Code2 className="h-5 w-5" />}
            {t(embedded ? 'sites.install.pageTitle' : 'sites.install.title')}
          </CardTitle>
          <CardDescription className={embedded ? "" : "text-base"}>
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

          <section className="space-y-3" aria-labelledby="install-optional-title">
            <h3 id="install-optional-title" className="text-sm font-medium">{t('sites.install.optional.title')}</h3>
            <p className="text-xs text-muted-foreground">{t('sites.install.optional.help')}</p>
            <div className="rounded-lg border p-4 space-y-5">
              {([
                { id: 'heatmap', checked: heatmap, set: setHeatmap, href: 'heatmap' },
                { id: 'performance', checked: performance, set: setPerformance, href: 'performance' },
              ] as const).map(option => (
                <div key={option.id} className="flex items-start gap-3">
                  <Checkbox id={`install-${option.id}`} checked={option.checked}
                    onCheckedChange={checked => option.set(checked === true)} className="mt-0.5" />
                  <div className="space-y-1">
                    <Label htmlFor={`install-${option.id}`} className="cursor-pointer text-sm font-medium">
                      {t(`sites.install.optional.${option.id}.label`)}
                    </Label>
                    <p className="text-xs text-muted-foreground">{t(`sites.install.optional.${option.id}.desc`)}</p>
                    <Link className="inline-block text-xs text-primary hover:underline" to={`/sites/${domain}/settings/${option.href}`}>
                      {t(`sites.install.optional.${option.id}.settings`)}
                    </Link>
                  </div>
                </div>
              ))}
              {(heatmap || performance) && (
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="install-release">{t('sites.install.optional.release')}</Label>
                    <Input id="install-release" value={release} maxLength={120}
                      onChange={event => setRelease(event.target.value)} aria-invalid={!validLabel(release.trim())} />
                    <p className="text-xs text-muted-foreground">{t('sites.install.optional.releaseHelp')}</p>
                  </div>
                  {heatmap && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="install-key">{t('sites.install.optional.key')}</Label>
                        <Input id="install-key" value={aggregationKey} maxLength={120} placeholder="product-detail"
                          onChange={event => setAggregationKey(event.target.value)}
                          aria-invalid={!!aggregationKey.trim() && !validLabel(aggregationKey.trim())} />
                        <p className="text-xs text-muted-foreground">{t('sites.install.optional.keyHelp')}</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="install-variant">{t('sites.install.optional.variant')}</Label>
                        <Input id="install-variant" value={variant} maxLength={120}
                          onChange={event => setVariant(event.target.value)} aria-invalid={!validLabel(variant.trim())} />
                        <p className="text-xs text-muted-foreground">{t('sites.install.optional.variantHelp')}</p>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{t('sites.install.optional.deployHelp')}</p>
                </div>
              )}
            </div>
            {!optionalValid && <p role="alert" className="text-sm text-destructive">{t('sites.install.optional.invalid')}</p>}
          </section>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{t('sites.install.trackingCode')}</h3>
              <Button variant="outline" size="sm" onClick={copySnippet} disabled={!optionalValid}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}
                {copied ? t('sites.install.copied') : t('sites.install.copyCode')}
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-50">
              <code>{scriptSnippet}</code>
            </pre>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{t('sites.install.nextSteps')}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>{t('sites.install.step1')}</li>
              <li>{t('sites.install.step2')}</li>
              <li>{t('sites.install.step3')}</li>
            </ol>
          </div>

          {!embedded && (
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => navigate("/sites")}>{t('sites.install.backToSites')}</Button>
              <Button onClick={() => navigate(`/sites/${domain}/stats`)}>
                {t('sites.install.viewStats')}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
