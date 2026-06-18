import { useState, useRef, useEffect } from "react";
import type { StatsRequest } from "../../types/interfaces";
import type { BaseResponse } from "@utils/axios";
import axios from "@utils/axios";
import { useTranslation } from "react-i18next";
import {
  Globe, Layout, MapPin, Monitor, MousePointerClick,
  Chrome, Laptop, Search, Target, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Filter type definitions
// ---------------------------------------------------------------------------
interface FilterOption {
  key: string;          // dimension name, e.g. "visit:country", "event:props:xxx"
  label: string;
  icon: React.ReactNode;
  /** Which API endpoint to use for value suggestions */
  suggestApi: "breakdown" | "suggestions" | "goals";
  /** Suggestion parameter — property for breakdown, filter_name for suggestions */
  suggestParam: string;
}

interface SuggestionItem {
  value: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface FilterMenuProps {
  domain: string;
  query: StatsRequest;
  onAddFilter: (dimension: string, operator: string, label: string, values: string[]) => void;
}

// ---------------------------------------------------------------------------
// Categorized filter options
// ---------------------------------------------------------------------------
function buildFilterOptions(t: (k: string) => string): { category: string; items: FilterOption[] }[] {
  return [
    {
      category: t('stats.filterMenu.url'),
      items: [
        { key: "event:page",      label: t('stats.filterMenu.page'),       icon: <Layout className="h-3.5 w-3.5 text-emerald-500" />, suggestApi: "breakdown", suggestParam: "event:page" },
        { key: "event:hostname",  label: t('stats.filterMenu.hostname'),   icon: <Layout className="h-3.5 w-3.5 text-emerald-400" />, suggestApi: "breakdown", suggestParam: "event:hostname" },
      ],
    },
    {
      category: t('stats.filterMenu.device'),
      items: [
        { key: "visit:country",   label: t('stats.filterMenu.country'),    icon: <MapPin className="h-3.5 w-3.5 text-red-500" />,  suggestApi: "breakdown", suggestParam: "visit:country" },
        { key: "visit:browser",   label: t('stats.filterMenu.browser'),    icon: <Chrome className="h-3.5 w-3.5 text-orange-500" />, suggestApi: "breakdown", suggestParam: "visit:browser" },
        { key: "visit:os",        label: t('stats.filterMenu.os'),         icon: <Laptop className="h-3.5 w-3.5 text-purple-500" />, suggestApi: "breakdown", suggestParam: "visit:os" },
        { key: "visit:device",    label: t('stats.filterMenu.deviceType'), icon: <Monitor className="h-3.5 w-3.5 text-gray-500" />, suggestApi: "breakdown", suggestParam: "visit:device" },
      ],
    },
    {
      category: t('stats.filterMenu.acquisition'),
      items: [
        { key: "visit:source",    label: t('stats.filterMenu.source'),     icon: <Globe className="h-3.5 w-3.5 text-blue-500" />,   suggestApi: "breakdown", suggestParam: "visit:source" },
      ],
    },
    {
      category: t('stats.filterMenu.behaviour'),
      items: [
        { key: "event:name",      label: t('stats.filterMenu.eventName'),  icon: <MousePointerClick className="h-3.5 w-3.5 text-indigo-500" />, suggestApi: "breakdown", suggestParam: "event:name" },
        { key: "event:goal",      label: t('stats.filterMenu.goal'),       icon: <Target className="h-3.5 w-3.5 text-red-400" />,   suggestApi: "goals",     suggestParam: "" },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function FilterMenu({ domain, query, onAddFilter }: FilterMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const options = buildFilterOptions(t);

  // Selected filter → search dialog
  const [selectedOption, setSelectedOption] = useState<FilterOption | null>(null);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  const handleSelectOption = (opt: FilterOption) => {
    setSelectedOption(opt);
    setSearchDialogOpen(true);
    setOpen(false); // close popover
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Search className="h-3.5 w-3.5" />
            {t('stats.filterMenu.addFilter')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <div className="p-3 border-b">
            <p className="text-sm font-medium">{t('stats.filterMenu.filterBy')}</p>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {options.map((group) => (
              <div key={group.category} className="py-1">
                <p className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {group.category}
                </p>
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => handleSelectOption(item)}
                  >
                    {item.icon}
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Search / select filter values dialog */}
      <SearchFilterDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        option={selectedOption}
        domain={domain}
        query={query}
        onConfirm={(values) => {
          if (selectedOption) {
            const label = selectedOption.label;
            onAddFilter(selectedOption.key, "is", label, values);
          }
          setSearchDialogOpen(false);
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// SearchFilterDialog — search + multi-select combobox for filter values
// ---------------------------------------------------------------------------
interface SearchFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  option: FilterOption | null;
  domain: string;
  query: StatsRequest;
  onConfirm: (values: string[]) => void;
}

function SearchFilterDialog({ open, onOpenChange, option, domain, query, onConfirm }: SearchFilterDialogProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Load suggestions when dialog opens or search changes
  useEffect(() => {
    if (!option || !domain || !open) return;
    setLoading(true);

    const params: Record<string, string> = {
      period: query.period || "p30",
      limit: "100",
    };
    if (query.date) params.date = query.date;
    if (query.from) params.from = query.from;
    if (query.to) params.to = query.to;

    if (option.suggestApi === "suggestions") {
      // Use suggestions API
      params.filter_name = option.suggestParam;
      params.q = search;
      axios.get<BaseResponse<SuggestionItem[]>>(`/stats/${domain}/suggestions`, { params })
        .then((res) => {
          setSuggestions(res.data?.data || []);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    } else if (option.suggestApi === "goals") {
      // Fetch from goals list
      axios.get<BaseResponse<{ id: number; display_name: string; event_name?: string; page_path?: string }[]>>(`/sites/${domain}/goals`)
        .then((res) => {
          const goals = (res.data?.data || [])
            .map((g) => {
              const type = g.event_name ? "event" : "page";
              const suffix = type === "event" ? ` (${g.event_name})` : ` (${g.page_path || ""})`;
              return {
                value: g.display_name,
                label: `${g.display_name}${suffix}`,
              };
            })
            .filter((g) => !search || g.label.toLowerCase().includes(search.toLowerCase()));
          setSuggestions(goals);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    } else {
      // Use breakdown API to get top values
      params.property = option.suggestParam;
      params.metrics = "visitors";
      axios.get<BaseResponse<{ columns: string[]; data: Record<string, unknown>[] }>>(`/stats/${domain}/breakdown`, { params })
        .then((res) => {
          const data = res.data?.data?.data || [];
          const dimCol = (res.data?.data?.columns || [])[0] || "name";
          const items: SuggestionItem[] = data
            .map((row) => ({ value: String(row[dimCol] || ""), label: String(row[dimCol] || "") }))
            .filter((item) => item.value && (!search || item.value.toLowerCase().includes(search.toLowerCase())));
          setSuggestions(items);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }
  }, [option, domain, open, query.period, query.date, query.from, query.to, search]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setSelected(new Set());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const toggleValue = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSelected(next);
  };

  const handleConfirm = () => {
    if (selected.size === 0) {
      // Quick mode: use search text directly (or take the first suggestion)
      const values = search.trim() ? [search.trim()] : (suggestions.length > 0 ? [suggestions[0].value] : []);
      if (values.length > 0) onConfirm(values);
    } else {
      onConfirm(Array.from(selected));
    }
  };

  if (!option) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {option.icon}
            {t('stats.filterMenu.selectTitle', { name: option.label })}
          </DialogTitle>
          <DialogDescription>
            {t('stats.filterMenu.selectDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            ref={inputRef}
            placeholder={t('stats.filterMenu.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />

          <div className="max-h-[240px] overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                {t('stats.filterMenu.loading')}
              </div>
            ) : suggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground gap-2">
                <p>{t('stats.filterMenu.noSuggestions')}</p>
                {search.trim() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onConfirm([search.trim()])}
                  >
                    {t('stats.filterMenu.useExact', { value: search.trim() })}
                  </Button>
                )}
              </div>
            ) : (
              suggestions.map((item) => {
                const isSelected = selected.has(item.value);
                return (
                  <button
                    key={item.value}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left",
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                    )}
                    onClick={() => toggleValue(item.value)}
                  >
                    <span className="flex-1 truncate font-mono text-xs">{item.label}</span>
                    {isSelected && <span className="text-indigo-500 text-xs">{t('stats.filterMenu.selected')}</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t('stats.filterMenu.cancel')}
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            {t('stats.filterMenu.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
