import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Globe,
  Target,
  Shield,
  Server,
  Zap,
  Eye,
  Moon,
  Sun,
  BookOpen,
  GitMerge,
  Flame,
  LayoutDashboard,
  Check,
  Copy,
  ArrowRight,
  ExternalLink,
  Activity,
  Sparkles,
} from "lucide-react";
import LogoHorizontal from "@/assets/logo-h.svg";
import LogoHorizontalDark from "@/assets/logo-h-dark.svg";

type Lang = "zh" | "en";
type T = Record<Lang, string>;

const i = (zh: string, en: string): T => ({ zh, en });

interface FeatureItem {
  icon: React.ReactNode;
  title: T;
  desc: T;
  badge?: T;
}

const features: FeatureItem[] = [
  {
    icon: <GitMerge className="w-5 h-5 text-blue-500" />,
    title: i("用户流向拓扑 (Sankey)", "User Flows (Sankey)"),
    desc: i(
      "ClickHouse 毫秒级多步路径聚合，DAG 拓扑直观展现访客全站跳转与核心流失环节",
      "Multi-step path aggregation on ClickHouse, visualizing visitor journeys & drop-offs via DAG topology"
    ),
    badge: i("全新上线", "New"),
  },
  {
    icon: <Flame className="w-5 h-5 text-amber-500" />,
    title: i("无侵入点击热力图", "Click Heatmaps"),
    desc: i(
      "自动捕获高频点击元素，支持屏幕断点适配与精确 Selector 定位，零配置还原页面真实点击热度",
      "Zero-config click density capturing with breakpoint adaptation and precise selector binding"
    ),
    badge: i("全新上线", "New"),
  },
  {
    icon: <LayoutDashboard className="w-5 h-5 text-indigo-500" />,
    title: i("自由拖拽自定义看板", "Pinned Dashboard"),
    desc: i(
      "支持任意多维过滤条件固定为看板图表，自由缩放拖拽排版，打造专属实时业务数据大屏",
      "Pin any multi-dimensional filter set to your wall with drag-and-drop customizable layout"
    ),
  },
  {
    icon: <Shield className="w-5 h-5 text-emerald-500" />,
    title: i("无 Cookie 隐私合规", "Cookieless Privacy"),
    desc: i(
      "无需烦人的 Cookie 弹窗横幅，基于内存哈希与会话隔离，完全符合 GDPR / CCPA 隐私规范",
      "No annoying cookie consent banners. Hashed ephemeral sessions compliant with GDPR / CCPA"
    ),
  },
  {
    icon: <Zap className="w-5 h-5 text-yellow-500" />,
    title: i("轻量极速追踪脚本", "Ultra-light Tracker"),
    desc: i(
      "压缩后仅 ~3 KB，异步执行不阻塞渲染，对 Google Lighthouse / Web Vitals 评分零影响",
      "~3 KB gzipped. Async execution with zero penalty on your Lighthouse & Core Web Vitals"
    ),
  },
  {
    icon: <Eye className="w-5 h-5 text-cyan-500" />,
    title: i("实时访客流监控", "Live Visitors Stream"),
    desc: i(
      "秒级刷新当前在站访客、正在浏览的着陆页与地理分布，配合动态波浪走势一目了然",
      "Second-level live visitors, active landing pages and geo presence with smooth trend waves"
    ),
  },
  {
    icon: <Globe className="w-5 h-5 text-purple-500" />,
    title: i("全渠道获客归因", "Acquisition Attribution"),
    desc: i(
      "自动识别自然搜索、付费广告、社媒与 UTM 营销活动，精准还原用户来源与转化表现",
      "Auto-detect organic, paid, social and UTM campaigns with reliable conversion attribution"
    ),
  },
  {
    icon: <Target className="w-5 h-5 text-rose-500" />,
    title: i("多步转化漏斗与目标", "Conversion Funnels & Goals"),
    desc: i(
      "自定义事件目标与树形漏斗分析，精确计算各转化步骤转化率与相对流失率",
      "Custom event goals and funnel trees to track step-by-step conversion and drop-off"
    ),
  },
  {
    icon: <Server className="w-5 h-5 text-slate-500" />,
    title: i("100% 数据主权私有化", "100% Self-Hosted"),
    desc: i(
      "Docker Compose 一键启动，集成 Caddy 自动申请免费 HTTPS，数据仅存在你的服务器中",
      "One-line Docker Compose deployment with automatic SSL via Caddy. Your server, your data"
    ),
  },
];

