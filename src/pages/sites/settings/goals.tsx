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
import { Plus, Trash2, Target, Globe, MousePointerClick, Tags, Sparkles } from "lucide-react";
import axios, { type BaseResponse } from "@utils/axios";
import ComboBoxCreate from "@/components/ui/combobox-create";
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
  const [customProps, setCustomProps] = useState<Record<string, string>>({});

  // Cached prop keys (fetched once when dialog opens)
  const [cachedPropKeys, setCachedPropKeys] = useState<{ value: string; label: string }[]>([]);
  const [propKeysLoading, setPropKeysLoading] = useState(false);

  // Auto-discovered event names (not yet configured as goals)
  const [discoveredEvents, setDiscoveredEvents] = useState<string[]>([]);
  const [discoveringEvents, setDiscoveringEvents] = useState(false);
  const [showAllDiscovered, setShowAllDiscovered] = useState(false);
  const [dismissedDiscovery, setDismissedDiscovery] = useState(false);
  const DISCOVERED_PREVIEW_COUNT = 8;

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

  // Preload prop keys when dialog opens (fetched once, cached)
  useEffect(() => {
    if (!dialogOpen || !domain) return;
    setPropKeysLoading(true);
    axios.get<BaseResponse<{ value: string; label: string }[]>>(
      `/stats/${domain}/suggestions`,
      { params: { filter_name: "prop_key", period: "p30", q: "" } }
    )
      .then((res) => setCachedPropKeys(res.data?.data || []))
      .catch(() => setCachedPropKeys([]))
      .finally(() => setPropKeysLoading(false));
  }, [dialogOpen, domain]);

  // Auto-discover existing events when dialog opens
  useEffect(() => {
    if (!dialogOpen || !domain) return;
    setDiscoveringEvents(true);
    axios.get<BaseResponse<{ columns: string[]; data: Record<string, unknown>[] }>>(
      `/stats/${domain}/breakdown`,
      { params: { property: "event:name", period: "p30", limit: "50", metrics: "events" } }
    )
      .then((res) => {
        const rows = res.data?.data?.data || [];
        const existingGoalNames = new Set(goals.map((g) => g.event_name));
        const names: string[] = [];
        for (const row of rows) {
          const name = String(row.name || "").trim();
          if (name && name !== "pageview" && !existingGoalNames.has(name)) {
            names.push(name);
          }
        }
        setDiscoveredEvents(names);
      })
      .catch(() => setDiscoveredEvents([]))
      .finally(() => setDiscoveringEvents(false));
  }, [dialogOpen, domain]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuickAddEvent = (name: string) => {
    setDisplayName(name);
    setEventName(name);
    setGoalType("event");
  };


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

      const props: Record<string, string> = {};
      for (const [k, v] of Object.entries(customProps)) {
        if (k.trim()) props[k.trim()] = v;
      }
      if (Object.keys(props).length > 0) {
        body.custom_props = props;
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
    } catch (error: any) {
      const message = error?.response?.data?.message || t('settings.goals.deleteFailed');
      toast.error(message);
    }
  };

  const resetForm = () => {
    setGoalType("event");
    setEventName("");
    setPagePath("");
    setDisplayName("");
    setCustomProps({});
    setDiscoveredEvents([]);
    setShowAllDiscovered(false);
    setDismissedDiscovery(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openDeleteDialog = (goal: Goal) => {
    setGoalToDelete(goal);
    setDeleteDialogOpen(true);
  };

  const toggleCustomPropKey = (key: string) => {
    setCustomProps((prev) => {
      if (key in prev) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: "" };
    });
  };

  const updateCustomPropValue = (key: string, value: string) => {
    setCustomProps((prev) => ({ ...prev, [key]: value }));
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
                <TableHead>{t('settings.goals.customProps')}</TableHead>
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
                    {goal.custom_props && Object.keys(goal.custom_props).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(goal.custom_props).map(([k, v]) => (
                          <span
                            key={k}
                            className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground"
                          >
                            {k}:{v}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('settings.goals.createGoal')}</DialogTitle>
              <DialogDescription>
                {t('settings.goals.dialogDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Auto-discovered events banner */}
              {discoveringEvents ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  {t('settings.goals.discovering')}
                </div>
              ) : !dismissedDiscovery && discoveredEvents.length > 0 && (
                <div className="border rounded-lg p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" />
                      {t('settings.goals.discoveredTitle', { count: discoveredEvents.length })}
                    </p>
                    <button
                      type="button"
                      onClick={() => setDismissedDiscovery(true)}
                      className="p-0.5 rounded hover:bg-indigo-200/50 dark:hover:bg-indigo-800/50 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(showAllDiscovered ? discoveredEvents : discoveredEvents.slice(0, DISCOVERED_PREVIEW_COUNT)).map((name) => (
                      <button
                        key={name}
                        type="button"
                        className="px-2 py-0.5 text-xs font-mono rounded bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors"
                        onClick={() => handleQuickAddEvent(name)}
                      >
                        + {name}
                      </button>
                    ))}
                  </div>
                  {discoveredEvents.length > DISCOVERED_PREVIEW_COUNT && (
                    <button
                      type="button"
                      className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline"
                      onClick={() => setShowAllDiscovered(!showAllDiscovered)}
                    >
                      {showAllDiscovered
                        ? t('settings.goals.showLess')
                        : t('settings.goals.showAll', { remaining: discoveredEvents.length - DISCOVERED_PREVIEW_COUNT })}
                    </button>
                  )}
                </div>
              )}

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
                  <ComboBoxCreate
                    value={eventName}
                    onChange={setEventName}
                    placeholder={t('settings.goals.eventNamePlaceholder')}
                    fetchSuggestions={async (q) => {
                      if (!domain) return [];
                      try {
                        const res = await axios.get<BaseResponse<{ columns: string[]; data: Record<string, unknown>[] }>>(
                          `/stats/${domain}/breakdown`,
                          { params: { property: "event:name", period: "p30", limit: "20", metrics: "events" } }
                        );
                        const rows = res.data?.data?.data || [];
                        return rows
                          .map((r) => ({ value: String(r.name || ""), label: String(r.name || "") }))
                          .filter((s) => s.value && s.value !== "pageview" && (!q || s.value.toLowerCase().includes(q.toLowerCase())));
                      } catch { return []; }
                    }}
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

              {/* Custom Properties — key ComboBox (from cache, creatable) + value inputs */}
              <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                <Label className="flex items-center gap-1.5 text-sm font-medium mb-1">
                  <Tags className="h-3.5 w-3.5" />
                  {t('settings.goals.customProps')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.goals.customPropsHint')}
                </p>

                {/* Key selector — suggests from cached keys, creatable for new keys */}
                <ComboBoxCreate
                  key={`prop-key-${Object.keys(customProps).length}`}
                  value=""
                  onChange={(val) => {
                    if (val.trim()) {
                      toggleCustomPropKey(val.trim());
                    }
                  }}
                  placeholder={t('settings.goals.propKeyPlaceholder')}
                  fetchSuggestions={async (q) => {
                    if (!cachedPropKeys.length) return [];
                    if (!q) return cachedPropKeys;
                    return cachedPropKeys.filter(
                      (k) => k.value.toLowerCase().includes(q.toLowerCase())
                    );
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {cachedPropKeys.length > 0
                    ? t('settings.goals.propKeyHint')
                    : !propKeysLoading && t('settings.goals.noAvailableProps')}
                </p>
                {/* Selected key badges + value inputs */}
                {Object.keys(customProps).length > 0 && (
                  <div className="space-y-2 mt-2 pt-2 border-t">
                    {Object.entries(customProps).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCustomPropKey(key)}
                          className="text-[11px] font-mono shrink-0 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors"
                        >
                          {key} ✕
                        </button>
                        <span className="text-muted-foreground shrink-0">=</span>
                        <div className="flex-1">
                          <ComboBoxCreate
                            value={val}
                            onChange={(v) => updateCustomPropValue(key, v)}
                            placeholder={t('settings.goals.propVal')}
                            liveSync
                            fetchSuggestions={async (q) => {
                              if (!domain || !key) return [];
                              try {
                                const res = await axios.get<BaseResponse<{ value: string; label: string }[]>>(
                                  `/stats/${domain}/suggestions`,
                                  { params: { filter_name: `event:props:${key}`, period: "p30", q } }
                                );
                                return (res.data?.data || []);
                              } catch { return []; }
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
