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
import { Copy, Plus, Trash2, Link } from "lucide-react";
import axios, { type BaseResponse } from "@utils/axios";
import type { SharedLink } from "../types/interfaces";

export default function SharedLinksSettings() {
  const { domain } = useParams<{ domain: string }>();
  const { t } = useTranslation();
  const [links, setLinks] = useState<SharedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SharedLink | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchLinks = useCallback(async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const res = await axios.get<BaseResponse<SharedLink[]>>(`/sites/${domain}/shared-links`);
      setLinks(res.data.data || []);
    } catch {
      toast.error(t("common.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [domain, t]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleCreate = async () => {
    if (!domain || !name.trim()) return;
    setCreating(true);
    try {
      await axios.post(`/sites/${domain}/shared-links`, { name: name.trim(), password: password || undefined });
      toast.success(t("common.created"));
      setDialogOpen(false);
      setName("");
      setPassword("");
      fetchLinks();
    } catch {
      toast.error(t("common.saveFailed"));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (link: SharedLink) => {
    if (!domain) return;
    try {
      await axios.delete(`/sites/${domain}/shared-links/${link.id}`);
      toast.success(t("common.deleted"));
      setDeleteTarget(null);
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
    } catch {
      toast.error(t("common.deleteFailed"));
    }
  };

  const handleCopy = (link: SharedLink) => {
    navigator.clipboard.writeText(link.url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            {t("settings.sharedLinks.title")}
          </CardTitle>
          <CardDescription className="mt-1">{t("settings.sharedLinks.description")}</CardDescription>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          {t("settings.sharedLinks.createLink")}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
        ) : links.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            {t("settings.sharedLinks.noLinks")}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("settings.sharedLinks.name")}</TableHead>
                <TableHead>{t("settings.sharedLinks.url")}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">{link.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[300px]">
                    {link.url}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCopy(link)}
                        title={t("settings.sharedLinks.copyUrl")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {copiedId === link.id && (
                        <span className="text-xs text-green-600">{t("settings.sharedLinks.copied")}</span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(link)}
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

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.sharedLinks.createLink")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("settings.sharedLinks.name")}</Label>
              <Input
                placeholder={t("settings.sharedLinks.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.sharedLinks.password")}</Label>
              <Input
                type="password"
                placeholder={t("settings.sharedLinks.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={creating || !name.trim()}>
              {creating ? t("common.saving") : t("common.create")}
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
            {t("settings.sharedLinks.deleteConfirm")}
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
