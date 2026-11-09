export interface HeatmapPage {
  hostname: string; path: string; version: string; variant: string
  viewport_width: number; viewport_height: number; document_width: number; document_height: number
}
export interface HeatmapConfig {
  can_write?: boolean
  enabled: boolean; paths: string[]; sample_rate: number; max_clicks: number
  raw_days: number; aggregate_days: number; timezone: string
}
export interface PageCount extends HeatmapPage { clicks: number; last_click: string }
export interface Snapshot extends HeatmapPage { id: number; image_width: number; image_height: number; created_at: string; expires_at: string }
export interface HeatmapData {
  points: { x: number; y: number; count: number }[]
  elements: { element: string; count: number }[]
  clicks: number; unmapped: number; truncated: boolean; grid_size: number
}
export function pageIdentity(p: HeatmapPage): HeatmapPage {
  return { hostname: p.hostname, path: p.path, version: p.version, variant: p.variant,
    viewport_width: p.viewport_width, viewport_height: p.viewport_height,
    document_width: p.document_width, document_height: p.document_height }
}
export const pageKey = (p: HeatmapPage) => JSON.stringify(pageIdentity(p))
