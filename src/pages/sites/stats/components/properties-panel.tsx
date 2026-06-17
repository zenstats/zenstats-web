import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download, BarChart3, Layers } from "lucide-react";
import type { StatsRequest } from "../../types/interfaces";
import type { BaseResponse } from "@utils/axios";
import axios from "@utils/axios";
import { cn } from "@/lib/utils";

interface PropKeyItem {
  value: string;
  label: string;
}

interface PropertiesPanelProps {
  query: StatsRequest;
  domain: string;
  breakdownApi: (params: StatsRequest) => Promise<BaseResponse<unknown>>;
  exportApi: (params: StatsRequest) => Promise<Blob>;
}

const PROPERTY_OPTIONS = [
  { group: "event", labelKey: "stats.properties.group.event", items: [
    { value: "event:name", labelKey: "stats.properties.dimensions.eventName" },
    { value: "event:page", labelKey: "stats.properties.dimensions.pagePath" },
  ]},
  { group: "visit", labelKey: "stats.properties.group.visit", items: [
    { value: "visit:source", labelKey: "stats.properties.dimensions.source" },
    { value: "visit:country", labelKey: "stats.properties.dimensions.country" },
    { value: "visit:region", labelKey: "stats.properties.dimensions.region" },
    { value: "visit:city", labelKey: "stats.properties.dimensions.city" },
    { value: "visit:browser", labelKey: "stats.properties.dimensions.browser" },
    { value: "visit:os", labelKey: "stats.properties.dimensions.os" },
    { value: "visit:device", labelKey: "stats.properties.dimensions.device" },
    { value: "visit:entry_page", labelKey: "stats.properties.dimensions.entryPage" },
    { value: "visit:exit_page", labelKey: "stats.properties.dimensions.exitPage" },
  ]},
];

const DEFAULT_PROPERTY = "event:page";

export default function PropertiesPanel({ query, domain, breakdownApi, exportApi }: PropertiesPanelProps) {
  const { t } = useTranslation();
  const [property, setProperty] = useState(DEFAULT_PROPERTY);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [hasRun, setHasRun] = useState(false);

  // Custom props state
  const [propKeys, setPropKeys] = useState<PropKeyItem[]>([]);
  const CUSTOM_PROPS_PREFIX = "event:props:";

  // Fetch available custom prop keys
  useEffect(() => {
    if (!domain) return;
    const params: Record<string, string> = {
      filter_name: "prop_key",
      period: query.period || "p30",
    };
    if (query.date) params.date = query.date;
    if (query.from) params.from = query.from;
    if (query.to) params.to = query.to;

    axios.get<BaseResponse<PropKeyItem[]>>("/stats/" + domain + "/suggestions", { params })
      .then((res) => {
        if (res.data?.data && Array.isArray(res.data.data)) {
          setPropKeys(res.data.data);
        }
      })
      .catch(() => {});
  }, [domain, query.period, query.date, query.from, query.to]);

  const isCustomProp = property.startsWith(CUSTOM_PROPS_PREFIX);
  const propKey = isCustomProp ? property.slice(CUSTOM_PROPS_PREFIX.length) : "";

  const fetchData = useCallback(async () => {
    if (!domain) return;
    setLoading(true);
    setHasRun(true);
    try {
      const params: StatsRequest = {
        ...query,
        property,
        metrics: "visitors,events",
        limit: 100,
        refresh: new Date(),
      };
      const res = await breakdownApi(params);
      if (res.data && typeof res.data === "object" && "data" in (res.data as object)) {
        const bdData = res.data as { columns?: string[]; data: Record<string, unknown>[] };
        setData(bdData.data || []);
        if (bdData.data && bdData.data.length > 0) {
          const cols = bdData.columns || Object.keys(bdData.data[0]);
          setColumns(cols.filter((col) => bdData.data?.some((row) => row[col] != null && row[col] !== "")));
        }
      }
    } catch (error) {
      console.error("Failed to fetch properties:", error);
    } finally {
      setLoading(false);
    }
  }, [domain, property, query, breakdownApi]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportCSV = async () => {
    try {
      const params: StatsRequest = {
        ...query,
        property,
        metrics: "visitors,events",
        refresh: new Date(),
      };
      const blob = await exportApi(params);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${domain}_${property}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const formatValue = (value: unknown): string => {
    if (typeof value === "number") return value.toLocaleString();
    if (value === null || value === undefined) return "—";
    return String(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {isCustomProp ? `${t("stats.properties.customProp", "Property")}: ${propKey}` : t("stats.properties.title")}
            </CardTitle>
            <CardDescription>
              {isCustomProp
                ? t("stats.properties.customPropDesc", "Values for custom property")
                : t("stats.properties.description")}
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <Select value={property} onValueChange={(v) => { setProperty(v); setHasRun(false); }}>
            <SelectTrigger className="h-9 text-sm w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_OPTIONS.map((group) => (
                <SelectGroup key={group.group}>
                  <SelectLabel>{t(group.labelKey)}</SelectLabel>
                  {group.items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {t(item.labelKey)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
              {/* Custom Properties group */}
              {propKeys.length > 0 && (
                <SelectGroup key="custom-props">
                  <SelectLabel>{t("stats.properties.group.customProps", "Custom Properties")}</SelectLabel>
                  {propKeys.map((pk) => (
                    <SelectItem key={CUSTOM_PROPS_PREFIX + pk.value} value={CUSTOM_PROPS_PREFIX + pk.value}>
                      {pk.value}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
          {data && data.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 gap-1.5">
              <Download className="h-3.5 w-3.5" />
              {t("stats.properties.exportCsv")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-4 w-1/5" />
              </div>
            ))}
          </div>
        ) : !hasRun ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {t("stats.properties.selectHint")}
          </div>
        ) : data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  {columns.map((col) => (
                    <TableHead key={col} className={col === columns[0] ? "" : "text-right"}>
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
                    {columns.map((col) => (
                      <TableCell
                        key={col}
                        className={cn(
                          col === columns[0]
                            ? "font-medium text-gray-900 dark:text-gray-100"
                            : "text-right tabular-nums text-gray-700 dark:text-gray-300"
                        )}
                      >
                        {formatValue(row[col])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">{t("stats.properties.noData")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
