
import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import PageLoader from "./PageLoader";

const isDesktop = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(min-width: 1024px)").matches;

function Layout() {
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (!isDesktop()) return false;

    try {
      return localStorage.getItem("sidebarOpen") !== "false";
    } catch {
      return true;
    }
  });

  // Do not show the loader on the initial app load.
  // Show it whenever the route changes afterward.
  const [navigation, setNavigation] = useState(() => ({
    key: location.key,
    loading: false,
  }));

  // Associate the loading state with the current route.
  if (navigation.key !== location.key) {
    setNavigation({
      key: location.key,
      loading: true,
    });
  }

  // Pages call this after their initial content is ready.
  const reportPageReady = useCallback((readyRouteKey) => {
    setNavigation((current) =>
      current.key === readyRouteKey
        ? { ...current, loading: false }
        : current
    );
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
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
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
          {/* Scrollable page content */}
          <div className="h-full overflow-y-auto custom-scrollbar">
            <div
              key={location.pathname}
              className={`
                min-h-full p-4 sm:p-6
                ${
                  navigation.loading
                    ? "page-content-waiting"
                    : "page-content-reveal"
                }
              `}
            >
              <Outlet
                context={{
                  reportPageReady,
                  routeKey: location.key,
                }}
              />
            </div>
          </div>

          {/* Covers only the main content, not the header or sidebar */}
          <PageLoader visible={navigation.loading} />
        </main>
      </div>
    </div>
  );
}

export default Layout;
