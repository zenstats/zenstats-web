import { Separator } from "@components/ui/separator"
import { SidebarNav, type SidebarNavItem } from "./components/sidebar-nav"
import { useNavigate, useParams } from "react-router-dom";
import { Code2, Database, Mail, Rocket, ShieldAlert, Target, BellRing, Link, Layers, LayoutGrid, Filter } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { isSubAccount, hasPerm } from "@utils/auth";

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {

  const { domain = '' } = useParams<{ domain?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const baseUrl = `/sites/${domain}/settings`;
  const subAccount = isSubAccount();

  // 构建全量导航项，带权限标注后过滤
  type NavItemDef = SidebarNavItem & { perm?: string; parentOnly?: boolean; children?: NavItemDef[] }

  const allNavItems: NavItemDef[] = [
    {
      id: "grp-setup",
      title: t('settings.layout.group.setup'),
      children: [
        { id: "general", title: t('settings.layout.nav.general'),     icon: <Rocket className="mr-2 h-4 w-4" />,   href: `${baseUrl}/general`, parentOnly: true },
        { id: "install", title: t('settings.layout.nav.installCode'), icon: <Code2 className="mr-2 h-4 w-4" />,    href: `${baseUrl}/install` },
        { id: "import",  title: t('settings.layout.nav.import'),      icon: <Database className="mr-2 h-4 w-4" />, href: `${baseUrl}/import`, parentOnly: true },
      ],
    },
    {
      id: "grp-analysis",
      title: t('settings.layout.group.analysis'),
      children: [
        { id: "goals",    title: t('settings.layout.nav.goals'),    icon: <Target className="mr-2 h-4 w-4" />,     href: `${baseUrl}/goals`,    perm: "goals:write" },
        { id: "funnels",  title: t('settings.layout.nav.funnels'),  icon: <Filter className="mr-2 h-4 w-4" />,     href: `${baseUrl}/funnels`,  perm: "funnels:write" },
        { id: "segments", title: t('settings.layout.nav.segments'), icon: <Layers className="mr-2 h-4 w-4" />,     href: `${baseUrl}/segments`, perm: "segments:write" },
        { id: "panels",   title: t('settings.layout.nav.panels'),   icon: <LayoutGrid className="mr-2 h-4 w-4" />, href: `${baseUrl}/panels`,   perm: "segments:write" },
      ],
    },
    {
      id: "grp-protection",
      title: t('settings.layout.group.protection'),
      perm: "shields:write",
      children: [
        { id: "shields-ip_address", title: t('settings.layout.nav.ipAddress'), icon: <ShieldAlert className="mr-2 h-4 w-4" />, href: `${baseUrl}/shields/ip_address` },
        { id: "shields-hostname",   title: t('settings.layout.nav.hostname'),  icon: <ShieldAlert className="mr-2 h-4 w-4" />, href: `${baseUrl}/shields/hostname` },
        { id: "shields-countries",  title: t('settings.layout.nav.countries'), icon: <ShieldAlert className="mr-2 h-4 w-4" />, href: `${baseUrl}/shields/countries` },
        { id: "shields-referrer",   title: t('settings.layout.nav.referrer'),  icon: <ShieldAlert className="mr-2 h-4 w-4" />, href: `${baseUrl}/shields/referrer` },
      ],
    },
    {
      id: "grp-notifications",
      title: t('settings.layout.group.notifications'),
      children: [
        { id: "email-reports", title: t('settings.layout.nav.emailReports'), icon: <Mail className="mr-2 h-4 w-4" />,     href: `${baseUrl}/email-reports`, perm: "email_reports:write" },
        { id: "traffic-alert", title: t('settings.layout.nav.trafficAlert'), icon: <BellRing className="mr-2 h-4 w-4" />, href: `${baseUrl}/traffic-alert`, perm: "traffic_alerts:write" },
      ],
    },
    {
      id: "grp-sharing",
      title: t('settings.layout.group.sharing'),
      children: [
        { id: "shared-links", title: t('settings.layout.nav.sharedLinks'), icon: <Link className="mr-2 h-4 w-4" />, href: `${baseUrl}/shared-links`, perm: "shared_links:write" },
      ],
    },
  ];

  const filterItem = (item: NavItemDef): NavItemDef | null => {
    if (subAccount) {
      if (item.parentOnly) return null;
      if (item.perm && !hasPerm(item.perm)) return null;
    }
    if (item.children) {
      const visibleChildren = item.children
        .map(filterItem)
        .filter((c): c is NavItemDef => c !== null);
      if (subAccount && visibleChildren.length === 0) return null;
      return { ...item, children: visibleChildren };
    }
    return item;
  };

  const sidebarNavItems: SidebarNavItem[] = allNavItems
    .map(filterItem)
    .filter((i): i is SidebarNavItem => i !== null);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-16 md:p-10">
      <div className="space-y-1.5">
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline cursor-pointer w-fit"
          onClick={() => navigate(domain ? `/sites/${domain}/stats` : '/sites')}
        >
          {t('settings.layout.backToDashboard')}
        </button>
        <h2 className="text-2xl font-bold tracking-tight">{t('settings.layout.settings')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('settings.layout.manageSiteSettings', { domain })}
        </p>
      </div>
      <Separator />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-10 lg:space-y-0">
        <aside className="lg:w-56 shrink-0">
          <SidebarNav items={sidebarNavItems} />
        </aside>
        <div className="flex-1 min-w-0 lg:max-w-4xl">
          {children}
        </div>
      </div>
    </div>
  )
}
