import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Target, Globe, MousePointerClick } from "lucide-react";
import axios, { type BaseResponse } from "@utils/axios";
import type { Goal, CreateGoalRequest } from "../types/interfaces";

export default function GoalsSettings() {
  const { domain } = useParams<{ domain: string }>();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [creating, setCreating] = useState(false);
  const { t } = useTranslation();

  // Form state
  const [goalType, setGoalType] = useState<"event" | "page">("event");
  const [eventName, setEventName] = useState("");
  const [pagePath, setPagePath] = useState("");
  const [displayName, setDisplayName] = useState("");

  const fetchGoals = useCallback(async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const res = await axios.get<BaseResponse<Goal[]>>(`/sites/${domain}/goals`);
      setGoals(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch goals:", error);
      toast.error(t('apiKeys.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleCreate = async () => {
    if (!domain) return;

    if (!displayName.trim()) {
      toast.error(t('settings.goals.displayNameRequired'));
      return;
    }

    if (goalType === "event" && !eventName.trim()) {
      toast.error(t('settings.goals.eventNameRequired'));
      return;
    }

    if (goalType === "page" && !pagePath.trim()) {
      toast.error(t('settings.goals.pagePathRequired'));
      return;
    }

    setCreating(true);
    try {
      const body: CreateGoalRequest = {
        display_name: displayName.trim(),
      };

      if (goalType === "event") {
        body.event_name = eventName.trim();
      } else {
        body.page_path = pagePath.trim();
      }

      await axios.post<BaseResponse<Goal>>(`/sites/${domain}/goals`, body);
      toast.success(t('settings.goals.createSuccess'));
      setDialogOpen(false);
      resetForm();
      fetchGoals();
    } catch (error: any) {
      const message = error?.response?.data?.message || t('settings.goals.createFailed');
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!domain || !goalToDelete) return;

    try {
      await axios.delete(`/sites/${domain}/goals/${goalToDelete.id}`);
      toast.success(t('settings.goals.deleteSuccess'));
      setDeleteDialogOpen(false);
      setGoalToDelete(null);
      fetchGoals();
    } catch (error) {
      toast.error(t('settings.goals.deleteFailed'));
    }
  };

  const resetForm = () => {
    setGoalType("event");
    setEventName("");
    setPagePath("");
    setDisplayName("");
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openDeleteDialog = (goal: Goal) => {
    setGoalToDelete(goal);
    setDeleteDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {t('settings.goals.title')}
            </CardTitle>
            <CardDescription>
              {t('settings.goals.description')}
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('settings.goals.addGoal')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('settings.goals.noGoals')}</p>
            <p className="text-sm">{t('settings.goals.createFirst')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings.goals.displayName')}</TableHead>
                <TableHead>{t('settings.goals.type')}</TableHead>
                <TableHead>{t('settings.goals.value')}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.map((goal) => (
                <TableRow key={goal.id}>
                  <TableCell className="font-medium">{goal.display_name}</TableCell>
                  <TableCell>
                    {goal.event_name ? (
                      <span className="inline-flex items-center gap-1 text-sm">
                        <MousePointerClick className="h-3.5 w-3.5" />
                        {t('settings.goals.event')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Globe className="h-3.5 w-3.5" />
                        {t('settings.goals.page')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {goal.event_name || goal.page_path}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(goal)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Create Goal Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('settings.goals.createGoal')}</DialogTitle>
              <DialogDescription>
                {t('settings.goals.dialogDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-name">{t('settings.goals.displayName')}</Label>
                <Input
                  id="display-name"
                  placeholder={t('settings.goals.displayNamePlaceholder')}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('settings.goals.goalType')}</Label>
                <RadioGroup
                  value={goalType}
                  onValueChange={(v) => setGoalType(v as "event" | "page")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="event" id="type-event" />
                    <Label htmlFor="type-event" className="cursor-pointer">
                      {t('settings.goals.customEvent')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="page" id="type-page" />
                    <Label htmlFor="type-page" className="cursor-pointer">
                      {t('settings.goals.pageView')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {goalType === "event" ? (
                <div className="space-y-2">
                  <Label htmlFor="event-name">{t('settings.goals.eventName')}</Label>
                  <Input
                    id="event-name"
                    placeholder={t('settings.goals.eventNamePlaceholder')}
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings.goals.eventNameHint')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="page-path">{t('settings.goals.pagePath')}</Label>
                  <Input
                    id="page-path"
                    placeholder={t('settings.goals.pagePathPlaceholder')}
                    value={pagePath}
                    onChange={(e) => setPagePath(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings.goals.pagePathHint')}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t('settings.goals.cancel')}
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? t('settings.goals.creating') : t('settings.goals.createGoal')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('settings.goals.deleteTitle')}</DialogTitle>
              <DialogDescription>
                {t('settings.goals.deleteConfirm', { name: goalToDelete?.display_name })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                {t('settings.goals.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                {t('settings.goals.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
