import { useEffect, useRef } from "react"
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

function isItemActive(item: SidebarNavItem, pathname: string): boolean {
  return pathname === item.href ||
    (item.children?.some(child => child.href && pathname.startsWith(child.href)) ?? false);
}

/** 展平分组：移动端只展示可点击的叶子项，分组标题省略以节省横向空间。 */
function flattenLinks(items: SidebarNavItem[]): SidebarNavItem[] {
  const out: SidebarNavItem[] = [];
  for (const item of items) {
    if (item.href) out.push(item);
    if (item.children) out.push(...flattenLinks(item.children));
  }
  return out;
}

/**
 * 设置页 / 管理后台的侧边导航。
 * - lg 及以上：左侧竖向分组列表（原有形态）。
 * - lg 以下：横向可滚动的 chip 条，当前项自动滚入视野。之前在窄屏上各分组并排成多列，
 *   导航区宽度达 770-815px，整页出现横向滚动条。
 */
export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const location = useLocation();
  const stripRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const active = stripRef.current?.querySelector<HTMLElement>("[data-active='true']");
    active?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [location.pathname]);

  const renderNavItem = (item: SidebarNavItem) => {
    const isActive = isItemActive(item, location.pathname);
    return (
      <div key={item.id} className="relative">
        {item.href ? (
          <Link
            to={item.href}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              isActive
                ? "bg-muted hover:bg-muted"
                : "hover:bg-muted/50",
              "justify-start"
            )}
          >
            {item.icon}
            {item.title}
          </Link>
        ) : (
          <div
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "justify-start cursor-default",
              isActive ? "bg-muted" : ""
            )}
          >
            {item.icon}
            {item.title}
          </div>
        )}

        {item.children && (
          <div className="pl-4 mt-1 space-y-1">
            {item.children.map(child => renderNavItem(child))}
          </div>
        )}
      </div>
    );
  };

  const flat = flattenLinks(items);

  return (
    <>
      {/* 移动端：横向滚动条 */}
      <nav
        ref={stripRef}
        className={cn(
          "lg:hidden flex gap-1 overflow-x-auto -mx-4 px-4 pb-2 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          className
        )}
        {...props}
      >
        {flat.map(item => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.id}
              to={item.href!}
              data-active={isActive}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "shrink-0 snap-start whitespace-nowrap",
                isActive ? "bg-muted hover:bg-muted" : "hover:bg-muted/50"
              )}
            >
              {item.icon}
              {item.title}
            </Link>
          );
        })}
      </nav>
      {/* 桌面端：竖向分组列表 */}
      <nav
        className={cn("hidden lg:flex lg:flex-col lg:space-y-1", className)}
        {...props}
      >
        {items.map(item => renderNavItem(item))}
      </nav>
    </>
  )
}
