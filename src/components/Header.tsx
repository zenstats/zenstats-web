import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/language-switcher";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { useScroll } from "@/components/ui/use-scroll";
import { cn } from "@/lib/utils";
import Logo from "@/assets/logo.svg";
import LogoDark from "@/assets/logo-dark.svg";
import { useTheme } from "next-themes";
import {
  Globe,
  Key,
  Settings,
  LogOut,
  User,
  LayoutGrid,
  ChevronDown,
  Shield,
  Search,
  Users,
  CreditCard,
} from "lucide-react";
import { isSubAccount } from "@utils/auth";

interface UserInfo {
  email: string;
  name: string;
}

// User state hook
const useUser = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);

  const set = useCallback((user: UserInfo) => {
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("email");
    localStorage.removeItem("name");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    navigate("/login");
  }, [navigate]);

  return { user, set, logout };
};

// User avatar circle
function UserAvatar({ name }: { name: string }) {
  const initial = name ? name.charAt(0).toUpperCase() : "U";
  const colors = [
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-violet-500",
  ];
  const colorIndex = name
    ? name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
    : 0;

  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white",
        colors[colorIndex],
      )}
    >
      {initial}
    </div>
  );
}

// Enhanced User dropdown
function UserDropdown({ user, onLogout, isAdmin, isSubAccount }: { user: { name: string; email: string }; onLogout: () => void; isAdmin: boolean; isSubAccount: boolean }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white bg-indigo-500">
            {initial}
          </div>
          <div className="hidden lg:flex flex-col items-start">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
              {user.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight truncate max-w-[140px]">
              {user.email}
            </span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden lg:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
        <div className="px-2 py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white bg-indigo-500">
              {initial}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {user.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </span>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate("/sites")}
          className="flex items-center gap-2.5 py-2 cursor-pointer"
        >
          <LayoutGrid className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{t('header.mySites')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate("/apikeys")}
          className="flex items-center gap-2.5 py-2 cursor-pointer"
        >
          <Key className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{t('header.apiKeys')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate("/settings/account")}
          className="flex items-center gap-2.5 py-2 cursor-pointer"
        >
          <Settings className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{t('header.settings')}</span>
        </DropdownMenuItem>
        {!isSubAccount && (
          <>
            <DropdownMenuItem
              onClick={() => navigate("/user/sources")}
              className="flex items-center gap-2.5 py-2 cursor-pointer"
            >
              <Search className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{t('header.searchEngines')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("/user/sub-accounts")}
              className="flex items-center gap-2.5 py-2 cursor-pointer"
            >
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{t('header.subAccounts')}</span>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem
          onClick={() => navigate("/user/quota")}
          className="flex items-center gap-2.5 py-2 cursor-pointer"
        >
          <CreditCard className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{t('header.myPlan')}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2.5 py-2 cursor-pointer"
          >
            <Shield className="h-4 w-4 text-gray-500" />
            <span className="text-sm">Admin</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={onLogout}
          className="flex items-center gap-2.5 py-2 cursor-pointer text-red-600"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">{t('header.logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// MobileMenu component
type MobileMenuProps = React.ComponentProps<"div"> & {
  open: boolean;
};

function MobileMenu({ open, children, className, ...props }: MobileMenuProps) {
  if (!open || typeof window === "undefined") return null;

  return createPortal(
    <div
      id="mobile-menu"
      className={cn(
        "bg-background/95 supports-[backdrop-filter]:bg-background/50 backdrop-blur-lg",
        "fixed top-14 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border-y md:hidden",
      )}
    >
      <div
        data-slot={open ? "open" : "closed"}
        className={cn(
          "data-[slot=open]:animate-in data-[slot=open]:zoom-in-97 ease-out",
          "size-full p-4",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

// Header component
export default function Header() {
  const { user, logout, set } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const scrolled = useScroll(10);
  const { t, i18n } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const logoSrc = isDark ? LogoDark : Logo;
  const toggleTheme = () => {
    // Get the toggle button position for radial reveal origin
    const btn = document.querySelector('[data-theme-toggle]');
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      document.documentElement.style.setProperty('--tx', `${x}px`);
      document.documentElement.style.setProperty('--ty', `${y}px`);
    }
    // Use View Transition API for smooth radial animation
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
  const isAdmin = localStorage.getItem("is_admin") === "true";
  const subAccount = isSubAccount();

  useEffect(() => {
    const loadUser = () => {
      const userInfo = {
        email: localStorage.getItem("email") || "",
        name: localStorage.getItem("name") || "",
      };
      set(userInfo);
    };

    loadUser();
    window.addEventListener("zenstats:user-updated", loadUser);

    return () => window.removeEventListener("zenstats:user-updated", loadUser);
  }, [location.pathname, set]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b border-transparent transition-all",
          {
            "bg-white/95 dark:bg-gray-950/95 supports-[backdrop-filter]:bg-white/50 dark:supports-[backdrop-filter]:bg-gray-950/50 border-gray-200 dark:border-gray-800 backdrop-blur-lg":
              scrolled || open,
          },
        )}
      >
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => navigate("/sites")}
          >
            <img className="block h-8 w-auto" src={logoSrc} alt="ZenStats" />
            <span className="font-semibold text-lg hidden sm:inline-block text-gray-900 dark:text-gray-100">
              ZenStats
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-3">
            {/* Sites quick link */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/sites")}
              className="text-gray-600 dark:text-gray-400 text-sm gap-1.5"
            >
              <Globe className="h-4 w-4" />
              {t('header.sites')}
            </Button>

            <LanguageSwitcher />

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              data-theme-toggle
              onClick={toggleTheme}
              className="text-gray-600 dark:text-gray-400"
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
            </Button>

            {user?.name ? (
              <UserDropdown user={user} onLogout={logout} isAdmin={isAdmin} isSubAccount={subAccount} />
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/login")}
                className="gap-1.5"
              >
                <User className="h-4 w-4" />
                {t('header.login')}
              </Button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            {user?.name && (
              <UserAvatar name={user.name} />
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setOpen(!open)}
              className="h-9 w-9"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label="Toggle menu"
            >
              <MenuToggleIcon open={open} className="size-5" />
            </Button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Content */}
      <MobileMenu open={open} className="flex flex-col justify-between gap-4">
        <div className="flex flex-col gap-1">
          {user?.name ? (
            <>
              {/* User info */}
              <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <UserAvatar name={user.name} />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {user.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                className="w-full justify-start gap-2.5 h-11"
                onClick={() => {
                  navigate("/sites");
                  setOpen(false);
                }}
              >
                <LayoutGrid className="h-4 w-4 text-gray-500" />
                {t('header.mySites')}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2.5 h-11"
                onClick={() => {
                  navigate("/apikeys");
                  setOpen(false);
                }}
              >
                <Key className="h-4 w-4 text-gray-500" />
                {t('header.apiKeys')}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2.5 h-11"
                onClick={() => {
                  navigate("/settings/account");
                  setOpen(false);
                }}
              >
                <Settings className="h-4 w-4 text-gray-500" />
                {t('header.settings')}
              </Button>
        {!isSubAccount && (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2.5 h-11"
                    onClick={() => {
                      navigate("/user/sources");
                      setOpen(false);
                    }}
                  >
                    <Search className="h-4 w-4 text-gray-500" />
                    {t('header.searchEngines')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2.5 h-11"
                    onClick={() => {
                      navigate("/user/sub-accounts");
                      setOpen(false);
                    }}
                  >
                    <Users className="h-4 w-4 text-gray-500" />
                    {t('header.subAccounts')}
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                className="w-full justify-start gap-2.5 h-11"
                onClick={() => {
                  navigate("/user/quota");
                  setOpen(false);
                }}
              >
                <CreditCard className="h-4 w-4 text-gray-500" />
                {t('header.myPlan')}
              </Button>

              {isAdmin && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2.5 h-11"
                  onClick={() => {
                    navigate("/admin");
                    setOpen(false);
                  }}
                >
                  <Shield className="h-4 w-4 text-gray-500" />
                  Admin
                </Button>
              )}

              <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />

              {/* Mobile theme toggle */}
              <button
                className="w-full flex items-center gap-2.5 py-2 px-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                onClick={() => {
                  setTheme(isDark ? "light" : "dark");
                }}
              >
                {isDark ? (
                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
                {isDark ? "Light Mode" : "Dark Mode"}
              </button>

              <button
                className="w-full flex items-center gap-2.5 py-2 px-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                onClick={() => {
                  i18n.changeLanguage(i18n.language === 'zh-CN' ? 'en' : 'zh-CN');
                  localStorage.setItem('zenstats-language', i18n.language === 'zh-CN' ? 'en' : 'zh-CN');
                }}
              >
                <Globe className="h-4 w-4 text-gray-500" />
                {i18n.language === 'zh-CN' ? 'English' : '简体中文'}
              </button>

              <Button
                variant="ghost"
                className="w-full justify-start gap-2.5 h-11 text-red-600 dark:text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
              >
                <LogOut className="h-4 w-4" />
                {t('header.logout')}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-1.5"
              onClick={() => {
                navigate("/login");
                setOpen(false);
              }}
            >
              <User className="h-4 w-4" />
              {t('header.login')}
            </Button>
          )}
        </div>
      </MobileMenu>
    </>
  );
}