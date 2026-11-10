import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GitMerge,
  Users,
  LogOut,
  TrendingDown,
  Compass,
  ArrowRight,
  X,
  RefreshCw,
  Search,
} from "lucide-react";
import type { StatsRequest, UserFlowsResponse, SankeyNode, SankeyLink } from "../../types/interfaces";

interface UserFlowsPanelProps {
  query: StatsRequest;
  domain: string;
  api: (
    query: StatsRequest,
    extra?: { entry_path?: string; steps?: number; limit?: number },
    signal?: AbortSignal,
  ) => Promise<UserFlowsResponse>;
}

// 节点排版几何信息
interface LayoutNode {
  index: number;
  node: SankeyNode;
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  inValue: number;
  outValue: number;
}

// 连线排版几何信息
interface LayoutLink {
  source: LayoutNode;
  target: LayoutNode;
  value: number;
  sy: number; // 源节点起点 y
  ty: number; // 目标节点终点 y
  width: number; // 连线粗细
  link: SankeyLink;
}

const STEP_COLORS = [
  "hsl(217, 91%, 60%)", // 蓝
  "hsl(142, 71%, 45%)", // 绿
  "hsl(262, 83%, 58%)", // 紫
  "hsl(38, 92%, 50%)",  // 橙黄
  "hsl(340, 75%, 55%)", // 玫红
];

