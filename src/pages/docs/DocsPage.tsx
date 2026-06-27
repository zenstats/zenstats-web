import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    groupKey: "overview",
    items: ["introduction", "authentication", "trackingScript"],
  },
  {
    groupKey: "statsApiV1",
    items: ["aggregate", "breakdown", "timeseries", "currentVisitors"],
  },
  {
    groupKey: "statsApiV2",
    items: ["v2Query"],
  },
  {
    groupKey: "reference",
    items: ["metrics", "dimensions", "filters", "periods"],
  },
  {
    groupKey: "features",
    items: ["goals", "funnels", "segments", "sharedLinks"],
  },
  {
    groupKey: "siteManagement",
    items: ["shields", "emailReports", "trafficAlerts"],
  },
  {
    groupKey: "operations",
    items: ["deployment", "health"],
  },
];

const SECTION_IDS = NAV_SECTIONS.flatMap((g) => g.items);

function CodeBlock({ label, children }: { label?: string; children: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="my-4 rounded-md overflow-hidden border border-slate-700">
      <div className="flex items-center justify-between bg-[#161b22] px-4 py-2 border-b border-slate-700">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{label}</span>
        <button
          onClick={copy}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="bg-[#0d1117] text-[#e6edf3] text-sm font-mono p-4 overflow-x-auto leading-relaxed whitespace-pre">
        {children}
      </pre>
    </div>
  );
}

function Callout({ type = "info", children }: { type?: "info" | "warn"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "border-l-4 px-4 py-3 rounded-r-md my-4 text-sm",
        type === "info" && "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
        type === "warn" && "border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
      )}
    >
      {children}
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={cn(
        "font-mono text-xs font-bold px-2 py-0.5 rounded mr-2",
        method === "GET" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
        method === "POST" && "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
      )}
    >
      {method}
    </span>
  );
}

