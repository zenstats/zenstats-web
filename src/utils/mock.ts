// Mock API data for development preview
// This module intercepts axios requests and returns mock data

import type { BaseResponse } from "./axios";

// Mock TopStats data (legacy /top_stats)
const mockTopStats = {
  code: 200,
  message: "success",
  data: {
    pv: 45678,
    uv: 12345,
    sessions: 15678,
    pv_change: 14.2,
    uv_change: 23.45,
    session_change: 20.6,
    avg_duration: 185.42,
    avg_duration_change: 8.75,
    avg_duration_format: "3M 5S",
    bounce_rate: 35.67,
  },
};

// Mock curve data (legacy /curve)
const generateCurveData = () => {
  const data = [];
  for (let i = 0; i < 24; i++) {
    const base = 200 + (i > 8 && i < 22 ? 400 : 0);
    const variation = ((i * 7 + 13) % 30) * 10;
    data.push({
      time: `${String(i).padStart(2, "0")}:00`,
      uv: base + variation,
    });
  }
  return { code: 200, message: "success", data };
};
const mockCurveData = generateCurveData();

// Mock source rank (legacy /source_rank)
const mockSourceRank = {
  code: 200,
  message: "success",
  data: [
    { key: "Google", visits: 5234, percentage: 42.4 },
    { key: "Direct / None", visits: 3102, percentage: 25.1 },
    { key: "Baidu", visits: 1876, percentage: 15.2 },
    { key: "Bing", visits: 987, percentage: 8.0 },
    { key: "Twitter", visits: 456, percentage: 3.7 },
    { key: "GitHub", visits: 321, percentage: 2.6 },
    { key: "Reddit", visits: 198, percentage: 1.6 },
    { key: "Hacker News", visits: 112, percentage: 0.9 },
    { key: "Yahoo", visits: 67, percentage: 0.5 },
  ],
};

// Mock page rank (legacy /page_rank)
const mockPageRank = {
  code: 200,
  message: "success",
  data: [
    { key: "/", visits: 8921, percentage: 32.5 },
    { key: "/blog/my-first-post", visits: 4567, percentage: 16.6 },
    { key: "/pricing", visits: 3210, percentage: 11.7 },
    { key: "/about", visits: 2345, percentage: 8.5 },
    { key: "/docs/getting-started", visits: 1987, percentage: 7.2 },
    { key: "/blog/tech-stack", visits: 1654, percentage: 6.0 },
    { key: "/contact", visits: 1234, percentage: 4.5 },
    { key: "/features", visits: 987, percentage: 3.6 },
    { key: "/blog/design-system", visits: 765, percentage: 2.8 },
    { key: "/changelog", visits: 543, percentage: 2.0 },
    { key: "/terms", visits: 432, percentage: 1.6 },
    { key: "/privacy", visits: 321, percentage: 1.2 },
  ],
};

// Mock device rank (legacy /device_rank)
const mockDeviceRank = {
  code: 200,
  message: "success",
  data: [
    { key: "Desktop", visits: 7890, percentage: 54.3 },
    { key: "Mobile", visits: 5432, percentage: 37.4 },
    { key: "Tablet", visits: 1200, percentage: 8.3 },
  ],
};

// Mock site list
const mockSiteList = {
  code: 200,
  message: "success",
  data: [
    { id: 1, domain: "example.com", remark: "示例站点", role: "admin", timezone: "Asia/Shanghai" },
    { id: 2, domain: "blog.example.com", remark: "博客", role: "viewer", timezone: "Asia/Shanghai" },
    { id: 3, domain: "docs.example.com", remark: "文档", role: "owner", timezone: "Asia/Shanghai" },
  ],
};

// ===== New Plausible-compatible APIs =====

// Mock aggregate response (GET /stats/:d/aggregate)
const mockAggregateResponse = {
  code: 200,
  message: "success",
  data: {
    results: {
      visitors: { value: 12345, comparison_value: 10000, change: 23.45 },
      pageviews: { value: 45678, comparison_value: 40000, change: 14.20 },
      bounce_rate: { value: 35.67, comparison_value: 40.12, change: -11.09 },
      visit_duration: { value: 185.42, comparison_value: 170.50, change: 8.75 },
      views_per_visit: { value: 3.70, comparison_value: 4.00, change: -7.50 },
    },
  },
};