export default function UserFlowsPanel({ query, domain, api }: UserFlowsPanelProps) {
  const { t } = useTranslation();

  const [data, setData] = useState<UserFlowsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [entryPathInput, setEntryPathInput] = useState<string>("");
  const [activeEntryPath, setActiveEntryPath] = useState<string>("");
  const [steps, setSteps] = useState<number>(3);
  const [limit, setLimit] = useState<number>(6);

  // 交互高亮状态
  const [hoveredNodeIndex, setHoveredNodeIndex] = useState<number | null>(null);
  const [hoveredLink, setHoveredLink] = useState<LayoutLink | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(900);
  const chartWidth = Math.max(containerWidth, 800, steps * 220);
  const nodeName = (node: SankeyNode) => node.is_dropoff
    ? t("stats.flows.dropOffNode")
    : node.is_other ? t("stats.flows.otherNode") : node.name;

  // 监听容器宽度自适应
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!domain) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(false);
      setData(null);
      setHoveredLink(null);
      setHoveredNodeIndex(null);
      setTooltipPos(null);
      try {
        const res = await api(query, {
          entry_path: activeEntryPath || undefined, steps, limit,
        }, controller.signal);
        if (!controller.signal.aborted) setData(res);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [domain, query, activeEntryPath, steps, limit, api, revision]);

  const fetchData = useCallback(() => setRevision(value => value + 1), []);

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveEntryPath(entryPathInput.trim());
  };

  const handleClearFilter = () => {
    setEntryPathInput("");
    setActiveEntryPath("");
  };

  const handleQuickDrillDown = (node: SankeyNode) => {
    if (node.is_dropoff || node.is_other) return;
    setEntryPathInput(node.name);
    setActiveEntryPath(node.name);
  };

  // 计算 SVG 桑基图坐标布局
  const layout = useMemo(() => {
    if (!data || !data.nodes || data.nodes.length === 0) {
      return { nodes: [] as LayoutNode[], links: [] as LayoutLink[], maxDepth: 0, height: 420 };
    }

    const { nodes: rawNodes, links: rawLinks } = data;
    const paddingX = 40;
    const paddingY = 48;
    const nodeWidth = Math.min(180, Math.max(120, (chartWidth - paddingX * 2) / (steps * 2.2)));

    // 1. 统计每个节点的输入和输出流量
    const nodeInValues = new Array(rawNodes.length).fill(0);
    const nodeOutValues = new Array(rawNodes.length).fill(0);
    rawLinks.forEach((l) => {
      if (l.source < rawNodes.length) nodeOutValues[l.source] += l.value;
      if (l.target < rawNodes.length) nodeInValues[l.target] += l.value;
    });

    const nodeMaxValues = rawNodes.map((_, idx) =>
      Math.max(nodeInValues[idx], nodeOutValues[idx], 1)
    );

    // 2. 按 depth 分列分组
    const columns: number[][] = [];
    rawNodes.forEach((node, idx) => {
      if (!columns[node.depth]) columns[node.depth] = [];
      columns[node.depth].push(idx);
    });

    const maxDepth = steps - 1;
    const colSpacing = (chartWidth - paddingX * 2 - nodeWidth) / maxDepth;

    // 3. 计算每个节点的位置与高度
    const layoutNodes: LayoutNode[] = new Array(rawNodes.length);
    const minNodeHeight = 32;
    const nodeGap = 12;
    const maxNodes = Math.max(...columns.map(column => column.length));
    const viewHeight = Math.max(440, paddingY * 2 + maxNodes * (minNodeHeight + nodeGap) + 160);
    const innerH = viewHeight - paddingY * 2;
    // One common scale for EVERY column and link. Label padding is separate,
    // so thin flows stay proportional and never spill beyond their node.
    const flowScale = Math.min(...columns.map(indices => {
      const value = indices.reduce((sum, idx) => sum + nodeMaxValues[idx], 0);
      return (innerH - indices.length * minNodeHeight - (indices.length - 1) * nodeGap) / value;
    }));

    columns.forEach((nodeIndices, depth) => {
      const colX = paddingX + depth * colSpacing;
      let currentY = paddingY;

      nodeIndices.forEach((idx) => {
        const val = nodeMaxValues[idx];
        const h = minNodeHeight + val * flowScale;

        layoutNodes[idx] = {
          index: idx,
          node: rawNodes[idx],
          x: colX,
          y: currentY,
          width: nodeWidth,
          height: h,
          value: val,
          inValue: nodeInValues[idx],
          outValue: nodeOutValues[idx],
        };

        currentY += h + nodeGap;
      });
    });

    // 4. 计算连线端点与宽度
    // 维护源节点已使用累加 y，目标节点已使用累加 y
    const sourceCurrentOffset = new Array(rawNodes.length).fill(minNodeHeight / 2);
    const targetCurrentOffset = new Array(rawNodes.length).fill(minNodeHeight / 2);

    const layoutLinks: LayoutLink[] = [];

    // 对 links 排序，保持平直连线顺序
    const sortedLinks = [...rawLinks].sort((a, b) => {
      if (a.source !== b.source) return a.source - b.source;
      return a.target - b.target;
    });

    sortedLinks.forEach((l) => {
      const srcNode = layoutNodes[l.source];
      const tgtNode = layoutNodes[l.target];
      if (!srcNode || !tgtNode) return;

      const linkHeight = l.value * flowScale;

      const sy = srcNode.y + sourceCurrentOffset[l.source] + linkHeight / 2;
      const ty = tgtNode.y + targetCurrentOffset[l.target] + linkHeight / 2;

      sourceCurrentOffset[l.source] += linkHeight;
      targetCurrentOffset[l.target] += linkHeight;

      layoutLinks.push({
        source: srcNode,
        target: tgtNode,
        value: l.value,
        sy,
        ty,
        width: linkHeight,
        link: l,
      });
    });

    // 动态确定 SVG 高度
    let maxY = viewHeight;
    layoutNodes.forEach((n) => {
      if (n.y + n.height + paddingY > maxY) {
        maxY = n.y + n.height + paddingY;
      }
    });

    return {
      nodes: layoutNodes,
      links: layoutLinks,
      maxDepth,
      height: Math.max(viewHeight, maxY),
    };
  }, [data, chartWidth, steps]);

  return (
    <div className="space-y-6">
      {/* 顶部控制栏 */}
      <Card className="border border-gray-200/80 dark:border-gray-800/80 bg-white/50 dark:bg-gray-900/40 backdrop-blur-sm shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* 标题与描述 */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <GitMerge className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {t("stats.flows.title", "用户流向分析 (Sankey)")}
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t(
                  "stats.flows.description",
                  "分析用户在站内的页面流转轨迹与流失流向，发现核心流失环节与热门跳转路径"
                )}
              </p>
              <p className="text-xs text-muted-foreground">{t("stats.flows.scope")}</p>
            </div>

            {/* 控制器组合 */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* 入口页筛选 */}
              <form onSubmit={handleApplyFilter} className="flex items-center relative min-w-[200px] max-w-xs">
                <Search className="h-3.5 w-3.5 absolute left-2.5 text-gray-400" />
                <Input
                  value={entryPathInput}
                  onChange={(e) => setEntryPathInput(e.target.value)}
                  placeholder={t("stats.flows.filterPlaceholder", "指定入口页，如 /pricing")}
                  aria-label={t("stats.flows.entryLabel")}
                  maxLength={2000}
                  pattern="/.*"
                  className="pl-8 pr-7 h-8 text-xs bg-white dark:bg-gray-900"
                />
                {entryPathInput && (
                  <button
                    type="button"
                    aria-label={t("stats.flows.clearFilter")}
                    onClick={handleClearFilter}
                    className="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </form>
              <Button variant="outline" size="sm" className="h-8 text-xs"
                onClick={() => handleApplyFilter()} disabled={entryPathInput.trim() === activeEntryPath}>
                {t("stats.flows.applyFilter")}
              </Button>

              {/* 步数切换 */}
              <div className="flex items-center border border-gray-200 dark:border-gray-800 rounded-md p-0.5 bg-gray-50/50 dark:bg-gray-900/50">
                {[2, 3, 4].map((stepCount) => (
                  <button
                    key={stepCount}
                    aria-pressed={steps === stepCount}
                    onClick={() => setSteps(stepCount)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
                      steps === stepCount
                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-xs"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    {t(`stats.flows.step${stepCount}`, `${stepCount} 步`)}
                  </button>
                ))}
              </div>

              {/* 每步展示条数 */}
              <Select
                value={String(limit)}
                onValueChange={(val) => setLimit(Number(val))}
              >
                <SelectTrigger aria-label={t("stats.flows.topLimit")} className="h-8 text-xs w-[100px] bg-white dark:bg-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">Top 4</SelectItem>
                  <SelectItem value="6">Top 6</SelectItem>
                  <SelectItem value="8">Top 8</SelectItem>
                  <SelectItem value="10">Top 10</SelectItem>
                </SelectContent>
              </Select>

              {/* 刷新 */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs bg-white dark:bg-gray-900"
                onClick={fetchData}
                disabled={loading}
                aria-label={t("stats.flows.refresh")}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* 若过滤了入口页，展示当前过滤标签 */}
          {activeEntryPath && (
            <div className="mt-3 flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800/60">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t("stats.flows.activeFilter", "当前限定起始页")}:
              </span>
              <Badge variant="secondary" className="gap-1 font-mono text-xs">
                {activeEntryPath}
                <button type="button" aria-label={t("stats.flows.clearFilter")} onClick={handleClearFilter}>
                  <X className="h-3 w-3 hover:text-red-500" />
                </button>
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 核心指标统计卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200/80 dark:border-gray-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {t("stats.flows.totalSessions", "触达会话总数")}
              </p>
              <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {loading ? <Skeleton className="h-6 w-16" /> : error ? "—" : (data?.total_sessions?.toLocaleString() ?? 0)}
              </h4>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200/80 dark:border-gray-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {t("stats.flows.dropOffSessions", "中途流失会话")}
              </p>
              <h4 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {loading ? <Skeleton className="h-6 w-16" /> : error ? "—" : (data?.drop_off_sessions?.toLocaleString() ?? 0)}
              </h4>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <LogOut className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200/80 dark:border-gray-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {t("stats.flows.dropOffRate", "平均流失率")}
              </p>
              <h4 className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {loading ? <Skeleton className="h-6 w-16" /> : error ? "—" : `${(data?.drop_off_rate ?? 0).toFixed(1)}%`}
              </h4>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <TrendingDown className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200/80 dark:border-gray-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {t("stats.flows.deepSessions", "深度流转会话")}
              </p>
              <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {loading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  error ? "—" : ((data?.total_sessions ?? 0) - (data?.drop_off_sessions ?? 0)).toLocaleString()
                )}
              </h4>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Compass className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 桑基图主体容器 */}
      <Card className="border border-gray-200/80 dark:border-gray-800/80 shadow-xs overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-900/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-blue-500" />
              {t("stats.flows.diagramTitle", "多步路径流向拓扑")}
            </CardTitle>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" />
                <span>{t("stats.flows.normalPage", "页面节点")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-400 dark:bg-rose-500 inline-block" />
                <span>{t("stats.flows.dropOffLegend", "离开网站 (Exit)")}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 relative" ref={containerRef}>
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-xs text-gray-400">{t("stats.flows.loading", "正在聚合多步页面流向数据...")}</p>
            </div>
          ) : error ? (
            <div role="alert" className="p-12 text-center space-y-3">
              <h4 className="text-sm font-medium">{t("stats.flows.errorTitle")}</h4>
              <p className="text-xs text-muted-foreground">{t("stats.flows.errorDesc")}</p>
              <Button variant="outline" size="sm" onClick={fetchData}>{t("stats.flows.retry")}</Button>
            </div>
          ) : !data || data.nodes.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                <GitMerge className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t("stats.flows.emptyTitle", "暂无流向数据")}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {t(
                  "stats.flows.emptyDesc",
                  "在所选时间范围内未检测到多步页面浏览行为，可尝试扩大时间范围或调整起始入口页"
                )}
              </p>
            </div>
          ) : (
            <div className="relative overflow-x-auto select-none py-2">
              {/* 各步列标题 */}
              <div
                className="flex items-center justify-between px-10 mb-2 border-b border-gray-100/80 dark:border-gray-800/50 pb-2"
                style={{ width: `${chartWidth}px` }}
              >
                {Array.from({ length: steps }).map((_, stepIdx) => (
                  <div key={stepIdx} className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] text-gray-600 dark:text-gray-300 font-mono">
                      {stepIdx + 1}
                    </span>
                    <span>
                      {stepIdx === 0
                        ? t("stats.flows.stepLanding", "第 1 步：着陆页")
                        : t("stats.flows.stepNext", `第 ${stepIdx + 1} 步：后续流向`, { step: stepIdx + 1 })}
                    </span>
                  </div>
                ))}
              </div>

              {/* SVG 桑基图绘图区 */}
              <svg
                width={chartWidth}
                height={layout.height}
                role="img"
                aria-label={t("stats.flows.diagramTitle")}
                className="overflow-visible"
              >
                <defs>
                  {/* 渐变连线 */}
                  {layout.links.map((link, idx) => {
                    const isHovered =
                      hoveredLink === link ||
                      hoveredNodeIndex === link.source.index ||
                      hoveredNodeIndex === link.target.index;
                    const isExit = link.target.node.is_dropoff;
                    const srcColor = STEP_COLORS[link.source.node.depth % STEP_COLORS.length];
                    const tgtColor = isExit ? "hsl(348, 83%, 60%)" : STEP_COLORS[link.target.node.depth % STEP_COLORS.length];

                    return (
                      <linearGradient
                        key={`link-grad-${idx}`}
                        id={`link-grad-${idx}`}
                        gradientUnits="userSpaceOnUse"
                        x1={link.source.x + link.source.width}
                        y1={link.sy}
                        x2={link.target.x}
                        y2={link.ty}
                      >
                        <stop offset="0%" stopColor={srcColor} stopOpacity={isHovered ? 0.75 : 0.35} />
                        <stop offset="100%" stopColor={tgtColor} stopOpacity={isHovered ? 0.75 : 0.35} />
                      </linearGradient>
                    );
                  })}
                </defs>

                {/* 连线绘制 (Links) */}
                <g className="links-layer">
                  {layout.links.map((link, idx) => {
                    const isHovered =
                      hoveredLink === link ||
                      hoveredNodeIndex === link.source.index ||
                      hoveredNodeIndex === link.target.index;

                    const sx = link.source.x + link.source.width;
                    const tx = link.target.x;
                    const mx = (sx + tx) / 2;

                    // 三次贝塞尔曲线：平滑 S 形
                    const pathData = `
                      M ${sx} ${link.sy}
                      C ${mx} ${link.sy}, ${mx} ${link.ty}, ${tx} ${link.ty}
                    `;

                    return (
                      <path
                        key={`link-${idx}`}
                        d={pathData}
                        fill="none"
                        stroke={`url(#link-grad-${idx})`}
                        strokeWidth={isHovered ? link.width + 2 : link.width}
                        strokeLinecap="round"
                        className="transition-all duration-150 cursor-pointer"
                        onMouseEnter={(e) => {
                          setHoveredLink(link);
                          setTooltipPos({ x: e.clientX, y: e.clientY });
                        }}
                        onMouseMove={(e) => {
                          setTooltipPos({ x: e.clientX, y: e.clientY });
                        }}
                        onMouseLeave={() => {
                          setHoveredLink(null);
                          setTooltipPos(null);
                        }}
                      />
                    );
                  })}
                </g>

                {/* 节点绘制 (Nodes) */}
                <g className="nodes-layer">
                  {layout.nodes.map((layoutNode) => {
                    const isExit = layoutNode.node.is_dropoff;
                    const isOther = layoutNode.node.is_other;
                    const isHovered =
                      hoveredNodeIndex === layoutNode.index ||
                      hoveredLink?.source.index === layoutNode.index ||
                      hoveredLink?.target.index === layoutNode.index;

                    const nodeBgColor = isExit
                      ? "hsl(348, 83%, 94%)"
                      : isOther
                      ? "hsl(215, 20%, 92%)"
                      : "hsl(217, 91%, 95%)";
                    const nodeBorderColor = isExit
                      ? "hsl(348, 83%, 60%)"
                      : isOther
                      ? "hsl(215, 16%, 60%)"
                      : STEP_COLORS[layoutNode.node.depth % STEP_COLORS.length];

                    return (
                      <g
                        key={`node-${layoutNode.index}`}
                        transform={`translate(${layoutNode.x}, ${layoutNode.y})`}
                        className={isExit || isOther ? "group" : "cursor-pointer group"}
                        role={isExit || isOther ? undefined : "button"}
                        tabIndex={isExit || isOther ? undefined : 0}
                        aria-label={isExit || isOther ? undefined : `${t("stats.flows.drillDown")}: ${layoutNode.node.name}`}
                        onMouseEnter={() => setHoveredNodeIndex(layoutNode.index)}
                        onMouseLeave={() => setHoveredNodeIndex(null)}
                        onClick={() => handleQuickDrillDown(layoutNode.node)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleQuickDrillDown(layoutNode.node);
                          }
                        }}
                      >
                        {/* 节点外框 */}
                        <rect
                          width={layoutNode.width}
                          height={layoutNode.height}
                          rx={6}
                          fill={nodeBgColor}
                          stroke={nodeBorderColor}
                          strokeWidth={isHovered ? 2 : 1}
                          strokeDasharray={isExit ? "4 3" : undefined}
                          className="dark:opacity-85 transition-all duration-150"
                        />

                        {/* 节点左侧色条徽章 */}
                        <rect
                          x={0}
                          y={0}
                          width={4}
                          height={layoutNode.height}
                          rx={2}
                          fill={nodeBorderColor}
                        />

                        {/* 文本内容 */}
                        <foreignObject
                          x={8}
                          y={0}
                          width={layoutNode.width - 12}
                          height={layoutNode.height}
                        >
                          <div className="h-full flex flex-col justify-center px-1 text-left overflow-hidden">
                            <span
                              className={`text-[11px] font-mono font-medium truncate leading-tight ${
                                isExit
                                  ? "text-rose-700 dark:text-rose-400 font-semibold"
                                  : isOther
                                  ? "text-gray-600 dark:text-gray-400 italic"
                                  : "text-gray-900 dark:text-gray-100"
                              }`}
                              title={nodeName(layoutNode.node)}
                            >
                              {nodeName(layoutNode.node)}
                            </span>
                            {layoutNode.height >= 34 && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-tight mt-0.5">
                                {t("stats.flows.sessionCount", { count: layoutNode.value })}
                              </span>
                            )}
                          </div>
                        </foreignObject>
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Hover Tooltip 浮层 */}
              {hoveredLink && tooltipPos && (
                <div
                  className="fixed z-50 pointer-events-none p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200 space-y-1.5 animate-in fade-in-50"
                  style={{
                    left: `${tooltipPos.x + 16}px`,
                    top: `${tooltipPos.y + 16}px`,
                    maxWidth: "280px",
                  }}
                >
                  <div className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100 pb-1 border-b border-gray-100 dark:border-gray-800">
                    <span className="truncate max-w-[100px] font-mono text-[11px]">{nodeName(hoveredLink.source.node)}</span>
                    <ArrowRight className="h-3 w-3 text-gray-400 shrink-0" />
                    <span className={`truncate max-w-[100px] font-mono text-[11px] ${hoveredLink.target.node.is_dropoff ? "text-rose-500" : ""}`}>
                      {nodeName(hoveredLink.target.node)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="text-gray-500 dark:text-gray-400">{t("stats.flows.sessions", "流转会话数")}:</span>
                    <span className="font-semibold">{hoveredLink.value.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">{t("stats.flows.percentage", "流转占比")}:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {hoveredLink.source.outValue > 0
                        ? `${((hoveredLink.value / hoveredLink.source.outValue) * 100).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 热门流转明细排行榜 */}
      {data && data.links && data.links.length > 0 && (
        <Card className="border border-gray-200/80 dark:border-gray-800/80 shadow-xs">
          <CardHeader className="py-4 px-6 border-b border-gray-100 dark:border-gray-800">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>{t("stats.flows.topPaths", "热门流转明细")}</span>
              <span className="text-xs font-normal text-gray-500">
                {t("stats.flows.transitionCount", { count: data.links.length })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/40 text-gray-500 dark:text-gray-400">
                    <th className="py-2.5 px-4 font-medium">{t("stats.flows.from", "来源页面")}</th>
                    <th className="py-2.5 px-4 font-medium w-8 text-center"></th>
                    <th className="py-2.5 px-4 font-medium">{t("stats.flows.to", "目标页面")}</th>
                    <th className="py-2.5 px-4 font-medium text-right">{t("stats.flows.sessions", "会话数")}</th>
                    <th className="py-2.5 px-4 font-medium text-right">{t("stats.flows.percentage", "流动占比")}</th>
                    <th className="py-2.5 px-4 font-medium text-right">{t("stats.flows.action", "操作")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                  {[...data.links]
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10)
                    .map((link, idx) => {
                      const srcNode = data.nodes[link.source];
                      const tgtNode = data.nodes[link.target];
                      const isExit = tgtNode?.is_dropoff;
                      const pct =
                        data.total_sessions > 0
                          ? ((link.value / data.total_sessions) * 100).toFixed(1)
                          : "0";

                      return (
                        <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-900/40 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-gray-900 dark:text-gray-100 truncate max-w-[220px]">
                            {srcNode && <span className="mr-2 text-muted-foreground">{t("stats.flows.stepLabel", { step: srcNode.depth + 1 })}</span>}
                            {srcNode ? nodeName(srcNode) : link.source_name || "-"}
                          </td>
                          <td className="py-2.5 px-2 text-center text-gray-400">
                            <ArrowRight className="h-3 w-3 inline" />
                          </td>
                          <td className="py-2.5 px-4 font-mono truncate max-w-[220px]">
                            {tgtNode && <span className="mr-2 text-muted-foreground">{t("stats.flows.stepLabel", { step: tgtNode.depth + 1 })}</span>}
                            {isExit ? (
                              <Badge variant="outline" className="text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 bg-rose-50/50 text-[11px]">
                                {t("stats.flows.dropOffNode", "离开网站 (Exit)")}
                              </Badge>
                            ) : (
                              <span className="text-gray-900 dark:text-gray-100">
                                {tgtNode ? nodeName(tgtNode) : link.target_name || "-"}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right font-medium text-gray-900 dark:text-gray-100">
                            {link.value.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-right text-gray-500 dark:text-gray-400">
                            {pct}%
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {!isExit && tgtNode && !tgtNode.is_other && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700"
                                onClick={() => handleQuickDrillDown(tgtNode)}
                              >
                                {t("stats.flows.drillDown", "以此入口")}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