function ParamTable({ rows }: { rows: { name: string; req?: boolean; desc: React.ReactNode }[] }) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-2 px-3 font-semibold text-slate-700 dark:text-slate-300 w-48">{t("docs.table.parameter")}</th>
            <th className="text-left py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">{t("docs.table.description")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="py-2 px-3 align-top">
                <code className="font-mono text-xs text-emerald-700 dark:text-emerald-400">{row.name}</code>
                {row.req && (
                  <span className="ml-1.5 text-[10px] font-semibold text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/40 px-1 py-0.5 rounded">
                    required
                  </span>
                )}
              </td>
              <td className="py-2 px-3 text-slate-600 dark:text-slate-400 leading-relaxed">{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RefGrid({ items }: { items: { code: string; desc: string }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 my-4">
      {items.map((item) => (
        <div key={item.code} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded p-2.5">
          <code className="block text-xs text-emerald-700 dark:text-emerald-400 font-mono mb-1">{item.code}</code>
          <small className="text-xs text-slate-500 dark:text-slate-400 leading-snug block">{item.desc}</small>
        </div>
      ))}
    </div>
  );
}

export default function DocsPage() {
  const { t } = useTranslation();
  const [active, setActive] = useState("introduction");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
    }
  };

  const navKey = (item: string) => `docs.nav.${item}`;

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 w-64 h-screen overflow-y-auto z-50 flex flex-col bg-slate-50 border-r border-slate-200 dark:bg-[#0d1117] dark:border-[#21262d]">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-200 dark:border-[#21262d]">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div className="w-7 h-7 bg-emerald-500 rounded flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 16 16" className="w-4 h-4 fill-white">
                <path d="M2 12l3-4 3 2 3-6 3 4H2z" />
              </svg>
            </div>
            <span className="font-mono text-sm font-semibold text-slate-800 dark:text-[#e6edf3] tracking-tight">ZenStats</span>
            <span className="font-mono text-[9px] bg-emerald-100 text-emerald-700 dark:bg-amber-100 dark:text-amber-800 px-1 py-0.5 rounded font-semibold">
              Docs
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2">
          {NAV_SECTIONS.map((group) => (
            <div key={group.groupKey} className="mb-5">
              <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-[#4b5563]">
                {t(`docs.nav.groups.${group.groupKey}`)}
              </div>
              {group.items.map((item) => (
                <button
                  key={item}
                  onClick={() => scrollTo(item)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 rounded text-[13px] transition-colors block",
                    active === item
                      ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-[#161b22]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#7d8590] dark:hover:text-[#e6edf3] dark:hover:bg-transparent",
                  )}
                >
                  {t(navKey(item))}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main ref={contentRef} className="ml-64 flex-1 min-w-0">
        <div className="max-w-3xl mx-auto px-8 py-12">

          {/* Introduction */}
          <section id="introduction" className="mb-16 scroll-mt-8">
            <div className="mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
              <h1 className="font-serif text-4xl font-bold text-slate-900 dark:text-slate-50 mb-3">
                {t("docs.hero.title")}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-4">
                {t("docs.hero.description")}
              </p>
              <div className="flex flex-wrap gap-2">
                {(t("docs.hero.chips", { returnObjects: true }) as string[]).map((chip) => (
                  <span key={chip} className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.introduction.baseUrl.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.introduction.baseUrl.description")}</p>
            <CodeBlock label="Base URL">https://your-zenstats-instance.com/api</CodeBlock>

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.introduction.responseFormat.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.introduction.responseFormat.description")}</p>
            <CodeBlock label="Success Response">{`{
  "code":    200,
  "message": "success",
  "data":    { ... }
}`}</CodeBlock>
            <CodeBlock label="Error Response">{`{
  "code":    400,
  "message": "bad request",
  "error":   "site_id is required"
}`}</CodeBlock>
          </section>

          {/* Authentication */}
          <section id="authentication" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.authentication")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.authentication.description")}</p>

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.authentication.apiKey.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.authentication.apiKey.description")}</p>
            <CodeBlock label="Request">{`curl https://your-instance.com/api/stats/example.com/aggregate \\
  -H "Authorization: Bearer zs_live_abc123..." \\
  -G \\
  -d "period=p30&metrics=visitors,pageviews"`}</CodeBlock>
            <Callout type="info">{t("docs.sections.authentication.apiKey.callout")}</Callout>

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.authentication.jwt.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">{t("docs.sections.authentication.jwt.description")}</p>
          </section>

          {/* Tracking Script */}
          <section id="trackingScript" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.trackingScript")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.trackingScript.description")}</p>
            <CodeBlock label="HTML">{`<script
  defer
  data-domain="example.com"
  src="https://your-instance.com/js/zenstats.js"
></script>`}</CodeBlock>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t("docs.sections.trackingScript.note")}</p>

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.trackingScript.customEvents.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.trackingScript.customEvents.description")}</p>
            <CodeBlock label="JavaScript">{`// Track a named event
zenstats.track('Signup')

// Track with custom properties
zenstats.track('Purchase', {
  plan:   'pro',
  amount: 49
})`}</CodeBlock>

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.trackingScript.engagement.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">{t("docs.sections.trackingScript.engagement.description")}</p>

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.trackingScript.outbound.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.trackingScript.outbound.description")}</p>
            <CodeBlock label="HTML">{`<a href="https://github.com" data-zenstats-outbound>GitHub</a>`}</CodeBlock>
          </section>

          {/* Aggregate */}
          <section id="aggregate" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.aggregate")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.aggregate.description")}</p>
            <div className="flex items-center font-mono text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded px-4 py-2.5 mb-4">
              <MethodBadge method="GET" />
              <span className="text-slate-700 dark:text-slate-300">/api/stats/:domain/aggregate</span>
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.table.queryParameters")}</h3>
            <ParamTable rows={[
              { name: "period", req: true, desc: <>{t("docs.params.period")} <a href="#periods" className="text-emerald-600 dark:text-emerald-400 hover:underline">{t("docs.nav.periods")}</a>.</> },
              { name: "metrics", desc: <>{t("docs.params.metrics")} <a href="#metrics" className="text-emerald-600 dark:text-emerald-400 hover:underline">{t("docs.nav.metrics")}</a>.</> },
              { name: "filters", desc: <>{t("docs.params.filters")} <a href="#filters" className="text-emerald-600 dark:text-emerald-400 hover:underline">{t("docs.nav.filters")}</a>.</> },
              { name: "compare", desc: t("docs.params.compare") },
              { name: "date", desc: t("docs.params.date") },
            ]} />
            <CodeBlock label="Request">{`curl https://your-instance.com/api/stats/example.com/aggregate \\
  -H "Authorization: Bearer <token>" \\
  -G \\
  -d "period=p30&metrics=visitors,pageviews,bounce_rate"`}</CodeBlock>
            <CodeBlock label="Response">{`{
  "code": 200,
  "data": {
    "visitors":    { "value": 12840, "change": 5.2 },
    "pageviews":   { "value": 48320, "change": 3.1 },
    "bounce_rate": { "value": 42.7,  "change": -1.4 }
  }
}`}</CodeBlock>
          </section>

          {/* Breakdown */}
          <section id="breakdown" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.breakdown")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.breakdown.description")}</p>
            <div className="flex items-center font-mono text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded px-4 py-2.5 mb-4">
              <MethodBadge method="GET" />
              <span className="text-slate-700 dark:text-slate-300">/api/stats/:domain/breakdown</span>
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.table.queryParameters")}</h3>
            <ParamTable rows={[
              { name: "period", req: true, desc: t("docs.params.period") },
              { name: "property", req: true, desc: <>{t("docs.params.property")} <a href="#dimensions" className="text-emerald-600 dark:text-emerald-400 hover:underline">{t("docs.nav.dimensions")}</a>.</> },
              { name: "metrics", desc: t("docs.params.metrics") },
              { name: "filters", desc: t("docs.params.filters") },
              { name: "limit", desc: t("docs.params.limit") },
              { name: "page", desc: t("docs.params.page") },
            ]} />
            <CodeBlock label="Request">{`curl https://your-instance.com/api/stats/example.com/breakdown \\
  -H "Authorization: Bearer <token>" \\
  -G \\
  -d "period=p30&property=visit:source&metrics=visitors,bounce_rate"`}</CodeBlock>
            <CodeBlock label="Response">{`{
  "code": 200,
  "data": {
    "results": [
      { "source": "Google",   "visitors": 5820, "bounce_rate": 38.2 },
      { "source": "Direct",   "visitors": 3140, "bounce_rate": 45.1 },
      { "source": "Twitter",  "visitors": 1280, "bounce_rate": 52.7 }
    ],
    "total": 3
  }
}`}</CodeBlock>
          </section>

          {/* Timeseries */}
          <section id="timeseries" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.timeseries")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.timeseries.description")}</p>
            <div className="flex items-center font-mono text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded px-4 py-2.5 mb-4">
              <MethodBadge method="GET" />
              <span className="text-slate-700 dark:text-slate-300">/api/stats/:domain/main-graph</span>
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.table.queryParameters")}</h3>
            <ParamTable rows={[
              { name: "period", req: true, desc: t("docs.params.period") },
              { name: "metrics", desc: t("docs.params.metrics") },
              { name: "filters", desc: t("docs.params.filters") },
            ]} />
            <CodeBlock label="Response">{`{
  "code": 200,
  "data": [
    { "date": "2024-01-01", "visitors": 340, "pageviews": 1200 },
    { "date": "2024-01-02", "visitors": 412, "pageviews": 1480 }
  ]
}`}</CodeBlock>
          </section>

          {/* Current Visitors */}
          <section id="currentVisitors" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.currentVisitors")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.currentVisitors.description")}</p>
            <div className="flex items-center font-mono text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded px-4 py-2.5 mb-4">
              <MethodBadge method="GET" />
              <span className="text-slate-700 dark:text-slate-300">/api/stats/:domain/current-visitors</span>
            </div>
            <CodeBlock label="Response">{`{
  "code": 200,
  "data": { "current_visitors": 47 }
}`}</CodeBlock>
          </section>

          {/* V2 Query */}
          <section id="v2Query" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.v2Query")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.v2Query.description")}</p>
            <div className="flex items-center font-mono text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded px-4 py-2.5 mb-4">
              <MethodBadge method="POST" />
              <span className="text-slate-700 dark:text-slate-300">/api/v2/query/:domain</span>
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.table.requestBody")}</h3>
            <ParamTable rows={[
              { name: "date_range", req: true, desc: t("docs.params.dateRange") },
              { name: "metrics", req: true, desc: t("docs.params.metricsV2") },
              { name: "dimensions", desc: t("docs.params.dimensionsV2") },
              { name: "filters", desc: t("docs.params.filtersV2") },
              { name: "order_by", desc: t("docs.params.orderBy") },
              { name: "limit", desc: t("docs.params.limit") },
              { name: "offset", desc: t("docs.params.offset") },
            ]} />
            <CodeBlock label="Request">{`curl -X POST https://your-instance.com/api/v2/query/example.com \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "date_range": ["2024-01-01", "2024-01-31"],
    "metrics": ["visitors", "pageviews", "bounce_rate"],
    "dimensions": ["visit:source"],
    "order_by": [["visitors", "desc"]],
    "limit": 20
  }'`}</CodeBlock>
            <CodeBlock label="Response">{`{
  "code": 200,
  "data": {
    "results": [
      {
        "dimensions": ["Google"],
        "metrics":    [5820, 18400, 38.2]
      }
    ],
    "meta": {
      "metrics":    ["visitors", "pageviews", "bounce_rate"],
      "dimensions": ["visit:source"]
    }
  }
}`}</CodeBlock>
          </section>

          {/* Metrics */}
          <section id="metrics" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.metrics")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.metrics.description")}</p>
            <RefGrid items={[
              { code: "visitors", desc: t("docs.metrics.visitors") },
              { code: "pageviews", desc: t("docs.metrics.pageviews") },
              { code: "visits", desc: t("docs.metrics.visits") },
              { code: "bounce_rate", desc: t("docs.metrics.bounceRate") },
              { code: "visit_duration", desc: t("docs.metrics.visitDuration") },
              { code: "time_on_page", desc: t("docs.metrics.timeOnPage") },
              { code: "scroll_depth", desc: t("docs.metrics.scrollDepth") },
              { code: "exit_rate", desc: t("docs.metrics.exitRate") },
              { code: "views_per_visit", desc: t("docs.metrics.viewsPerVisit") },
              { code: "events", desc: t("docs.metrics.events") },
            ]} />
          </section>

          {/* Dimensions */}
          <section id="dimensions" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.dimensions")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.dimensions.description")}</p>
            <RefGrid items={[
              { code: "visit:source", desc: t("docs.dimensions.source") },
              { code: "event:page", desc: t("docs.dimensions.page") },
              { code: "visit:entry_page", desc: t("docs.dimensions.entryPage") },
              { code: "visit:exit_page", desc: t("docs.dimensions.exitPage") },
              { code: "visit:country", desc: t("docs.dimensions.country") },
              { code: "visit:region", desc: t("docs.dimensions.region") },
              { code: "visit:city", desc: t("docs.dimensions.city") },
              { code: "visit:browser", desc: t("docs.dimensions.browser") },
              { code: "visit:os", desc: t("docs.dimensions.os") },
              { code: "visit:device", desc: t("docs.dimensions.device") },
              { code: "visit:screen_size", desc: t("docs.dimensions.screenSize") },
              { code: "event:name", desc: t("docs.dimensions.eventName") },
            ]} />
          </section>

          {/* Filters */}
          <section id="filters" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.filters")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.filters.description")}</p>
            <CodeBlock label="Filter Structure">{`// Each filter is a tuple: [operator, dimension, [value]]
[
  ["is",         "visit:country", ["US", "GB"]],
  ["is_not",     "visit:browser", ["IE"]],
  ["contains",   "event:page",    ["/blog"]],
  ["not_contains","visit:source", ["spam"]]
]`}</CodeBlock>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.filters.operators.heading")}</h3>
            <ParamTable rows={[
              { name: "is", desc: t("docs.filters.is") },
              { name: "is_not", desc: t("docs.filters.isNot") },
              { name: "contains", desc: t("docs.filters.contains") },
              { name: "not_contains", desc: t("docs.filters.notContains") },
              { name: "matches", desc: t("docs.filters.matches") },
            ]} />
          </section>

          {/* Periods */}
          <section id="periods" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.periods")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.periods.description")}</p>
            <ParamTable rows={[
              { name: "day", desc: t("docs.periods.day") },
              { name: "p7", desc: t("docs.periods.p7") },
              { name: "p30", desc: t("docs.periods.p30") },
              { name: "month", desc: t("docs.periods.month") },
              { name: "6mo", desc: t("docs.periods.sixMonth") },
              { name: "12mo", desc: t("docs.periods.twelveMonth") },
              { name: "custom", desc: t("docs.periods.custom") },
            ]} />
          </section>

          {/* Goals */}
          <section id="goals" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.goals")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.goals.description")}</p>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.goals.create.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.goals.create.description")}</p>
            <Callout type="info">{t("docs.sections.goals.callout")}</Callout>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.goals.types.heading")}</h3>
            <ParamTable rows={[
              { name: t("docs.sections.goals.types.pageview"), desc: t("docs.sections.goals.types.pageviewDesc") },
              { name: t("docs.sections.goals.types.event"), desc: t("docs.sections.goals.types.eventDesc") },
            ]} />
          </section>

          {/* Funnels */}
          <section id="funnels" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.funnels")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.funnels.description")}</p>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.funnels.create.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">{t("docs.sections.funnels.create.description")}</p>
            <Callout type="info">{t("docs.sections.funnels.callout")}</Callout>
          </section>

          {/* Segments */}
          <section id="segments" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.segments")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.segments.description")}</p>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.segments.management.heading")}</h3>
            <ParamTable rows={[
              { name: "GET /segments", desc: t("docs.sections.segments.management.list") },
              { name: "POST /segments", desc: t("docs.sections.segments.management.create") },
              { name: "PUT /segments/:id", desc: t("docs.sections.segments.management.update") },
              { name: "DELETE /segments/:id", desc: t("docs.sections.segments.management.delete") },
            ]} />
            <CodeBlock label="Create Segment">{`curl -X POST https://your-instance.com/api/sites/example.com/segments \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Mobile US Users",
    "description": "US visitors on mobile devices",
    "filters": [
      ["is", "visit:country", ["US"]],
      ["is", "visit:device",  ["mobile"]]
    ]
  }'`}</CodeBlock>
          </section>

          {/* Shared Links */}
          <section id="sharedLinks" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.sharedLinks")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.sharedLinks.description")}</p>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.sharedLinks.create.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.sharedLinks.create.description")}</p>
            <CodeBlock label="Create Shared Link">{`curl -X POST https://your-instance.com/api/sites/example.com/shared-links \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "Public Dashboard" }'`}</CodeBlock>
            <CodeBlock label="Response">{`{
  "code": 200,
  "data": {
    "id":   42,
    "name": "Public Dashboard",
    "slug": "abc123xyz",
    "url":  "https://your-instance.com/share/abc123xyz"
  }
}`}</CodeBlock>
            <Callout type="info">{t("docs.sections.sharedLinks.callout")}</Callout>
          </section>

          {/* Shields */}
          <section id="shields" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.shields")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.shields.description")}</p>
            <Callout type="warn">{t("docs.sections.shields.callout")}</Callout>

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.shields.ip.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.shields.ip.description")}</p>

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.shields.hostname.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.shields.hostname.description")}</p>
            <CodeBlock label="Example">{`*.example.com   → matches app.example.com, www.example.com
example.com     → exact match only`}</CodeBlock>

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.shields.country.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.shields.country.description")}</p>

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.shields.referrer.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">{t("docs.sections.shields.referrer.description")}</p>
          </section>

          {/* Email Reports */}
          <section id="emailReports" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.emailReports")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.emailReports.description")}</p>

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.emailReports.weekly.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.emailReports.weekly.description")}</p>

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.emailReports.monthly.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.emailReports.monthly.description")}</p>
            <Callout type="info">{t("docs.sections.emailReports.callout")}</Callout>
          </section>

          {/* Traffic Alerts */}
          <section id="trafficAlerts" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.trafficAlerts")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.trafficAlerts.description")}</p>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.trafficAlerts.settings.heading")}</h3>
            <ParamTable rows={[
              { name: "threshold", desc: t("docs.sections.trafficAlerts.settings.threshold") },
              { name: "interval", desc: t("docs.sections.trafficAlerts.settings.interval") },
              { name: "recipients", desc: t("docs.sections.trafficAlerts.settings.recipients") },
            ]} />
            <Callout type="info">{t("docs.sections.trafficAlerts.callout")}</Callout>
          </section>

          {/* Deployment */}
          <section id="deployment" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.deployment")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.deployment.description")}</p>

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.deployment.quickStart.heading")}</h3>
            <CodeBlock label="1. Clone">{`git clone https://github.com/zenstats/zenstats-deploy
cd zenstats-deploy`}</CodeBlock>
            <CodeBlock label="2. Configure">{`cp .env.example .env
# Edit .env — set ZENSTATS_SECRET_KEY and ZENSTATS_DOMAIN at minimum`}</CodeBlock>
            <CodeBlock label="3. Deploy">{`docker compose up -d`}</CodeBlock>

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.deployment.envVars.heading")}</h3>
            <ParamTable rows={[
              { name: "ZENSTATS_SECRET_KEY", req: true, desc: t("docs.sections.deployment.envVars.secretKey") },
              { name: "ZENSTATS_DOMAIN", req: true, desc: t("docs.sections.deployment.envVars.domain") },
              { name: "DB_PASSWORD", desc: t("docs.sections.deployment.envVars.dbPassword") },
              { name: "ZENSTATS_MAXMIND_LICENSE_KEY", desc: t("docs.sections.deployment.envVars.maxmindKey") },
              { name: "ZENSTATS_LOG_LEVEL", desc: t("docs.sections.deployment.envVars.logLevel") },
            ]} />

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.deployment.services.heading")}</h3>
            <ParamTable rows={[
              { name: "frontend", desc: t("docs.sections.deployment.services.frontend") },
              { name: "zenstats", desc: t("docs.sections.deployment.services.backend") },
              { name: "zenstats_db", desc: t("docs.sections.deployment.services.postgres") },
              { name: "zenstats_events_db", desc: t("docs.sections.deployment.services.clickhouse") },
            ]} />
            <Callout type="warn">{t("docs.sections.deployment.callout")}</Callout>
          </section>

          {/* Health */}
          <section id="health" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.health")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.health.description")}</p>
            <div className="flex items-center font-mono text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded px-4 py-2.5 mb-2">
              <MethodBadge method="GET" />
              <span className="text-slate-700 dark:text-slate-300">/health/live</span>
            </div>
            <div className="flex items-center font-mono text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded px-4 py-2.5 mb-4">
              <MethodBadge method="GET" />
              <span className="text-slate-700 dark:text-slate-300">/health/ready</span>
            </div>
            <CodeBlock label="Response">{`{ "status": "ok" }`}</CodeBlock>
          </section>

          {/* Footer */}
          <footer className="mt-16 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>{t("docs.footer.copyright")}</span>
            <a href="https://github.com/zenstats/zenstats" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              GitHub
            </a>
          </footer>
        </div>
      </main>
    </div>
  );
}