const comparisonRows = [
  {
    metric: i("Cookie 横幅弹窗", "Cookie Consent Banner"),
    zenstats: i("完全不需要", "Not Required"),
    ga4: i("必须强制弹出 (GDPR)", "Required (GDPR)"),
    highlight: true,
  },
  {
    metric: i("追踪脚本体积", "Script Bundle Size"),
    zenstats: i("~3 KB (轻若无物)", "~3 KB (Ultra-light)"),
    ga4: i("~45 KB+ (显著拖累 LCP)", "~45 KB+ (Slows LCP)"),
    highlight: true,
  },
  {
    metric: i("数据所有权", "Data Ownership"),
    zenstats: i("100% 私有自控", "100% Self-Hosted"),
    ga4: i("被 Google 收集并用于广告画像", "Shared with Google Ad Network"),
    highlight: true,
  },
  {
    metric: i("底层存储引擎", "Underlying Database"),
    zenstats: i("ClickHouse 亿级毫秒聚合", "ClickHouse Columnar Engine"),
    ga4: i("黑盒预采样，偶发24小时延迟", "Blackbox, up to 24h lag"),
    highlight: false,
  },
  {
    metric: i("原生点击热力图", "Native Click Heatmap"),
    zenstats: i("内置开箱即用", "Built-in & Ready"),
    ga4: i("不支持 (需引入额外 Hotjar 脚本)", "Not Supported"),
    highlight: true,
  },
  {
    metric: i("用户流向拓扑 (Sankey)", "User Flows DAG"),
    zenstats: i("多步 DAG 拓扑直观展示", "Multi-step DAG Topology"),
    ga4: i("配置复杂且采样严重", "Complex & Heavily Sampled"),
    highlight: false,
  },
];

const techs = [
  "Go 1.25",
  "Gin",
  "React 19",
  "TypeScript",
  "ClickHouse 25",
  "PostgreSQL 18",
  "Docker",
  "Caddy SSL",
  "Tailwind CSS",
];

