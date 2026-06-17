import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate, useParams } from "react-router-dom";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  ChevronDown,
  Settings,
  Code2,
  Link,
  Globe,
  Monitor,
  Layout,
  MapPin,
  ArrowLeftRight,
  BarChart3,
  Laptop,
  Chrome,
  MapIcon,
  Target,
  Layers,
  Filter,
} from "lucide-react";
import i18n from '@/i18n';
import axios, { type BaseResponse } from "@utils/axios";
import qs from "qs";
import dayjs from "dayjs";
import type {
  Site,
  StatsRequest,
  AggregateResponse,
  MainGraphPoint,
  CurrentVisitors as CurrentVisitorsType,
  BreakdownResponse,
} from "../types/interfaces";
import AggregateStats from "./components/aggregate-stats";
import MainGraph from "./components/main-graph";
import BreakdownTable from "./components/breakdown-table";
import CurrentVisitorsComponent from "./components/current-visitors";
import FilterBar from "./components/filter-bar";
import CustomQuery from "./components/custom-query";
import DimensionSettings, {
  type DimensionConfig,
  getDefaultDimensions,
} from "./components/dimension-settings";
import GoalsPanel from "./components/goals-panel";
import PropertiesPanel from "./components/properties-panel";
import FunnelsPanel from "./components/funnels-panel";
import Forbidden from "@components/403";
import { cn } from "@/lib/utils";

const dateFormat = i18n.language === 'zh-CN' ? "YYYY年MM月DD日" : "YYYY-MM-DD";
const shortDateFormat = i18n.language === 'zh-CN' ? "MM月DD日" : "MM-DD";

// Map dimension keys to icons
const DIMENSION_ICONS: Record<string, React.ReactNode> = {
  source: <Globe className="h-4 w-4" />,
  page: <Layout className="h-4 w-4" />,
  entry_page: <ArrowLeftRight className="h-4 w-4" />,
  exit_page: <ArrowLeftRight className="h-4 w-4" />,
  country: <Globe className="h-4 w-4" />,
  region: <MapPin className="h-4 w-4" />,
  city: <MapPin className="h-4 w-4" />,
  browser: <Chrome className="h-4 w-4" />,
  os: <Laptop className="h-4 w-4" />,
  device: <Monitor className="h-4 w-4" />,
  event_name: <BarChart3 className="h-4 w-4" />,
};

interface ParsedFilter {
  property: string;
  label: string;
  value: string;
}

function parseFilters(filtersStr: string | undefined): ParsedFilter[] {
  if (!filtersStr) return [];
  try {
    const parsed = JSON.parse(filtersStr);
    const result: ParsedFilter[] = [];
    // Handle [["is","visit:country",["US"]]] format
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (Array.isArray(item) && item.length >= 3) {
          result.push({
            property: item[1],
            label: item[1].split(":").pop() || item[1],
            value: Array.isArray(item[2]) ? item[2].join(", ") : String(item[2]),
          });
        }
        // Handle ["and", [...]] or ["or", [...]] format
        if (Array.isArray(item) && item.length >= 2 && (item[0] === "and" || item[0] === "or")) {
          for (const sub of item[1]) {
            if (Array.isArray(sub) && sub.length >= 3) {
              result.push({
                property: sub[1],
                label: sub[1].split(":").pop() || sub[1],
                value: Array.isArray(sub[2]) ? sub[2].join(", ") : String(sub[2]),
              });
            }
          }
        }
      }
    }
    return result;
  } catch {
    return [];
  }
}

