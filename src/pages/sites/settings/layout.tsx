import { Separator } from "@components/ui/separator"
import { SidebarNav, type SidebarNavItem } from "./components/sidebar-nav"
import { useNavigate, useParams } from "react-router-dom";
import { Code2, Database, Mail, Rocket, ShieldAlert, Target, BellRing } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {

  const { domain = '' } = useParams<{ domain?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const baseUrl = `/sites/${domain}/settings`;

  const sidebarNavItems: SidebarNavItem[] = [
    {
      id: "general",
      title: t('settings.layout.nav.general'),
      icon: <Rocket className="mr-2 h-4 w-4" />,
      href: `${baseUrl}/general`,
    },
    {
      id: "install",
      title: t('settings.layout.nav.installCode'),
      icon: <Code2 className="mr-2 h-4 w-4" />,
      href: `/sites/${domain}/install`,
    },
    {
      id: "import",
      title: t('settings.layout.nav.import'),
      icon: <Database className="mr-2 h-4 w-4" />,
      href: `/sites/${domain}/import`,
    },
    {
      id: "conversions",
      title: t('settings.layout.nav.conversions'),
      icon: <Target className="mr-2 h-4 w-4" />,
      children: [
        {
          id: "goals",
          title: t('settings.layout.nav.goals'),
          href: `${baseUrl}/goals`,
        },
        {
          id: "funnels",
          title: t('settings.layout.nav.funnels'),
          href: `${baseUrl}/funnels`,
        },
      ],
    },
    {
      id: "shields",
      title: t('settings.layout.nav.shields'),
      icon: <ShieldAlert className="mr-2 h-4 w-4" />,
      children: [
        {
          id: "shields-ip_address",
          title: t('settings.layout.nav.ipAddress'),
          href: `${baseUrl}/shields/ip_address`,
        },
        {
          id: "shields-hostname",
          title: t('settings.layout.nav.hostname'),
          href: `${baseUrl}/shields/hostname`,
        },
        {
          id: "shields-countries",
          title: t('settings.layout.nav.countries'),
          href: `${baseUrl}/shields/countries`,
        },
        {
          id: "shields-referrer",
          title: t('settings.layout.nav.referrer'),
          href: `${baseUrl}/shields/referrer`,
        },
      ],
    },
    {
      id: "email-reports",
      title: t('settings.layout.nav.emailReports'),
      icon: <Mail className="mr-2 h-4 w-4" />,
      href: `${baseUrl}/email-reports`,
    },
    {
      id: "traffic-alert",
      title: t('settings.layout.nav.trafficAlert'),
      icon: <BellRing className="mr-2 h-4 w-4" />,
      href: `${baseUrl}/traffic-alert`,
    },
  ];

  return (
    <div className="space-y-6 p-4 pb-16 md:p-10">
      <div className="space-y-2">
        <div
          className="text-sm text-blue-500 hover:underline cursor-pointer w-fit"
          onClick={() => navigate(domain ? `/sites/${domain}/stats` : '/sites')}
        >
          {t('settings.layout.backToDashboard')}
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{t('settings.layout.settings')}</h2>
        <p className="text-muted-foreground">
          {t('settings.layout.manageSiteSettings', { domain })}
        </p>
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-8 lg:space-y-0">
        <aside className="lg:w-1/5">
          <SidebarNav items={sidebarNavItems} />
        </aside>
        <div className="flex-1 lg:max-w-4xl">
          {children}
        </div>
      </div>
    </div>
  )
}