// Mock main-graph response (GET /stats/:d/main-graph)
const generateMainGraphData = () => {
  const data = [];
  for (let i = 0; i < 24; i++) {
    const baseVisitors = 200 + (i > 8 && i < 22 ? 400 : 0);
    const variation = ((i * 7 + 13) % 30) * 10;
    data.push({
      timestamp: `${String(i).padStart(2, "0")}:00`,
      metrics: {
        visitors: baseVisitors + variation,
        pageviews: Math.round((baseVisitors + variation) * 2.8),
      },
    });
  }
  return { code: 200, message: "success", data };
};
const mockMainGraphResponse = generateMainGraphData();

// Mock breakdown response (GET /stats/:d/breakdown)
const mockBreakdownSources = {
  code: 200,
  message: "success",
  data: {
    columns: ["referrer_source", "visitors"],
    data: [
      { referrer_source: "Google", visitors: 5234 },
      { referrer_source: "Direct / None", visitors: 3102 },
      { referrer_source: "Baidu", visitors: 1876 },
      { referrer_source: "Bing", visitors: 987 },
      { referrer_source: "Twitter", visitors: 456 },
      { referrer_source: "GitHub", visitors: 321 },
      { referrer_source: "Reddit", visitors: 198 },
      { referrer_source: "Hacker News", visitors: 112 },
      { referrer_source: "Yahoo", visitors: 67 },
    ],
  },
};

const mockBreakdownPages = {
  code: 200,
  message: "success",
  data: {
    columns: ["page", "visitors", "pageviews"],
    data: [
      { page: "/", visitors: 8921, pageviews: 12345 },
      { page: "/blog/my-first-post", visitors: 4567, pageviews: 6789 },
      { page: "/pricing", visitors: 3210, pageviews: 4532 },
      { page: "/about", visitors: 2345, pageviews: 3210 },
      { page: "/docs/getting-started", visitors: 1987, pageviews: 2876 },
      { page: "/blog/tech-stack", visitors: 1654, pageviews: 2345 },
      { page: "/contact", visitors: 1234, pageviews: 1654 },
      { page: "/features", visitors: 987, pageviews: 1234 },
      { page: "/blog/design-system", visitors: 765, pageviews: 987 },
      { page: "/changelog", visitors: 543, pageviews: 765 },
    ],
  },
};

const mockBreakdownCountries = {
  code: 200,
  message: "success",
  data: {
    columns: ["country", "visitors"],
    data: [
      { country: "CN", visitors: 6543 },
      { country: "US", visitors: 2345 },
      { country: "JP", visitors: 1234 },
      { country: "DE", visitors: 876 },
      { country: "GB", visitors: 654 },
      { country: "KR", visitors: 543 },
      { country: "FR", visitors: 432 },
      { country: "CA", visitors: 321 },
      { country: "AU", visitors: 287 },
      { country: "BR", visitors: 234 },
      { country: "IN", visitors: 198 },
      { country: "RU", visitors: 176 },
    ],
  },
};

const mockBreakdownBrowsers = {
  code: 200,
  message: "success",
  data: {
    columns: ["browser", "visitors"],
    data: [
      { browser: "Chrome", visitors: 6543 },
      { browser: "Safari", visitors: 3210 },
      { browser: "Firefox", visitors: 1876 },
      { browser: "Edge", visitors: 1543 },
      { browser: "Opera", visitors: 654 },
      { browser: "Samsung Internet", visitors: 432 },
      { browser: "UC Browser", visitors: 267 },
    ],
  },
};

const mockBreakdownOS = {
  code: 200,
  message: "success",
  data: {
    columns: ["os", "visitors"],
    data: [
      { os: "Windows", visitors: 5432 },
      { os: "macOS", visitors: 3876 },
      { os: "Android", visitors: 2654 },
      { os: "iOS", visitors: 1987 },
      { os: "Linux", visitors: 543 },
      { os: "Chrome OS", visitors: 32 },
    ],
  },
};

