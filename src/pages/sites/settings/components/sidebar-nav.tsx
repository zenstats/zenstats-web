import { cn } from "@/lib/utils"
import { buttonVariants } from "@components/ui/variants/button-variants"
import { useLocation } from "react-router-dom"
import { Link } from "react-router-dom";


export interface SidebarNavItem {
  id: string;
  icon?: React.ReactNode;
  href?: string;
  title: string;
  children?: SidebarNavItem[];
}

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: SidebarNavItem[];
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const location = useLocation();

  const renderNavItem = (item: SidebarNavItem) => {
    // 分区标题：无 href 且带子项的项渲染为一个分组标题 + 其下的链接
    if (!item.href && item.children) {
      return (
        <div key={item.id} className="space-y-1">
          <div className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {item.title}
          </div>
          {item.children.map(child => renderNavItem(child))}
        </div>
      );
    }

    const isActive = location.pathname === item.href;
    return (
      <div key={item.id} className="relative">
        {item.href ? (
          <Link
            to={item.href}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              isActive
                ? "bg-accent text-accent-foreground font-medium hover:bg-accent"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              "justify-start w-full"
            )}
          >
            {item.icon}
            {item.title}
          </Link>
        ) : (
          <div className={cn(buttonVariants({ variant: "ghost" }), "justify-start cursor-default")}>
            {item.icon}
            {item.title}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav
      className={cn(
        "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1",
        className
      )}
      {...props}
    >
      {items.map(item => renderNavItem(item))}
    </nav>
  )
}
