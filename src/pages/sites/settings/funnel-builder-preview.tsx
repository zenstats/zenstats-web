import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface GoalLite {
  id: number;
  display_name: string;
}

interface FunnelBuilderPreviewProps {
  goals: GoalLite[];
  selectedGoals: number[]; // 每步目标 id（0 = 未选择）
  stepParents: number[]; // 每步父下标（-1 = 根）
  onReparent: (child: number, newParent: number) => void;
}

// isDescendant 判断 node 是否为 ancestor 的子孙（含多层）。
function isDescendant(stepParents: number[], node: number, ancestor: number): boolean {
  const seen = new Set<number>();
  for (let p = stepParents[node]; p !== -1 && p !== undefined && !seen.has(p); p = stepParents[p]) {
    if (p === ancestor) return true;
    seen.add(p);
  }
  return false;
}

// canReparent 判断能否把 child 挂到 parent 下：不能是自己、不能挂到自己的子孙下（成环）、根不可移动。
export function canReparent(stepParents: number[], child: number, parent: number): boolean {
  if (child === parent) return false;
  if (stepParents[child] === -1) return false; // 单根：根节点不可重新挂载
  if (isDescendant(stepParents, parent, child)) return false;
  return true;
}

// isLinearFunnel 判定：每步的父都是上一步 → 线性；否则树形。
export function isLinearFunnel(stepParents: number[]): boolean {
  return stepParents.every((p, i) => (i === 0 ? p === -1 : p === i - 1));
}

// FunnelBuilderPreview 创建漏斗时的实时结构预览：
// 随选择即时渲染成横向扇形树，自动标注"线性/树形"；节点可拖到另一节点上重新指定父节点。
export default function FunnelBuilderPreview({ goals, selectedGoals, stepParents, onReparent }: FunnelBuilderPreviewProps) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (selectedGoals.length === 0) return null;

  const nameOf = (i: number) => {
    const gid = selectedGoals[i];
    if (!gid) return t("settings.funnels.previewUnselected");
    return goals.find((g) => g.id === gid)?.display_name ?? `#${gid}`;
  };
  const childrenOf = (p: number) => stepParents.map((sp, i) => (sp === p ? i : -1)).filter((i) => i >= 0);
  const roots = stepParents.map((p, i) => (p === -1 ? i : -1)).filter((i) => i >= 0);
  const linear = isLinearFunnel(stepParents);

  const render = (i: number): ReactNode => {
    const kids = childrenOf(i);
    const isRoot = stepParents[i] === -1;
    const droppable = dragging !== null && canReparent(stepParents, dragging, i);
    const isHover = hover === i && droppable;
    return (
      <div key={i} className="flex flex-col items-center">
        {!isRoot && <span className="h-3 w-px bg-border" aria-hidden />}
        <div
          draggable={!isRoot}
          onDragStart={(e) => {
            setDragging(i);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", String(i));
          }}
          onDragEnd={() => {
            setDragging(null);
            setHover(null);
          }}
          onDragOver={(e) => {
            if (droppable) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }
          }}
          onDragEnter={() => setHover(i)}
          onDragLeave={() => setHover((h) => (h === i ? null : h))}
          onDrop={(e) => {
            e.preventDefault();
            const src = Number(e.dataTransfer.getData("text/plain"));
            if (!Number.isNaN(src) && canReparent(stepParents, src, i)) onReparent(src, i);
            setDragging(null);
            setHover(null);
          }}
          className={cn(
            "min-w-[110px] max-w-[150px] rounded-md border px-2 py-1.5 text-center text-xs select-none transition-colors",
            isRoot ? "border-primary bg-primary/10 cursor-default" : "border-border bg-card cursor-grab active:cursor-grabbing",
            dragging === i && "opacity-40",
            isHover && "ring-2 ring-primary border-primary bg-primary/15",
            dragging !== null && !droppable && dragging !== i && "opacity-60",
          )}
          title={isRoot ? t("settings.funnels.previewRootHint") : t("settings.funnels.dragHint")}
        >
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium",
                isRoot ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
          </div>
          <div className={cn("truncate", !selectedGoals[i] && "italic text-muted-foreground")} title={nameOf(i)}>
            {nameOf(i)}
          </div>
        </div>
        {kids.length > 0 && (
          <div className="mt-1 flex items-start gap-4 pt-1 border-t border-border/60">
            {kids.map((k) => render(k))}
          </div>
        )}
      </div>
    );
  };

  return (
    // min-w-0 + max-w-full：作为 grid/flex 子项时不把自身内容宽度上抛，宽树在内部横向滚动
    <div className="rounded-md border border-dashed border-border p-3 bg-muted/30 min-w-0 max-w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{t("settings.funnels.previewTitle")}</span>
        <span
          className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded",
            linear ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" : "bg-primary/15 text-primary",
          )}
        >
          {linear ? t("settings.funnels.linearFunnel") : t("settings.funnels.treeFunnel")}
        </span>
      </div>
      <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
        <div className="flex justify-center gap-6 min-w-max px-1 py-1">{roots.map((r) => render(r))}</div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{t("settings.funnels.dragHint")}</p>
    </div>
  );
}
