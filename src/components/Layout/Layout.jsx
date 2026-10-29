import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import PageLoader from "./PageLoader";
import useSessionGuard from "../../hooks/useSessionGuard";

const isDesktop = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(min-width: 1024px)").matches;

function hasAuthTransition() {
  try {
    return sessionStorage.getItem("lensflow_auth_transition") === "true";
  } catch {
    return false;
  }
}

function Layout() {
  // Sends this device to the login page if its session was signed out
  // from another device ("Sign Out Other Devices").
  useSessionGuard("/login");

  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (!isDesktop()) return false;

    try {
      return localStorage.getItem("sidebarOpen") !== "false";
    } catch {
      return true;
    }
  });

  const [navigation, setNavigation] = useState(() => ({
    key: location.key,
    loading: hasAuthTransition(),
  }));

  // Show the loader after route changes, including the initial dashboard mount
  // when the sign-in page set the auth-transition flag.
  if (navigation.key !== location.key) {
    setNavigation({
      key: location.key,
      loading: true,
    });
  }

  const reportPageReady = useCallback((readyRouteKey) => {
    setNavigation((current) => {
      if (current.key !== readyRouteKey) return current;

      try {
        sessionStorage.removeItem("lensflow_auth_transition");
      } catch {
        // Ignore storage errors.
      }

      return { ...current, loading: false };
    });
  }, []);

  useEffect(() => {
    try {
      if (isDesktop()) {
        localStorage.setItem("sidebarOpen", String(sidebarOpen));
      }
    } catch {
      // Ignore storage errors.
    }
  }, [sidebarOpen]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          sidebarOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="relative flex-1 min-h-0 overflow-hidden bg-slate-100 dark:bg-slate-950">
          <div className="h-full overflow-y-auto custom-scrollbar">
            <div
              key={location.pathname}
              className={`
                min-h-full p-4 sm:p-6
                ${navigation.loading ? "page-content-waiting" : "page-content-reveal"}
              `}
            >
              <Outlet context={{ reportPageReady, routeKey: location.key }} />
            </div>
          </div>

          {/* Covers the main content only; sidebar and header remain visible. */}
          <PageLoader visible={navigation.loading} />
        </main>
      </div>
    </div>
  );
}

export default Layout;