const mockBreakdownDevices = {
  code: 200,
  message: "success",
  data: {
    columns: ["device", "visitors"],
    data: [
      { device: "Desktop", visitors: 7890 },
      { device: "Mobile", visitors: 5432 },
      { device: "Tablet", visitors: 1200 },
    ],
  },
};

const mockBreakdownEntryPages = {
  code: 200,
  message: "success",
  data: {
    columns: ["entry_page", "visitors", "visit_duration", "bounce_rate"],
    data: [
      { entry_page: "/", visitors: 5432, visit_duration: 120, bounce_rate: 42.3 },
      { entry_page: "/blog", visitors: 2345, visit_duration: 180, bounce_rate: 35.1 },
      { entry_page: "/docs", visitors: 1876, visit_duration: 240, bounce_rate: 25.9 },
      { entry_page: "/pricing", visitors: 1234, visit_duration: 90, bounce_rate: 55.5 },
      { entry_page: "/about", visitors: 876, visit_duration: 60, bounce_rate: 60.0 },
      { entry_page: "/features", visitors: 654, visit_duration: 150, bounce_rate: 38.5 },
    ],
  },
};

const mockBreakdownExitPages = {
  code: 200,
  message: "success",
  data: {
    columns: ["exit_page", "visitors", "pageviews"],
    data: [
      { exit_page: "/pricing", visitors: 3210, pageviews: 4532 },
      { exit_page: "/", visitors: 2876, pageviews: 8921 },
      { exit_page: "/blog/my-first-post", visitors: 1654, pageviews: 4567 },
      { exit_page: "/about", visitors: 1432, pageviews: 2345 },
      { exit_page: "/docs/getting-started", visitors: 987, pageviews: 1987 },
    ],
  },
};

const mockBreakdownScreenSizes = {
  code: 200,
  message: "success",
  data: {
    columns: ["screen_size", "visitors"],
    data: [
      { screen_size: "1920x1080", visitors: 4321 },
      { screen_size: "1366x768", visitors: 2345 },
      { screen_size: "1440x900", visitors: 1876 },
      { screen_size: "1536x864", visitors: 1234 },
      { screen_size: "2560x1440", visitors: 987 },
      { screen_size: "375x812", visitors: 876 },
      { screen_size: "414x896", visitors: 654 },
      { screen_size: "360x780", visitors: 543 },
    ],
  },
};

const mockBreakdownEventNames = {
  code: 200,
  message: "success",
  data: {
    columns: ["event_name", "visitors", "events"],
    data: [
      { event_name: "pageview", visitors: 45678, events: 89012 },
      { event_name: "click", visitors: 12345, events: 34567 },
      { event_name: "scroll_depth", visitors: 8901, events: 23456 },
      { event_name: "form_submit", visitors: 5432, events: 8765 },
      { event_name: "signup", visitors: 3210, events: 3210 },
      { event_name: "purchase", visitors: 1876, events: 2345 },
      { event_name: "download", visitors: 1234, events: 1543 },
      { event_name: "share", visitors: 987, events: 1234 },
      { event_name: "search", visitors: 654, events: 987 },
      { event_name: "video_play", visitors: 432, events: 654 },
    ],
  },
};

// Mock API keys
const mockAPIKeys = {
  code: 200,
  message: "success",
  data: [
    {
      id: 1,
      name: "Production API Key",
      key_preview: "zs_prod_****abc1",
      created_at: "2024-01-15T10:30:00Z",
      expires_at: "2025-01-15T00:00:00Z",
      last_used_at: "2024-05-20T08:15:00Z",
    },
    {
      id: 2,
      name: "Development Key",
      key_preview: "zs_dev_****xyz9",
      created_at: "2024-03-01T14:00:00Z",
      expires_at: "",
      last_used_at: "2024-05-27T16:42:00Z",
    },
    {
      id: 3,
      name: "Test Key (Expired)",
      key_preview: "zs_test_****exp0",
      created_at: "2024-01-01T00:00:00Z",
      expires_at: "2024-02-01T00:00:00Z",
      last_used_at: "2024-01-28T12:00:00Z",
    },
  ],
};

// Mock current visitors (GET /stats/:d/current-visitors)
const mockCurrentVisitors = {
  code: 200,
  message: "success",
  data: {
    total: 42,
    visitors: 42,
    sessions: 58,
    last_updated: new Date().toISOString(),
  },
};

