import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";

// ---- 首屏（冷启动）必需的页面保持同步导入：未登录 → 登录页；已登录 → 站点列表 ----
import Login from "@/pages/login/login";
import Sites from "@/pages/sites/sites";
import NotFoundPage from '@/pages/404';
import EmailGuard from '@/components/email-guard';
import AdminGuard from '@/components/admin-guard';
import RootRedirect from '@/components/root-redirect';
import { preloadStats } from '@/lib/route-preload';

// ---- 其余页面全部按路由懒加载 ----
// 之前 13 个站点设置页、导入页（583 行）、API Key、账号/用户页、注册与验证页都在首屏 index 块里，
// 而绝大多数会话只会访问其中 0-1 个。懒加载后首屏只包含 login/sites 两条路径的代码。
// 导出 preload* 供列表页在空闲时预取下一步最可能进入的页面（见 sites.tsx）。
const StatsPage = lazy(preloadStats);
const HeatmapPage = lazy(() => import("@/pages/sites/heatmap/heatmap"));
const FunnelAnalysisPage = lazy(() => import("@/pages/sites/funnel-analysis/funnel-analysis"));
const ShareView = lazy(() => import('./pages/share/share-view'));
const DocsPage = lazy(() => import('./pages/docs/DocsPage'));

const SubLogin = lazy(() => import("@/pages/login/sub-login"));
const ForgotPassword = lazy(() => import("@/pages/login/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/login/reset-password"));
const Setup = lazy(() => import('@/pages/login/setup'));
const Register = lazy(() => import('./pages/register/register'));

const NewSite = lazy(() => import("@/pages/sites/new"));
const SiteInstallPage = lazy(() => import("@/pages/sites/install"));
const SiteVerifyPage = lazy(() => import("@/pages/sites/verify"));
const ImportPage = lazy(() => import('./pages/sites/import/import'));
const APIKeysPage = lazy(() => import("@/pages/sites/apikeys/apikeys"));
const AccountSettingsPage = lazy(() => import("@/pages/settings/account"));

// 站点设置：布局与各表单共用一个 chunk（进入任一设置页即整体加载，页内切换无二次等待）
const SettingsLayout = lazy(() => import('./pages/sites/settings/layout'));
const SettingsGeneralForm = lazy(() => import('./pages/sites/settings/general-form').then(m => ({ default: m.SettingsGeneralForm })));
const SettingShieldsIpAddress = lazy(() => import('./pages/sites/settings/shields/ip_address'));
const SettingShieldsHostname = lazy(() => import('./pages/sites/settings/shields/hostname'));
const SettingShieldsCountries = lazy(() => import('./pages/sites/settings/shields/countries'));
const SettingShieldsReferrer = lazy(() => import('./pages/sites/settings/shields/referrer'));
const GoalsSettings = lazy(() => import('./pages/sites/settings/goals'));
const FunnelsSettings = lazy(() => import('./pages/sites/settings/funnels'));
const EmailReportsSettings = lazy(() => import('./pages/sites/settings/email-reports'));
const TrafficAlertSettings = lazy(() => import('./pages/sites/settings/traffic-alert'));
const SharedLinksSettings = lazy(() => import('./pages/sites/settings/shared-links'));
const SegmentsSettings = lazy(() => import('./pages/sites/settings/segments'));
const PanelsSettings = lazy(() => import('./pages/sites/settings/panels'));

// Admin pages（后台仅管理员访问，整体懒加载）
const AdminLayout = lazy(() => import('./pages/admin/layout'));
const AdminDashboard = lazy(() => import('./pages/admin/dashboard'));
const AdminIngestionQuality = lazy(() => import('./pages/admin/ingestion-quality'));
const AdminUsers = lazy(() => import('./pages/admin/users'));
const AdminGroups = lazy(() => import('./pages/admin/groups'));
const AdminSites = lazy(() => import('./pages/admin/sites'));
const AdminSources = lazy(() => import('./pages/admin/sources'));
const AdminEmailLogs = lazy(() => import('./pages/admin/email-logs'));
const AdminSettings = lazy(() => import('./pages/admin/settings'));

// User pages
const UserSources = lazy(() => import('./pages/user/sources'));
const UserSubAccounts = lazy(() => import('./pages/user/sub-accounts'));
const UserQuota = lazy(() => import('./pages/user/quota'));

// Verification pages
const VerifyEmail = lazy(() => import('./pages/verify-email/verify-email'));
const VerifyEmailSuccess = lazy(() => import('./pages/verify-email/verify-email-success'));
const PendingVerification = lazy(() => import('./pages/pending-verification'));

