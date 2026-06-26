import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import axios, { type BaseResponse } from "@utils/axios";
import type { Segment } from "../types/interfaces";

export default function SegmentsSettings() {
  const { domain } = useParams<{ domain: string }>();
  const { t } = useTranslation();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Segment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Segment | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [filters, setFilters] = useState("");

  const fetchSegments = useCallback(async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const res = await axios.get<BaseResponse<Segment[]>>(`/sites/${domain}/segments`);
      setSegments(res.data.data || []);
    } catch {
      toast.error(t("common.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [domain, t]);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  const openCreate = () => {
    setEditTarget(null);
    setName("");
    setDescription("");
    setFilters("[]");
    setDialogOpen(true);
  };

  const openEdit = (seg: Segment) => {
    setEditTarget(seg);
    setName(seg.name);
    setDescription(seg.description ?? "");
    setFilters(seg.filters);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!domain || !name.trim()) return;
    // Validate JSON
    try {
      JSON.parse(filters);
    } catch {
      toast.error("Filters must be valid JSON");
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await axios.patch(`/sites/${domain}/segments/${editTarget.id}`, {
          name: name.trim(),
          description: description.trim() || undefined,
          filters,
        });
      } else {
        await axios.post(`/sites/${domain}/segments`, {
          name: name.trim(),
          description: description.trim() || undefined,
          filters,
        });
      }
      toast.success(t("common.saved"));
      setDialogOpen(false);
      fetchSegments();
    } catch {
      toast.error(t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (seg: Segment) => {
    if (!domain) return;
    try {
      await axios.delete(`/sites/${domain}/segments/${seg.id}`);
      toast.success(t("common.deleted"));
      setDeleteTarget(null);
      setSegments((prev) => prev.filter((s) => s.id !== seg.id));
    } catch {
      toast.error(t("common.deleteFailed"));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            {t("settings.segments.title")}
          </CardTitle>
          <CardDescription className="mt-1">{t("settings.segments.description")}</CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          {t("settings.segments.createSegment")}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
        ) : segments.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            {t("settings.segments.noSegments")}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("settings.segments.name")}</TableHead>
                <TableHead>{t("settings.segments.filters")}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segments.map((seg) => (
                <TableRow key={seg.id}>
                  <TableCell>
                    <div className="font-medium">{seg.name}</div>
                    {seg.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">{seg.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[300px]">
                    {seg.filters}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(seg)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(seg)}
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

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget ? t("settings.segments.edit") : t("settings.segments.createSegment")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("settings.segments.name")}</Label>
              <Input
                placeholder={t("settings.segments.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.segments.description_field")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></Label>
              <Input
                placeholder={t("settings.segments.descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.segments.filters")}</Label>
              <Textarea
                placeholder={t("settings.segments.filtersPlaceholder")}
                value={filters}
                onChange={(e) => setFilters(e.target.value)}
                rows={4}
                className="font-mono text-xs"
              />
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

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.confirmDelete")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("settings.segments.deleteConfirm")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
