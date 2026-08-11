import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import GridLayout, { WidthProvider, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import type { BaseResponse } from "@utils/axios";
import axios from "@utils/axios";
import type {
  StatsRequest,
  SavedPanel,
  CustomQueryConfig,
  QueryV2Request,
  QueryV2Response,
  AggregateMetric,
} from "@/pages/sites/types/interfaces";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Pin, GripVertical, Pencil, Check, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const Grid = WidthProvider(GridLayout);

interface PinnedPanelsProps {
  domain: string;
  query: StatsRequest;
  queryV2Api: (req: QueryV2Request) => Promise<BaseResponse<QueryV2Response>>;
}

const COLS = 12;
const ROW_HEIGHT = 56;
const HOME_ROW_LIMIT = 8;

// 把维度/指标列名美化成更易读的标签。
function prettify(col: string): string {
  let s = col.replace(/^event:props:/, "").replace(/^event:/, "").replace(/^visit:/, "");
  s = s.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// 由保存的配置构建 QueryV2 请求（复用当前看板的时间范围）。
function buildRequest(cfg: CustomQueryConfig, base: StatsRequest): QueryV2Request {
  const valid = (cfg.filters || []).filter((f) => f.value && f.value.trim());
  let filters: unknown | undefined;
  if (valid.length === 1) {
    const f = valid[0];
    filters = [[f.operator, f.property, [f.value.trim()]]];
  } else if (valid.length > 1) {
    filters = ["and", valid.map((f) => [f.operator, f.property, [f.value.trim()]])];
  }

  const dimensions = cfg.resultType === "breakdown" && cfg.property
    ? [cfg.property, cfg.property2].filter((d): d is string => !!d)
    : [];
  const orderBy: [string, string][] = [];
  if (cfg.orderByMetric && cfg.orderByMetric !== "none") {
    orderBy.push([cfg.orderByMetric, cfg.orderByDir || "desc"]);
  }

  return {
    period: base.period,
    from: base.from,
    to: base.to,
    date: base.date,
    metrics: cfg.metrics && cfg.metrics.length > 0 ? cfg.metrics : ["visitors"],
    dimensions,
    filters,
    order_by: orderBy.length > 0 ? orderBy : undefined,
    limit: cfg.resultType === "breakdown" ? HOME_ROW_LIMIT : (cfg.limit || HOME_ROW_LIMIT),
    offset: 0,
  };
}

function PinnedPanelCard({
  panel,
  query,
  queryV2Api,
  editing,
}: {
  panel: SavedPanel;
  query: StatsRequest;
  queryV2Api: PinnedPanelsProps["queryV2Api"];
  editing: boolean;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Record<string, string | number>[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [aggregate, setAggregate] = useState<Record<string, AggregateMetric> | null>(null);
  const [error, setError] = useState(false);

  const run = useCallback(async () => {
    let cfg: CustomQueryConfig;
    try {
      cfg = JSON.parse(panel.config) as CustomQueryConfig;
    } catch {
      setError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const res = await queryV2Api(buildRequest(cfg, query));
      const data = res.data;
      if (cfg.resultType === "aggregate" && data?.results) {
        setAggregate(data.results);
        setRows(null);
      } else if (data?.data) {
        setRows(data.data);
        setAggregate(null);
        if (data.data.length > 0) {
          setColumns(data.columns || Object.keys(data.data[0]));
        }
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel.config, query.period, query.from, query.to, query.date, queryV2Api]);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <div className="h-full flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      {/* Header (drag handle in edit mode) */}
      <div
        className={cn(
          "panel-drag-handle flex items-center gap-1.5 px-3.5 py-2.5 border-b border-gray-100 dark:border-gray-800 shrink-0",
          editing && "cursor-move bg-gray-50/60 dark:bg-gray-800/40"
        )}
      >
        {editing && <GripVertical className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
        <Pin className="h-3.5 w-3.5 text-violet-500 shrink-0" />
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{panel.name}</span>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3 flex-1 overflow-auto">
        {loading ? (
          <div className="space-y-2.5 py-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <Skeleton className="h-3.5 flex-1 max-w-[60%]" />
                <Skeleton className="h-3.5 w-12" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-xs text-muted-foreground py-6 text-center">{t("stats.panels.noResults")}</div>
        ) : aggregate ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
            {Object.entries(aggregate).map(([key, metric]) => (
              <div key={key}>
                <div className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium truncate">
                  {prettify(key)}
                </div>
                <div className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
                  {typeof metric.value === "number" ? metric.value.toLocaleString() : metric.value}
                </div>
                {metric.change !== null && metric.change !== undefined && (
                  <div className={cn("text-[11px] font-medium mt-0.5", metric.change >= 0 ? "text-green-600" : "text-red-600")}>
                    {metric.change >= 0 ? "+" : ""}{metric.change.toFixed(1)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : rows && rows.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 dark:text-gray-500">
                {columns.map((col, ci) => (
                  <th key={col} className={cn("font-medium pb-2 px-1 whitespace-nowrap", ci === 0 ? "text-left" : "text-right")}>
                    {prettify(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, HOME_ROW_LIMIT).map((row, idx) => (
                <tr key={idx} className="border-t border-gray-50 dark:border-gray-800/60">
                  {columns.map((col, ci) => (
                    <td
                      key={col}
                      className={cn(
                        "py-1.5 px-1",
                        ci === 0
                          ? "text-left font-medium text-gray-800 dark:text-gray-200 max-w-[240px] truncate"
                          : "text-right text-gray-600 dark:text-gray-400 tabular-nums whitespace-nowrap"
                      )}
                      title={ci === 0 ? String(row[col] ?? "") : undefined}
                    >
                      {typeof row[col] === "number" ? (row[col] as number).toLocaleString() : String(row[col] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-xs text-muted-foreground py-6 text-center">{t("stats.panels.noResults")}</div>
        )}
      </div>
    </div>
  );
}

export default function PinnedPanels({ domain, query, queryV2Api }: PinnedPanelsProps) {
  const { t } = useTranslation();
  const [panels, setPanels] = useState<SavedPanel[]>([]);
  const [editing, setEditing] = useState(false);
  const [layout, setLayout] = useState<Layout[]>([]);
  const savedLayoutRef = useRef<Record<string, Layout>>({});

  useEffect(() => {
    if (!domain) return;
    axios
      .get<BaseResponse<SavedPanel[]>>(`/sites/${domain}/panels`, { params: { pinned: "true" } })
      .then((res) => setPanels(res.data.data || []))
      .catch(() => {});
  }, [domain]);

  // 由面板的已保存布局（或默认排布）构建网格布局
  useEffect(() => {
    const next: Layout[] = panels.map((panel, idx) => {
      let box: { x: number; y: number; w: number; h: number } | null = null;
      if (panel.layout) {
        try {
          const parsed = JSON.parse(panel.layout);
          if (parsed && typeof parsed.w === "number" && typeof parsed.h === "number") box = parsed;
        } catch {
          /* ignore */
        }
      }
      const item: Layout = box
        ? { i: String(panel.id), x: box.x, y: box.y, w: box.w, h: box.h }
        : { i: String(panel.id), x: (idx % 2) * 6, y: Math.floor(idx / 2) * 5, w: 6, h: 5 };
      return { ...item, minW: 3, minH: 3 };
    });
    setLayout(next);
    const map: Record<string, Layout> = {};
    next.forEach((l) => (map[l.i] = l));
    savedLayoutRef.current = map;
  }, [panels]);

  // 拖拽/缩放结束后，把发生变化的面板布局写回后端
  const persistLayout = useCallback(
    (current: Layout[]) => {
      if (!domain) return;
      for (const item of current) {
        const prev = savedLayoutRef.current[item.i];
        if (prev && prev.x === item.x && prev.y === item.y && prev.w === item.w && prev.h === item.h) continue;
        savedLayoutRef.current[item.i] = item;
        axios
          .patch(`/sites/${domain}/panels/${item.i}`, {
            layout: JSON.stringify({ x: item.x, y: item.y, w: item.w, h: item.h }),
          })
          .catch(() => {});
      }
    },
    [domain]
  );

  const hasPanels = panels.length > 0;
  const gridChildren = useMemo(
    () =>
      panels.map((panel) => (
        <div key={String(panel.id)}>
          <PinnedPanelCard panel={panel} query={query} queryV2Api={queryV2Api} editing={editing} />
        </div>
      )),
    [panels, query, queryV2Api, editing]
  );

  if (!hasPanels) return null;

  return (
    <section className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <LayoutGrid className="h-3.5 w-3.5" />
          {t("stats.panels.homeTitle")}
          <span className="text-gray-400 font-normal normal-case">({panels.length})</span>
        </div>
        <Button
          variant={editing ? "default" : "outline"}
          size="sm"
          onClick={() => setEditing((v) => !v)}
          className="h-8 px-3 text-xs"
        >
          {editing ? <Check className="h-3.5 w-3.5 mr-1" /> : <Pencil className="h-3.5 w-3.5 mr-1" />}
          {editing ? t("stats.panels.doneEdit") : t("stats.panels.editLayout")}
        </Button>
      </div>

      {editing && (
        <div className="text-xs text-muted-foreground mb-2">{t("stats.panels.editHint")}</div>
      )}

      <Grid
        className="[&_.react-grid-item.react-grid-placeholder]:!bg-violet-200/60 [&_.react-grid-item.react-grid-placeholder]:!rounded-xl"
        layout={layout}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        margin={[16, 16]}
        isDraggable={editing}
        isResizable={editing}
        draggableHandle=".panel-drag-handle"
        onLayoutChange={(l) => setLayout(l)}
        onDragStop={(l) => persistLayout(l)}
        onResizeStop={(l) => persistLayout(l)}
      >
        {gridChildren}
      </Grid>
    </section>
  );
}
