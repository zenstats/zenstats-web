import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { LayoutGrid, Pencil, Pin, Trash2 } from "lucide-react";
import axios, { type BaseResponse } from "@utils/axios";
import { useConfirm } from "@/components/confirm-provider";
import type { SavedPanel, CustomQueryConfig } from "../types/interfaces";
import { cn } from "@/lib/utils";

// 从 config JSON 生成一行简短摘要
function configSummary(config: string): string {
  try {
    const cfg = JSON.parse(config) as CustomQueryConfig;
    const parts: string[] = [];
    parts.push(cfg.resultType === "aggregate" ? "aggregate" : "breakdown");
    if (cfg.resultType === "breakdown" && cfg.property) parts.push(cfg.property);
    if (Array.isArray(cfg.metrics) && cfg.metrics.length > 0) parts.push(cfg.metrics.join(", "));
    return parts.join(" · ");
  } catch {
    return "-";
  }
}

export default function PanelsSettings() {
  const { domain } = useParams<{ domain: string }>();
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [panels, setPanels] = useState<SavedPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SavedPanel | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const fetchPanels = useCallback(async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const res = await axios.get<BaseResponse<SavedPanel[]>>(`/sites/${domain}/panels`);
      setPanels(res.data.data || []);
    } catch {
      toast.error(t("common.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [domain, t]);

  useEffect(() => {
    fetchPanels();
  }, [fetchPanels]);

  const openEdit = (panel: SavedPanel) => {
    setEditTarget(panel);
    setName(panel.name);
    setDescription(panel.description ?? "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!domain || !editTarget || !name.trim()) return;
    setSaving(true);
    try {
      await axios.patch(`/sites/${domain}/panels/${editTarget.id}`, {
        name: name.trim(),
        // 始终发送字符串：空串表示清空描述（后端用指针区分“未传/清空”）
        description: description.trim(),
      });
      toast.success(t("common.saved"));
      setDialogOpen(false);
      fetchPanels();
    } catch {
      toast.error(t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (panel: SavedPanel) => {
    if (!domain) return;
    try {
      await axios.patch(`/sites/${domain}/panels/${panel.id}`, { pinned: !panel.pinned });
      setPanels((prev) => prev.map((p) => (p.id === panel.id ? { ...p, pinned: !p.pinned } : p)));
    } catch {
      toast.error(t("common.saveFailed"));
    }
  };

  const handleDelete = async (panel: SavedPanel) => {
    if (!domain) return;
    if (!(await confirm({ description: t("settings.panels.deleteConfirm"), destructive: true }))) return;
    try {
      await axios.delete(`/sites/${domain}/panels/${panel.id}`);
      toast.success(t("common.deleted"));
      setPanels((prev) => prev.filter((p) => p.id !== panel.id));
    } catch {
      toast.error(t("common.deleteFailed"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5" />
          {t("settings.panels.title")}
        </CardTitle>
        <CardDescription className="mt-1">{t("settings.panels.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
        ) : panels.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            {t("settings.panels.empty")}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("settings.panels.name")}</TableHead>
                <TableHead>{t("settings.panels.query")}</TableHead>
                <TableHead className="w-[90px] text-center">{t("settings.panels.pinned")}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {panels.map((panel) => (
                <TableRow key={panel.id}>
                  <TableCell>
                    <div className="font-medium">{panel.name}</div>
                    {panel.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">{panel.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[280px]">
                    {configSummary(panel.config)}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => handleTogglePin(panel)}
                      title={panel.pinned ? t("settings.panels.unpin") : t("settings.panels.pin")}
                      className={cn(
                        "p-1.5 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
                        panel.pinned ? "text-violet-600 dark:text-violet-400" : "text-gray-300 dark:text-gray-600"
                      )}
                    >
                      <Pin className={cn("h-4 w-4", panel.pinned && "fill-current")} />
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(panel)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(panel)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.panels.edit")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("settings.panels.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>
                {t("settings.panels.descriptionField")}{" "}
                <span className="text-muted-foreground text-xs">({t("common.optional")})</span>
              </Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Card>
  );
}
