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

// V2 Query API types
export interface QueryV2Request {
  period?: string;
  from?: string;
  to?: string;
  date?: string;
  metrics: string[];
  dimensions?: string[];
  filters?: unknown;
  order_by?: [string, string][];
  limit?: number;
  offset?: number;
}

export interface QueryV2Response {
  columns: string[];
  data: Record<string, string | number>[];
  total_rows?: number;
  results?: Record<string, AggregateMetric>;
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

// Shared Link types
export interface SharedLink {
  id: number;
  site_id: number;
  name: string;
  slug: string;
  password_hash: string;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSharedLinkRequest {
  name: string;
  password?: string;
}

// Segment types
export interface Segment {
  id: number;
  site_id: number;
  name: string;
  description?: string;
  filters: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSegmentRequest {
  name: string;
  description?: string;
  filters: string;
}

export interface UpdateSegmentRequest {
  name?: string;
  description?: string;
  filters?: string;
}

// SavedPanel types（已保存的自定义查询面板）
export interface SavedPanel {
  id: number;
  site_id: number;
  name: string;
  description?: string;
  // config 为自定义查询完整配置的 JSON 字符串（见 CustomQueryConfig）
  config: string;
  pinned: boolean;
  // layout 为该面板在自定义看板网格中的位置与大小 JSON（PanelLayout）
  layout?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

// PanelLayout 是序列化进 SavedPanel.layout 的网格布局。
export interface PanelLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

// CustomQueryConfig 是序列化进 SavedPanel.config 的自定义查询表单配置。
export interface CustomQueryConfig {
  resultType: "breakdown" | "aggregate";
  property: string;
  property2?: string; // 可选第二拆分维度（多维 breakdown）
  metrics: string[];
  filters: { property: string; operator: string; value: string }[];
  limit: number;
  orderByMetric: string;
  orderByDir: "desc" | "asc";
}

export interface CreatePanelRequest {
  name: string;
  description?: string;
  config: string;
  pinned?: boolean;
}

export interface UpdatePanelRequest {
  name?: string;
  description?: string;
  config?: string;
  layout?: string;
  pinned?: boolean;
}

// Goal types
export interface Goal {
  id: number;
  site_id: number;
  event_name?: string;
  page_path?: string;
  display_name: string;
  custom_props?: Record<string, string>;
}

export interface CreateGoalRequest {
  event_name?: string;
  page_path?: string;
  display_name: string;
  custom_props?: Record<string, string>;
}

// Funnel types
export interface FunnelStep {
  step_id?: number;
  parent_step_id?: number | null; // 树形：父步骤 ID；根为空
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
  // parent 为父步骤在 steps 数组中的下标（必须更早）；省略时下标0为根、其余接上一步（线性）
  steps: { goal_id: number; parent?: number }[];
}

// Funnel Analysis types
export interface FunnelStepResult {
  step_order: number;
  goal_name: string;
  visitors: number;
  drop_off: number;
  conversion_rate: number;
}

// 树形节点结果：按根→节点完整路径统计，转化率相对父节点
export interface FunnelNodeResult {
  step_id: number;
  parent_step_id?: number | null;
  step_order: number;
  goal_name: string;
  visitors: number;
  drop_off: number;
  conversion_rate: number;
  is_root: boolean;
}
export interface FunnelAnalysisResult {
  total_visitors: number;
  steps: FunnelStepResult[];
  conversion_rate: number;
  // 树形视图数据：每个节点带 step_id/parent_step_id，据此重建多层树
  nodes?: FunnelNodeResult[];
}

// User Flows (Sankey) types
export interface SankeyNode {
  id: string;
  name: string;
  depth: number;
  is_dropoff?: boolean;
  is_other?: boolean;
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
  source_name?: string;
  target_name?: string;
}

export interface UserFlowsResponse {
  nodes: SankeyNode[];
  links: SankeyLink[];
  total_sessions: number;
  drop_off_sessions: number;
  drop_off_rate: number;
}