const routes: RouteObject[] = [
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/sub-login",
    element: <SubLogin />
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />
  },
  {
    path: "/reset-password",
    element: <ResetPassword />
  },
  {
    path: "/share/:slug",
    element: <ShareView />
  },
  {
    path: "/docs",
    element: <DocsPage />
  },
  {
    path: "/setup",
    element: <Setup />
  },
  {
    path: "/register",
    element: <Register />
  },
  {
    path: "/verify-email",
    element: <VerifyEmail />
  },
  {
    path: "/verify-email-success",
    element: <VerifyEmailSuccess />
  },
  {
    path: "/pending-verification",
    element: <PendingVerification />
  },
  // 需要登录且邮箱已验证的路由
  {
    element: <EmailGuard />,
    children: [
      {
        path: "/sites",
        children: [
          {
            index: true,
            element: <Sites />
          },
          {
            path: "new",
            element: <NewSite />
          },
          {
            path: ":domain/install",
            element: <SiteInstallPage />
          },
          {
            path: ":domain/verify",
            element: <SiteVerifyPage />
          },
          {
            path: ":domain/stats",
            element: <StatsPage />
          },
          {
            path: ":domain/heatmap",
            element: <HeatmapPage />
          },
          {
            path: ":domain/funnel-analysis",
            element: <FunnelAnalysisPage />
          },
          {
            path: ":domain/import",
            element: <ImportPage />
          },
          {
            path: ":domain/settings",
            children: [
              {
                index: true,
                element: <Navigate to="general" replace />
              },
              {
                path: "install",
                element: <SettingsLayout>
                  <SiteInstallPage embedded />
                </SettingsLayout>,
              },
              {
                path: "import",
                element: <SettingsLayout>
                  <ImportPage embedded />
                </SettingsLayout>,
              },
              {
                path: "general",
                element: <SettingsLayout>
                  <SettingsGeneralForm />
                </SettingsLayout>,
              },
              {
                path: "goals",
                element: <SettingsLayout>
                  <GoalsSettings />
                </SettingsLayout>,
              },
              {
                path: "funnels",
                element: <SettingsLayout>
                  <FunnelsSettings />
                </SettingsLayout>,
              },
              {
                path: "shields",
                children: [
                  {
                    path: "ip_address",
                    element: <SettingsLayout>
                      <SettingShieldsIpAddress />
                    </SettingsLayout>,
                  },
                  {
                    path: "hostname",
                    element: <SettingsLayout>
                      <SettingShieldsHostname />
                    </SettingsLayout>,
                  },
                  {
                    path: "countries",
                    element: <SettingsLayout>
                      <SettingShieldsCountries />
                    </SettingsLayout>,
                  },
                  {
                    path: "referrer",
                    element: <SettingsLayout>
                      <SettingShieldsReferrer />
                    </SettingsLayout>,
                  },
                ]
              },
              {
                path: "email-reports",
                element: <SettingsLayout>
                  <EmailReportsSettings />
                </SettingsLayout>,
              },
              {
                path: "traffic-alert",
                element: <SettingsLayout>
                  <TrafficAlertSettings />
                </SettingsLayout>,
              },
              {
                path: "shared-links",
                element: <SettingsLayout>
                  <SharedLinksSettings />
                </SettingsLayout>,
              },
              {
                path: "segments",
                element: <SettingsLayout>
                  <SegmentsSettings />
                </SettingsLayout>,
              },
              {
                path: "panels",
                element: <SettingsLayout>
                  <PanelsSettings />
                </SettingsLayout>,
              },
            ]
          }
        ]
      },
      {
        path: "/apikeys",
        element: <APIKeysPage />
      },
      {
        path: "/settings/account",
        element: <AccountSettingsPage />
      },
      {
        path: "/user/sources",
        element: <UserSources />
      },
      {
        path: "/user/sub-accounts",
        element: <UserSubAccounts />
      },
      {
        path: "/user/quota",
        element: <UserQuota />
      },
      {
        path: "/admin",
        element: <AdminGuard />,
        children: [
          {
            path: "ingestion-quality",
            element: <AdminLayout><AdminIngestionQuality /></AdminLayout>
          },
          {
            index: true,
            element: <Navigate to="/admin/dashboard" replace />
          },
          {
            path: "dashboard",
            element: <AdminLayout><AdminDashboard /></AdminLayout>
          },
          {
            path: "users",
            element: <AdminLayout><AdminUsers /></AdminLayout>
          },
          {
            path: "groups",
            element: <AdminLayout><AdminGroups /></AdminLayout>
          },
          {
            path: "sites",
            element: <AdminLayout><AdminSites /></AdminLayout>
          },
          {
            path: "sources",
            element: <AdminLayout><AdminSources /></AdminLayout>
          },
          {
            path: "email-logs",
            element: <AdminLayout><AdminEmailLogs /></AdminLayout>
          },
          {
            path: "settings",
            element: <AdminLayout><AdminSettings /></AdminLayout>
          },
        ]
      },
    ]
  },
  {
    path: "/",
    element: <RootRedirect />
  },
  {
    path: "*",
    element: <NotFoundPage />
  }
];

export default routes;
