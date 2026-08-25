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
 * 站点设置侧边导航。
 * - lg 及以上：左侧竖向分组列表。
 * - lg 以下：横向可滚动的 chip 条，当前项自动滚入视野。之前各分组在窄屏上并排成多列，
 *   导航区宽度超过 600px，整页出现横向滚动条。
 */
export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const location = useLocation();
  const stripRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const active = stripRef.current?.querySelector<HTMLElement>("[data-active='true']");
    active?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [location.pathname]);

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

  const flat = flattenLinks(items);

  return (
    <>
      {/* 移动端：横向滚动 chip 条 */}
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
                isActive
                  ? "bg-accent text-accent-foreground font-medium hover:bg-accent"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
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
