import { Separator } from "@/components/ui/separator"
import { SidebarNav, type SidebarNavItem } from "@/components/sidebar-nav"
import { useNavigate } from "react-router-dom";
import { BarChart3, Users, Package, Globe, Settings, ArrowLeft } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const sidebarNavItems: SidebarNavItem[] = [
    {
      id: "dashboard",
      title: t('admin.dashboard', 'Dashboard'),
      icon: <BarChart3 className="mr-2 h-4 w-4" />,
      href: "/admin/dashboard",
    },
    {
      id: "users",
      title: t('admin.users', 'Users'),
      icon: <Users className="mr-2 h-4 w-4" />,
      href: "/admin/users",
    },
    {
      id: "groups",
      title: t('admin.groups', 'Groups'),
      icon: <Package className="mr-2 h-4 w-4" />,
      href: "/admin/groups",
    },
    {
      id: "sites",
      title: t('admin.sites', 'Sites'),
      icon: <Globe className="mr-2 h-4 w-4" />,
      href: "/admin/sites",
    },
    {
      id: "settings",
      title: t('admin.settings', 'Settings'),
      icon: <Settings className="mr-2 h-4 w-4" />,
      href: "/admin/settings",
    },
  ];

  return (
    <div className="space-y-6 p-4 pb-16 md:p-10">
      <div className="space-y-2">
        <div
          className="text-sm text-blue-500 hover:underline cursor-pointer w-fit flex items-center gap-1"
          onClick={() => navigate('/sites')}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('admin.backToSites', 'Back to Sites')}
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{t('admin.title', 'Admin Panel')}</h2>
        <p className="text-muted-foreground">
          {t('admin.description', 'Manage users, groups, and system settings')}
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
