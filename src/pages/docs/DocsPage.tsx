import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import LogoHorizontal from "@/assets/logo-h.svg";
import LogoHorizontalDark from "@/assets/logo-h-dark.svg";

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
    items: ["heatmap", "goals", "funnels", "segments", "sharedLinks"],
  },
  {
    groupKey: "siteManagement",
    items: ["shields", "emailReports", "trafficAlerts", "subAccounts"],
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
            <img src={LogoHorizontal} alt="ZenStats" className="h-6 w-auto dark:hidden" />
            <img src={LogoHorizontalDark} alt="ZenStats" className="h-6 w-auto hidden dark:block" />
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

            {/* 埋点总览：事件 = 事件名 + 属性；四种采集方式 */}
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.trackingScript.instrumentation.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.trackingScript.instrumentation.description")}</p>
            <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1 mb-2">
              <li>{t("docs.sections.trackingScript.instrumentation.ways.auto")}</li>
              <li>{t("docs.sections.trackingScript.instrumentation.ways.tagged")}</li>
              <li>{t("docs.sections.trackingScript.instrumentation.ways.js")}</li>
              <li>{t("docs.sections.trackingScript.instrumentation.ways.server")}</li>
            </ul>

            {/* 内置事件名（自动采集） */}
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.trackingScript.auto.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.trackingScript.auto.description")}</p>
            <ParamTable rows={[
              { name: "pageview", desc: t("docs.sections.trackingScript.auto.events.pageview") },
              { name: "engagement", desc: t("docs.sections.trackingScript.auto.events.engagement") },
              { name: "Outbound Link: Click", desc: t("docs.sections.trackingScript.auto.events.outbound") },
              { name: "File Download", desc: t("docs.sections.trackingScript.auto.events.download") },
              { name: "Form: Submission", desc: t("docs.sections.trackingScript.auto.events.form") },
            ]} />
            <Callout type="info">{t("docs.sections.trackingScript.auto.callout")}</Callout>

            {/* 事件名规则 */}
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.trackingScript.eventName.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.trackingScript.eventName.description")}</p>
            <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1 mb-2">
              <li>{t("docs.sections.trackingScript.eventName.rules.exact")}</li>
              <li>{t("docs.sections.trackingScript.eventName.rules.reserved")}</li>
              <li>{t("docs.sections.trackingScript.eventName.rules.stable")}</li>
              <li>{t("docs.sections.trackingScript.eventName.rules.props")}</li>
            </ul>

            {/* 方式一：JS API */}
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.trackingScript.js.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.trackingScript.js.description")}</p>
            <CodeBlock label="JavaScript">{`// Named event
zenstats('Signup')

// With custom properties
zenstats('Purchase', {
  props: { plan: 'pro', amount: 49 }
})

// Non-interactive: does not affect bounce rate
zenstats('Scroll Depth', { interactive: false })

// Callback: status = HTTP code, ignored = filtered (bot / exclusion)
zenstats('Download', {
  callback: (r) => console.log(r.status, r.ignored)
})`}</CodeBlock>

            {/* 方式二：CSS class 无代码埋点 */}
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.trackingScript.tagged.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.trackingScript.tagged.description")}</p>
            <CodeBlock label="HTML">{`<!-- Button click -->
<button class="event-name=Signup">Sign Up</button>

<!-- Link click ("+" becomes a space: "Pricing Click"); url prop is added automatically -->
<a href="/pricing" class="event-name=Pricing+Click">View Pricing</a>

<!-- Extra props via event-<key>=<value> -->
<button class="event-name=Purchase event-plan=Pro event-amount=99">Buy Pro</button>

<!-- Form submission (otherwise recorded as "Form: Submission") -->
<form class="event-name=Contact+Form">…</form>`}</CodeBlock>
            <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1 mb-2">
              <li>{t("docs.sections.trackingScript.tagged.rules.plus")}</li>
              <li>{t("docs.sections.trackingScript.tagged.rules.parents")}</li>
              <li>{t("docs.sections.trackingScript.tagged.rules.link")}</li>
            </ul>
            <Callout type="warn">{t("docs.sections.trackingScript.tagged.callout")}</Callout>

            {/* 自定义属性：如何发、如何查 */}
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.trackingScript.props.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.trackingScript.props.description")}</p>
            <CodeBlock label="Breakdown by property">{`curl -X POST https://your-instance.com/api/v2/query/example.com \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "period": "p30",
    "metrics": ["visitors", "events"],
    "dimensions": ["event:props:plan"],
    "filters": [["is", "event:name", ["Purchase"]]]
  }'`}</CodeBlock>
            <Callout type="info">{t("docs.sections.trackingScript.props.callout")}</Callout>

            {/* 方式三：服务端上报 */}
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.trackingScript.server.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.trackingScript.server.description")}</p>
            <CodeBlock label="POST /api/event">{`{
  "n": "Purchase",
  "d": "example.com",
  "u": "https://example.com/checkout",
  "p": { "plan": "pro" }
}`}</CodeBlock>

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.trackingScript.revenue.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.trackingScript.revenue.description")}</p>
            <CodeBlock label="POST /api/event">{`{
  "n": "Purchase",
  "d": "example.com",
  "u": "https://example.com/checkout",
  "revenue": { "amount": "49.99", "currency": "USD" }
}`}</CodeBlock>
            <Callout type="info">{t("docs.sections.trackingScript.revenue.callout")}</Callout>
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
    "columns": ["visitors", "bounce_rate"],
    "data": [
      { "name": "Google",   "visitors": 5820, "bounce_rate": 38.2 },
      { "name": "Direct",   "visitors": 3140, "bounce_rate": 45.1 },
      { "name": "Twitter",  "visitors": 1280, "bounce_rate": 52.7 }
    ],
    "total_rows": 25
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
              { name: "period", desc: t("docs.params.periodV2") },
              { name: "date", desc: t("docs.params.date") },
              { name: "from", desc: t("docs.params.from") },
              { name: "to", desc: t("docs.params.to") },
              { name: "metrics", req: true, desc: t("docs.params.metricsV2") },
              { name: "dimensions", desc: t("docs.params.dimensionsV2") },
              { name: "filters", desc: t("docs.params.filtersV2") },
              { name: "order_by", desc: t("docs.params.orderBy") },
              { name: "limit", desc: t("docs.params.limit") },
              { name: "offset", desc: t("docs.params.offset") },
              { name: "compare", desc: t("docs.params.compare") },
              { name: "compare_from / compare_to", desc: t("docs.params.compareCustom") },
              { name: "sample_threshold", desc: t("docs.params.sampleThreshold") },
            ]} />
            <CodeBlock label="Request (breakdown)">{`curl -X POST https://your-instance.com/api/v2/query/example.com \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "period": "p30",
    "metrics": ["visitors", "pageviews", "bounce_rate"],
    "dimensions": ["visit:source"],
    "filters": [["is","visit:country",["US"]]],
    "order_by": [["visitors", "desc"]],
    "limit": 20,
    "offset": 0
  }'`}</CodeBlock>
            <CodeBlock label="Request (aggregate + comparison)">{`curl -X POST https://your-instance.com/api/v2/query/example.com \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "period": "p7",
    "metrics": ["visitors", "pageviews", "bounce_rate", "visit_duration"],
    "compare": "previous_period"
  }'`}</CodeBlock>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.v2Query.multiDim.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.v2Query.multiDim.description")}</p>
            <CodeBlock label="Request (multi-dimension breakdown)">{`curl -X POST https://your-instance.com/api/v2/query/example.com \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "period": "p30",
    "metrics": ["visitors", "total_revenue"],
    "dimensions": ["event:page", "visit:country"]
  }'
// Each result row carries every dimension column, e.g.
// { "page": "/pricing", "country": "US", "visitors": 421, "total_revenue": 1290.50 }`}</CodeBlock>
            <CodeBlock label="Response (aggregate)">{`{
  "code": 200,
  "data": {
    "results": {
      "visitors":       { "value": 12840, "change": 5.2, "comparison_value": 12208 },
      "pageviews":      { "value": 48320,  "change": 3.1, "comparison_value": 46850  },
      "bounce_rate":    { "value": 38.2,  "change": -1.5, "comparison_value": 39.8   },
      "visit_duration":  { "value": 68.5,  "change": 2.0,  "comparison_value": 67.1   }
    }
  }
}`}</CodeBlock>
            <CodeBlock label="Response (breakdown)">{`{
  "code": 200,
  "data": {
    "columns": ["visitors", "pageviews", "bounce_rate"],
    "data": [
      { "name": "Google",  "visitors": 5820, "pageviews": 18400, "bounce_rate": 32.1 },
      { "name": "Direct",  "visitors": 3140, "pageviews": 10200, "bounce_rate": 45.1 }
    ],
    "total_rows": 12
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
              { code: "conversions", desc: t("docs.metrics.conversions") },
              { code: "conversion_rate", desc: t("docs.metrics.conversionRate") },
              { code: "percentage", desc: t("docs.metrics.percentage") },
              { code: "total_revenue", desc: t("docs.metrics.totalRevenue") },
              { code: "average_revenue", desc: t("docs.metrics.averageRevenue") },
            ]} />
          </section>

          {/* Dimensions */}
          <section id="dimensions" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.dimensions")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.dimensions.description")}</p>
            <RefGrid items={[
              { code: "visit:source", desc: t("docs.dimensions.source") },
              { code: "visit:channel", desc: t("docs.dimensions.channel") },
              { code: "visit:utm_source", desc: t("docs.dimensions.utmSource") },
              { code: "visit:utm_medium", desc: t("docs.dimensions.utmMedium") },
              { code: "visit:utm_campaign", desc: t("docs.dimensions.utmCampaign") },
              { code: "visit:utm_content", desc: t("docs.dimensions.utmContent") },
              { code: "visit:utm_term", desc: t("docs.dimensions.utmTerm") },
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
              { code: "event:props:<key>", desc: t("docs.dimensions.eventProps") },
              { code: "visit:entry_page_hostname", desc: t("docs.dimensions.entryPageHostname") },
              { code: "visit:exit_page_hostname", desc: t("docs.dimensions.exitPageHostname") },
              { code: "event:hostname", desc: t("docs.dimensions.hostname") },
              { code: "event:goal", desc: t("docs.dimensions.goal") },
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
              { name: "contains_not", desc: t("docs.filters.containsNot") },
              { name: "matches_not", desc: t("docs.filters.matchesNot") },
              { name: "matches_wildcard", desc: t("docs.filters.matchesWildcard") },
              { name: "matches_wildcard_not", desc: t("docs.filters.matchesWildcardNot") },
            ]} />
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.filters.logical.heading")}</h3>
            <ParamTable rows={[
              { name: "and / or / not", desc: t("docs.filters.andOrNot") },
              { name: "has_done", desc: t("docs.filters.hasDone") },
              { name: "has_not_done", desc: t("docs.filters.hasNotDone") },
            ]} />
            <CodeBlock label="Behavioral & case-insensitive filters">{`// has_done: visitors who did an event anywhere in the session
["has_done", ["is", "event:name", ["Signup"]]]

// Case-insensitive match (default is case-sensitive) via a 4th modifier element
["is", "visit:browser", ["chrome"], {"case_sensitive": false}]`}</CodeBlock>
            <Callout type="info">{t("docs.sections.filters.caseCallout")}</Callout>
          </section>

          {/* Periods */}
          <section id="periods" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.periods")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.periods.description")}</p>
            <ParamTable rows={[
              { name: "day", desc: t("docs.periods.day") },
              { name: "realtime", desc: t("docs.periods.realtime") },
              { name: "p7", desc: t("docs.periods.p7") },
              { name: "p14", desc: t("docs.periods.p14") },
              { name: "p30", desc: t("docs.periods.p30") },
              { name: "month", desc: t("docs.periods.month") },
              { name: "6mo", desc: t("docs.periods.sixMonth") },
              { name: "12mo", desc: t("docs.periods.twelveMonth") },
              { name: "year", desc: t("docs.periods.year") },
              { name: "all", desc: t("docs.periods.all") },
              { name: "Nd / Nmo", desc: t("docs.periods.shorthand") },
              { name: "custom", desc: t("docs.periods.custom") },
            ]} />
          </section>

          {/* Goals */}
          <section id="heatmap" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t('docs.nav.heatmap')}</h2>
            {['docOverview','docGroups','docLayout','docScreenshot','docRetention','docAPI'].map(key=><p key={key} className="mb-4 text-sm text-slate-600 dark:text-slate-400">{t(`heatmap.${key}`)}</p>)}
            <CodeBlock label="Tracker">{`<script defer src="https://stats.example.com/js/script.js" data-domain="example.com"
  data-heatmap="true" data-heatmap-key="software-detail"
  data-heatmap-version="release-1" data-heatmap-variant="default"></script>
<button data-zs-id="download.primary">Download</button>
<div data-zs-ignore>Private content</div>`}</CodeBlock>
            <CodeBlock label="API">{`GET /api/sites/:domain/heatmap/pages?start=2026-11-01&end=2026-11-09&scope=key
GET /api/sites/:domain/heatmap/data?start=2026-11-01&end=2026-11-09&scope=key&page=<page JSON>
POST /api/sites/:domain/heatmap/capture
{ "url": "https://example.com/soft/example.html", "scope": "key", "page": { "...": "selected layout" } }`}</CodeBlock>
          </section>

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
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.goals.breakdown.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t("docs.sections.goals.breakdown.description")}</p>
            <CodeBlock label="Goal breakdown">{`curl -X POST https://your-instance.com/api/v2/query/example.com \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "period": "p30",
    "metrics": ["visitors", "events", "conversion_rate"],
    "dimensions": ["event:goal"]
  }'`}</CodeBlock>
            <Callout type="info">{t("docs.sections.goals.breakdown.callout")}</Callout>
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

          {/* Sub-accounts & Permissions */}
          <section id="subAccounts" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t("docs.nav.subAccounts")}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.subAccounts.description")}</p>

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.subAccounts.roles.heading")}</h3>
            <ParamTable rows={[
              { name: "viewer", desc: t("docs.sections.subAccounts.roles.viewer") },
              { name: "editor", desc: t("docs.sections.subAccounts.roles.editor") },
              { name: "admin", desc: t("docs.sections.subAccounts.roles.admin") },
              { name: "custom", desc: t("docs.sections.subAccounts.roles.custom") },
            ]} />

            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t("docs.sections.subAccounts.permissions.heading")}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{t("docs.sections.subAccounts.permissions.description")}</p>
            <RefGrid items={[
              { code: "goals:write", desc: t("docs.sections.subAccounts.permissions.goals") },
              { code: "funnels:write", desc: t("docs.sections.subAccounts.permissions.funnels") },
              { code: "segments:write", desc: t("docs.sections.subAccounts.permissions.segments") },
              { code: "shared_links:write", desc: t("docs.sections.subAccounts.permissions.sharedLinks") },
              { code: "shields:write", desc: t("docs.sections.subAccounts.permissions.shields") },
              { code: "email_reports:write", desc: t("docs.sections.subAccounts.permissions.emailReports") },
              { code: "traffic_alerts:write", desc: t("docs.sections.subAccounts.permissions.trafficAlerts") },
            ]} />
            <Callout type="info">{t("docs.sections.subAccounts.callout")}</Callout>
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
