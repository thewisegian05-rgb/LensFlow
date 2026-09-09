import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">

      {/* Sidebar */}

      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">

        <Header />

        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-slate-100 dark:bg-slate-950">

          <Outlet />

        </main>

      </div>

    </div>
  );
}

export default Layout;