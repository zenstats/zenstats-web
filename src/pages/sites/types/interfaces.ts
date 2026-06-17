export interface Site {
  id: number;
  domain: string;
  remark: string;
  role: string;
  timezone?: string;
  limit_minute?: number;
  rate_seconds?: number;
  allowed_origins?: string;
  is_verified?: boolean;
  verified_at?: string;
}

export interface VerificationStatus {
  domain: string;
  is_verified: boolean;
  verification_token?: string;
  verified_at?: string;
}

export interface TimeRangeVisitor {
  date: string;
  time?: string;
  uv: number;
  visitors?: number;
  pageviews?: number;
}

export interface TopStats {
  pv: number;
  uv: number;
  sessions: number;
  pv_change: number;
  uv_change: number;
  session_change: number;
  avg_duration: number;
  avg_duration_change: number;
  avg_duration_format: string;
  bounce_rate: number;
}

export interface RankItem {
  key: string;
  visits: number;
  percentage?: number;
}

export interface StatsRequest {
  period: string;
  date?: string;
  from?: string;
  to?: string;
  compare?: string;       // "1" = auto compare vs previous period
  compare_from?: string;  // explicit compare range start
  compare_to?: string;    // explicit compare range end
  interval?: Interval;
  metrics?: string;
  property?: string;
  filters?: string;
  limit?: number;
  page?: number;
  refresh?: Date;
}

export type Interval = 'minute' | 'hourly' | 'daily' | 'weekly' | 'monthly';

// New Aggregate API types
export interface AggregateMetric {
  value: number;
  comparison_value: number | null;
  change: number | null;
}

export interface AggregateResponse {
  results: Record<string, AggregateMetric>;
}

// New Main Graph API types
export interface MainGraphPoint {
  timestamp: string;
  metrics: Record<string, number>;
}

// New Breakdown API types
export interface BreakdownColumn {
  name: string;
  label: string;
  type: string;
}

export interface BreakdownResponse {
  columns: string[];
  data: Record<string, string | number>[];
  total_rows?: number;
}

// Current Visitors API types
export interface CurrentVisitors {
  total: number;
  visitors: number;
  sessions: number;
  last_updated: string;
}

// Combined stats data for the page
export interface StatsData {
  aggregate: AggregateResponse | null;
  mainGraph: MainGraphPoint[] | null;
  currentVisitors: CurrentVisitors | null;
  sources: BreakdownResponse | null;
  pages: BreakdownResponse | null;
  countries: BreakdownResponse | null;
  browsers: BreakdownResponse | null;
  operatingSystems: BreakdownResponse | null;
  devices: BreakdownResponse | null;
  entryPages: BreakdownResponse | null;
  exitPages: BreakdownResponse | null;
  screenSizes: BreakdownResponse | null;
}

// Goal types
export interface Goal {
  id: number;
  site_id: number;
  event_name?: string;
  page_path?: string;
  display_name: string;
}

export interface CreateGoalRequest {
  event_name?: string;
  page_path?: string;
  display_name: string;
}

// Funnel types
export interface FunnelStep {
  step_order: number;
  goal_id: number;
  goal_name: string;
  goal_type: string;
  goal_value: string;
}

export interface Funnel {
  id: number;
  site_id: number;
  name: string;
  steps: { id: number; goal_id: number; step_order: number }[];
}

export interface FunnelDetail {
  id: number;
  site_id: number;
  name: string;
  steps: FunnelStep[];
}

export interface CreateFunnelRequest {
  name: string;
  steps: { goal_id: number }[];
}

// Funnel Analysis types
export interface FunnelStepResult {
  step_order: number;
  goal_name: string;
  visitors: number;
  drop_off: number;
  conversion_rate: number;
}

export interface FunnelAnalysisResult {
  total_visitors: number;
  steps: FunnelStepResult[];
  conversion_rate: number;
}