export default function StatsPage() {
  const navigate = useNavigate();
  const { domain } = useParams();
  const { t } = useTranslation();

  const PERIOD_OPTIONS = useMemo(() => [
    { key: "day", label: t('stats.period.today') },
    { key: "yesterday", label: t('stats.period.yesterday') },
    { key: "realtime", label: t('stats.period.realtime') },
    { key: "p7", label: t('stats.period.last7Days'), separator: true },
    { key: "p14", label: t('stats.period.last14Days') },
    { key: "p30", label: t('stats.period.last30Days') },
  ], [t]);

  const CATEGORY_TABS = useMemo(() => [
    { key: "traffic", label: t('stats.categories.traffic'), icon: <Globe className="h-3.5 w-3.5" /> },
    { key: "page", label: t('stats.categories.page'), icon: <Layout className="h-3.5 w-3.5" /> },
    { key: "audience", label: t('stats.categories.audience'), icon: <MapIcon className="h-3.5 w-3.5" /> },
    { key: "technology", label: t('stats.categories.technology'), icon: <Monitor className="h-3.5 w-3.5" /> },
  ], [t]);

  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectdOptionName, setSelectdOptionName] = useState<string>(t('stats.period.today'));
  const [sites, setSites] = useState<Site[]>([]);
  const [hasAccess, setHasAccess] = useState<'loading' | 'granted' | 'no_access' | 'not_verified'>('loading');
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("traffic");
  const [activePanel, setActivePanel] = useState<"stats" | "goals" | "properties" | "funnels" | "custom-query">("stats");

  // Local metric selection (separate from query to avoid triggering all panels)
  const [activeMetric, setActiveMetric] = useState("visitors");

  // Compare mode: toggle on → auto vs previous period; dropdown to pick another range
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareMode, setCompareMode] = useState<"auto" | "custom">("auto");
  const [compareLabel, setCompareLabel] = useState("");
  const [isCompareDropdownOpen, setIsCompareDropdownOpen] = useState(false);
  const [compareCustomDate, setCompareCustomDate] = useState<Date | undefined>(undefined);
  const [isCompareDatePickerOpen, setIsCompareDatePickerOpen] = useState(false);

  // Dimension settings with localStorage persistence
  const storageKey = `zenstats-dimensions-${domain}`;
  const [dimensions, setDimensions] = useState<DimensionConfig[]>(() => {
    const defaults = getDefaultDimensions(t);
    const defaultsByKey = new Map<string, DimensionConfig>(defaults.map((d) => [d.key, d]));
    const validKeys = new Set(defaults.map((d) => d.key));
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out dimensions that no longer exist, update labels from defaults
          const valid = parsed
            .filter((d: DimensionConfig) => validKeys.has(d.key))
            .map((d: DimensionConfig) => ({
              ...d,
              label: defaultsByKey.get(d.key)?.label ?? d.label,
              property: defaultsByKey.get(d.key)?.property ?? d.property,
            }));
          // Add any new dimensions that weren't in the stored config
          const storedKeys = new Set(valid.map((d: DimensionConfig) => d.key));
          const newDims = defaults.filter((d) => !storedKeys.has(d.key));
          const merged = [...valid, ...newDims];
          if (merged.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(merged));
            return merged;
          }
        }
      }
    } catch {
      // ignore
    }
    return defaults;
  });

  const handleDimensionsChange = (newDims: DimensionConfig[]) => {
    setDimensions(newDims);
    localStorage.setItem(storageKey, JSON.stringify(newDims));
  };

  const [query, setQuery] = useState<StatsRequest>({
    period: "day",
  });

  // Parse current filters
  const activeFilters = useMemo(() => parseFilters(query.filters), [query.filters]);

  // Get enabled dimensions grouped by category
  const enabledDimensions = useMemo(() => {
    return dimensions.filter((d: DimensionConfig) => d.enabled);
  }, [dimensions]);

  const currentCategoryDimensions = useMemo(() => {
    return enabledDimensions.filter((d: DimensionConfig) => d.category === activeCategoryTab);
  }, [enabledDimensions, activeCategoryTab]);

  // Check which categories have enabled dimensions
  const activeCategories = useMemo(() => {
    const cats = new Set<string>(enabledDimensions.map((d: DimensionConfig) => d.category));
    return CATEGORY_TABS.filter((tab) => cats.has(tab.key));
  }, [enabledDimensions, CATEGORY_TABS]);

  const api = useMemo(
    () => ({
      // New aggregate API (replaces /top_stats)
      getAggregate: async (dateRange: StatsRequest) => {
        const { metrics: _metrics, ...params } = dateRange;
        const response = await axios.get<BaseResponse<AggregateResponse>>(
          "/stats/" + domain + "/aggregate",
          { params },
        );
        return response.data;
      },
      // New main-graph API (replaces /curve)
      getMainGraph: async (dateRange: StatsRequest) => {
        const response = await axios.get<BaseResponse<MainGraphPoint[]>>(
          "/stats/" + domain + "/main-graph",
          { params: dateRange },
        );
        return response.data;
      },
      getCurrentVisitors: async (dateRange: StatsRequest) => {
        const response = await axios.get<BaseResponse<CurrentVisitorsType>>(
          "/stats/" + domain + "/current-visitors",
          { params: dateRange },
        );
        return response.data;
      },
      // Breakdown API (unified for all dimensions)
      getBreakdown: async (dateRange: StatsRequest) => {
        const response = await axios.get<BaseResponse<BreakdownResponse>>(
          "/stats/" + domain + "/breakdown",
          { params: dateRange },
        );
        return response.data;
      },
      // Export breakdown as CSV file
      exportBreakdown: async (dateRange: StatsRequest) => {
        const response = await axios.get("/stats/" + domain + "/export", {
          params: dateRange,
          responseType: "blob",
        });
        return response.data;
      },
      // Suggestions for filter autocomplete (prop keys and values)
      getSuggestions: async (filterName: string, searchQuery?: string, period?: string, date?: string) => {
        const params: Record<string, string> = {
          filter_name: filterName,
          period: period || "p30",
        };
        if (searchQuery) params.q = searchQuery;
        if (date) params.date = date;
        const response = await axios.get<BaseResponse<{ value: string; label: string }[]>>(
          "/stats/" + domain + "/suggestions",
          { params },
        );
        return response.data;
      },
      getSiteList: async () => {
        const response = await axios.get<BaseResponse<Site[]>>("/sites");
        return response.data;
      },
    }),
    [domain],
  );

  const fetchAllData = useCallback(() => {
    const q = qs.parse(window.location.search, { ignoreQueryPrefix: true });
    const period = [
      "realtime", "day", "custom", "p7", "p14", "p30",
    ].includes(q.period as string)
      ? (q.period as string)
      : "day";
    const date = q.date as string;
    const from = q.from as string;
    const to = q.to as string;

    const request: StatsRequest = { period };
    if (date) request.date = dayjs(date).format("YYYY-MM-DD");
    if (from) request.from = dayjs(from).format("YYYY-MM-DD");
    if (to) request.to = dayjs(to).format("YYYY-MM-DD");
    request.refresh = dayjs().toDate();
    setQuery(request);
  }, []);

  const handleDayClick = (day: Date) => {
    const { from, to } = selectedDateRange;
    const newRange = { ...selectedDateRange };

    if (!from && !to) {
      newRange.from = day;
    } else if (!from && to) {
      newRange.from = day;
      if (day > to) newRange.to = day;
    } else if (from && !to) {
      newRange.to = day;
      if (day < from) newRange.from = day;
    } else if (from && to) {
      if (day < from) newRange.from = day;
      if (day > to) newRange.to = day;
    }

    setSelectedDateRange(newRange);
  };

  const handleChangeOption = useCallback(
    (option: string) => {
      const now = dayjs().toDate();
      const yesterday = dayjs().subtract(1, "day").toDate();
      let date: Date | undefined;

      if (option === "yesterday") {
        date = yesterday;
        option = "day";
      } else {
        date = now;
      }

      if (option !== "custom") {
        setSelectedDateRange({ from: undefined, to: undefined });
      } else {
        if (dayjs(selectedDateRange.from).isSame(selectedDateRange.to, "day")) {
          date = selectedDateRange.from;
          option = "day";
        }
      }
      const params: StatsRequest = { period: option };
      if (option === "custom") {
        params.from = dayjs(selectedDateRange.from).format("YYYY-MM-DD");
        params.to = dayjs(selectedDateRange.to).format("YYYY-MM-DD");
      } else {
        params.date = dayjs(date).format("YYYY-MM-DD");
      }

      // Preserve current filters when changing date
      setQuery((prev) => ({
        ...params,
        filters: prev.filters,
        refresh: new Date(),
      }));

      const queryString = qs.stringify(params);
      window.history.pushState(
        {},
        "",
        `${window.location.pathname}?${queryString.toString()}`,
      );

      setIsDropdownOpen(false);
    },
    [selectedDateRange, setQuery],
  );

  // Compute primary period length in days (for matching compare range)
  const primaryPeriodDays = useMemo(() => {
    const period = query.period;
    if (period === "day" || period === "yesterday") return 1;
    if (period === "p7") return 7;
    if (period === "p14") return 14;
    if (period === "p30") return 30;
    if (period === "custom" && query.from && query.to) {
      return dayjs(query.to).diff(dayjs(query.from), "day") + 1;
    }
    return 1;
  }, [query.period, query.from, query.to]);

  // Change compare mode: "auto" = previous period, or pick a specific range
  const handleCompareMode = useCallback((mode: "auto" | "custom" | string) => {
    if (mode === "auto") {
      setCompareMode("auto");
      setCompareLabel("");
      setQuery((q) => ({
        ...q,
        compare: "1",
        compare_from: undefined,
        compare_to: undefined,
        refresh: new Date(),
      }));
    } else if (mode === "custom") {
      // Open picker — no pre-selection, user picks freely
      setCompareCustomDate(undefined);
      setIsCompareDatePickerOpen(true);
    }
    setIsCompareDropdownOpen(false);
  }, [setQuery, primaryPeriodDays]);

  // Handle compare custom date: compute full range matching primary period length
  useEffect(() => {
    if (compareCustomDate) {
      const endDate = dayjs(compareCustomDate);
      const startDate = endDate.subtract(primaryPeriodDays - 1, "day");
      const fromStr = startDate.format("YYYY-MM-DD");
      const toStr = endDate.format("YYYY-MM-DD");
      setCompareMode("custom");
      setCompareLabel(`${startDate.format(shortDateFormat)} - ${endDate.format(shortDateFormat)}`);
      setQuery((q) => ({
        ...q,
        compare: "1",
        compare_from: fromStr,
        compare_to: toStr,
        refresh: new Date(),
      }));
      setIsCompareDatePickerOpen(false);
    }
  }, [compareCustomDate, setQuery, primaryPeriodDays]);

  useEffect(() => {
    if (selectedDateRange.from && selectedDateRange.to) {
      if (selectedDateRange.from == selectedDateRange.to) {
        handleChangeOption("day");
      } else {
        handleChangeOption("custom");
      }
      setIsDatePickerOpen(false);
    }
  }, [handleChangeOption, selectedDateRange]);

  useEffect(() => {
    const fetchSiteList = async () => {
      try {
        const response = await api.getSiteList();
        if (response.data) {
          setSites(response.data);
          const found = response.data.some((site) => site.domain === domain);
          if (!found) {
            setHasAccess('no_access');
          } else {
            const verified = response.data.some((site) => site.domain === domain && site.is_verified);
            setHasAccess(verified ? 'granted' : 'not_verified');
          }
        }
      } catch (error) {
        console.error("Failed to fetch site list:", error);
      }
    };
    fetchSiteList();
  }, [domain, api]);

  const handleSelectdOptionName = () => {
    const q = qs.parse(window.location.search, { ignoreQueryPrefix: true });
    const period = q.period as string;
    const date = q.date as string;
    const from = q.from as string;
    const to = q.to as string;

    switch (period) {
      case "day":
        if (dayjs(date).isSame(dayjs(), "day")) {
          setSelectdOptionName(t('stats.period.today'));
        } else {
          setSelectdOptionName(dayjs(date).format(dateFormat));
        }
        break;
      case "yesterday":
        setSelectdOptionName(t('stats.period.yesterday'));
        break;
      case "realtime":
        setSelectdOptionName(t('stats.period.realtime'));
        break;
      case "p7":
        setSelectdOptionName(t('stats.period.last7Days'));
        break;
      case "p14":
        setSelectdOptionName(t('stats.period.last14Days'));
        break;
      case "p30":
        setSelectdOptionName(t('stats.period.last30Days'));
        break;
      case "custom":
        setSelectdOptionName(
          `${dayjs(from).format(shortDateFormat)} - ${dayjs(to).format(shortDateFormat)}`,
        );
        break;
      default:
        setSelectdOptionName(t('stats.period.today'));
    }
  };

  const refreshData = () => {
    setQuery((prev) => ({ ...prev, refresh: new Date() }));
  };

  // Initial data load
  useEffect(() => {
    fetchAllData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update selected option name when query date changes
  useEffect(() => {
    handleSelectdOptionName();
  }, [query.period, query.date, query.from, query.to]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter management
  const handleRemoveFilter = (index: number) => {
    setQuery((prev) => {
      if (!prev.filters) return prev;
      try {
        const parsed = JSON.parse(prev.filters);
        parsed.splice(index, 1);
        return {
          ...prev,
          filters: parsed.length > 0 ? JSON.stringify(parsed) : undefined,
          refresh: new Date(),
        };
      } catch {
        return { ...prev, filters: undefined, refresh: new Date() };
      }
    });
  };

  const handleClearAllFilters = () => {
    setQuery((prev) => ({ ...prev, filters: undefined, refresh: new Date() }));
  };

  // Ensure activeCategoryTab is valid
  useEffect(() => {
    if (activeCategories.length > 0 && !activeCategories.some((t) => t.key === activeCategoryTab)) {
      setActiveCategoryTab(activeCategories[0].key);
    }
  }, [activeCategories, activeCategoryTab]);

  if (hasAccess === 'no_access') return <Forbidden />;

  if (hasAccess === 'not_verified') {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">{t('error.403')}</h1>
        <p className="text-2xl text-gray-700 mb-4">{t('error.siteNotVerified')}</p>
        <p className="text-gray-500 mb-8">{t('error.siteNotVerifiedHint')}</p>
        <Button variant="default" onClick={() => navigate(`/sites/${domain}/verify`)}>
          {t('error.goToVerify')}
        </Button>
      </div>
    );
  }

  if (hasAccess === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-sm text-gray-500">{t('stats.loading')}</div>
          </div>
        </div>
      </div>
    );
  }

  const currentSite = sites.find((site) => site.domain === domain);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-4">
          {/* Domain selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                <Link className="h-4 w-4 text-gray-400" />
                <span>{domain}</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              {(currentSite?.role === "admin" || currentSite?.role === "owner") && (
                <>
                  <DropdownMenuItem
                    onClick={() => navigate(`/sites/${domain}/settings`)}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    {t('stats.siteSettings')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate(`/sites/${domain}/install`)}
                    className="flex items-center gap-2"
                  >
                    <Code2 className="h-4 w-4" />
                    {t('stats.installTrackingCode')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {sites.map((site) => (
                <DropdownMenuItem
                  key={site.domain}
                  onClick={() => navigate(`/sites/${site.domain}/stats`)}
                  className={cn(
                    "flex items-center gap-2",
                    site.domain === domain && "bg-gray-50 dark:bg-gray-800"
                  )}
                >
                  <span className="text-sm">{site.domain}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/sites")}>
                {t('stats.viewAllSites')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Current visitors */}
            <CurrentVisitorsComponent
              domain={domain!}
              query={{ period: "realtime" }}
              api={api.getCurrentVisitors}
            />

            {/* Date picker dialog */}
            <Dialog open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <DialogContent className="sm:max-w-auto w-auto p-0" showCloseButton={false}>
                <DialogHeader className="sr-only">
                  <DialogTitle>{t('stats.selectDateRange')}</DialogTitle>
                </DialogHeader>
                <Calendar
                  mode="range"
                  showOutsideDays={false}
                  numberOfMonths={2}
                  onDayClick={handleDayClick}
                  selected={selectedDateRange}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                />
                <div className="flex items-center justify-end gap-2 p-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsDatePickerOpen(false);
                      setSelectedDateRange({ from: undefined, to: undefined });
                    }}
                  >
                    {t('stats.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (selectedDateRange.from && selectedDateRange.to) {
                        handleChangeOption("custom");
                      }
                      setIsDatePickerOpen(false);
                    }}
                  >
                    {t('stats.confirm')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Compare toggle + mode selector */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  setCompareEnabled((prev) => {
                    const next = !prev;
                    if (next) {
                      setCompareMode("auto");
                      setCompareLabel("");
                      setQuery((q) => ({
                        ...q,
                        compare: "1",
                        compare_from: undefined,
                        compare_to: undefined,
                        refresh: new Date(),
                      }));
                    } else {
                      setQuery((q) => {
                        const { compare, compare_from, compare_to, ...rest } = q as any;
                        return { ...rest, refresh: new Date() };
                      });
                    }
                    return next;
                  });
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border transition-colors",
                  compareEnabled
                    ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 rounded-l-lg"
                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
                )}
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span className="hidden sm:inline">{t('stats.compare.toggle')}</span>
              </button>
              {compareEnabled && (
                <DropdownMenu open={isCompareDropdownOpen} onOpenChange={setIsCompareDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center gap-1 px-2 py-2 text-sm font-medium border border-l-0 transition-colors rounded-r-lg",
                        "bg-white dark:bg-gray-900 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400",
                        "hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                      )}
                    >
                      <span className="text-xs truncate max-w-[120px]">
                        {compareMode === "auto" ? t('stats.compare.previousPeriod') : compareLabel}
                      </span>
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48" align="end">
                    <DropdownMenuItem
                      onClick={() => handleCompareMode("auto")}
                      className={cn(compareMode === "auto" && "bg-gray-50 dark:bg-gray-800")}
                    >
                      {t('stats.compare.previousPeriod')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleCompareMode("custom")}
                      className={cn(compareMode === "custom" && "bg-gray-50 dark:bg-gray-800")}
                    >
                      {t('stats.compare.customRange')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Compare custom date picker dialog — single date, range auto-matches primary period */}
            <Dialog open={isCompareDatePickerOpen} onOpenChange={setIsCompareDatePickerOpen}>
              <DialogContent className="sm:max-w-auto w-auto p-0" showCloseButton={false}>
                <DialogHeader className="sr-only">
                  <DialogTitle>{t('stats.compare.selectCompareRange')}</DialogTitle>
                </DialogHeader>
                <div className="px-3 pt-3 text-sm text-gray-500">
                  {t('stats.compare.pickDateHint', { days: primaryPeriodDays })}
                </div>
                <Calendar
                  mode="single"
                  showOutsideDays={false}
                  onSelect={(day: Date | undefined) => {
                    if (day) setCompareCustomDate(day);
                  }}
                  selected={compareCustomDate}
                  disabled={(date: Date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                />
                <div className="flex items-center justify-end gap-2 p-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCompareDatePickerOpen(false);
                      setCompareCustomDate(undefined);
                    }}
                  >
                    {t('stats.cancel')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Period selector */}
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors",
                    "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700",
                    "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  )}
                >
                  <span>{selectdOptionName}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48" align="end">
                {PERIOD_OPTIONS.map((opt) => (
                  <div key={opt.key}>
                    {opt.separator && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      onClick={() => handleChangeOption(opt.key)}
                      className={cn(
                        query.period === opt.key && "bg-gray-50 dark:bg-gray-800"
                      )}
                    >
                      {opt.label}
                    </DropdownMenuItem>
                  </div>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setIsDatePickerOpen(true);
                    setSelectedDateRange({ from: undefined, to: undefined });
                    setIsDropdownOpen(false);
                  }}
                  className="text-indigo-600 dark:text-indigo-400"
                >
                  {t('stats.period.customRange')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh */}
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshData}
              className="h-9 w-9 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <FilterBar
          filters={activeFilters}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
        />

        {/* Section tabs (Stats / Goals / Properties / Funnels / Custom Query) */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 mt-3 mb-4">
          {([
            { key: "stats", label: t("stats.sidebar.stats"), icon: <BarChart3 className="h-3.5 w-3.5" /> },
            { key: "goals", label: t("stats.sidebar.goals"), icon: <Target className="h-3.5 w-3.5" /> },
            { key: "properties", label: t("stats.sidebar.properties"), icon: <Layers className="h-3.5 w-3.5" /> },
            { key: "funnels", label: t("stats.sidebar.funnels"), icon: <Filter className="h-3.5 w-3.5" /> },
            { key: "custom-query", label: t("stats.sidebar.customQuery"), icon: <Code2 className="h-3.5 w-3.5" /> },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActivePanel(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
                activePanel === tab.key
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-700"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-900/50"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div>
          {/* Stats panel */}
          {activePanel === "stats" && (
            <>
              {/* Dimension settings (inline for stats panel) */}
              <div className="flex items-center justify-end mb-3">
                <DimensionSettings dimensions={dimensions} onChange={handleDimensionsChange} />
              </div>

                {/* Aggregate stats */}
                <div className="mb-4">
                  <AggregateStats
                    query={query}
                    activeMetric={activeMetric}
                    onMetricChange={setActiveMetric}
                    api={api.getAggregate}
                  />
                </div>

                {/* Main graph */}
                <div className="mb-4">
                  <MainGraph
                    query={query}
                    activeMetric={activeMetric}
                    onMetricChange={setActiveMetric}
                    api={api.getMainGraph}
                  />
                </div>

                {/* Breakdown section */}
                <div className="mb-4">
                  {/* Category tab bar */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                      {activeCategories.map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveCategoryTab(tab.key)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
                            activeCategoryTab === tab.key
                              ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-700"
                              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-900/50"
                          )}
                        >
                          {tab.icon}
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Breakdown tables for current category */}
                  {currentCategoryDimensions.length === 0 ? (
                    <div className="text-center py-12 text-sm text-gray-400 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      {t('stats.emptyDimensions')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {currentCategoryDimensions.map((dim: DimensionConfig) => (
                        <BreakdownTable
                          key={dim.key}
                          title={dim.label}
                          keyName={dim.label}
                          limit={50}
                          query={{ ...query, property: dim.property }}
                          setQuery={setQuery}
                          api={api.getBreakdown}
                          exportApi={api.exportBreakdown}
                          icon={DIMENSION_ICONS[dim.key] || <BarChart3 className="h-4 w-4" />}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Goals panel */}
            {activePanel === "goals" && (
              <GoalsPanel
                query={query}
                domain={domain!}
                aggregateApi={api.getAggregate}
              />
            )}

            {/* Properties panel */}
            {activePanel === "properties" && (
              <PropertiesPanel
                query={query}
                domain={domain!}
                breakdownApi={api.getBreakdown}
                exportApi={api.exportBreakdown}
              />
            )}

            {/* Funnels panel */}
            {activePanel === "funnels" && (
              <FunnelsPanel
                query={query}
                domain={domain!}
              />
            )}

            {/* Custom Query panel */}
            {activePanel === "custom-query" && (
              <CustomQuery
                query={query}
                domain={domain!}
                breakdownApi={api.getBreakdown}
                aggregateApi={api.getAggregate}
                exportApi={api.exportBreakdown}
              />
            )}
        </div>

        {/* Footer */}
        <div className="text-center py-6">
          <span className="text-xs text-gray-400">
            {t('stats.footer')}
          </span>
        </div>
      </div>
    </div>
  );
}