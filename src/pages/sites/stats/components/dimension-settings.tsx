import { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export interface DimensionConfig {
  key: string;
  label: string;
  property: string;
  category: "traffic" | "page" | "audience" | "technology";
  enabled: boolean;
  order: number;
}

const DEFAULT_ENABLED = ["source", "medium", "utm_source", "utm_campaign", "page", "entry_page", "country", "browser", "os", "device"];

const DIMENSION_TRANSLATION_KEYS: Record<string, string> = {
  source: "stats.dimensionSettings.dimensions.source",
  medium: "stats.dimensionSettings.dimensions.medium",
  utm_source: "stats.dimensionSettings.dimensions.utmSource",
  utm_campaign: "stats.dimensionSettings.dimensions.utmCampaign",
  utm_medium: "stats.dimensionSettings.dimensions.utmMedium",
  utm_content: "stats.dimensionSettings.dimensions.utmContent",
  utm_term: "stats.dimensionSettings.dimensions.utmTerm",
  page: "stats.dimensionSettings.dimensions.page",
  entry_page: "stats.dimensionSettings.dimensions.entryPage",
  exit_page: "stats.dimensionSettings.dimensions.exitPage",
  country: "stats.dimensionSettings.dimensions.country",
  region: "stats.dimensionSettings.dimensions.region",
  city: "stats.dimensionSettings.dimensions.city",
  browser: "stats.dimensionSettings.dimensions.browser",
  os: "stats.dimensionSettings.dimensions.os",
  device: "stats.dimensionSettings.dimensions.device",
  event_name: "stats.dimensionSettings.dimensions.eventName",
};

const DIMENSION_DATA: Omit<DimensionConfig, "enabled" | "order" | "label">[] = [
  { key: "source", property: "visit:source", category: "traffic" },
  { key: "medium", property: "visit:medium", category: "traffic" },
  { key: "utm_source", property: "event:utm_source", category: "traffic" },
  { key: "utm_medium", property: "event:utm_medium", category: "traffic" },
  { key: "utm_campaign", property: "event:utm_campaign", category: "traffic" },
  { key: "utm_content", property: "event:utm_content", category: "traffic" },
  { key: "utm_term", property: "event:utm_term", category: "traffic" },
  { key: "page", property: "event:page", category: "page" },
  { key: "entry_page", property: "visit:entry_page", category: "page" },
  { key: "exit_page", property: "visit:exit_page", category: "page" },
  { key: "country", property: "visit:country", category: "audience" },
  { key: "region", property: "visit:region", category: "audience" },
  { key: "city", property: "visit:city", category: "audience" },
  { key: "browser", property: "visit:browser", category: "technology" },
  { key: "os", property: "visit:os", category: "technology" },
  { key: "device", property: "visit:device", category: "technology" },
  { key: "event_name", property: "event:name", category: "page" },
];

interface DimensionSettingsProps {
  dimensions: DimensionConfig[];
  onChange: (dimensions: DimensionConfig[]) => void;
}

export function getDefaultDimensions(t?: (key: string) => string): DimensionConfig[] {
  return DIMENSION_DATA.map((dim, index) => ({
    ...dim,
    label: t ? t(DIMENSION_TRANSLATION_KEYS[dim.key]) : dim.key,
    enabled: DEFAULT_ENABLED.includes(dim.key),
    order: index,
  }));
}

export default function DimensionSettings({ dimensions, onChange }: DimensionSettingsProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [localDims, setLocalDims] = useState<DimensionConfig[]>(dimensions);

  // Sync localDims when parent's dimensions change (e.g. language switch re-translates labels)
  useEffect(() => {
    setLocalDims(dimensions);
  }, [dimensions]);

  const CATEGORY_LABELS: Record<string, string> = useMemo(() => ({
    traffic: t('stats.dimensionSettings.categories.traffic'),
    page: t('stats.dimensionSettings.categories.page'),
    audience: t('stats.dimensionSettings.categories.audience'),
    technology: t('stats.dimensionSettings.categories.technology'),
  }), [t]);

  const handleToggle = (key: string) => {
    setLocalDims((prev) =>
      prev.map((d) => (d.key === key ? { ...d, enabled: !d.enabled } : d))
    );
  };

  const handleSave = () => {
    onChange(localDims);
    setOpen(false);
  };

  const handleReset = () => {
    setLocalDims(getDefaultDimensions(t));
  };

  // Group by category
  const grouped = localDims.reduce(
    (acc, dim) => {
      if (!acc[dim.category]) acc[dim.category] = [];
      acc[dim.category].push(dim);
      return acc;
    },
    {} as Record<string, DimensionConfig[]>
  );

  const enabledCount = localDims.filter((d) => d.enabled).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('stats.dimensionSettings.title')}</span>
          <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 rounded-full">
            {enabledCount}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('stats.dimensionSettings.dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('stats.dimensionSettings.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {Object.entries(grouped).map(([category, dims]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {CATEGORY_LABELS[category] || category}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dims.map((dim) => (
                  <button
                    key={dim.key}
                    onClick={() => handleToggle(dim.key)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all",
                      dim.enabled
                        ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                  >
                    {dim.enabled ? (
                      <Eye className="h-4 w-4 text-indigo-500 shrink-0" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {dim.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                        {dim.property}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "w-9 h-5 rounded-full transition-colors relative shrink-0",
                        dim.enabled
                          ? "bg-indigo-500"
                          : "bg-gray-300 dark:bg-gray-600"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                          dim.enabled ? "left-[18px]" : "left-0.5"
                        )}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-row items-center justify-between border-t pt-4">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            {t('stats.dimensionSettings.resetDefaults')}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              {t('stats.dimensionSettings.cancel')}
            </Button>
            <Button size="sm" onClick={handleSave}>
              {t('stats.dimensionSettings.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}