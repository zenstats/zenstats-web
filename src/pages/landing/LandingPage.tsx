import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  BarChart2, Globe, Target, Shield, Users, Server,
  Zap, Eye, Moon, Sun, BookOpen,
} from "lucide-react";
import LogoHorizontal from "@/assets/logo-h.svg";
import LogoHorizontalDark from "@/assets/logo-h-dark.svg";

type Lang = "zh" | "en";
type T = Record<Lang, string>;

const i = (zh: string, en: string): T => ({ zh, en });

const features: { icon: React.ReactNode; title: T; desc: T }[] = [
  {
    icon: <Shield className="w-5 h-5" />,
    title: i("Cookieless", "Cookieless"),
    desc: i("无需 Cookie 横幅，不依赖第三方 Cookie 追踪用户", "No cookie banners. Tracking without third-party cookies."),
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: i("轻量追踪脚本", "Lightweight Script"),
    desc: i("~3 KB gzipped，对 Lighthouse 评分零影响", "~3 KB gzipped. Zero impact on Lighthouse scores."),
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: i("实时仪表板", "Real-time Dashboard"),
    desc: i("实时访客与浏览量，交互式可视化图表", "Live visitors & pageviews with interactive charts."),
  },
  {
    icon: <Globe className="w-5 h-5" />,
    title: i("GeoIP + 设备", "GeoIP + Device"),
    desc: i("访客地理位置、浏览器、操作系统、设备类型", "Visitor location, browser, OS, and device type."),
  },
  {
    icon: <Target className="w-5 h-5" />,
    title: i("目标与漏斗", "Goals & Funnels"),
    desc: i("自定义事件目标、多步骤转化漏斗", "Custom event goals and multi-step conversion funnels."),
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: i("团队权限", "Team Access"),
    desc: i("多用户、角色权限、子账号管理", "Multi-user, role-based access, sub-accounts."),
  },
  {
    icon: <BarChart2 className="w-5 h-5" />,
    title: i("数据段 & 分享", "Segments & Sharing"),
    desc: i("保存过滤器组合为数据段，一键生成公开分享链接", "Save filter sets as segments, share dashboards publicly."),
  },
  {
    icon: <Server className="w-5 h-5" />,
    title: i("一行部署", "One-line Deploy"),
    desc: i("Docker Compose + Caddy 自动 SSL，数据完全自控", "Docker Compose + Caddy auto SSL. Your data, your server."),
  },
];

const techs = ["Go", "Gin", "React", "TypeScript", "PostgreSQL", "ClickHouse", "Docker", "Caddy", "Tailwind CSS"];

