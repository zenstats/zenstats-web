import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Code2,
  Globe,
  LayoutGrid,
  List,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Gauge,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useCallback } from "react";
import axios, { type BaseResponse } from "@utils/axios";
import { isSubAccount } from "@utils/auth";
import { cn } from "@/lib/utils";
import SiteSparkline from "@/components/SiteSparkline";
import { preloadStats } from "@/lib/route-preload";
import TodaySiteStats from "./components/today-stats";
import type { Site } from "./types/interfaces";

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

export default function Sites() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [sites, setSites] = useState([] as Site[]);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const subAccount = isSubAccount();

  const [viewMode, setViewMode] = useState<"card" | "list">(() => {
    return (localStorage.getItem("zenstats-site-view") as "card" | "list") || "card";
  });

  const fetchSites = useCallback(async () => {
    const url = debouncedSearchQuery
      ? `/sites?domain=${encodeURIComponent(debouncedSearchQuery)}`
      : "/sites";
    try {
      const res = await axios.get<BaseResponse<Site[]>>(url);
      if (res.status === 200) {
        setSites(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch sites:", error);
    }
  }, [debouncedSearchQuery]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  // 站点列表之后几乎必然进入统计页：在浏览器空闲时预取 stats chunk（含 recharts），
  // 点击卡片时无需再等待脚本下载。
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => { void preloadStats(); });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => { void preloadStats(); }, 1500);
    return () => window.clearTimeout(id);
  }, []);

  const goToSite = (site: Site) =>
    navigate(site.is_verified ? `/sites/${site.domain}/stats` : `/sites/${site.domain}/verify`);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      {/* Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-border/70">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("sites.title")}
          </h1>
          {sites.length > 0 && (
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-mono font-medium">
              {sites.length}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search input with icon */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t("sites.searchPlaceholder")}
              value={searchQuery}
              className="h-9 bg-card pl-8 pr-8 w-full sm:w-60 text-sm shadow-2xs"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Segmented View Toggle */}
          <div className="inline-flex items-center rounded-lg border border-border/80 bg-muted/50 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setViewMode("card");
                localStorage.setItem("zenstats-site-view", "card");
              }}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "card"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("list");
                localStorage.setItem("zenstats-site-view", "list");
              }}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "list"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {!subAccount && (
            <Button
              variant="default"
              size="sm"
              className="h-9 px-3.5 gap-1.5 shadow-xs"
              onClick={() => navigate("/sites/new")}
            >
              <Plus className="h-4 w-4" />
              <span>{t("sites.addSite")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {sites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 py-16 px-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Globe className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {t("sites.noSites")}
          </p>
          {!subAccount && !searchQuery && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-1.5"
              onClick={() => navigate("/sites/new")}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("sites.addSite")}</span>
            </Button>
          )}
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <Card
              key={site.id}
              onClick={() => goToSite(site)}
              className="cursor-pointer group rounded-2xl border-border/80 bg-card shadow-2xs hover:border-primary/35 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 py-4 gap-3"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-2 px-4">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 dark:bg-primary/15 border border-primary/15 text-primary font-semibold text-xs uppercase transition-colors group-hover:bg-primary/12">
                    {site.domain.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex items-center gap-1.5 text-sm">
                      <span className="truncate font-semibold text-foreground group-hover:text-primary transition-colors">
                        {site.domain}
                      </span>
                      {site.is_verified ? (
                        <span title="Verified" className="inline-flex">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        </span>
                      ) : (
                        <span title="Not verified" className="inline-flex">
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        </span>
                      )}
                    </CardTitle>
                    {site.remark ? (
                      <CardDescription className="mt-0.5 truncate text-xs">
                        {site.remark}
                      </CardDescription>
                    ) : (
                      <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                        {site.is_verified ? "Active" : "Pending verification"}
                      </div>
                    )}
                  </div>
                </div>
                {!subAccount && (
                  <div className="flex items-center gap-0.5 shrink-0 -mr-1.5 -mt-0.5 opacity-75 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10"
                      title={t("performance.title", "Core Web Vitals")}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/sites/${site.domain}/performance`);
                      }}
                    >
                      <Gauge className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-500/10"
                      title={t("heatmap.title", "点击热力图")}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/sites/${site.domain}/heatmap`);
                      }}
                    >
                      <Flame className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                      title={t("sites.installTrackingCode")}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/sites/${site.domain}/install`);
                      }}
                    >
                      <Code2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      disabled={site.role === "viewer"}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                      title={t("sites.siteSettings")}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/sites/${site.domain}/settings/general`);
                      }}
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="px-4 pt-0.5">
                <TodaySiteStats domain={site.domain} />
                <SiteSparkline domain={site.domain} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/80 shadow-2xs overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30 text-[11px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-semibold">Site</th>
                <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Today</th>
                <th className="text-right px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sites.map((site) => (
                <tr
                  key={site.id}
                  onClick={() => goToSite(site)}
                  className="group cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 dark:bg-primary/15 border border-primary/15 text-primary font-semibold text-xs uppercase">
                        {site.domain.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {site.domain}
                          </span>
                          {site.is_verified ? (
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          )}
                        </div>
                        {site.remark && (
                          <div className="text-xs text-muted-foreground truncate">{site.remark}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <TodaySiteStats domain={site.domain} variant="list" />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {!subAccount && (
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10"
                          title={t("performance.title", "Core Web Vitals")}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/sites/${site.domain}/performance`);
                          }}
                        >
                          <Gauge className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-500/10"
                          title={t("heatmap.title", "点击热力图")}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/sites/${site.domain}/heatmap`);
                          }}
                        >
                          <Flame className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                          title={t("sites.installTrackingCode")}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/sites/${site.domain}/install`);
                          }}
                        >
                          <Code2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          disabled={site.role === "viewer"}
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                          title={t("sites.siteSettings")}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/sites/${site.domain}/settings/general`);
                          }}
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
