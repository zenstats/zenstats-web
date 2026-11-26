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
  Copy,
  Check,
  Info,
  AlertTriangle,
  Hash,
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
    items: ["performance", "heatmap", "userFlows", "goals", "funnels", "segments", "sharedLinks"],
  },
  {
    groupKey: "siteManagement",
    items: ["shields", "emailReports", "trafficAlerts", "subAccounts"],
  },
  {
    groupKey: "operations",
    items: ["deployment", "health"],
  },
] as const;

const SECTION_IDS: string[] = NAV_SECTIONS.flatMap((g) => [...g.items]);

function CodeBlock({ label, children }: { label?: string; children: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-border/80 dark:border-slate-800/90 shadow-2xs">
      <div className="flex items-center justify-between bg-[#161b22] px-4 py-2 border-b border-slate-800/90">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? t("docs.copied", "Copied") : t("docs.copy", "Copy")}</span>
        </button>
      </div>
      <pre className="bg-[#0d1117] text-[#e6edf3] text-xs sm:text-[13px] font-mono p-4 overflow-x-auto leading-relaxed whitespace-pre">
        {children}
      </pre>
    </div>
  );
}

function Callout({ type = "info", children }: { type?: "info" | "warn"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-4 py-3 my-4 text-sm leading-relaxed",
        type === "info" &&
          "border-primary/25 bg-primary/[0.06] text-foreground dark:bg-primary/[0.12]",
        type === "warn" &&
          "border-amber-500/30 bg-amber-500/[0.08] text-amber-900 dark:text-amber-200 dark:bg-amber-500/[0.12]",
      )}
    >
      {type === "info" ? (
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function MethodBadge({ method }: { method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" }) {
  return (
    <span
      className={cn(
        "font-mono text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 tracking-wide",
        method === "GET" && "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
        method === "POST" && "bg-indigo-500/12 text-indigo-700 dark:text-indigo-400",
        method === "PUT" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        method === "PATCH" && "bg-violet-500/15 text-violet-700 dark:text-violet-400",
        method === "DELETE" && "bg-rose-500/12 text-rose-700 dark:text-rose-400",
      )}
    >
      {method}
    </span>
  );
}

function EndpointBar({
  method,
  path,
}: {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copyPath = () => {
    navigator.clipboard.writeText(path).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-card border border-border/80 px-3.5 py-2.5 my-3 shadow-2xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <MethodBadge method={method} />
        <code className="font-mono text-xs sm:text-sm text-foreground truncate">{path}</code>
      </div>
      <button
        type="button"
        onClick={copyPath}
        title={t("docs.copy", "Copy")}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0 px-2 py-1 rounded-md hover:bg-muted/60 transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    window.history.replaceState(null, "", `#${id}`);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <h2 className="group flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground mb-3">
      <span>{children}</span>
      <button
        type="button"
        onClick={copyLink}
        aria-label={`Copy link to ${id}`}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted/60 transition-all"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Hash className="w-4 h-4" />}
      </button>
    </h2>
  );
}

function ParamTable({ rows }: { rows: { name: string; req?: boolean; desc: React.ReactNode }[] }) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto my-4 rounded-xl border border-border/80 bg-card shadow-2xs">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border/80 bg-muted/35">
            <th className="text-left py-2.5 px-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-52">
              {t("docs.table.parameter")}
            </th>
            <th className="text-left py-2.5 px-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("docs.table.description")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((row) => (
            <tr key={row.name} className="hover:bg-muted/25 transition-colors">
              <td className="py-2.5 px-3.5 align-top">
                <code className="font-mono text-xs font-medium text-primary">{row.name}</code>
                {row.req && (
                  <span className="ml-1.5 inline-block text-[10px] font-semibold text-amber-700 bg-amber-500/12 dark:text-amber-400 px-1.5 py-0.5 rounded">
                    {t("docs.table.required", "required")}
                  </span>
                )}
              </td>
              <td className="py-2.5 px-3.5 text-muted-foreground leading-relaxed text-xs sm:text-sm">
                {row.desc}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RefGrid({ items }: { items: { code: string; desc: string }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 my-4">
      {items.map((item) => (
        <div
          key={item.code}
          className="rounded-xl border border-border/75 bg-card hover:border-primary/35 transition-colors p-3 shadow-2xs"
        >
          <code className="block text-xs text-primary font-mono font-semibold mb-1 break-all">
            {item.code}
          </code>
          <small className="text-xs text-muted-foreground leading-snug block">{item.desc}</small>
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const hasToken = typeof window !== "undefined" && Boolean(localStorage.getItem("token"));

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const toggleLang = () => {
    const nextLang = i18n.language.startsWith("zh") ? "en" : "zh-CN";
    void i18n.changeLanguage(nextLang);
  };

  // Scroll-spy for section highlighting
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

  // Scroll to initial URL hash (e.g. /docs#heatmap or /docs#trackingScript)
  useEffect(() => {
    const hashId = window.location.hash.replace(/^#/, "");
    if (hashId && SECTION_IDS.includes(hashId)) {
      const timer = window.setTimeout(() => {
        const el = document.getElementById(hashId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          setActive(hashId);
        }
      }, 60);
      return () => window.clearTimeout(timer);
    }
  }, []);

  // Working "/" keyboard shortcut to focus sidebar search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `#${id}`);
      setActive(id);
      setMobileMenuOpen(false);
    }
  };

  const navKey = (item: string) => `docs.nav.${item}`;

  const activeGroupKey = useMemo(() => {
    const found = NAV_SECTIONS.find((g) => (g.items as readonly string[]).includes(active));
    return found?.groupKey ?? "overview";
  }, [active]);

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
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile sticky top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-background/90 backdrop-blur-xl border-b border-border/80 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img src={isDark ? LogoHorizontalDark : LogoHorizontal} alt="ZenStats" className="h-7 w-auto" />
            <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              {t("docs.badge", "Docs")}
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={toggleLang}
            className="px-2 py-1 text-xs font-medium rounded-lg border border-border bg-card text-foreground hover:bg-muted transition"
          >
            {i18n.language.startsWith("zh") ? "EN" : "中"}
          </button>
        </div>
      </div>

      {/* Mobile drawer backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-72 md:w-64 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-in-out md:translate-x-0 overflow-hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Logo & home link */}
        <div className="px-4 py-3.5 border-b border-sidebar-border flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 no-underline group min-w-0">
            <img
              src={isDark ? LogoHorizontalDark : LogoHorizontal}
              alt="ZenStats"
              className="h-7 w-auto transition-transform group-hover:scale-102"
            />
            <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
              {t("docs.badge", "Docs")}
            </span>
          </Link>
          <Link
            to="/"
            className="px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition flex items-center gap-1 shrink-0"
            title={t("docs.backHome")}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("docs.backHomeShort", "Home")}</span>
          </Link>
        </div>

        {/* Search input with working "/" shortcut */}
        <div className="p-3 border-b border-sidebar-border">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchQuery("");
                  searchInputRef.current?.blur();
                }
              }}
              placeholder={t("docs.searchPlaceholder")}
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring/40 shadow-2xs transition"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <kbd className="absolute right-2 text-[10px] font-mono text-muted-foreground px-1.5 py-0.2 rounded bg-muted border border-border select-none">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Navigation sections */}
        <nav className="flex-1 py-4 px-2.5 overflow-y-auto">
          {filteredNavSections.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {t("docs.searchEmpty")}
            </div>
          ) : (
            filteredNavSections.map((group) => (
              <div key={group.groupKey} className="mb-5">
                <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/75">
                  {t(`docs.nav.groups.${group.groupKey}`)}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => scrollTo(item)}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 rounded-lg text-[13px] transition-colors block truncate",
                        active === item
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                      )}
                    >
                      {t(navKey(item))}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </nav>

        {/* Sidebar footer actions */}
        <div className="p-3 border-t border-sidebar-border flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:text-foreground hover:bg-muted transition"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{isDark ? t("docs.themeLight", "Light") : t("docs.themeDark", "Dark")}</span>
          </button>
          <button
            type="button"
            onClick={toggleLang}
            className="px-2 py-1 rounded-md border border-border bg-card text-[11px] font-medium text-foreground hover:bg-muted transition"
          >
            {i18n.language.startsWith("zh") ? "English" : "简体中文"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main ref={contentRef} className="md:ml-64 flex-1 min-w-0 flex flex-col">
        {/* Sticky desktop breadcrumb & utility bar */}
        <div className="hidden md:flex sticky top-0 z-30 items-center justify-between px-8 h-14 bg-background/85 backdrop-blur-xl border-b border-border/70 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to="/"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t("docs.backHome")}</span>
            </Link>
            <span className="text-border">/</span>
            <span className="text-muted-foreground truncate">{t(`docs.nav.groups.${activeGroupKey}`)}</span>
            <span className="text-border">/</span>
            <span className="font-medium text-foreground truncate">{t(navKey(active))}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="https://github.com/zenstats/zenstats"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <Link
              to={hasToken ? "/sites" : "/login"}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 shadow-2xs transition-colors"
            >
              {hasToken ? t("docs.openDashboard", "Open Dashboard") : t("docs.loginDashboard")}
            </Link>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 md:px-8 py-8 md:py-12 w-full">
          {/* Introduction */}
          <section id="introduction" className="mb-16 scroll-mt-20">
            <div className="mb-8 pb-8 border-b border-border/70">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
                {t("docs.hero.title")}
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-4">
                {t("docs.hero.description")}
              </p>
              <div className="flex flex-wrap gap-2">
                {(t("docs.hero.chips", { returnObjects: true }) as string[]).map((chip) => (
                  <span
                    key={chip}
                    className="text-xs font-medium px-2.5 py-1 rounded-full bg-card text-foreground/85 border border-border/80 shadow-2xs"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.introduction.baseUrl.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.introduction.baseUrl.description")}
            </p>
            <CodeBlock label={t("docs.labels.baseUrl")}>https://your-zenstats-instance.com/api</CodeBlock>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.introduction.responseFormat.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.introduction.responseFormat.description")}
            </p>
            <CodeBlock label={t("docs.labels.successResponse")}>{`{
  "code":    200,
  "message": "success",
  "data":    { ... }
}`}</CodeBlock>
            <CodeBlock label={t("docs.labels.errorResponse")}>{`{
  "code":    400,
  "message": "bad request",
  "error":   "site_id is required"
}`}</CodeBlock>
          </section>

          {/* Authentication */}
          <section id="authentication" className="mb-16 scroll-mt-20">
            <SectionHeading id="authentication">{t("docs.nav.authentication")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.authentication.description")}</p>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.authentication.apiKey.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.authentication.apiKey.description")}
            </p>
            <CodeBlock label={t("docs.labels.curl")}>{`curl https://your-instance.com/api/stats/example.com/aggregate \\
  -H "Authorization: Bearer zs_live_abc123..." \\
  -G \\
  -d "period=p30&metrics=visitors,pageviews"`}</CodeBlock>
            <Callout type="info">{t("docs.sections.authentication.apiKey.callout")}</Callout>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.authentication.jwt.heading")}
            </h3>
            <p className="text-muted-foreground text-sm">{t("docs.sections.authentication.jwt.description")}</p>
          </section>

          {/* Tracking Script */}
          <section id="trackingScript" className="mb-16 scroll-mt-20">
            <SectionHeading id="trackingScript">{t("docs.nav.trackingScript")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.trackingScript.description")}
            </p>
            <CodeBlock label={t("docs.labels.html")}>{`<script
  defer
  data-domain="example.com"
  src="https://your-instance.com/js/script.js"
></script>`}</CodeBlock>
            <p className="text-sm text-muted-foreground">{t("docs.sections.trackingScript.note")}</p>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("sites.install.optional.title")}
            </h3>
            <p className="text-sm text-muted-foreground">{t("sites.install.optional.docsHelp")}</p>
            <Callout type="info">{t("sites.install.optional.help")}</Callout>
            <ParamTable
              rows={[
                { name: "data-heatmap", desc: t("sites.install.optional.heatmap.desc") },
                { name: "data-performance", desc: t("sites.install.optional.performance.desc") },
                {
                  name: "data-heatmap-version / data-performance-version",
                  desc: t("sites.install.optional.releaseHelp"),
                },
                { name: "data-heatmap-key", desc: t("sites.install.optional.keyHelp") },
                { name: "data-heatmap-variant", desc: t("sites.install.optional.variantHelp") },
              ]}
            />
            <CodeBlock label={t("docs.labels.heatmapsAndVitals")}>{`<script defer crossorigin="anonymous"
  data-domain="example.com"
  src="https://your-instance.com/js/script.heatmap.performance.js"
  data-heatmap="true"
  data-heatmap-version="release-1"
  data-heatmap-variant="default"
  data-performance="true"
  data-performance-version="release-1"></script>`}</CodeBlock>
            <p className="text-sm text-muted-foreground">{t("sites.install.optional.deployHelp")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("sites.install.optional.proxyHelp")}</p>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.trackingScript.instrumentation.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.trackingScript.instrumentation.description")}
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mb-2">
              <li>{t("docs.sections.trackingScript.instrumentation.ways.auto")}</li>
              <li>{t("docs.sections.trackingScript.instrumentation.ways.tagged")}</li>
              <li>{t("docs.sections.trackingScript.instrumentation.ways.js")}</li>
              <li>{t("docs.sections.trackingScript.instrumentation.ways.server")}</li>
            </ul>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.trackingScript.auto.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.trackingScript.auto.description")}
            </p>
            <ParamTable
              rows={[
                { name: "pageview", desc: t("docs.sections.trackingScript.auto.events.pageview") },
                { name: "engagement", desc: t("docs.sections.trackingScript.auto.events.engagement") },
                { name: "Outbound Link: Click", desc: t("docs.sections.trackingScript.auto.events.outbound") },
                { name: "File Download", desc: t("docs.sections.trackingScript.auto.events.download") },
                { name: "Form: Submission", desc: t("docs.sections.trackingScript.auto.events.form") },
              ]}
            />
            <Callout type="info">{t("docs.sections.trackingScript.auto.callout")}</Callout>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.trackingScript.eventName.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.trackingScript.eventName.description")}
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mb-2">
              <li>{t("docs.sections.trackingScript.eventName.rules.exact")}</li>
              <li>{t("docs.sections.trackingScript.eventName.rules.reserved")}</li>
              <li>{t("docs.sections.trackingScript.eventName.rules.stable")}</li>
              <li>{t("docs.sections.trackingScript.eventName.rules.props")}</li>
            </ul>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.trackingScript.js.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.trackingScript.js.description")}
            </p>
            <CodeBlock label={t("docs.labels.javascript")}>{`// 1. Trigger a named custom event
zenstats('Signup')

// 2. Attach custom properties (key/value pairs)
zenstats('Purchase', {
  props: { plan: 'pro', amount: 49 }
})

// 3. Non-interactive event (excluded from bounce-rate impact)
zenstats('Scroll Depth', { interactive: false })

// 4. Optional callback with HTTP status and shield ignore flag
zenstats('Download', {
  callback: (r) => console.log(r.status, r.ignored)
})`}</CodeBlock>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.trackingScript.tagged.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.trackingScript.tagged.description")}
            </p>
            <CodeBlock label={t("docs.labels.htmlMarkup")}>{`<!-- Custom event on button click -->
<button class="event-name=Signup">Sign Up</button>

<!-- Link click ("+" becomes space: "Pricing Click"; url prop auto-filled) -->
<a href="/pricing" class="event-name=Pricing+Click">Pricing</a>

<!-- Additional event-<key>=<value> custom properties -->
<button class="event-name=Purchase event-plan=Pro event-amount=99">Buy Pro</button>

<!-- Form submit (defaults to "Form: Submission" if no event-name given) -->
<form class="event-name=Contact+Form">…</form>`}</CodeBlock>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mb-2">
              <li>{t("docs.sections.trackingScript.tagged.rules.plus")}</li>
              <li>{t("docs.sections.trackingScript.tagged.rules.parents")}</li>
              <li>{t("docs.sections.trackingScript.tagged.rules.link")}</li>
            </ul>
            <Callout type="warn">{t("docs.sections.trackingScript.tagged.callout")}</Callout>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.trackingScript.props.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.trackingScript.props.description")}
            </p>
            <CodeBlock label={t("docs.labels.propBreakdown")}>{`curl -X POST https://your-instance.com/api/v2/query/example.com \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "period": "p30",
    "metrics": ["visitors", "events"],
    "dimensions": ["event:props:plan"],
    "filters": [["is", "event:name", ["Purchase"]]]
  }'`}</CodeBlock>
            <Callout type="info">{t("docs.sections.trackingScript.props.callout")}</Callout>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.trackingScript.server.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.trackingScript.server.description")}
            </p>
            <CodeBlock label="POST /api/event">{`{
  "n": "Purchase",
  "d": "example.com",
  "u": "https://example.com/checkout",
  "p": { "plan": "pro" }
}`}</CodeBlock>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.trackingScript.revenue.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.trackingScript.revenue.description")}
            </p>
            <CodeBlock label="POST /api/event">{`{
  "n": "Purchase",
  "d": "example.com",
  "u": "https://example.com/checkout",
  "revenue": { "amount": "49.99", "currency": "USD" }
}`}</CodeBlock>
            <Callout type="info">{t("docs.sections.trackingScript.revenue.callout")}</Callout>
          </section>

          {/* Aggregate */}
          <section id="aggregate" className="mb-16 scroll-mt-20">
            <SectionHeading id="aggregate">{t("docs.nav.aggregate")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.aggregate.description")}</p>
            <EndpointBar method="GET" path="/api/stats/:domain/aggregate" />

            <h3 className="font-semibold text-foreground mb-2 mt-6">{t("docs.table.queryParameters")}</h3>
            <ParamTable
              rows={[
                {
                  name: "period",
                  req: true,
                  desc: (
                    <>
                      {t("docs.params.period")}{" "}
                      <a href="#periods" className="text-primary hover:underline">
                        {t("docs.nav.periods")}
                      </a>
                      .
                    </>
                  ),
                },
                {
                  name: "metrics",
                  desc: (
                    <>
                      {t("docs.params.metrics")}{" "}
                      <a href="#metrics" className="text-primary hover:underline">
                        {t("docs.nav.metrics")}
                      </a>
                      .
                    </>
                  ),
                },
                {
                  name: "filters",
                  desc: (
                    <>
                      {t("docs.params.filters")}{" "}
                      <a href="#filters" className="text-primary hover:underline">
                        {t("docs.nav.filters")}
                      </a>
                      .
                    </>
                  ),
                },
                { name: "compare", desc: t("docs.params.compare") },
                { name: "date", desc: t("docs.params.date") },
                { name: "from", desc: t("docs.params.from") },
                { name: "to", desc: t("docs.params.to") },
              ]}
            />
            <CodeBlock label={t("docs.labels.request")}>{`curl https://your-instance.com/api/stats/example.com/aggregate \\
  -H "Authorization: Bearer <token>" \\
  -G \\
  -d "period=p30&metrics=visitors,pageviews,bounce_rate"`}</CodeBlock>
            <CodeBlock label={t("docs.labels.response")}>{`{
  "code": 200,
  "data": {
    "results": {
      "visitors":    { "value": 12840, "change": 5.2 },
      "pageviews":   { "value": 48320, "change": 3.1 },
      "bounce_rate": { "value": 42.7,  "change": -1.4 }
    }
  }
}`}</CodeBlock>
          </section>

          {/* Breakdown */}
          <section id="breakdown" className="mb-16 scroll-mt-20">
            <SectionHeading id="breakdown">{t("docs.nav.breakdown")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.breakdown.description")}</p>
            <EndpointBar method="GET" path="/api/stats/:domain/breakdown" />

            <h3 className="font-semibold text-foreground mb-2 mt-6">{t("docs.table.queryParameters")}</h3>
            <ParamTable
              rows={[
                { name: "period", req: true, desc: t("docs.params.period") },
                {
                  name: "property",
                  req: true,
                  desc: (
                    <>
                      {t("docs.params.property")}{" "}
                      <a href="#dimensions" className="text-primary hover:underline">
                        {t("docs.nav.dimensions")}
                      </a>
                      .
                    </>
                  ),
                },
                { name: "metrics", desc: t("docs.params.metrics") },
                { name: "filters", desc: t("docs.params.filters") },
                { name: "limit", desc: t("docs.params.limit") },
                { name: "page", desc: t("docs.params.page") },
                { name: "from", desc: t("docs.params.from") },
                { name: "to", desc: t("docs.params.to") },
              ]}
            />
            <CodeBlock label={t("docs.labels.request")}>{`curl https://your-instance.com/api/stats/example.com/breakdown \\
  -H "Authorization: Bearer <token>" \\
  -G \\
  -d "period=p30&property=visit:source&metrics=visitors,bounce_rate"`}</CodeBlock>
            <CodeBlock label={t("docs.labels.response")}>{`{
  "code": 200,
  "data": {
    "columns": ["source", "visitors", "bounce_rate"],
    "data": [
      { "source": "Google",  "visitors": 5820, "bounce_rate": 38.2 },
      { "source": "Direct",  "visitors": 3140, "bounce_rate": 45.1 },
      { "source": "Twitter", "visitors": 1280, "bounce_rate": 52.7 }
    ],
    "total_rows": 25
  }
}`}</CodeBlock>
          </section>

          {/* Timeseries */}
          <section id="timeseries" className="mb-16 scroll-mt-20">
            <SectionHeading id="timeseries">{t("docs.nav.timeseries")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.timeseries.description")}</p>
            <EndpointBar method="GET" path="/api/stats/:domain/main-graph" />

            <h3 className="font-semibold text-foreground mb-2 mt-6">{t("docs.table.queryParameters")}</h3>
            <ParamTable
              rows={[
                { name: "period", req: true, desc: t("docs.params.period") },
                { name: "interval", desc: t("docs.params.interval") },
                { name: "metrics", desc: t("docs.params.metrics") },
                { name: "filters", desc: t("docs.params.filters") },
                { name: "date", desc: t("docs.params.date") },
                { name: "from", desc: t("docs.params.from") },
                { name: "to", desc: t("docs.params.to") },
              ]}
            />
            <CodeBlock label={t("docs.labels.response")}>{`{
  "code": 200,
  "data": [
    {
      "timestamp": "2026-11-01",
      "metrics": { "visitors": 340, "pageviews": 1200 }
    },
    {
      "timestamp": "2026-11-02",
      "metrics": { "visitors": 412, "pageviews": 1480 }
    }
  ]
}`}</CodeBlock>
          </section>

          {/* Current Visitors */}
          <section id="currentVisitors" className="mb-16 scroll-mt-20">
            <SectionHeading id="currentVisitors">{t("docs.nav.currentVisitors")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">
              {t("docs.sections.currentVisitors.description")}
            </p>
            <EndpointBar method="GET" path="/api/stats/:domain/current-visitors" />
            <CodeBlock label={t("docs.labels.response")}>{`{
  "code": 200,
  "data": {
    "total": 47,
    "visitors": 47,
    "sessions": 52,
    "last_updated": "2026-11-26T06:00:00Z"
  }
}`}</CodeBlock>
          </section>

          {/* V2 Query */}
          <section id="v2Query" className="mb-16 scroll-mt-20">
            <SectionHeading id="v2Query">{t("docs.nav.v2Query")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.v2Query.description")}</p>
            <EndpointBar method="POST" path="/api/v2/query/:domain" />

            <h3 className="font-semibold text-foreground mb-2 mt-6">{t("docs.table.requestBody")}</h3>
            <ParamTable
              rows={[
                { name: "period", desc: t("docs.params.periodV2") },
                { name: "date_range", desc: t("docs.params.dateRange") },
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
              ]}
            />
            <CodeBlock label={t("docs.labels.request")}>{`curl -X POST https://your-instance.com/api/v2/query/example.com \\
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
            <CodeBlock label={t("docs.labels.request")}>{`curl -X POST https://your-instance.com/api/v2/query/example.com \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "period": "p7",
    "metrics": ["visitors", "pageviews", "bounce_rate", "visit_duration"],
    "compare": "previous_period"
  }'`}</CodeBlock>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.v2Query.multiDim.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.v2Query.multiDim.description")}
            </p>
            <CodeBlock label={t("docs.labels.request")}>{`curl -X POST https://your-instance.com/api/v2/query/example.com \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "period": "p30",
    "metrics": ["visitors", "total_revenue"],
    "dimensions": ["event:page", "visit:country"]
  }'
// Each row includes columns for every requested dimension:
// { "page": "/pricing", "country": "US", "visitors": 421, "total_revenue": 1290.50 }`}</CodeBlock>
            <CodeBlock label={t("docs.labels.response")}>{`{
  "code": 200,
  "data": {
    "results": {
      "visitors":       { "value": 12840, "change": 5.2, "comparison_value": 12208 },
      "pageviews":      { "value": 48320, "change": 3.1, "comparison_value": 46850 },
      "bounce_rate":    { "value": 38.2,  "change": -1.5, "comparison_value": 39.8 },
      "visit_duration": { "value": 68.5,  "change": 2.0, "comparison_value": 67.1 }
    }
  }
}`}</CodeBlock>
            <CodeBlock label={t("docs.labels.response")}>{`{
  "code": 200,
  "data": {
    "columns": ["source", "visitors", "pageviews", "bounce_rate"],
    "data": [
      { "source": "Google", "visitors": 5820, "pageviews": 18400, "bounce_rate": 32.1 },
      { "source": "Direct", "visitors": 3140, "pageviews": 10200, "bounce_rate": 45.1 }
    ],
    "total_rows": 12
  }
}`}</CodeBlock>
          </section>

          {/* Metrics */}
          <section id="metrics" className="mb-16 scroll-mt-20">
            <SectionHeading id="metrics">{t("docs.nav.metrics")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.metrics.description")}</p>
            <RefGrid
              items={[
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
              ]}
            />
          </section>

          {/* Dimensions */}
          <section id="dimensions" className="mb-16 scroll-mt-20">
            <SectionHeading id="dimensions">{t("docs.nav.dimensions")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.dimensions.description")}</p>
            <RefGrid
              items={[
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
              ]}
            />
          </section>

          {/* Filters */}
          <section id="filters" className="mb-16 scroll-mt-20">
            <SectionHeading id="filters">{t("docs.nav.filters")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.filters.description")}</p>
            <CodeBlock label={t("docs.labels.filterStructure")}>{`// Each filter is a tuple: [operator, dimension, [values]]
[
  ["is",           "visit:country", ["US", "GB"]],
  ["is_not",       "visit:browser", ["IE"]],
  ["contains",     "event:page",    ["/blog"]],
  ["not_contains", "visit:source",  ["spam"]]
]`}</CodeBlock>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.filters.operators.heading")}
            </h3>
            <ParamTable
              rows={[
                { name: "is", desc: t("docs.filters.is") },
                { name: "is_not", desc: t("docs.filters.isNot") },
                { name: "contains", desc: t("docs.filters.contains") },
                { name: "not_contains", desc: t("docs.filters.notContains") },
                { name: "matches", desc: t("docs.filters.matches") },
                { name: "contains_not", desc: t("docs.filters.containsNot") },
                { name: "matches_not", desc: t("docs.filters.matchesNot") },
                { name: "matches_wildcard", desc: t("docs.filters.matchesWildcard") },
                { name: "matches_wildcard_not", desc: t("docs.filters.matchesWildcardNot") },
              ]}
            />

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.filters.logical.heading")}
            </h3>
            <ParamTable
              rows={[
                { name: "and / or / not", desc: t("docs.filters.andOrNot") },
                { name: "has_done", desc: t("docs.filters.hasDone") },
                { name: "has_not_done", desc: t("docs.filters.hasNotDone") },
              ]}
            />
            <CodeBlock label={t("docs.labels.behaviorFilters")}>{`// 1. has_done: match sessions that triggered the event at least once
["has_done", ["is", "event:name", ["Signup"]]]

// 2. Case-insensitive matching (optional 4th tuple element)
["is", "visit:browser", ["chrome"], {"case_sensitive": false}]`}</CodeBlock>
            <Callout type="info">{t("docs.sections.filters.caseCallout")}</Callout>
          </section>

          {/* Periods */}
          <section id="periods" className="mb-16 scroll-mt-20">
            <SectionHeading id="periods">{t("docs.nav.periods")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.periods.description")}</p>
            <ParamTable
              rows={[
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
              ]}
            />
          </section>

          {/* Core Web Vitals (placed right before Heatmap to match NAV_SECTIONS order) */}
          <section id="performance" className="mb-16 scroll-mt-20">
            <SectionHeading id="performance">{t("docs.nav.performance")}</SectionHeading>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              {t("docs.sections.performance.description")}
            </p>
            <Callout type="info">{t("docs.sections.performance.callout")}</Callout>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.performance.metrics.heading")}
            </h3>
            <ParamTable
              rows={[
                {
                  name: t("docs.sections.performance.metrics.lcpName"),
                  desc: t("docs.sections.performance.metrics.lcpDesc"),
                },
                {
                  name: t("docs.sections.performance.metrics.inpName"),
                  desc: t("docs.sections.performance.metrics.inpDesc"),
                },
                {
                  name: t("docs.sections.performance.metrics.clsName"),
                  desc: t("docs.sections.performance.metrics.clsDesc"),
                },
                {
                  name: t("docs.sections.performance.metrics.ttfbName"),
                  desc: t("docs.sections.performance.metrics.ttfbDesc"),
                },
                {
                  name: t("docs.sections.performance.metrics.fcpName"),
                  desc: t("docs.sections.performance.metrics.fcpDesc"),
                },
              ]}
            />

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.performance.quality.heading")}
            </h3>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1.5 mb-4">
              <li>
                <strong className="text-foreground">{t("docs.sections.performance.quality.p75Title")}</strong>{" "}
                {t("docs.sections.performance.quality.p75Desc")}
              </li>
              <li>
                <strong className="text-foreground">
                  {t("docs.sections.performance.quality.foregroundTitle")}
                </strong>{" "}
                {t("docs.sections.performance.quality.foregroundDesc")}
              </li>
              <li>
                <strong className="text-foreground">
                  {t("docs.sections.performance.quality.lateInitTitle")}
                </strong>{" "}
                {t("docs.sections.performance.quality.lateInitDesc")}
              </li>
              <li>
                <strong className="text-foreground">
                  {t("docs.sections.performance.quality.fullNavTitle")}
                </strong>{" "}
                {t("docs.sections.performance.quality.fullNavDesc")}
              </li>
            </ul>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.performance.tracker.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.performance.tracker.description")}
            </p>
            <CodeBlock label={t("docs.labels.coreWebVitals")}>{`<script defer
  src="https://your-instance.com/js/script.performance.js"
  data-domain="example.com"
  data-performance="true"
  data-performance-version="release-1"></script>`}</CodeBlock>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.performance.api.heading")}
            </h3>
            <p className="text-xs text-muted-foreground mb-2">{t("docs.authJwtNote")}</p>
            <EndpointBar method="GET" path="/api/sites/:domain/performance/config" />
            <EndpointBar method="PUT" path="/api/sites/:domain/performance/config" />
            <p className="text-xs text-muted-foreground mb-4">{t("docs.sections.performance.api.configDesc")}</p>

            <EndpointBar method="GET" path="/api/sites/:domain/performance/data" />
            <p className="text-xs text-muted-foreground mb-2">{t("docs.sections.performance.api.dataDesc")}</p>
            <ParamTable
              rows={[
                { name: "start", req: true, desc: t("docs.sections.performance.api.params.start") },
                { name: "end", req: true, desc: t("docs.sections.performance.api.params.end") },
                { name: "metric", desc: t("docs.sections.performance.api.params.metric") },
                { name: "device", desc: t("docs.sections.performance.api.params.device") },
                { name: "path", desc: t("docs.sections.performance.api.params.path") },
                { name: "hostname", desc: t("docs.sections.performance.api.params.hostname") },
                { name: "release", desc: t("docs.sections.performance.api.params.release") },
                { name: "browser", desc: t("docs.sections.performance.api.params.browser") },
                { name: "country", desc: t("docs.sections.performance.api.params.country") },
                { name: "navigation", desc: t("docs.sections.performance.api.params.navigation") },
              ]}
            />
          </section>

          {/* Heatmap */}
          <section id="heatmap" className="mb-16 scroll-mt-20">
            <SectionHeading id="heatmap">{t("docs.nav.heatmap")}</SectionHeading>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              {t("docs.sections.heatmap.description")}
            </p>
            <Callout type="info">{t("docs.sections.heatmap.callout")}</Callout>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.heatmap.modes.heading")}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              {t("docs.sections.heatmap.modes.description")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
              <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-500/12 text-orange-600 dark:text-orange-400 font-bold text-xs">
                    1
                  </span>
                  <span>{t("docs.sections.heatmap.modes.clickTitle")}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("docs.sections.heatmap.modes.clickDesc")}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/12 text-primary font-bold text-xs">
                    2
                  </span>
                  <span>{t("docs.sections.heatmap.modes.scrollTitle")}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("docs.sections.heatmap.modes.scrollDesc")}
                </p>
              </div>
            </div>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.heatmap.breakpoints.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-3">
              {t("docs.sections.heatmap.breakpoints.description")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
              <div className="p-3.5 rounded-xl border border-border/80 bg-card shadow-2xs">
                <div className="font-semibold text-xs text-foreground">
                  {t("docs.sections.heatmap.breakpoints.desktopTitle")}
                </div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {t("docs.sections.heatmap.breakpoints.desktopDesc")}
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-border/80 bg-card shadow-2xs">
                <div className="font-semibold text-xs text-foreground">
                  {t("docs.sections.heatmap.breakpoints.tabletTitle")}
                </div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {t("docs.sections.heatmap.breakpoints.tabletDesc")}
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-border/80 bg-card shadow-2xs">
                <div className="font-semibold text-xs text-foreground">
                  {t("docs.sections.heatmap.breakpoints.mobileTitle")}
                </div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {t("docs.sections.heatmap.breakpoints.mobileDesc")}
                </div>
              </div>
            </div>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.heatmap.tracker.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.heatmap.tracker.description")}
            </p>
            <ParamTable
              rows={[
                { name: "data-heatmap", req: true, desc: t("docs.sections.heatmap.tracker.dataHeatmap") },
                { name: "data-heatmap-key", desc: t("docs.sections.heatmap.tracker.dataKey") },
                { name: "data-heatmap-version", desc: t("docs.sections.heatmap.tracker.dataVersion") },
                { name: "data-heatmap-variant", desc: t("docs.sections.heatmap.tracker.dataVariant") },
              ]}
            />
            <CodeBlock label={t("docs.labels.trackerEmbed")}>{`<script defer src="https://your-instance.com/js/script.heatmap.js"
  data-domain="demo.site"
  data-heatmap="true"
  data-heatmap-key="pricing-page"
  data-heatmap-version="v2.0"
  data-heatmap-variant="default">
</script>`}</CodeBlock>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.heatmap.markup.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.heatmap.markup.description")}
            </p>
            <ParamTable
              rows={[
                { name: "data-zs-id", desc: t("docs.sections.heatmap.markup.zsId") },
                { name: "data-zs-ignore", desc: t("docs.sections.heatmap.markup.zsIgnore") },
              ]}
            />
            <CodeBlock label={t("docs.labels.htmlMarkup")}>{`<!-- 1. Stable semantic ID for top-element ranking -->
<button data-zs-id="header.cta_upgrade" class="btn btn-primary">
  Upgrade Plan
</button>

<!-- 2. Privacy-masked container (clicks inside are dropped client-side) -->
<div data-zs-ignore class="user-sensitive-billing-card">
  <input type="password" placeholder="Password" />
</div>`}</CodeBlock>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.heatmap.api.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.heatmap.api.description")}
            </p>
            <p className="text-xs text-muted-foreground mb-4">{t("docs.authJwtNote")}</p>

            <div className="space-y-4">
              <div>
                <EndpointBar method="GET" path="/api/sites/:domain/heatmap/pages" />
                <p className="text-xs text-muted-foreground mb-2">
                  {t("docs.sections.heatmap.api.pagesDesc")}
                </p>
                <CodeBlock label={t("docs.labels.curlExample")}>{`curl -G "https://your-instance.com/api/sites/example.com/heatmap/pages" \\
  -H "Authorization: Bearer <jwt>" \\
  -d "start=2026-11-01&end=2026-11-10&scope=key&key=pricing-page"`}</CodeBlock>
              </div>

              <div>
                <EndpointBar method="GET" path="/api/sites/:domain/heatmap/data" />
                <p className="text-xs text-muted-foreground mb-2">
                  {t("docs.sections.heatmap.api.dataDesc")}
                </p>
              </div>

              <div>
                <EndpointBar method="GET" path="/api/sites/:domain/heatmap/scroll/pages" />
                <p className="text-xs text-muted-foreground mb-2">
                  {t("docs.sections.heatmap.api.scrollPagesDesc")}
                </p>
              </div>

              <div>
                <EndpointBar method="GET" path="/api/sites/:domain/heatmap/scroll/data" />
                <p className="text-xs text-muted-foreground mb-2">
                  {t("docs.sections.heatmap.api.scrollDataDesc")}
                </p>
              </div>

              <div>
                <EndpointBar method="POST" path="/api/sites/:domain/heatmap/capture" />
                <EndpointBar method="POST" path="/api/sites/:domain/heatmap/snapshots" />
                <p className="text-xs text-muted-foreground">
                  {t("docs.sections.heatmap.api.captureDesc")}
                </p>
              </div>
            </div>
          </section>

          {/* User Flows */}
          <section id="userFlows" className="mb-16 scroll-mt-20">
            <SectionHeading id="userFlows">{t("docs.nav.userFlows")}</SectionHeading>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              {t("docs.sections.userFlows.description")}
            </p>
            <Callout type="info">{t("docs.sections.userFlows.callout")}</Callout>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.userFlows.query.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.userFlows.query.description")}
            </p>
            <EndpointBar method="GET" path="/api/stats/:domain/user-flows" />
            <ParamTable
              rows={[
                { name: "period", req: true, desc: t("docs.params.period") },
                { name: "entry_path", desc: t("docs.sections.userFlows.params.entryPath") },
                { name: "filters", desc: t("docs.params.filters") },
                { name: "steps", desc: t("docs.sections.userFlows.params.steps") },
                { name: "limit", desc: t("docs.sections.userFlows.params.limit") },
              ]}
            />
            <CodeBlock label={t("docs.labels.userFlowCurl")}>{`curl -X GET "https://your-instance.com/api/stats/example.com/user-flows?period=p30&steps=3&limit=6" \\
  -H "Authorization: Bearer <token>"`}</CodeBlock>
            <CodeBlock label={t("docs.labels.userFlowResponse")}>{`{
  "code": 200,
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

          {/* Goals */}
          <section id="goals" className="mb-16 scroll-mt-20">
            <SectionHeading id="goals">{t("docs.nav.goals")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.goals.description")}</p>
            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.goals.create.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.goals.create.description")}
            </p>
            <Callout type="info">{t("docs.sections.goals.callout")}</Callout>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.goals.types.heading")}
            </h3>
            <ParamTable
              rows={[
                { name: t("docs.sections.goals.types.pageview"), desc: t("docs.sections.goals.types.pageviewDesc") },
                { name: t("docs.sections.goals.types.event"), desc: t("docs.sections.goals.types.eventDesc") },
              ]}
            />

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.goals.breakdown.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.goals.breakdown.description")}
            </p>
            <CodeBlock label={t("docs.labels.goalBreakdown")}>{`curl -X POST https://your-instance.com/api/v2/query/example.com \\
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
          <section id="funnels" className="mb-16 scroll-mt-20">
            <SectionHeading id="funnels">{t("docs.nav.funnels")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.funnels.description")}</p>
            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.funnels.create.heading")}
            </h3>
            <p className="text-muted-foreground text-sm">{t("docs.sections.funnels.create.description")}</p>
            <Callout type="info">{t("docs.sections.funnels.callout")}</Callout>
          </section>

          {/* Segments */}
          <section id="segments" className="mb-16 scroll-mt-20">
            <SectionHeading id="segments">{t("docs.nav.segments")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.segments.description")}</p>
            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.segments.management.heading")}
            </h3>
            <p className="text-xs text-muted-foreground mb-2">{t("docs.authJwtNote")}</p>
            <ParamTable
              rows={[
                { name: "GET /api/sites/:domain/segments", desc: t("docs.sections.segments.management.list") },
                { name: "POST /api/sites/:domain/segments", desc: t("docs.sections.segments.management.create") },
                {
                  name: "PATCH /api/sites/:domain/segments/:segmentId",
                  desc: t("docs.sections.segments.management.update"),
                },
                {
                  name: "DELETE /api/sites/:domain/segments/:segmentId",
                  desc: t("docs.sections.segments.management.delete"),
                },
              ]}
            />
            <CodeBlock label={t("docs.labels.createSegment")}>{`curl -X POST https://your-instance.com/api/sites/example.com/segments \\
  -H "Authorization: Bearer <jwt>" \\
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
          <section id="sharedLinks" className="mb-16 scroll-mt-20">
            <SectionHeading id="sharedLinks">{t("docs.nav.sharedLinks")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.sharedLinks.description")}</p>
            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.sharedLinks.create.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.sharedLinks.create.description")}
            </p>
            <CodeBlock label={t("docs.labels.createSharedLink")}>{`curl -X POST https://your-instance.com/api/sites/example.com/shared-links \\
  -H "Authorization: Bearer <jwt>" \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "Public Dashboard" }'`}</CodeBlock>
            <CodeBlock label={t("docs.labels.response")}>{`{
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
          <section id="shields" className="mb-16 scroll-mt-20">
            <SectionHeading id="shields">{t("docs.nav.shields")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.shields.description")}</p>
            <Callout type="warn">{t("docs.sections.shields.callout")}</Callout>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.shields.ip.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">{t("docs.sections.shields.ip.description")}</p>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.shields.hostname.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.shields.hostname.description")}
            </p>
            <CodeBlock label={t("docs.labels.wildcardExample")}>{`*.example.com   -> matches app.example.com, www.example.com, etc.
example.com     -> exact match on root domain only`}</CodeBlock>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.shields.country.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.shields.country.description")}
            </p>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.shields.referrer.heading")}
            </h3>
            <p className="text-muted-foreground text-sm">{t("docs.sections.shields.referrer.description")}</p>
          </section>

          {/* Email Reports */}
          <section id="emailReports" className="mb-16 scroll-mt-20">
            <SectionHeading id="emailReports">{t("docs.nav.emailReports")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.emailReports.description")}</p>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.emailReports.weekly.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.emailReports.weekly.description")}
            </p>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.emailReports.monthly.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {t("docs.sections.emailReports.monthly.description")}
            </p>
            <Callout type="info">{t("docs.sections.emailReports.callout")}</Callout>
          </section>

          {/* Traffic Alerts */}
          <section id="trafficAlerts" className="mb-16 scroll-mt-20">
            <SectionHeading id="trafficAlerts">{t("docs.nav.trafficAlerts")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">
              {t("docs.sections.trafficAlerts.description")}
            </p>
            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.trafficAlerts.settings.heading")}
            </h3>
            <ParamTable
              rows={[
                { name: "threshold", desc: t("docs.sections.trafficAlerts.settings.threshold") },
                { name: "interval", desc: t("docs.sections.trafficAlerts.settings.interval") },
                { name: "recipients", desc: t("docs.sections.trafficAlerts.settings.recipients") },
              ]}
            />
            <Callout type="info">{t("docs.sections.trafficAlerts.callout")}</Callout>
          </section>

          {/* Sub-accounts & Permissions */}
          <section id="subAccounts" className="mb-16 scroll-mt-20">
            <SectionHeading id="subAccounts">{t("docs.nav.subAccounts")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.subAccounts.description")}</p>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.subAccounts.roles.heading")}
            </h3>
            <ParamTable
              rows={[
                { name: "viewer", desc: t("docs.sections.subAccounts.roles.viewer") },
                { name: "editor", desc: t("docs.sections.subAccounts.roles.editor") },
                { name: "admin", desc: t("docs.sections.subAccounts.roles.admin") },
                { name: "custom", desc: t("docs.sections.subAccounts.roles.custom") },
              ]}
            />

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.subAccounts.permissions.heading")}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {t("docs.sections.subAccounts.permissions.description")}
            </p>
            <RefGrid
              items={[
                { code: "goals:write", desc: t("docs.sections.subAccounts.permissions.goals") },
                { code: "funnels:write", desc: t("docs.sections.subAccounts.permissions.funnels") },
                { code: "segments:write", desc: t("docs.sections.subAccounts.permissions.segments") },
                { code: "shared_links:write", desc: t("docs.sections.subAccounts.permissions.sharedLinks") },
                { code: "shields:write", desc: t("docs.sections.subAccounts.permissions.shields") },
                { code: "email_reports:write", desc: t("docs.sections.subAccounts.permissions.emailReports") },
                { code: "traffic_alerts:write", desc: t("docs.sections.subAccounts.permissions.trafficAlerts") },
              ]}
            />
            <Callout type="info">{t("docs.sections.subAccounts.callout")}</Callout>
          </section>

          {/* Deployment */}
          <section id="deployment" className="mb-16 scroll-mt-20">
            <SectionHeading id="deployment">{t("docs.nav.deployment")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.deployment.description")}</p>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.deployment.quickStart.heading")}
            </h3>
            <CodeBlock label={t("docs.labels.cloneStep")}>{`git clone https://github.com/zenstats/zenstats-deploy
cd zenstats-deploy`}</CodeBlock>
            <CodeBlock label={t("docs.labels.configStep")}>{`cp .env.example .env
# Edit .env — set ZENSTATS_SECRET_KEY (>= 32 bytes) and ZENSTATS_DOMAIN`}</CodeBlock>
            <CodeBlock label={t("docs.labels.deployStep")}>{`docker compose up -d

# Optional: include automated headless snapshot capture for heatmaps
docker compose -f docker-compose.yml -f docker-compose.heatmap.yml up -d`}</CodeBlock>

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.deployment.envVars.heading")}
            </h3>
            <ParamTable
              rows={[
                {
                  name: "ZENSTATS_SECRET_KEY",
                  req: true,
                  desc: t("docs.sections.deployment.envVars.secretKey"),
                },
                {
                  name: "ZENSTATS_DOMAIN",
                  req: true,
                  desc: t("docs.sections.deployment.envVars.domain"),
                },
                { name: "ZENSTATS_BASE_URL", desc: t("docs.sections.deployment.envVars.baseUrl") },
                { name: "DB_PASSWORD", desc: t("docs.sections.deployment.envVars.dbPassword") },
                {
                  name: "ZENSTATS_MAXMIND_LICENSE_KEY",
                  desc: t("docs.sections.deployment.envVars.maxmindKey"),
                },
                { name: "ZENSTATS_LOG_LEVEL", desc: t("docs.sections.deployment.envVars.logLevel") },
              ]}
            />

            <h3 className="font-semibold text-foreground mb-2 mt-6">
              {t("docs.sections.deployment.services.heading")}
            </h3>
            <ParamTable
              rows={[
                { name: "frontend", desc: t("docs.sections.deployment.services.frontend") },
                { name: "zenstats", desc: t("docs.sections.deployment.services.backend") },
                { name: "zenstats_db", desc: t("docs.sections.deployment.services.postgres") },
                { name: "zenstats_events_db", desc: t("docs.sections.deployment.services.clickhouse") },
                { name: "heatmap-screenshot", desc: t("docs.sections.deployment.services.screenshot") },
              ]}
            />
            <Callout type="warn">{t("docs.sections.deployment.callout")}</Callout>
          </section>

          {/* Health */}
          <section id="health" className="mb-16 scroll-mt-20">
            <SectionHeading id="health">{t("docs.nav.health")}</SectionHeading>
            <p className="text-muted-foreground text-sm mb-4">{t("docs.sections.health.description")}</p>
            <EndpointBar method="GET" path="/api/health/live" />
            <CodeBlock label={t("docs.labels.response")}>{`{ "ok": true }`}</CodeBlock>

            <EndpointBar method="GET" path="/api/health/ready" />
            <CodeBlock label={t("docs.labels.response")}>{`{
  "code": 200,
  "message": "success",
  "data": {
    "status": "healthy",
    "postgres": "connected",
    "clickhouse": "connected",
    "timestamp": 1732600000
  }
}`}</CodeBlock>
          </section>

          {/* Footer */}
          <footer className="mt-16 pt-6 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("docs.footer.copyright")}</span>
            <a
              href="https://github.com/zenstats/zenstats"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </footer>
        </div>
      </main>
    </div>
  );
}
