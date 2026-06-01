import { Separator } from "@components/ui/separator"
import { SidebarNav, type SidebarNavItem } from "./components/sidebar-nav"
import { useNavigate, useParams } from "react-router-dom";
import { Rocket, ShieldAlert } from "lucide-react";

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {

  const { domain = '' } = useParams<{ domain?: string }>();
  const navigate = useNavigate();
  const baseUrl = `/sites/${domain}/settings`;

  const sidebarNavItems: SidebarNavItem[] = [
    {
      id: "general",
      title: "General",
      icon: <Rocket className="mr-2 h-4 w-4" />,
      href: `${baseUrl}/general`,
    },
    {
      id: "shields",
      title: "Shields",
      icon: <ShieldAlert className="mr-2 h-4 w-4" />,
      children: [
        {
          id: "shields-ip_address",
          title: "IP Address",
          href: `${baseUrl}/shields/ip_address`,
        },
        {
          id: "shields-hostname",
          title: "Hostname",
          href: `${baseUrl}/shields/hostname`,
        },
        {
          id: "shields-countries",
          title: "Countries",
          href: `${baseUrl}/shields/countries`,
        },
      ],
    },
  ];

  return (
    <div className="hidden space-y-6 p-10 pb-16 md:block">
      <div className="space-y-2">
        <div
          className="text-sm text-blue-500 hover:underline cursor-pointer w-fit"
          onClick={() => navigate(domain ? `/sites/${domain}/stats` : '/sites')}
        >
          ← Back to Dashboard
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your site settings for <span className="font-semibold text-primary">{domain}</span>.
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
