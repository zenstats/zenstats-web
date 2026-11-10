import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Search,
  X,
  Menu,
  Sun,
  Moon,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
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
    items: ["heatmap", "userFlows", "goals", "funnels", "segments", "sharedLinks"],
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
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState("introduction");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const toggleLang = () => {
    const nextLang = i18n.language.startsWith("zh") ? "en" : "zh-CN";
    i18n.changeLanguage(nextLang);
  };

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
      setMobileMenuOpen(false);
    }
  };

  const navKey = (item: string) => `docs.nav.${item}`;

  // 搜索过滤小节
  const filteredNavSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return NAV_SECTIONS;

    return NAV_SECTIONS.map((group) => {
      const groupTitle = t(`docs.nav.groups.${group.groupKey}`).toLowerCase();
      const matchedItems = group.items.filter((item) => {
        const itemTitle = t(navKey(item)).toLowerCase();
        return item.toLowerCase().includes(q) || itemTitle.includes(q) || groupTitle.includes(q);
      });
      return {
        ...group,
        items: matchedItems,
      };
    }).filter((group) => group.items.length > 0);
  }, [searchQuery, t]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col md:flex-row">
      {/* 移动端顶部吸顶 Bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-white/95 dark:bg-[#030712]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Open menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img src={isDark ? LogoHorizontalDark : LogoHorizontal} alt="ZenStats" className="h-7 w-auto" />
            <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
              Docs
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
          <button
            onClick={toggleLang}
            className="px-2 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {i18n.language.startsWith("zh") ? "EN" : "中"}
          </button>
        </div>
      </div>

      {/* 移动端遮罩层 */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 侧边栏 Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-72 md:w-64 z-50 flex flex-col bg-slate-50/90 dark:bg-[#0d1117] border-r border-slate-200/90 dark:border-[#21262d] backdrop-blur-sm transition-transform duration-200 ease-in-out md:translate-x-0 overflow-hidden shadow-xs",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Logo 标题区域 */}
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-[#21262d] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline group">
            <img src={isDark ? LogoHorizontalDark : LogoHorizontal} alt="ZenStats" className="h-7 w-auto transition-transform group-hover:scale-102" />
            <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
              Docs
            </span>
          </Link>
          <Link
            to="/"
            className="px-2 py-1 rounded-md text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 transition flex items-center gap-1"
            title="返回产品首页"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">主页</span>
          </Link>
        </div>

        {/* 侧边栏搜索框 */}
        <div className="p-3 border-b border-slate-200/70 dark:border-[#21262d]/80 bg-white/40 dark:bg-slate-950/30">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("docs.searchPlaceholder", "快速检索 API / 小节...")}
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 shadow-2xs transition"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <kbd className="absolute right-2 text-[10px] font-mono text-slate-400 px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 select-none">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* 导航菜单列表 */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          {filteredNavSections.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              未找到匹配的文档小节
            </div>
          ) : (
            filteredNavSections.map((group) => (
              <div key={group.groupKey} className="mb-5">
                <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-[#6e7681]">
                  {t(`docs.nav.groups.${group.groupKey}`)}
                </div>
                {group.items.map((item) => (
                  <button
                    key={item}
                    onClick={() => scrollTo(item)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 rounded text-[13px] transition-colors block truncate",
                      active === item
                        ? "text-emerald-600 bg-emerald-50 font-medium dark:text-emerald-400 dark:bg-[#161b22]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#7d8590] dark:hover:text-[#e6edf3] dark:hover:bg-slate-800/40",
                    )}
                  >
                    {t(navKey(item))}
                  </button>
                ))}
              </div>
            ))
          )}
        </nav>

        {/* 侧边栏底部快捷操作 */}
        <div className="p-3 border-t border-slate-200 dark:border-[#21262d] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-[#0d1117]">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{isDark ? "Light" : "Dark"}</span>
          </button>
          <button
            onClick={toggleLang}
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {i18n.language.startsWith("zh") ? "English" : "简体中文"}
          </button>
        </div>
      </aside>

      {/* 主内容区 Content */}
      <main ref={contentRef} className="md:ml-64 flex-1 min-w-0 flex flex-col">
        {/* 桌面端顶部小工具条 */}
        <div className="hidden md:flex items-center justify-between px-8 py-3.5 border-b border-slate-100 dark:border-slate-800/80 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition">
              <ArrowLeft className="w-3 h-3" />
              <span>{t("docs.backHome", "返回产品首页")}</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="font-mono text-slate-800 dark:text-slate-200">REST API & Documentation</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/zenstats/zenstats"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <Link
              to="/login"
              className="px-3 py-1 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
            >
              {t("docs.loginDashboard", "登录控制台")}
            </Link>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 md:px-8 py-8 md:py-12 w-full">

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

          {/* Heatmap */}
          <section id="heatmap" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">
              {t('docs.nav.heatmap')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
              ZenStats 原生内置高性能点击热力图（Click Heatmaps）系统，基于 ClickHouse 列式存储与相对坐标网格归一化算法，无需引入庞大的第三方重型 SDK（如 Hotjar / CrazyEgg），即可直观还原访客在页面各区域与交互元素上的真实点击密度分布。
            </p>

            <Callout type="info">
              热力点击事件通过独立的批处理管道（Batch Ingestion）上报与隔离存储，<strong>绝不污染常规站点的 PV、UV、会话数与业务转化指标</strong>，保障核心统计数据的绝对干净。
            </Callout>

            {/* 核心特性与设备断点 */}
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">
              设备自适应与网格归一化 (Viewport Breakpoints)
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
              访客使用的屏幕分辨率千差万别，ZenStats 自动将访客视口划分为三大设备断点，并在 40×80 比例网格内计算相对点击百分比坐标：
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">桌面端 (Desktop)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">视口宽度 ≥ 1024px，默认捕获 1280×800 标准底图</div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">平板端 (Tablet)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">视口宽度 768px ~ 1023px，适合移动横屏与 iPad 分析</div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">移动端 (Mobile)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">视口宽度 &lt; 768px，垂直流式布局点击聚合</div>
              </div>
            </div>

            {/* Tracker 客户端配置 */}
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">
              Tracker 客户端埋点与属性配置
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
              在站点引入统计脚本时，添加以下 HTML 数据属性即可启用热力图高级捕获：
            </p>
            <ParamTable
              rows={[
                { name: "data-heatmap", req: true, desc: "设为 \"true\" 开启当前页面的点击热力捕获" },
                { name: "data-heatmap-key", desc: "模板聚合 Key。适用于动态路由页面（如 /product/:id 或 /blog/:slug），传入统一 Key（如 \"product-detail\"）将多个动态页面归纳合并到同一热力图下" },
                { name: "data-heatmap-version", desc: "发布版本号（如 \"v2.1\" 或 \"release-2026-11\"），支持按版本切片观察 UI 迭代前后的点击对比" },
                { name: "data-heatmap-variant", desc: "变体标识符（如 \"default\" 或 \"variant-b\"），用于 A/B 测试场景下多实验组点击热力对比" },
              ]}
            />
            <CodeBlock label="Tracker Embed Example">
{`<script defer src="https://your-domain.com/tracker.js"
  data-site-id="demo.site"
  data-heatmap="true"
  data-heatmap-key="pricing-page"
  data-heatmap-version="v2.0"
  data-heatmap-variant="default">
</script>`}
            </CodeBlock>

            {/* 元素语义绑定与隐私忽略 */}
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">
              元素语义锚定与隐私屏蔽属性
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
              为了避免前端发布发版造成 CSS 选择器变动，以及严格遵守隐私合规要求，ZenStats 支持针对 DOM 元素配置专属属性：
            </p>
            <ParamTable
              rows={[
                {
                  name: "data-zs-id",
                  desc: (
                    <span>
                      显式指定元素的永久语义 ID（例如 <code>data-zs-id="signup.submit"</code>）。Tracker 在上报时将优先使用此 ID 作为元素标识，在元素点击排行中一目了然，彻底杜绝选择器漂移。
                    </span>
                  ),
                },
                {
                  name: "data-zs-ignore",
                  desc: (
                    <span>
                      标记忽略区域。在敏感表单、个人账户信息卡片、支付输入框添加此属性后，<strong>Tracker 会主动忽略其内部发生的任何点击事件</strong>，不记录坐标与选择器。
                    </span>
                  ),
                },
              ]}
            />
            <CodeBlock label="HTML Markup Example">
{`<!-- 显式绑定语义 ID 的重要按钮 -->
<button data-zs-id="header.cta_upgrade" class="btn btn-primary">
  立即升级套餐
</button>

<!-- 包含敏感信息的隐私忽略区域 -->
<div data-zs-ignore class="user-sensitive-billing-card">
  <input type="password" placeholder="输入密码" />
  <p>用户敏感私人账单信息（此处任何点击将被完全忽略）</p>
</div>`}
            </CodeBlock>

            {/* RESTful API 参考 */}
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">
              热力图 RESTful API 参考
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
              可通过 API 查询热力图配置、页面聚合列表与点击热点数据：
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <MethodBadge method="GET" />
                  <code className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                    /sites/:domain/heatmap/pages
                  </code>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  获取在指定时间范围内存在热力点击的页面 URL 或聚合 Key 列表。支持参数 <code>start</code>、<code>end</code>、<code>scope</code> (<code>key</code> | <code>page</code>)。
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <MethodBadge method="GET" />
                  <code className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                    /sites/:domain/heatmap/data
                  </code>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  获取点击密度热点散点阵列与元素点击排行榜（Top Elements）。
                </p>
                <CodeBlock label="cURL Example">
{`curl -X GET "https://your-instance.com/api/sites/example.com/heatmap/data?start=2026-11-01&end=2026-11-10&scope=key&key=pricing-page" \\
  -H "Authorization: Bearer <token>"`}
                </CodeBlock>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <MethodBadge method="POST" />
                  <code className="font-mono text-xs text-blue-700 dark:text-blue-400">
                    /sites/:domain/heatmap/capture
                  </code>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  为指定页面或聚合 Key 生成/上传背景底图快照，供分析界面精准比对。
                </p>
              </div>
            </div>
          </section>

          {/* User Flows */}
          <section id="userFlows" className="mb-16 scroll-mt-8">
            <h2 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">{t('docs.nav.userFlows')}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">{t('docs.sections.userFlows.description')}</p>
            <Callout type="info">{t('docs.sections.userFlows.callout')}</Callout>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-6">{t('docs.sections.userFlows.query.heading')}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
              <MethodBadge method="GET" />
              <code className="font-mono text-xs text-emerald-700 dark:text-emerald-400">/stats/:domain/user-flows</code>
            </p>
            <ParamTable rows={[
              { name: "period", req: true, desc: t("docs.params.period") },
              { name: "entry_path", desc: "限定起始落地页路径（如 / 或 /pricing），默认为空聚合全部落地页" },
              { name: "steps", desc: "流转深度步数（2 ~ 4 步，默认 3）" },
              { name: "limit", desc: "每步热门路径保留数量（3 ~ 12，默认 6），长尾页面归入 (other)" },
            ]} />
            <CodeBlock label="cURL">{`curl -X GET "https://your-instance.com/api/stats/example.com/user-flows?period=p30&steps=3&limit=6" \\
  -H "Authorization: Bearer <token>"`}</CodeBlock>
            <CodeBlock label="Example Response">{`{
  "code": 0,
  "data": {
    "nodes": [
      { "id": "0:/", "name": "/", "depth": 0 },
      { "id": "1:/pricing", "name": "/pricing", "depth": 1 },
      { "id": "1:(exit)", "name": "(exit)", "depth": 1, "is_dropoff": true }
    ],
    "links": [
      { "source": 0, "target": 1, "value": 1420 },
      { "source": 0, "target": 2, "value": 480 }
    ],
    "total_sessions": 1900,
    "drop_off_sessions": 480,
    "drop_off_rate": 25.3
  }
}`}</CodeBlock>
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
