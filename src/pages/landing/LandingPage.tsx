import { Link } from "react-router-dom";

const features = [
  {
    icon: "🍪",
    title: "Cookieless",
    desc: "无需 Cookie 横幅，GDPR 开箱即用",
  },
  {
    icon: "⚡",
    title: "轻量追踪",
    desc: "~3KB gzipped，Lighthouse 满分零影响",
  },
  {
    icon: "📊",
    title: "实时仪表板",
    desc: "实时访客数、PV、参与度，交互式图表",
  },
  {
    icon: "🌍",
    title: "GeoIP + 设备检测",
    desc: "访客地理位置、浏览器、OS、设备类型",
  },
  {
    icon: "🎯",
    title: "目标与漏斗",
    desc: "转化追踪、自定义事件目标、多步骤漏斗",
  },
  {
    icon: "🔐",
    title: "团队管理",
    desc: "多用户 + 角色权限 + 子账号",
  },
  {
    icon: "🛡️",
    title: "屏蔽规则",
    desc: "按 IP / 域名 / 国家过滤无效流量",
  },
  {
    icon: "🐳",
    title: "一行部署",
    desc: "Docker Compose + Caddy 自动 SSL",
  },
];

const techs = ["Go", "React", "TypeScript", "PostgreSQL", "ClickHouse", "Docker", "Caddy", "Tailwind CSS"];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
            <span className="text-indigo-600">Zen</span>Stats
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto mb-10">
            Self-Hosted · Cookieless · Privacy-First Web Analytics
          </p>
          <p className="text-lg text-gray-400 max-w-xl mx-auto mb-12">
            轻量级、GDPR 合规的 Google Analytics 替代方案。
            Go + ClickHouse 构建，适合任何规模。
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/login"
              className="rounded-lg bg-indigo-600 px-8 py-3 text-white font-semibold hover:bg-indigo-700 transition"
            >
              开始使用
            </Link>
            <a
              href="https://git.potawang.cn/zenstats/zenstats-deploy"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-gray-300 px-8 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              部署指南 →
            </a>
          </div>
        </div>
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white" />
      </header>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
          功能特性
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f) => (
            <div key={f.title} className="text-center">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-10">技术栈</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {techs.map((t) => (
              <span
                key={t}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-600 shadow-sm"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">准备好开始了吗？</h2>
        <p className="text-gray-500 mb-8">一行命令部署你的私有分析平台。</p>
        <code className="inline-block bg-gray-900 text-green-400 px-6 py-3 rounded-lg text-sm font-mono">
          docker compose up -d
        </code>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-400">
        <div className="flex justify-center gap-6 mb-4">
          <a
            href="https://git.potawang.cn/zenstats/zenstats"
            target="_blank"
            rel="noreferrer"
            className="hover:text-gray-600 transition"
          >
            API 后端
          </a>
          <a
            href="https://git.potawang.cn/zenstats/zenstats-web"
            target="_blank"
            rel="noreferrer"
            className="hover:text-gray-600 transition"
          >
            前端
          </a>
          <a
            href="https://git.potawang.cn/zenstats/zenstats-deploy"
            target="_blank"
            rel="noreferrer"
            className="hover:text-gray-600 transition"
          >
            部署
          </a>
        </div>
        <p>Apache 2.0 License</p>
      </footer>
    </div>
  );
}
