import { Component, useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import ClientPortalStyles from "./client/ClientPortalStyles";

import ClientAuth from "./client/components/ClientAuth";
import ClientSidebar from "./client/components/ClientSidebar";
import ClientHeader from "./client/components/ClientHeader";
import PortalSkeleton from "./client/components/PortalSkeleton";
import CodeForm from "./client/components/CodeForm";

import { useClientAuth } from "./client/hooks/useClientAuth";
import { useConnections } from "./client/hooks/useConnections";
import { usePortal } from "./client/hooks/usePortal";
import { useScrollReveal } from "./client/hooks/useScrollReveal";
import { CLIENT_BASE, ClientNavContext, useClientNav } from "./client/utils/clientRoutes";

import HomeTab from "./client/tabs/HomeTab";
import PortfolioTab from "./client/tabs/PortfolioTab";
import ScheduleTab from "./client/tabs/ScheduleTab";
import MyBookingsTab from "./client/tabs/MyBookingsTab";
import ReviewsTab from "./client/tabs/ReviewsTab";
import MessageTab from "./client/tabs/MessageTab";

/* If one tab crashes, show the message here instead of taking the whole site down
   (which is what sent you back to the landing page). */
class TabErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Client tab crashed:", error, info?.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="rounded-xl border border-dashed border-rose-500/40 px-4 py-10 text-center">
        <p className="text-sm font-medium text-rose-300">This page could not be displayed.</p>
        <p className="mt-2 break-words font-mono text-xs text-slate-400">
          {String(this.state.error?.message || this.state.error)}
        </p>
      </div>
    );
  }
}

/* Gives every tab its data both ways: as props AND through useOutletContext,
   so older saved copies of a tab (that still read props) keep working. */
function TabBridge(props) {
  const Tab = props.component;
  const ctx = useOutletContext();
  return <Tab {...ctx} />;
}

function ClientLayout() {
  const navigate = useNavigate();
  const { user, authLoading, signOut } = useClientAuth();
  const conn = useConnections(user, authLoading);
  const { portal, loading: portalLoading, error: portalError, reload } = usePortal(conn.activeId);

  /* each tab is a real URL (/customer/home, /customer/schedule ...) like the admin */
  const { tabUrl, current } = useClientNav();
  const goTo = (id) => navigate(tabUrl(id));

  // new page = start at the top
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [current]);

  /* re-run the card reveal on every tab switch and when data arrives */
  useScrollReveal(`${current}-${portal ? 1 : 0}-${conn.showCodeForm ? 1 : 0}`);

  const handleSignOut = async () => {
    const ok = await signOut();
    if (ok) {
      navigate("/login", { replace: true });
    }
  };

  if (authLoading) {
    return <div className="min-h-[50vh] px-4 py-16 text-center text-sm text-slate-500">Loading...</div>;
  }
  if (!user) {
    return (
      <>
        <ClientPortalStyles />
        <ClientAuth />
      </>
    );
  }

  const showCodeForm = conn.noConnections || conn.showCodeForm;
  const errorText = portalError || conn.error;

  let content;
  if (conn.loading && conn.connections.length === 0) {
    content = <PortalSkeleton />;
  } else if (showCodeForm) {
    content = (
      <div className="py-3 sm:py-6">
        <CodeForm
          onConnect={conn.connect}
          connecting={conn.connecting}
          error={conn.codeError}
          onCancel={conn.showCodeForm && !conn.noConnections ? conn.closeCodeForm : null}
        />
      </div>
    );
  } else if (portalLoading && !portal) {
    content = <PortalSkeleton />;
  } else if (errorText) {
    content = (
      <p className="rounded-xl border border-dashed border-rose-500/40 py-10 text-center text-sm text-rose-300">
        {errorText}
      </p>
    );
  } else if (portal) {
    /* key={current} remounts the page, so the slide-in plays on every tab click */
    content = (
      <div key={current} className="lf-page">
        <TabErrorBoundary key={current}>
          <Outlet context={{ portal, activeId: conn.activeId, reload, goTo }} />
        </TabErrorBoundary>
      </div>
    );
  } else {
    content = (
      <div className="rounded-xl border border-dashed border-slate-700 px-4 py-10 text-center">
        <p className="text-sm font-medium text-slate-200">Photographer portal is empty</p>
        <p className="mt-1 text-xs text-slate-500">
          The connection is active, but the portal did not return a profile to display.
        </p>
      </div>
    );
  }

  return (
    <div className="client-portal dark custom-scrollbar relative isolate min-h-screen w-full overflow-x-hidden bg-[#070D1D] text-slate-100">
    <ClientPortalStyles />
      {/* Aurora background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <span className="lf-orb lf-orb-1" />
        <span className="lf-orb lf-orb-2" />
        <span className="lf-orb lf-orb-3" />
      </div>

      <div className="relative z-10 mx-auto min-h-screen w-full max-w-[1600px] lg:flex">
        <ClientSidebar onSignOut={handleSignOut} />

        <div className="min-w-0 flex-1 lg:ml-[248px]">
          <ClientHeader
            connections={conn.connections}
            activeId={conn.activeId}
            onSelect={conn.setActiveId}
            showCodeButton={!conn.noConnections}
            onOpenCode={conn.openCodeForm}
            onSignOut={handleSignOut}
          />
          <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <div className="mx-auto w-full max-w-[1500px]">{content}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

/* The tab routes live here.
   Router line (best):   <Route path="/customer/*" element={<ClientPortalPage />} />
   Also works with:      <Route path="/customer" element={<ClientPortalPage />} />  (tabs become ?tab=...) */
function ClientPortalPage() {
  const params = useParams();
  const { search } = useLocation();
  const queryMode = params["*"] === undefined; // route has no "/*"
  const tab = new URLSearchParams(search).get("tab") || "home";

  const home = <Navigate to={queryMode ? `${CLIENT_BASE}?tab=home` : `${CLIENT_BASE}/home`} replace />;
  // query mode: point the inner routes at /customer/<tab>
  const location = queryMode ? { pathname: `${CLIENT_BASE}/${tab}` } : undefined;

  return (
    <ClientNavContext.Provider value={{ queryMode }}>
      <Routes location={location}>
        <Route element={<ClientLayout />}>
          <Route index element={home} />
          <Route path="home" element={<TabBridge component={HomeTab} />} />
          <Route path="portfolio" element={<TabBridge component={PortfolioTab} />} />
          <Route path="schedule" element={<TabBridge component={ScheduleTab} />} />
          <Route path="bookings" element={<TabBridge component={MyBookingsTab} />} />
          <Route path="reviews" element={<TabBridge component={ReviewsTab} />} />
          <Route path="messages" element={<TabBridge component={MessageTab} />} />
          <Route path="*" element={home} />
        </Route>
      </Routes>
    </ClientNavContext.Provider>
  );
}

export default ClientPortalPage;