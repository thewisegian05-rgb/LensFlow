import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const isDesktop = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(min-width: 1024px)").matches;

function Layout() {
  // Open by default on desktop, hidden on mobile/tablet.
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (!isDesktop()) return false;
    try {
      return localStorage.getItem("sidebarOpen") !== "false";
    } catch {
      return true;
    }
  });

  // Remember the desktop preference
  useEffect(() => {
    if (!isDesktop()) return;
    try {
      localStorage.setItem("sidebarOpen", String(sidebarOpen));
    } catch {
      /* ignore storage errors */
    }
  }, [sidebarOpen]);

  // Escape closes the sidebar
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setSidebarOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">

      {/* Sidebar */}

      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        <Header
          sidebarOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-slate-100 dark:bg-slate-950">

          <Outlet />

        </main>

      </div>

    </div>
  );
}

export default Layout;