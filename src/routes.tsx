import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import Login from "@/pages/login/login";
import Sites from "@/pages/sites/sites";
import NewSite from "@/pages/sites/new";
import SiteInstallPage from "@/pages/sites/install";
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
    path: "/setup",
    element: <Setup />
  },
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
    path: "/",
    element: <RootRedirect />
  },
  {
    path: "*",
    element: <NotFoundPage />
  }
];

export default routes;