const repoBase = "https://github.com/zenstats";

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("zh");
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-6 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <a href="/" className="flex items-center">
          <img src={isDark ? LogoHorizontalDark : LogoHorizontal} alt="ZenStats" className="h-8 w-auto" />
        </a>
        <div className="flex items-center gap-2">
          <Link
            to="/docs"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {t(i("文档", "Docs"))}
          </Link>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
          <button
            data-theme-toggle
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleLang}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            {lang === "zh" ? "EN" : "中文"}
          </button>
          <Link
            to="/login"
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
          >
            {t(i("登录", "Login"))}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 text-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.12),transparent)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_60%,white)] dark:bg-[linear-gradient(to_bottom,transparent_60%,rgb(3,7,18))]" />
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t(i("自托管 · 开源", "Self-hosted · Open Source"))}
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            {lang === "zh" ? (
              <>隐私优先的<br /><span className="text-emerald-500">网站分析</span>平台</>
            ) : (
              <>Privacy-first<br /><span className="text-emerald-500">Web Analytics</span></>
            )}
          </h1>

          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
            {t(i(
              "基于 Go + ClickHouse 构建的轻量级分析平台。数据存储在你自己的服务器上，无第三方介入，完全掌控。",
              "Lightweight analytics built on Go & ClickHouse. Your data stays on your server — no third parties, full control."
            ))}
          </p>

          <div className="flex justify-center flex-wrap gap-3">
            <Link
              to="/login"
              className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition text-sm"
            >
              {t(i("开始使用 →", "Get Started →"))}
            </Link>
            <a
              href={`${repoBase}/zenstats-deploy`}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
            >
              {t(i("部署指南", "Deploy Guide"))}
            </a>
            <Link
              to="/docs"
              className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
            >
              {t(i("查看文档", "Read Docs"))}
            </Link>
          </div>
        </div>

        {/* Deploy command */}
        <div className="mt-16 flex justify-center">
          <div className="inline-flex items-center gap-3 bg-gray-900 dark:bg-gray-800 rounded-xl px-5 py-3 shadow-lg">
            <span className="text-gray-500 text-sm select-none">$</span>
            <code className="text-emerald-400 text-sm font-mono">docker compose up -d</code>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-center mb-2">{t(i("功能特性", "Features"))}</h2>
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-12">
          {t(i("开箱即用，无需额外配置", "Everything you need, out of the box"))}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div
              key={f.title.zh}
              className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm transition group"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition">
                {f.icon}
              </div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1.5">{t(f.title)}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{t(f.desc)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-2">{t(i("如何开始", "How it Works"))}</h2>
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-12">
          {t(i("三步完成自托管部署", "Self-host in three steps"))}
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: i("克隆部署仓库", "Clone the deploy repo"),
              desc: i("从 GitHub 获取官方 Docker Compose 配置", "Get the official Docker Compose setup from GitHub"),
              code: "git clone github.com/zenstats/zenstats-deploy",
            },
            {
              step: "02",
              title: i("配置环境变量", "Configure your environment"),
              desc: i("复制 .env.example 并设置域名和密钥", "Copy .env.example, set your domain and secret key"),
              code: "cp .env.example .env && vi .env",
            },
            {
              step: "03",
              title: i("一键启动", "Launch all services"),
              desc: i("Caddy 自动申请 SSL，数据库自动初始化", "Caddy handles TLS, databases auto-initialize"),
              code: "docker compose up -d",
            },
          ].map((s) => (
            <div key={s.step} className="relative p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <span className="text-3xl font-black text-gray-100 dark:text-gray-800 absolute top-4 right-5 select-none">{s.step}</span>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">{t(s.title)}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">{t(s.desc)}</p>
              <div className="bg-gray-900 dark:bg-gray-800 rounded-lg px-3 py-2">
                <code className="text-emerald-400 text-xs font-mono break-all">{s.code}</code>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy note */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-6">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm text-amber-900 dark:text-amber-300 mb-1.5">
                {t(i("关于隐私与数据存储", "About Privacy & Data Storage"))}
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                {t(i(
                  "ZenStats 会存储访客 IP 地址用于 GeoIP 解析，并在数据库中保留哈希后的指纹标识。如需符合 GDPR 等隐私法规，请在隐私政策中披露相关数据处理行为，并确保你所在司法管辖区具备合法处理依据（如合法利益或用户同意）。ZenStats 本身不进行跨站追踪，数据完全托管在你自己的服务器上。",
                  "ZenStats stores visitor IP addresses for GeoIP resolution and retains hashed fingerprint identifiers. To comply with GDPR or similar regulations, disclose this data processing in your privacy policy and ensure you have a lawful basis (e.g. legitimate interest or consent) in your jurisdiction. ZenStats does not do cross-site tracking and all data stays on your own server."
                ))}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="border-t border-gray-100 dark:border-gray-800 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-6">
            {t(i("技术栈", "Built with"))}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {techs.map((tech) => (
              <span
                key={tech}
                className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400 dark:text-gray-600">
          <img src={isDark ? LogoHorizontalDark : LogoHorizontal} alt="ZenStats" className="h-9 w-auto opacity-70" />
          <div className="flex items-center gap-5">
            <a href={`${repoBase}/zenstats`} target="_blank" rel="noreferrer" className="hover:text-gray-700 dark:hover:text-gray-300 transition">
              {t(i("API 后端", "API Backend"))}
            </a>
            <a href={`${repoBase}/zenstats-web`} target="_blank" rel="noreferrer" className="hover:text-gray-700 dark:hover:text-gray-300 transition">
              {t(i("前端", "Frontend"))}
            </a>
            <Link to="/docs" className="hover:text-gray-700 dark:hover:text-gray-300 transition">
              {t(i("文档", "Docs"))}
            </Link>
            <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noreferrer" className="hover:text-gray-700 dark:hover:text-gray-300 transition">
              AGPL v3
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
