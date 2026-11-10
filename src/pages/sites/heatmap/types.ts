export interface HeatmapPage {
  aggregation_key?: string;
  hostname: string;
  path: string;
  version: string;
  variant: string;
  viewport_width: number;
  viewport_height: number;
  document_width: number;
  document_height: number;
}
export interface HeatmapConfig {
  can_write?: boolean;
  screenshot_available?: boolean;
  groups: { path: string; key: string; example_url: string }[];
  enabled: boolean;
  paths: string[];
  sample_rate: number;
  max_clicks: number;
  raw_days: number;
  aggregate_days: number;
  timezone: string;
}
export interface PageCount extends HeatmapPage {
  clicks: number;
  last_click: string;
}
export interface Snapshot extends HeatmapPage {
  id: number;
  source_url?: string;
  image_width: number;
  image_height: number;
  created_at: string;
  expires_at: string;
}
export interface HeatmapData {
  points: { x: number; y: number; count: number }[];
  elements: { element: string; count: number }[];
  clicks: number;
  unmapped: number;
  truncated: boolean;
  grid_size: number;
  coordinate_space?: "normalized";
  grid_columns?: number;
  grid_rows?: number;
}
export function pageIdentity(p: HeatmapPage): HeatmapPage {
  return {
    aggregation_key: p.aggregation_key || "",
    hostname: p.hostname,
    path: p.path,
    version: p.version,
    variant: p.variant,
    viewport_width: p.viewport_width,
    viewport_height: p.viewport_height,
    document_width: p.document_width,
    document_height: p.document_height,
  };
}
// Identity uses responsive width classes, so historical backgrounds remain usable
// when the selected page has a different window size or document length.
export function deviceClass(p: HeatmapPage) {
  return p.viewport_width < 768
    ? "mobile"
    : p.viewport_width < 1024
      ? "tablet"
      : "desktop";
}
export const pageKey = (p: HeatmapPage) =>
  JSON.stringify({
    aggregation_key: p.aggregation_key || "",
    hostname: p.hostname,
    path: p.path,
    version: p.version,
    variant: p.variant,
    device: deviceClass(p),
  });

export function layoutKey(p: HeatmapPage, scope: string) {
  return pageKey(scope === "key" ? { ...p, path: "/" } : p);
}
