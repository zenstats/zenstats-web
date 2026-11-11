export interface PerformanceConfig {
  enabled: boolean;
  paths: string[];
  sample_rate: number;
  raw_days: number;
  timezone: string;
  config_version: number;
  can_write?: boolean;
}
export type Rating = "good" | "needs_improvement" | "poor" | "insufficient";
export interface VitalMetric {
  name: string;
  unit: string;
  p75: number | null;
  samples: number;
  supported_navigations: number;
  missing_navigations: number;
  coverage: number;
  good: number;
  needs_improvement: number;
  poor: number;
  clipped: number;
  small_sample: boolean;
  rating: Rating;
}
export interface PerformanceData {
  sampled_navigations: number;
  eligible_navigations: number;
  late_init_navigations: number;
  background_init_navigations: number;
  mixed_sampling: boolean;
  mixed_config: boolean;
  overall: Rating;
  metrics: VitalMetric[];
  trend: { day: string; samples: number; p75: number | null }[];
  pages: {
    hostname: string;
    path: string;
    samples: number;
    p75: number | null;
    good: number;
    needs_improvement: number;
    poor: number;
  }[];
  raw_days: number;
  timezone: string;
  generated_at: string;
}
export function todayInZone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"]
    .map((k) => parts.find((p) => p.type === k)?.value)
    .join("-");
}
export function shiftDay(day: string, days: number) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function metricValue(value: number | null, metric: string) {
  if (value === null) return "—";
  return metric === "CLS"
    ? value.toFixed(3)
    : `${Math.round(value).toLocaleString()} ms`;
}
