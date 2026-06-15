import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import Login from "@/pages/login/login";
import SubLogin from "@/pages/login/sub-login";
import ForgotPassword from "@/pages/login/forgot-password";
import ResetPassword from "@/pages/login/reset-password";
import Sites from "@/pages/sites/sites";
import NewSite from "@/pages/sites/new";
import SiteInstallPage from "@/pages/sites/install";
import SiteVerifyPage from "@/pages/sites/verify";
import StatsPage from "@/pages/sites/stats/stats";
import FunnelAnalysisPage from "@/pages/sites/funnel-analysis/funnel-analysis";
import APIKeysPage from "@/pages/sites/apikeys/apikeys";
import AccountSettingsPage from "@/pages/settings/account";
import Setup from '@/pages/login/setup';
import NotFoundPage from '@/pages/404';
import SettingsLayout from './pages/sites/settings/layout';
import { SettingsGeneralForm } from './pages/sites/settings/general-form';
import SettingShieldsIpAddress from './pages/sites/settings/shields/ip_address';
import SettingShieldsHostname from './pages/sites/settings/shields/hostname';
import SettingShieldsCountries from './pages/sites/settings/shields/countries';
import GoalsSettings from './pages/sites/settings/goals';
import FunnelsSettings from './pages/sites/settings/funnels';

// Admin pages
import AdminGuard from '@/components/admin-guard';
import AdminLayout from './pages/admin/layout';
import AdminDashboard from './pages/admin/dashboard';
import AdminUsers from './pages/admin/users';
import AdminGroups from './pages/admin/groups';
import AdminSites from './pages/admin/sites';
import AdminSettings from './pages/admin/settings';

// User pages
import Register from './pages/register/register';
import UserSearchEngines from './pages/user/search-engines';
import UserSubAccounts from './pages/user/sub-accounts';
import UserQuota from './pages/user/quota';

// Verification pages
import VerifyEmail from './pages/verify-email/verify-email';
import VerifyEmailSuccess from './pages/verify-email/verify-email-success';
import PendingVerification from './pages/pending-verification';
import EmailGuard from '@/components/email-guard';

// Root redirect component that checks login state
function RootRedirect() {
  const token = localStorage.getItem("token");
  if (token) {
    return <Navigate to="/sites" replace />;
  }
  return <Navigate to="/login" replace />;
}

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
            path: ":domain/funnel-analysis",
            element: <FunnelAnalysisPage />
          },
          {
            path: ":domain/settings",
            children: [
              {
                index: true,
                element: <Navigate to="general" replace />
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
                ]
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
        path: "/user/search-engines",
        element: <UserSearchEngines />
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