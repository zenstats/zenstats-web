import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunnelNodeResult } from "../../types/interfaces";

interface FunnelTreeProps {
  nodes: FunnelNodeResult[];
  totalVisitors: number;
}

export interface FlatTreeNode {
  node: FunnelNodeResult;
  depth: number;
  parentName: string | null;
}

// childrenOf 返回某节点的子节点，按访客数降序，便于同级对比。
function childrenOf(nodes: FunnelNodeResult[], id: number): FunnelNodeResult[] {
  return nodes
    .filter((n) => n.parent_step_id === id)
    .slice()
    .sort((a, b) => b.visitors - a.visitors);
}

// flattenTreeDfs 把树按深度优先展开（根→子→孙），附带深度与父名称。
// 供明细表按树结构（而非添加顺序）排列，消除线性顺序带来的歧义。
export function flattenTreeDfs(nodes: FunnelNodeResult[]): FlatTreeNode[] {
  const byId = new Map(nodes.map((n) => [n.step_id, n]));
  const out: FlatTreeNode[] = [];
  const walk = (n: FunnelNodeResult, depth: number) => {
    const parent = n.parent_step_id != null ? byId.get(n.parent_step_id) : undefined;
    out.push({ node: n, depth, parentName: parent ? parent.goal_name : null });
    for (const c of childrenOf(nodes, n.step_id)) walk(c, depth + 1);
  };
  nodes
    .filter((n) => n.is_root || n.parent_step_id == null)
    .forEach((r) => walk(r, 0));
  return out;
}

// isTreeFunnel 判断是否存在分叉：任一非根节点的父不是它按 step_order 的前一个节点。
export function isTreeFunnel(nodes: FunnelNodeResult[]): boolean {
  const sorted = nodes.slice().sort((a, b) => a.step_order - b.step_order);
  return sorted.some((n, i) => i > 0 && !n.is_root && n.parent_step_id !== sorted[i - 1].step_id);
}

// FunnelTree 横向扇形树。百分比口径明确区分：
//   · 边上：相对父节点的转化率，并标出父节点名（"7.9% 相对 Home"）——主指标；
//   · 节点内「占起点」：相对整棵树起点的占比，仅在第 3 层及更深显示
//     （第 2 层的父就是起点，两者相同，不重复展示）。
export default function FunnelTree({ nodes, totalVisitors }: FunnelTreeProps) {
  const { t } = useTranslation();
  if (!nodes || nodes.length === 0) return null;

  const roots = nodes.filter((n) => n.is_root || n.parent_step_id == null);

  const renderSubtree = (n: FunnelNodeResult, depth: number, parentName: string | null): ReactNode => {
    const kids = childrenOf(nodes, n.step_id);
    const share = totalVisitors > 0 ? (n.visitors / totalVisitors) * 100 : 0;
    return (
      <div key={n.step_id} className="flex flex-col items-center">
        {/* 边：相对父节点的转化率（标明基准） */}
        {!n.is_root && (
          <div className="flex flex-col items-center mb-1">
            <span className="h-4 w-px bg-border" aria-hidden />
            <div className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-center leading-tight">
              <span className="font-mono text-sm font-bold text-primary">{n.conversion_rate.toFixed(1)}%</span>
              <span className="ml-1 text-[10px] text-muted-foreground">
                {t("funnelAnalysis.treeEdgeOf", { parent: parentName ?? "" })}
              </span>
            </div>
            <span className="h-3 w-px bg-border" aria-hidden />
          </div>
        )}

        {/* 节点卡片 */}
        <div
          className={`min-w-[160px] max-w-[200px] rounded-lg border px-3 py-2 text-center ${
            n.is_root ? "border-primary bg-primary/10" : "border-border bg-card"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium shrink-0 ${
                n.is_root ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {n.step_order}
            </span>
            {n.is_root && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                {t("funnelAnalysis.treeRoot")}
              </span>
            )}
          </div>
          <div className="text-sm font-medium truncate" title={n.goal_name}>{n.goal_name}</div>
          <div className="font-mono text-lg font-semibold leading-tight">
            {n.visitors.toLocaleString()}
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">{t("funnelAnalysis.visitors")}</span>
          </div>
          {/* 占起点：仅第 3 层及更深展示，避免与相对父重复 */}
          {depth >= 2 && (
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              {t("funnelAnalysis.treeShareOfRoot", { pct: share.toFixed(1) })}
            </div>
          )}
          {!n.is_root && n.drop_off > 0 && (
            <div className="mt-0.5 text-[10px] text-red-500">
              {t("funnelAnalysis.treeDropOff", { n: n.drop_off.toLocaleString() })}
            </div>
          )}
        </div>

        {/* 子树：并排 */}
        {kids.length > 0 && (
          <div className="mt-1 flex items-start gap-6 pt-1 border-t border-border/60">
            {kids.map((k) => renderSubtree(k, depth + 1, n.goal_name))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* 图例：说明两种百分比的口径 */}
      <p className="mb-3 text-[11px] text-muted-foreground">{t("funnelAnalysis.treeLegend")}</p>
      <div className="overflow-x-auto pb-2">
        <div className="flex justify-center gap-8 min-w-max px-2">
          {roots.map((r) => renderSubtree(r, 0, null))}
        </div>
      </div>
    </div>
  );
}
