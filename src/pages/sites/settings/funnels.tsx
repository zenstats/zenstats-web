import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Filter, ChevronRight, GripVertical, BarChart3 } from "lucide-react";
import axios, { type BaseResponse } from "@utils/axios";
import type { Goal, Funnel, CreateFunnelRequest } from "../types/interfaces";

export default function FunnelsSettings() {
  const { domain } = useParams<{ domain: string }>();
  const navigate = useNavigate();
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [funnelToDelete, setFunnelToDelete] = useState<Funnel | null>(null);
  const [creating, setCreating] = useState(false);
  const { t } = useTranslation();

  // Form state
  const [funnelName, setFunnelName] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<number[]>([]);

  const fetchData = useCallback(async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const [funnelsRes, goalsRes] = await Promise.all([
        axios.get<BaseResponse<Funnel[]>>(`/sites/${domain}/funnels`),
        axios.get<BaseResponse<Goal[]>>(`/sites/${domain}/goals`),
      ]);
      setFunnels(funnelsRes.data.data || []);
      setGoals(goalsRes.data.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error(t('settings.funnels.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!domain) return;

    if (!funnelName.trim()) {
      toast.error(t('settings.funnels.nameRequired'));
      return;
    }

    if (selectedGoals.length < 2) {
      toast.error(t('settings.funnels.stepsRequired'));
      return;
    }

    setCreating(true);
    try {
      const body: CreateFunnelRequest = {
        name: funnelName.trim(),
        steps: selectedGoals.map((goalId) => ({ goal_id: goalId })),
      };

      await axios.post<BaseResponse<Funnel>>(`/sites/${domain}/funnels`, body);
      toast.success(t('settings.funnels.createSuccess'));
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      const message = error?.response?.data?.message || t('settings.funnels.createFailed');
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!domain || !funnelToDelete) return;

    try {
      await axios.delete(`/sites/${domain}/funnels/${funnelToDelete.id}`);
      toast.success(t('settings.funnels.deleteSuccess'));
      setDeleteDialogOpen(false);
      setFunnelToDelete(null);
      fetchData();
    } catch (error: any) {
      const message = error?.response?.data?.message || t('settings.funnels.deleteFailed');
      toast.error(message);
    }
  };

  const resetForm = () => {
    setFunnelName("");
    setSelectedGoals([]);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openDeleteDialog = (funnel: Funnel) => {
    setFunnelToDelete(funnel);
    setDeleteDialogOpen(true);
  };

  const addStep = () => {
    if (selectedGoals.length >= 8) {
      toast.error(t('settings.funnels.maxSteps'));
      return;
    }
    setSelectedGoals([...selectedGoals, 0]);
  };

  const removeStep = (index: number) => {
    if (selectedGoals.length <= 2) {
      toast.error(t('settings.funnels.stepsRequired'));
      return;
    }
    setSelectedGoals(selectedGoals.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, goalId: number) => {
    const newGoals = [...selectedGoals];
    newGoals[index] = goalId;
    setSelectedGoals(newGoals);
  };

  const openAnalysis = (funnelId: number) => {
    if (domain) {
      navigate(`/sites/${domain}/funnel-analysis?funnel=${funnelId}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('settings.funnels.title')}
            </CardTitle>
            <CardDescription>
              {t('settings.funnels.description')}
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog} size="sm" disabled={goals.length < 2}>
            <Plus className="h-4 w-4 mr-2" />
            {t('settings.funnels.addFunnel')}
          </Button>
        </div>
        {goals.length < 2 && (
          <p className="text-sm text-muted-foreground">
            {t('settings.funnels.needGoals')}{" "}
            <button
              onClick={() => navigate(`/sites/${domain}/settings/goals`)}
              className="text-primary hover:underline"
            >
              {t('settings.funnels.createGoalsFirst')}
            </button>
          </p>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : funnels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('settings.funnels.noFunnels')}</p>
            <p className="text-sm">{t('settings.funnels.createFirst')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings.funnels.name')}</TableHead>
                <TableHead>{t('settings.funnels.steps')}</TableHead>
                <TableHead className="w-[140px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funnels.map((funnel) => (
                <TableRow key={funnel.id}>
                  <TableCell className="font-medium">{funnel.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <span>{t('settings.funnels.stepCount', { count: funnel.steps.length })}</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAnalysis(funnel.id)}
                        className="h-8"
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        {t('settings.funnels.analyze')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(funnel)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Create Funnel Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('settings.funnels.createFunnel')}</DialogTitle>
              <DialogDescription>
                {t('settings.funnels.dialogDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="funnel-name">{t('settings.funnels.funnelName')}</Label>
                <Input
                  id="funnel-name"
                  placeholder={t('settings.funnels.funnelNamePlaceholder')}
                  value={funnelName}
                  onChange={(e) => setFunnelName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('settings.funnels.steps')}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addStep}
                    disabled={selectedGoals.length >= 8}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {t('settings.funnels.addStep')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('settings.funnels.stepsHint')}
                </p>

                <div className="space-y-2 mt-3">
                  {selectedGoals.map((goalId, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">
                        {index + 1}
                      </span>
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Select
                        value={goalId.toString()}
                        onValueChange={(v) => updateStep(index, parseInt(v))}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={t('settings.funnels.selectGoal')} />
                        </SelectTrigger>
                        <SelectContent>
                          {goals.map((goal) => (
                            <SelectItem key={goal.id} value={goal.id.toString()}>
                              {goal.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStep(index)}
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t('settings.funnels.cancel')}
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? t('settings.funnels.creating') : t('settings.funnels.createFunnel')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('settings.funnels.deleteTitle')}</DialogTitle>
              <DialogDescription>
                {t('settings.funnels.deleteConfirm', { name: funnelToDelete?.name })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                {t('settings.funnels.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                {t('settings.funnels.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