const repoBase = "https://github.com/zenstats";

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("zh");
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // 模拟交互 Tab
  const [activePreviewTab, setActivePreviewTab] = useState<"flows" | "heatmap" | "realtime">("flows");
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);

  const t = (b: T) => b[lang];
  const toggleLang = () => setLang((l) => (l === "zh" ? "en" : "zh"));

  const toggleTheme = () => {
    const btn = document.querySelector("[data-theme-toggle]");
    if (btn) {
      const rect = btn.getBoundingClientRect();
      document.documentElement.style.setProperty("--tx", `${rect.left + rect.width / 2}px`);
      document.documentElement.style.setProperty("--ty", `${rect.top + rect.height / 2}px`);
    }
    if (document.startViewTransition) {
      document.documentElement.classList.add("theme-transitioning");
      document.startViewTransition(() => setTheme(isDark ? "light" : "dark"));
      setTimeout(() => document.documentElement.classList.remove("theme-transitioning"), 600);
    } else {
      setTheme(isDark ? "light" : "dark");
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCodeKey(key);
      setTimeout(() => setCopiedCodeKey(null), 2000);
    });
  };

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* 顶部导航 */}
      <nav className="fixed top-0 inset-x-0 z-50 h-16 flex items-center justify-between px-6 md:px-10 bg-white/80 dark:bg-[#030712]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={isDark ? LogoHorizontalDark : LogoHorizontal} alt="ZenStats" className="h-8 w-auto" />
            <span className="hidden sm:inline-block text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              v2.0
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-5 text-sm text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              {t(i("核心特性", "Features"))}
            </a>
            <a href="#comparison" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              {t(i("平台对比", "Comparison"))}
            </a>
            <a href="#deploy" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              {t(i("快速部署", "Quick Start"))}
            </a>
            <Link to="/docs" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {t(i("API 与文档", "Docs"))}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* 主题切换 */}
          <button
            data-theme-toggle
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* 语言切换 */}
          <button
            onClick={toggleLang}
            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {lang === "zh" ? "EN" : "中文"}
          </button>

          {/* 登录 / 进入控制台 */}
          {token ? (
            <Link
              to="/sites"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition flex items-center gap-1.5"
            >
              <span>{t(i("进入仪表板", "Dashboard"))}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition"
            >
              {t(i("登录", "Login"))}
            </Link>
          )}
        </div>
      </nav>

      {/* Hero 区域 */}
      <section className="relative pt-32 pb-20 px-6 md:px-12 text-center overflow-hidden">
        {/* 背景光晕装饰 */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-blue-500/15 blur-[120px] rounded-full dark:from-emerald-600/20 dark:via-cyan-600/15 dark:to-blue-600/20" />
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-40" />
        </div>

        <div className="max-w-4xl mx-auto">
          {/* 顶部胶囊标签 */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-medium mb-6 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t(i("隐私优先 · 极速 ClickHouse · 100% 自托管", "Privacy-first · ClickHouse Fast · 100% Self-Hosted"))}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.15]">
            {lang === "zh" ? (
              <>
                掌控你的网站数据资产
                <br />
                <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-blue-600 bg-clip-text text-transparent">
                  无需妥协隐私，无惧海量分析
                </span>
              </>
            ) : (
              <>
                Own Your Web Analytics Data
                <br />
                <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-blue-600 bg-clip-text text-transparent">
                  Privacy-first, ClickHouse Powered
                </span>
              </>
            )}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            {t(
              i(
                "专为现代化应用打造的下一代分析平台。无 Cookie 追踪、~3KB 极轻脚本、ClickHouse 亿级聚合引擎，配备点击热力图与流向拓扑分析，数据完全存储在你自己的私有服务器上。",
                "The next-gen analytics suite built for modern teams. Cookieless tracking, ~3KB lightweight script, ClickHouse millisecond queries, plus click heatmaps and user flows DAG — all on your own server."
              )
            )}
          </p>

          {/* 按钮群 */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 mb-10">
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 text-sm"
            >
              <span>{t(i("立即开启体验", "Get Started Free"))}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/docs"
              className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>{t(i("查阅开发者文档", "Read Documentation"))}</span>
            </Link>
            <a
              href={`${repoBase}/zenstats`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>

          {/* 一键引入 Tracker / Docker 部署代码胶囊 */}
          <div className="max-w-xl mx-auto">
            <div className="p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between text-left">
              <div className="flex items-center gap-2 px-3 overflow-hidden font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
                <span className="text-emerald-500 font-bold select-none">&lt;/&gt;</span>
                <span className="truncate">&lt;script defer src="https://your-domain.com/tracker.js" data-site-id="my-site"&gt;&lt;/script&gt;</span>
              </div>
              <button
                onClick={() =>
                  handleCopy(
                    '<script defer src="https://your-domain.com/tracker.js" data-site-id="my-site"></script>',
                    "tracker"
                  )
                }
                className="shrink-0 p-2 text-xs font-medium rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
                title="Copy snippet"
              >
                {copiedCodeKey === "tracker" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">{copiedCodeKey === "tracker" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 高保真产品交互预览卡片 (Product Mockup Sandbox) */}
        <div className="mt-14 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-2xl backdrop-blur-xl overflow-hidden text-left">
            {/* 窗口顶部标题栏 */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/80">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 text-xs font-mono text-slate-500 dark:text-slate-400 hidden sm:inline">
                  zenstats.local/analytics — demo.site
                </span>
              </div>

              {/* 交互 Tab 切换 */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-xs">
                <button
                  onClick={() => setActivePreviewTab("flows")}
                  className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
                    activePreviewTab === "flows"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                  }`}
                >
                  <GitMerge className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t(i("用户流向 (Sankey)", "User Flows"))}</span>
                </button>
                <button
                  onClick={() => setActivePreviewTab("heatmap")}
                  className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
                    activePreviewTab === "heatmap"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t(i("点击热力图", "Click Heatmap"))}</span>
                </button>
                <button
                  onClick={() => setActivePreviewTab("realtime")}
                  className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
                    activePreviewTab === "realtime"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t(i("实时监控", "Realtime"))}</span>
                </button>
              </div>
            </div>

            {/* 卡片内容区 */}
            <div className="p-6">
              {activePreviewTab === "flows" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {t(i("用户页面跳转与流失拓扑 (Sankey Topology)", "User Page Flow & Drop-off DAG"))}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                      ● 8,920 Total Sessions
                    </span>
                  </div>

                  {/* 模拟桑基图流动效果 */}
                  <div className="grid grid-cols-3 gap-6 py-4 items-center">
                    {/* Step 1 */}
                    <div className="space-y-3">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Step 1: Landing Page</div>
                      <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 font-mono text-xs flex justify-between">
                        <span>/ (Home)</span>
                        <span className="font-semibold text-blue-600">6,120</span>
                      </div>
                      <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 font-mono text-xs flex justify-between">
                        <span>/pricing</span>
                        <span className="font-semibold text-slate-600">2,800</span>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="space-y-3 relative">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Step 2: Transition</div>
                      <div className="p-3 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 font-mono text-xs flex justify-between">
                        <span>/docs/quickstart</span>
                        <span className="font-semibold text-purple-600">4,350</span>
                      </div>
                      <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 font-mono text-xs flex justify-between">
                        <span className="text-rose-600">(exit) 离开网站</span>
                        <span className="font-semibold text-rose-600">1,770 (28.9%)</span>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="space-y-3">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Step 3: Conversion</div>
                      <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 font-mono text-xs flex justify-between">
                        <span>/register/success</span>
                        <span className="font-semibold text-emerald-600">3,120 (71.7%)</span>
                      </div>
                      <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 font-mono text-xs flex justify-between">
                        <span>/checkout/pending</span>
                        <span className="font-semibold text-amber-600">1,230</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === "heatmap" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {t(i("页面点击热力密度模拟 (Click Density)", "Click Density & Element Heatmap"))}
                    </span>
                    <span className="text-amber-500 font-mono font-medium">
                      Scope: /pricing · 1,480 Total Clicks
                    </span>
                  </div>

                  <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/50 p-6 flex flex-col items-center justify-center min-h-[180px] text-center overflow-hidden">
                    {/* 模拟热力光斑 */}
                    <div className="absolute top-1/3 left-1/3 w-28 h-28 rounded-full bg-red-500/40 blur-xl pointer-events-none" />
                    <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-amber-400/35 blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-wrap gap-4 items-center justify-center">
                      <div className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-xs shadow-md border-2 border-red-500/80 relative">
                        <span>btn#primary-upgrade</span>
                        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-red-500 text-[10px] text-white font-bold">
                          742次
                        </span>
                      </div>
                      <div className="px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs border-2 border-amber-400/80 relative">
                        <span>btn#annual-toggle</span>
                        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-amber-500 text-[10px] text-white font-bold">
                          328次
                        </span>
                      </div>
                      <div className="px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs border border-slate-200 dark:border-slate-700 relative">
                        <span>link#docs-faq</span>
                        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-blue-500 text-[10px] text-white font-bold">
                          115次
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === "realtime" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div className="text-[11px] text-slate-500">{t(i("当前实时在线", "Live Visitors"))}</div>
                      <div className="text-xl font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>142</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div className="text-[11px] text-slate-500">{t(i("今日独立访客 (UV)", "Unique Visitors"))}</div>
                      <div className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-0.5">24,890</div>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div className="text-[11px] text-slate-500">{t(i("页面浏览量 (PV)", "Pageviews"))}</div>
                      <div className="text-xl font-bold text-blue-600 mt-0.5">92,410</div>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div className="text-[11px] text-slate-500">{t(i("次均停留时长", "Avg Duration"))}</div>
                      <div className="text-xl font-bold text-purple-600 mt-0.5">3m 24s</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 核心特性矩阵 (Features) */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t(i("全景分析能力", "Full-Spectrum Analytics"))}</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {t(i("开箱即用的专业级网站分析平台", "Professional Analytics Out of the Box"))}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
            {t(
              i(
                "无需复杂的埋点体系与繁重的接入流程，一处部署即可解锁实时流量、转化漏斗、点击热力图与流向拓扑",
                "No complicated tracking pipelines or setup fatigue. Deploy once to unlock real-time stats, funnels, heatmaps and user flows."
              )
            )}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, idx) => (
            <div
              key={idx}
              className="relative p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 hover:border-emerald-500/50 dark:hover:border-emerald-500/40 hover:shadow-lg transition-all duration-200 group"
            >
              {f.badge && (
                <span className="absolute top-4 right-4 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                  {t(f.badge)}
                </span>
              )}
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">{t(f.title)}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{t(f.desc)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 平台深度对比 (Comparison) */}
      <section id="comparison" className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {t(i("为什么选择 ZenStats？", "Why ZenStats?"))}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {t(i("对比传统 Google Analytics 4，体验无拘无束的轻量自托管分析", "Compared with Google Analytics 4 — faster, lighter, private"))}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50">
                <th className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">{t(i("衡量维度", "Feature / Aspect"))}</th>
                <th className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                  ZenStats (自托管)
                </th>
                <th className="py-3.5 px-4 font-medium text-slate-500 dark:text-slate-400">Google Analytics 4</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {comparisonRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{t(row.metric)}</td>
                  <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{t(row.zenstats)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{t(row.ga4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 快速自托管部署三步曲 (Quick Start) */}
      <section id="deploy" className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {t(i("三步完成私有化部署", "Self-Host in 3 Steps"))}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {t(i("内置 Docker Compose 与 Caddy 自动申请免费 SSL 证书", "Complete Docker Compose recipe with Caddy auto HTTPS"))}
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              step: "01",
              title: i("克隆官方部署编排", "Clone Deploy Repo"),
              desc: i("获取针对生产环境优化的 Docker Compose 模板", "Fetch production-ready Compose template"),
              code: "git clone https://github.com/zenstats/zenstats-deploy.git",
            },
            {
              step: "02",
              title: i("配置域名与环境变量", "Configure Environment"),
              desc: i("复制 .env 并指定服务运行域名与密钥", "Copy .env and specify domain & secret key"),
              code: "cp .env.example .env && vim .env",
            },
            {
              step: "03",
              title: i("一行启动全套服务", "Launch via Docker"),
              desc: i("Postgres、ClickHouse 与 Caddy 自动初始化", "PostgreSQL, ClickHouse and Caddy auto-init"),
              code: "docker compose up -d",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="relative p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between"
            >
              <div>
                <span className="text-3xl font-black text-slate-200 dark:text-slate-800 absolute top-4 right-5 select-none">
                  {s.step}
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1.5">{t(s.title)}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">{t(s.desc)}</p>
              </div>
              <div className="flex items-center justify-between bg-slate-900 dark:bg-slate-950 rounded-lg p-2.5 font-mono text-[11px] text-emerald-400 overflow-hidden">
                <span className="truncate">{s.code}</span>
                <button
                  onClick={() => handleCopy(s.code, s.step)}
                  className="shrink-0 ml-2 text-slate-400 hover:text-white"
                  title="Copy"
                >
                  {copiedCodeKey === s.step ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 隐私与数据合规指引 */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-6 flex gap-4">
          <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-left">
            <h4 className="font-semibold text-sm text-emerald-900 dark:text-emerald-200">
              {t(i("隐私第一的设计哲学与数据主权", "Privacy-First Architecture & Compliance"))}
            </h4>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
              {t(
                i(
                  "ZenStats 严格遵循零第三方共享准则。访客 IP 仅在内存中进行 GeoIP 区域解析后即刻加盐哈希，不保留可回溯个人身份的明文数据，无需展示烦扰用户的 Cookie 授权弹窗。所有原始事件与指标仅驻留在您自主掌控的私有服务器上。",
                  "ZenStats operates on zero third-party data transmission. IP addresses are processed in-memory for GeoIP resolution and immediately salted-hashed. No persistent tracking cookies or cross-site identifiers are stored. All events stay strictly within your self-hosted database."
                )
              )}
            </p>
          </div>
        </div>
      </section>

      {/* 底部 Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 pt-16 pb-12 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          {/* 上半部分：品牌与分类导航 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12">
            {/* 左侧：Logo 与品牌介绍 */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-2">
                <img src={isDark ? LogoHorizontalDark : LogoHorizontal} alt="ZenStats" className="h-8 w-auto" />
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Self-hosted
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                {t(
                  i(
                    "自托管、隐私优先的现代化网站分析平台。基于 Go 与 ClickHouse 构建，支持点击热力图与用户流向拓扑分析，数据 100% 掌握在自己手中。",
                    "Self-hosted, privacy-first web analytics platform powered by Go and ClickHouse. Built-in click heatmaps and user flows DAG — 100% data ownership."
                  )
                )}
              </p>
              <div className="flex items-center gap-3 pt-1">
                <a
                  href={`${repoBase}/zenstats`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>GitHub Repository</span>
                </a>
                <span className="text-xs text-slate-400 font-mono">AGPL-3.0 License</span>
              </div>
            </div>

            {/* 右侧：分类链接 */}
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
              {/* 核心特性 */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  {t(i("产品特性", "Features"))}
                </h4>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li>
                    <a href="#features" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                      {t(i("用户流向拓扑 (Sankey)", "User Flows DAG"))}
                    </a>
                  </li>
                  <li>
                    <a href="#features" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                      {t(i("点击热力图", "Click Heatmap"))}
                    </a>
                  </li>
                  <li>
                    <a href="#features" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                      {t(i("实时在线访客", "Live Visitors"))}
                    </a>
                  </li>
                  <li>
                    <a href="#comparison" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                      {t(i("GA4 深度对比", "Compare with GA4"))}
                    </a>
                  </li>
                </ul>
              </div>

              {/* 开发者与文档 */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  {t(i("开发者资源", "Developers"))}
                </h4>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li>
                    <Link to="/docs" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                      {t(i("开发文档首页", "Documentation"))}
                    </Link>
                  </li>
                  <li>
                    <Link to="/docs" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                      {t(i("Tracker 客户端接入", "Tracking Script"))}
                    </Link>
                  </li>
                  <li>
                    <Link to="/docs" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                      {t(i("REST API v1 / v2 参考", "API Reference"))}
                    </Link>
                  </li>
                  <li>
                    <Link to="/docs" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                      {t(i("系统健康检查探针", "Health Probes"))}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* 开源生态与部署 */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  {t(i("开源与生态", "Open Source"))}
                </h4>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li>
                    <a
                      href={`${repoBase}/zenstats-deploy`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-emerald-600 dark:hover:text-emerald-400 transition flex items-center gap-1"
                    >
                      <span>Docker Compose</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </li>
                  <li>
                    <a
                      href={`${repoBase}/zenstats`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-emerald-600 dark:hover:text-emerald-400 transition flex items-center gap-1"
                    >
                      <span>Backend (Go)</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </li>
                  <li>
                    <a
                      href={`${repoBase}/zenstats-web`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-emerald-600 dark:hover:text-emerald-400 transition flex items-center gap-1"
                    >
                      <span>Frontend (React)</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </li>
                  <li>
                    <Link to="/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                      {t(i("控制台登录", "Dashboard Login"))}
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 下半部分：版权与技术栈水平条（彻底杜绝错位） */}
          <div className="pt-8 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} ZenStats. Built with Go, ClickHouse & React. All rights reserved.
            </span>

            {/* 技术栈徽章 */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {techs.map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-md text-[10px] font-mono text-slate-500 dark:text-slate-400"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
