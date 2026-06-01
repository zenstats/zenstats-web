import { useState, useEffect, useCallback, useMemo } from "react";
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
  Link,
  Globe,
  Monitor,
  Layout,
  ScreenShare,
  MapPin,
  ArrowLeftRight,
  BarChart3,
  Laptop,
  Chrome,
  Map,
} from "lucide-react";
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
} from "../types/interfaces"; // BreakdownResponse used in api type
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
import Forbidden from "@components/403";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = [
  { key: "day", label: "今日" },
  { key: "yesterday", label: "昨日" },
  { key: "realtime", label: "实时" },
  { key: "p7", label: "最近7天", separator: true },
  { key: "p14", label: "最近14天" },
  { key: "p30", label: "最近30天" },
];

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
  screen_size: <ScreenShare className="h-4 w-4" />,
  event_name: <BarChart3 className="h-4 w-4" />,
};

// Category groupings for tabs
const CATEGORY_TABS = [
  { key: "traffic", label: "流量来源", icon: <Globe className="h-3.5 w-3.5" /> },
  { key: "page", label: "页面", icon: <Layout className="h-3.5 w-3.5" /> },
  { key: "audience", label: "受众", icon: <Map className="h-3.5 w-3.5" /> },
  { key: "technology", label: "技术", icon: <Monitor className="h-3.5 w-3.5" /> },
];

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

  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [queryTime, setQueryTime] = useState<Date>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectdOptionName, setSelectdOptionName] = useState<string>("今日");
  const [sites, setSites] = useState<Site[]>([]);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("traffic");

  // Dimension settings with localStorage persistence
  const storageKey = `zenstats-dimensions-${domain}`;
  const [dimensions, setDimensions] = useState<DimensionConfig[]>(() => {
    const defaults = getDefaultDimensions();
    const validKeys = new Set(defaults.map((d) => d.key));
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out dimensions that no longer exist in AVAILABLE_DIMENSIONS
          const valid = parsed.filter((d: DimensionConfig) => validKeys.has(d.key));
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
  }, [enabledDimensions]);

  const api = useMemo(
    () => ({
      // New aggregate API (replaces /top_stats)
      getAggregate: async (dateRange: StatsRequest) => {
        const response = await axios.get<BaseResponse<AggregateResponse>>(
          "/stats/" + domain + "/aggregate",
          { params: dateRange },
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

      const queryString = qs.stringify(params);
      window.history.pushState(
        {},
        "",
        `${window.location.pathname}?${queryString.toString()}`,
      );

      setIsDropdownOpen(false);
      setQueryTime(new Date());
    },
    [selectedDateRange],
  );

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
          setHasAccess(found);
        }
      } catch (error) {
        console.error("获取站点列表失败:", error);
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
          setSelectdOptionName("今日");
        } else {
          setSelectdOptionName(dayjs(date).format("YYYY年MM月DD日"));
        }
        break;
      case "yesterday":
        setSelectdOptionName("昨日");
        break;
      case "realtime":
        setSelectdOptionName("实时");
        break;
      case "p7":
        setSelectdOptionName("最近7天");
        break;
      case "p14":
        setSelectdOptionName("最近14天");
        break;
      case "p30":
        setSelectdOptionName("最近30天");
        break;
      case "custom":
        setSelectdOptionName(
          `${dayjs(from).format("MM月DD日")} - ${dayjs(to).format("MM月DD日")}`,
        );
        break;
      default:
        setSelectdOptionName("今日");
    }
  };

  const refreshData = () => setQueryTime(new Date());

  useEffect(() => {
    handleSelectdOptionName();
    fetchAllData();
  }, [queryTime, fetchAllData]);

  // Filter management
  const handleRemoveFilter = (index: number) => {
    setQuery((prev) => {
      if (!prev.filters) return prev;
      try {
        const parsed = JSON.parse(prev.filters);
        parsed.splice(index, 1);
        return { ...prev, filters: parsed.length > 0 ? JSON.stringify(parsed) : undefined };
      } catch {
        return { ...prev, filters: undefined };
      }
    });
    setQueryTime(new Date());
  };

  const handleClearAllFilters = () => {
    setQuery((prev) => ({ ...prev, filters: undefined }));
    setQueryTime(new Date());
  };

  // Ensure activeCategoryTab is valid
  useEffect(() => {
    if (activeCategories.length > 0 && !activeCategories.some((t) => t.key === activeCategoryTab)) {
      setActiveCategoryTab(activeCategories[0].key);
    }
  }, [activeCategories, activeCategoryTab]);

  if (hasAccess === false) return <Forbidden />;

  if (hasAccess === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-sm text-gray-500">正在检查访问权限...</div>
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
                    站点设置
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
                查看全部站点
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Dimension settings */}
            <DimensionSettings dimensions={dimensions} onChange={handleDimensionsChange} />

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
                  <DialogTitle>选择日期范围</DialogTitle>
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
                    取消
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
                    确定
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
                  自定义范围
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

        {/* Aggregate stats */}
        <div className="mb-4 mt-3">
          <AggregateStats
            query={query}
            setQuery={setQuery}
            api={api.getAggregate}
          />
        </div>

        {/* Main graph */}
        <div className="mb-4">
          <MainGraph
            query={query}
            setQuery={setQuery}
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
              当前分类下没有启用的维度。点击右上角"维度设置"启用更多维度。
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {currentCategoryDimensions.map((dim: DimensionConfig) => (
                <BreakdownTable
                  key={dim.key}
                  title={dim.label}
                  keyName={dim.label}
                  limit={9}
                  query={{ ...query, property: dim.property }}
                  setQuery={setQuery}
                  api={api.getBreakdown}
                  icon={DIMENSION_ICONS[dim.key] || <BarChart3 className="h-4 w-4" />}
                />
              ))}
            </div>
          )}
        </div>

        {/* Custom Query Section */}
        <div className="mb-4">
          <CustomQuery
            query={query}
            domain={domain!}
            breakdownApi={api.getBreakdown}
            aggregateApi={api.getAggregate}
          />
        </div>

        {/* Footer */}
        <div className="text-center py-6">
          <span className="text-xs text-gray-400">
            由 ZenStats 提供统计服务
          </span>
        </div>
      </div>
    </div>
  );
}