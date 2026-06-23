import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Target, ExternalLink, Globe, MousePointerClick } from "lucide-react";
import axios, { type BaseResponse } from "@utils/axios";
import type { Goal, StatsRequest, AggregateResponse } from "../../types/interfaces";
import GoalDetailDialog from "./goal-detail-dialog";

interface GoalsPanelProps {
  query: StatsRequest;
  domain: string;
  aggregateApi: (params: StatsRequest) => Promise<BaseResponse<AggregateResponse>>;
  onAddFilter: (dimension: string, operator: string, label: string, values: string[]) => void;
}

interface GoalWithStats extends Goal {
  conversionCount: number | null;
  loading: boolean;
}

export default function GoalsPanel({ query, domain, aggregateApi, onAddFilter }: GoalsPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<GoalWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail dialog state
  const [detailGoal, setDetailGoal] = useState<Goal | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchGoals = useCallback(async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const res = await axios.get<BaseResponse<Goal[]>>(`/sites/${domain}/goals`);
      const goalsData: GoalWithStats[] = (res.data.data || []).map((g) => ({
        ...g,
        conversionCount: null,
        loading: true,
      }));
      setGoals(goalsData);

      // Fetch stats for each goal
      for (const goal of goalsData) {
        try {
          const filterValue = goal.event_name || goal.page_path || "";
          const filterProperty = goal.event_name ? "event:name" : "event:page";

          const params: StatsRequest = {
            ...query,
            metrics: "events",
            filters: JSON.stringify([["is", filterProperty, [filterValue]]]),
            refresh: new Date(),
          };

          const statsRes = await aggregateApi(params);
          if (statsRes.data?.results?.events) {
            goal.conversionCount = statsRes.data.results.events.value;
          }
        } catch {
          // ignore individual goal stat errors
        } finally {
          goal.loading = false;
        }
      }
      setGoals([...goalsData]);
    } catch (error) {
      console.error("Failed to fetch goals:", error);
      toast.error(t("stats.goals.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [domain, query, aggregateApi, t]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const goalTypeIcon = (goal: Goal) => {
    if (goal.event_name) return <MousePointerClick className="h-4 w-4 text-indigo-500" />;
    if (goal.page_path) return <Globe className="h-4 w-4 text-emerald-500" />;
    return <Target className="h-4 w-4 text-gray-400" />;
  };

  const goalTypeLabel = (goal: Goal) => {
    if (goal.event_name) return t("stats.goals.eventGoal");
    if (goal.page_path) return t("stats.goals.pageGoal");
    return "—";
  };

  const goalValue = (goal: Goal) => {
    return goal.event_name || goal.page_path || "—";
  };

  return (
    <Card className="dark:bg-gray-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {t("stats.goals.title")}
            </CardTitle>
            <CardDescription>{t("stats.goals.description")}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/sites/${domain}/settings/goals`)}
            className="gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("stats.goals.manage")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium">{t("stats.goals.noGoals")}</p>
            <p className="text-xs mt-1">{t("stats.goals.noGoalsHint")}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate(`/sites/${domain}/settings/goals`)}
            >
              {t("stats.goals.createGoal")}
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>{t("stats.goals.name")}</TableHead>
                <TableHead>{t("stats.goals.type")}</TableHead>
                <TableHead className="text-right">{t("stats.goals.value")}</TableHead>
                <TableHead className="text-right w-[100px]">{t("stats.goals.conversions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.map((goal) => (
                <TableRow
                  key={goal.id}
                  className="cursor-pointer hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10"
                  onClick={() => { setDetailGoal(goal); setDetailOpen(true); }}
                >
                  <TableCell>{goalTypeIcon(goal)}</TableCell>
                  <TableCell className="font-medium">{goal.display_name}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-muted-foreground">
                      {goalTypeLabel(goal)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <code className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800/50 px-1.5 py-0.5 rounded">
                      {goalValue(goal)}
                    </code>
                  </TableCell>
                  <TableCell className="text-right">
                    {goal.loading ? (
                      <Skeleton className="h-5 w-14 ml-auto" />
                    ) : goal.conversionCount !== null ? (
                      <span className="font-mono text-sm font-semibold tabular-nums">
                        {goal.conversionCount.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Goal detail drill-down dialog */}
      <GoalDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        goal={detailGoal}
        domain={domain}
        query={query}
        aggregateApi={aggregateApi}
        onAddFilter={onAddFilter}
      />
    </Card>
  );
}