// Mock shield country rules
const mockShieldCountries = {
  code: 200,
  message: "success",
  data: [
    {
      id: 1,
      site_id: 1,
      country_code: "RU",
      country_name: "Russia",
      action: "deny",
      description: "Spam traffic",
      added_by: "admin@example.com",
      created_at: "2024-03-15T10:30:00Z",
      updated_at: "2024-03-15T10:30:00Z",
    },
    {
      id: 2,
      site_id: 1,
      country_code: "CN",
      country_name: "China",
      action: "deny",
      description: "Test block",
      added_by: "admin@example.com",
      created_at: "2024-04-01T14:00:00Z",
      updated_at: "2024-04-01T14:00:00Z",
    },
  ],
};

// Mock auth state
const mockAuthState = {
  code: 200,
  message: "success",
  data: "initialized",
};

// Route mock data based on URL pattern
export function getMockResponse(url: string): BaseResponse<unknown> | null {
  const path = url.split("?")[0];
  const query = url.includes("?") ? url.split("?")[1] : "";

  // Auth APIs
  if (path.includes("/auth/state")) return mockAuthState;
  if (path.includes("/auth/login")) return {
    code: 200,
    message: "success",
    data: {
      token: "mock-token-for-preview",
      refresh_token: "mock-refresh-token",
      user: { name: "Demo User", email: "demo@zenstats.com" },
    },
  };

  // Legacy APIs (no /stats/ prefix)
  if (path.includes("/top_stats")) return mockTopStats;
  if (path.includes("/curve")) return mockCurveData;
  if (path.includes("/source_rank") || path.includes("/sources")) return mockSourceRank;
  if (path.includes("/page_rank")) return mockPageRank;
  if (path.includes("/device_rank")) return mockDeviceRank;
  if (path.includes("/shield")) return path.includes("/country") ? mockShieldCountries : { code: 200, message: "success", data: [] };
  if (path.includes("/sites") && !path.includes("/stats")) return mockSiteList;
  if (path.includes("/apikeys") && !path.includes("/apikeys/")) return mockAPIKeys;
  if (path.match(/\/apikeys\/\d+$/)) return { code: 200, message: "success", data: null };

  // New APIs (with /stats/ prefix)
  if (path.includes("/current-visitors")) return mockCurrentVisitors;
  if (path.includes("/aggregate")) return mockAggregateResponse;
  if (path.includes("/main-graph")) return mockMainGraphResponse;

  // Breakdown API - route by property param
  if (path.includes("/breakdown")) {
    if (query.includes("visit:source")) return mockBreakdownSources;
    if (query.includes("visit:referrer")) return mockBreakdownSources;
    if (query.includes("visit:channel")) return mockBreakdownSources;
    if (query.includes("visit:country")) return mockBreakdownCountries;
    if (query.includes("visit:region")) return mockBreakdownCountries;
    if (query.includes("visit:city")) return mockBreakdownCountries;
    if (query.includes("visit:browser_version")) return mockBreakdownBrowsers;
    if (query.includes("visit:browser")) return mockBreakdownBrowsers;
    if (query.includes("visit:os_version")) return mockBreakdownOS;
    if (query.includes("visit:os")) return mockBreakdownOS;
    if (query.includes("visit:device")) return mockBreakdownDevices;
    if (query.includes("visit:screen")) return mockBreakdownScreenSizes;
    if (query.includes("visit:entry_page")) return mockBreakdownEntryPages;
    if (query.includes("visit:exit_page")) return mockBreakdownExitPages;
    if (query.includes("event:name")) return mockBreakdownEventNames;
    if (query.includes("event:page")) return mockBreakdownPages;
    if (query.includes("event:hostname")) return mockBreakdownSources;
    if (query.includes("event:browser")) return mockBreakdownBrowsers;
    if (query.includes("event:os")) return mockBreakdownOS;
    if (query.includes("event:device")) return mockBreakdownDevices;
    if (query.includes("event:country")) return mockBreakdownCountries;
    // Default fallback
    return mockBreakdownPages;
  }

  // POST requests for creating keys are handled by adapter
  // This function is only for GET requests

  return null;
}
