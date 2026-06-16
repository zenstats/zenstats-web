export interface ImportUploadResponse {
  import_id: number;
  rows_imported: number;
  report_type: string;
  table: string;
}

export interface ImportAggregateResponse {
  visitors: number;
  pageviews: number;
  visits: number;
  bounce_rate: number;
  visit_duration: number;
  views_per_visit: number;
}

export interface ImportBreakdownRow {
  name: string;
  visitors: number;
  pageviews: number;
}

export interface ImportBreakdownResponse {
  data: ImportBreakdownRow[];
}
