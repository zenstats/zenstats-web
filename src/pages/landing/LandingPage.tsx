import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import LogoHorizontal from "@/assets/logo-h.svg";
import LogoHorizontalDark from "@/assets/logo-h-dark.svg";

type Lang = "zh" | "en";
type Bilingual = Record<Lang, string>;

const features: { icon: string; title: Bilingual; desc: Bilingual }[] = [
  {
    icon: "🍪",
    title: { zh: "Cookieless", en: "Cookieless" },
    desc: { zh: "无需 Cookie 横幅，开箱即用 GDPR 合规", en: "No cookie banners required — GDPR compliant out of the box" },
  },
  {
    icon: "⚡",
    title: { zh: "轻量追踪", en: "Lightweight Tracking" },
    desc: { zh: "~3KB gzipped，Lighthouse 满分，性能零影响", en: "~3KB gzipped, perfect Lighthouse score, zero performance impact" },
  },
  {
    icon: "📊",
    title: { zh: "实时仪表板", en: "Real-time Dashboard" },
    desc: { zh: "实时访客与浏览量，交互式可视化图表", en: "Live visitors & pageviews with interactive charts" },
  },
  {
    icon: "🌍",
    title: { zh: "GeoIP + 设备检测", en: "GeoIP + Device Detection" },
    desc: { zh: "访客地理位置、浏览器、OS、设备类型", en: "Visitor location, browser, OS, and device type" },
  },
  {
    icon: "🎯",
    title: { zh: "目标与漏斗", en: "Goals & Funnels" },
    desc: { zh: "转化追踪、自定义事件目标、多步骤漏斗", en: "Conversion tracking, custom event goals, multi-step funnels" },
  },
  {
    icon: "🔐",
    title: { zh: "团队管理", en: "Team Management" },
    desc: { zh: "多用户 + 角色权限 + 子账号", en: "Multi-user, role-based access, sub-accounts" },
  },
  {
    icon: "🛡️",
    title: { zh: "屏蔽规则", en: "Shield Rules" },
    desc: { zh: "IP / 域名 / 国家多维度过滤无效流量", en: "Filter traffic by IP, hostname, or country" },
  },
  {
    icon: "🐳",
    title: { zh: "一行部署", en: "One-line Deploy" },
    desc: { zh: "Docker Compose + Caddy 自动 SSL", en: "Docker Compose + Caddy with auto SSL" },
  },
];

const techs = ["Go", "React", "TypeScript", "PostgreSQL", "ClickHouse", "Docker", "Caddy", "Tailwind CSS"];

const repoBase = "https://github.com/zenstats";

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("zh");
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const t = (b: Bilingual) => b[lang];
  const toggleLang = () => setLang((l) => (l === "zh" ? "en" : "zh"));
  const toggleTheme = () => {
    const btn = document.querySelector('[data-theme-toggle]');
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      document.documentElement.style.setProperty('--tx', `${x}px`);
      document.documentElement.style.setProperty('--ty', `${y}px`);
    }
    if (document.startViewTransition) {
      document.documentElement.classList.add('theme-transitioning');
      document.startViewTransition(() => {
        setTheme(isDark ? "light" : "dark");
      });
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 600);
    } else {
      setTheme(isDark ? "light" : "dark");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Top bar: logo (left) + controls (right) */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        {/* Logo — top left */}
        <a href="/" className="flex items-center">
          <img
            src={isDark ? LogoHorizontalDark : LogoHorizontal}
            alt="ZenStats"
            className="h-9 w-auto"
          />
        </a>

        {/* Controls — top right */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            data-theme-toggle
            onClick={toggleTheme}
            className="p-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Language toggle */}
          <button
            onClick={toggleLang}
            className="px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
          >
            {lang === "zh" ? "English" : "中文"}
          </button>
        </div>
      </div>

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 pt-28 pb-24 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 mb-6">
            <span className="text-indigo-600 dark:text-indigo-400">Zen</span>Stats
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10">
            Self-Hosted · Cookieless · Privacy-First Web Analytics
          </p>
          <p className="text-lg text-gray-400 dark:text-gray-500 max-w-xl mx-auto mb-12">
            {lang === "zh"
              ? "轻量级、GDPR 合规的网站分析平台。基于 Go + ClickHouse 构建，从个人项目到企业级应用均可胜任。"
              : "A lightweight, GDPR-compliant web analytics platform powered by Go & ClickHouse. Scales from personal projects to enterprise."}
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/login"
              className="rounded-lg bg-indigo-600 px-8 py-3 text-white font-semibold hover:bg-indigo-700 transition"
            >
              {t({ zh: "开始使用", en: "Get Started" })}
            </Link>
            <a
              href={`${repoBase}/zenstats-deploy`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-8 py-3 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              {t({ zh: "部署指南", en: "Deploy Guide" })} →
            </a>
          </div>
        </div>
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white dark:from-indigo-950/30 dark:via-gray-950 dark:to-gray-950" />
      </header>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-16">
          {t({ zh: "功能特性", en: "Features" })}
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f) => (
            <div key={f.title.zh} className="text-center">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{t(f.title)}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t(f.desc)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="bg-gray-50 dark:bg-gray-900 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-10">
            {t({ zh: "技术栈", en: "Tech Stack" })}
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {techs.map((t) => (
              <span
                key={t}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 shadow-sm"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {t({ zh: "准备好开始了吗？", en: "Ready to Get Started?" })}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          {t({ zh: "一行命令，部署你自己的隐私优先分析平台。", en: "Deploy your own privacy-first analytics platform with one command." })}
        </p>
        <code className="inline-block bg-gray-900 dark:bg-gray-800 text-green-400 dark:text-green-300 px-6 py-3 rounded-lg text-sm font-mono">
          docker compose up -d
        </code>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        <div className="flex justify-center gap-6 mb-4">
          <a
            href={`${repoBase}/zenstats`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            {t({ zh: "API 后端", en: "API Backend" })}
          </a>
          <a
            href={`${repoBase}/zenstats-web`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            {t({ zh: "前端", en: "Frontend" })}
          </a>
          <a
            href={`${repoBase}/zenstats-deploy`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            {t({ zh: "部署", en: "Deploy" })}
          </a>
        </div>
        <a
          href="https://www.gnu.org/licenses/agpl-3.0.html"
          target="_blank"
          rel="noreferrer"
          className="hover:text-gray-600 dark:hover:text-gray-300 transition"
        >
          AGPL v3
        </a>
      </footer>
    </div>
  );
}
