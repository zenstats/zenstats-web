import { X, Globe, Layout, MapPin, Monitor, MousePointerClick, ArrowLeftRight, Chrome, Laptop, Palette, Tag, Target } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Filter {
  label: string;
  dimension: string;
  operator: string;
  value: string;
}

interface FilterBarProps {
  filters: Filter[];
  onRemove: (index: number) => void;
  onClearAll: () => void;
}

function filterIcon(dimension: string) {
  if (dimension.startsWith("event:props:")) return <Tag className="h-3 w-3 text-amber-500" />;
  if (dimension === "event:goal") return <Target className="h-3 w-3 text-red-500" />;
  if (dimension === "event:page") return <Layout className="h-3 w-3 text-emerald-500" />;
  if (dimension === "event:name") return <MousePointerClick className="h-3 w-3 text-indigo-500" />;
  if (dimension === "visit:source" || dimension === "visit:referrer") return <Globe className="h-3 w-3 text-blue-500" />;
  if (dimension === "visit:country" || dimension === "visit:region" || dimension === "visit:city") return <MapPin className="h-3 w-3 text-red-500" />;
  if (dimension === "visit:browser" || dimension === "visit:browser_version") return <Chrome className="h-3 w-3 text-orange-500" />;
  if (dimension === "visit:os" || dimension === "visit:os_version") return <Laptop className="h-3 w-3 text-purple-500" />;
  if (dimension === "visit:device") return <Monitor className="h-3 w-3 text-gray-500" />;
  if (dimension === "visit:entry_page" || dimension === "visit:exit_page") return <ArrowLeftRight className="h-3 w-3 text-teal-500" />;
  if (dimension === "visit:screen_size") return <Palette className="h-3 w-3 text-pink-500" />;
  return <Tag className="h-3 w-3 text-gray-400" />;
}

function operatorLabel(op: string): string {
  switch (op) {
    case "is_not": return "≠";
    case "contains": return "⊃";
    case "not_contains": return "⊅";
    default: return "=";
  }
}

export default function FilterBar({ filters, onRemove, onClearAll }: FilterBarProps) {
  const { t } = useTranslation();
  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filters.map((filter, index) => (
        <div
          key={`${filter.dimension}:${filter.value}-${index}`}
          className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 text-xs font-medium bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          {filterIcon(filter.dimension)}
          <span className="text-gray-500 dark:text-gray-400 text-[11px]">{filter.label}</span>
          <span className="text-gray-300 dark:text-gray-600">{operatorLabel(filter.operator)}</span>
          <span className="max-w-[120px] truncate">{filter.value}</span>
          <button
            onClick={() => onRemove(index)}
            className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 underline"
        >
          {t('stats.filterBar.clearAll')}
        </button>
      )}
    </div>
  );
}