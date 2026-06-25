import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Shield,
  ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useCallback } from "react";
import axios, { type BaseResponse } from "@utils/axios";
import { isSubAccount } from "@utils/auth";
import SiteSparkline from "@/components/SiteSparkline";
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

  const goToSite = (site: Site) =>
    navigate(site.is_verified ? `/sites/${site.domain}/stats` : `/sites/${site.domain}/verify`);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t("sites.title")}
        </h1>
        <div className="border-b border-gray-200 dark:border-gray-700 mt-3" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Input
            placeholder={t("sites.searchPlaceholder")}
            value={searchQuery}
            className="bg-white dark:bg-gray-900 w-64"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => {
                setViewMode("card");
                localStorage.setItem("zenstats-site-view", "card");
              }}
              className={`p-1.5 transition-colors ${
                viewMode === "card"
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setViewMode("list");
                localStorage.setItem("zenstats-site-view", "list");
              }}
              className={`p-1.5 transition-colors ${
                viewMode === "list"
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
        {!subAccount && (
          <Button variant="default" onClick={() => navigate("/sites/new")}>
            {t("sites.addSite")}
          </Button>
        )}
      </div>

      {/* Sites */}
      {viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <Card
              key={site.id}
              onClick={() => goToSite(site)}
              className="cursor-pointer group hover:-translate-y-0.5 transition-all duration-200 py-4 gap-3"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-2 px-4">
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex items-center gap-1.5 text-sm">
                    <Globe className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="truncate font-medium">{site.domain}</span>
                    {site.is_verified ? (
                      <span title="Verified">
                        <Shield className="h-3 w-3 text-emerald-500 shrink-0" />
                      </span>
                    ) : (
                      <span title="Not verified">
                        <ShieldAlert className="h-3 w-3 text-amber-500 shrink-0" />
                      </span>
                    )}
                  </CardTitle>
                  {site.remark && (
                    <CardDescription className="mt-0.5 truncate text-xs">
                      {site.remark}
                    </CardDescription>
                  )}
                </div>
                {!subAccount && (
                  <div className="flex items-center gap-0.5 shrink-0 -mr-1 -mt-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                      className="h-7 w-7 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
              <CardContent className="px-4">
                <TodaySiteStats domain={site.domain} />
                <SiteSparkline domain={site.domain} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {sites.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">
              {t("sites.noSites")}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Site</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Today</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {sites.map((site) => (
                  <tr
                    key={site.id}
                    onClick={() => goToSite(site)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {site.domain}
                            </span>
                            {site.is_verified ? (
                              <Shield className="h-3 w-3 text-emerald-500 shrink-0" />
                            ) : (
                              <ShieldAlert className="h-3 w-3 text-amber-500 shrink-0" />
                            )}
                          </div>
                          {site.remark && (
                            <div className="text-xs text-gray-500 truncate">{site.remark}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <TodaySiteStats domain={site.domain} variant="list" />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {!subAccount && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                            className="h-7 w-7 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
          )}
        </div>
      )}
    </div>
  );
}
