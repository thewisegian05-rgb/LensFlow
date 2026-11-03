import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { FaSearch, FaUser, FaFolderOpen, FaCalendarAlt, FaBriefcase, FaImages, FaArrowRight, FaMapMarkerAlt, FaTag, FaClock } from "react-icons/fa";
import { supabase } from "../../lib/supabaseClient";
import Sidebar from "./Sidebar";
import Header from "./Header";
import PageLoader from "./PageLoader";
import useSessionGuard from "../../hooks/useSessionGuard";

const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
function hasAuthTransition() {
  try { return sessionStorage.getItem("lensflow_auth_transition") === "true"; }
  catch { return false; }
}


function HighlightMatch({ text, query }) {
  const value = String(text ?? "");
  const term = query.trim();

  if (!term) return value;

  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = value.split(new RegExp(`(${escapedTerm})`, "gi"));

  return parts.map((part, index) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark
        key={`${part}-${index}`}
        className="rounded bg-sky-400/20 px-0.5 text-sky-600 dark:bg-sky-400/20 dark:text-sky-300"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function Layout() {
  useSessionGuard("/login");
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (!isDesktop()) return false;
    try { return localStorage.getItem("sidebarOpen") !== "false"; }
    catch { return true; }
  });
  const [navigation, setNavigation] = useState(() => ({ key: location.key, loading: hasAuthTransition() }));
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({
    clients: [],
    projects: [],
    schedules: [],
    folders: [],
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  if (navigation.key !== location.key) setNavigation({ key: location.key, loading: true });

  const reportPageReady = useCallback((readyRouteKey) => {
    setNavigation((current) => {
      if (current.key !== readyRouteKey) return current;
      try { sessionStorage.removeItem("lensflow_auth_transition"); } catch {}
      return { ...current, loading: false };
    });
  }, []);

  useEffect(() => {
    try { if (isDesktop()) localStorage.setItem("sidebarOpen", String(sidebarOpen)); } catch {}
  }, [sidebarOpen]);

  // Clear the global search whenever the user navigates to a different page.
  useEffect(() => {
    setSearchQuery("");
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const term = searchQuery.trim();

    if (!term) {
      setSearchResults({
        clients: [],
        projects: [],
        schedules: [],
        folders: [],
      });
      setSearchError("");
      setSearchLoading(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          if (!cancelled) {
            setSearchResults({
              clients: [],
              projects: [],
              schedules: [],
              folders: [],
            });
            setSearchError("Please sign in to search your records.");
            setSearchLoading(false);
          }
          return;
        }

        const safeTerm = term.replace(/[,%()]/g, " ");
        const pattern = `%${safeTerm}%`;

        const [
          clientResponse,
          eventResponse,
          folderResponse,
        ] = await Promise.all([
          supabase
            .from("clients")
            .select("id, name, email, project, type")
            .eq("user_id", user.id)
            .or(`name.ilike.${pattern},email.ilike.${pattern},project.ilike.${pattern}`)
            .limit(30),

          supabase
            .from("schedule_events")
            .select("id, project_id, title, client, category, location, start_time")
            .eq("user_id", user.id)
            .or(`title.ilike.${pattern},client.ilike.${pattern},category.ilike.${pattern},location.ilike.${pattern}`)
            .order("start_time", { ascending: true })
            .limit(30),

          supabase
            .from("folders")
            .select("id, name, parent_id")
            .eq("user_id", user.id)
            .ilike("name", pattern)
            .limit(30),
        ]);

        if (cancelled) return;

        const errors = [
          clientResponse.error,
          eventResponse.error,
          folderResponse.error,
        ].filter(Boolean);

        if (errors.length > 0) {
          console.error("Global search errors:", errors);
          setSearchError(
            "Some search results couldn't be loaded. Please try again."
          );
        } else {
          setSearchResults({
            clients: clientResponse.data || [],
            // Preserve the existing Workflow results.
            projects: eventResponse.data || [],
            // Schedule events use the same table but have their own destination.
            schedules: eventResponse.data || [],
            folders: folderResponse.data || [],
          });
        }
      } catch (error) {
        console.error("Global search failed:", error);

        if (!cancelled) {
          setSearchError("Search couldn't be completed. Please try again.");
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const openClient = (client) => {
    navigate("/dashboard/clients", { state: { highlightClientId: client.id, highlightSearchTerm: searchQuery.trim() } });
    setSearchQuery("");
  };
  const openProject = (project) => {
    navigate("/dashboard/workflow", { state: { highlightProjectId: project.id, highlightSearchTerm: searchQuery.trim() } });
    setSearchQuery("");
  };
  const openSchedule = (event) => {
    navigate("/dashboard/schedule", {
      state: { highlightEventId: event.id },
    });
    setSearchQuery("");
  };

  const openFolder = (folder) => {
    navigate("/dashboard/storage", {
      state: { highlightFolderId: folder.id },
    });
    setSearchQuery("");
  };

  const showingSearch = Boolean(searchQuery.trim());
  const totalResults =
    searchResults.clients.length +
    searchResults.projects.length +
    searchResults.schedules.length +
    searchResults.folders.length;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((open) => !open)} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(true)} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main className="relative flex-1 min-h-0 overflow-hidden bg-[#020617]">
          {/* Floating blue orbs */}
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <div className="lf-orb lf-orb-a" />
            <div className="lf-orb lf-orb-b" />
            <div className="lf-orb lf-orb-c" />
          </div>
          <style>{`
            .lf-orb {
              position: absolute;
              border-radius: 9999px;
              filter: blur(70px);
              mix-blend-mode: screen;
              opacity: .55;
              pointer-events: none;
            }

            .lf-orb-a {
              width: 26rem;
              height: 26rem;
              left: -6rem;
              top: -4rem;
              background: rgba(14,165,233,.5);
              animation: lfOrbA 16s ease-in-out infinite alternate;
            }

            .lf-orb-b {
              width: 30rem;
              height: 30rem;
              right: -8rem;
              top: 10%;
              background: rgba(99,102,241,.45);
              animation: lfOrbB 20s ease-in-out infinite alternate;
            }

            .lf-orb-c {
              width: 20rem;
              height: 20rem;
              left: 35%;
              bottom: -6rem;
              background: rgba(56,189,248,.35);
              animation: lfOrbC 18s ease-in-out infinite alternate;
            }

            @keyframes lfOrbA {
              from {
                transform: translate3d(0,0,0) scale(1);
              }
              to {
                transform: translate3d(22vw,12vh,0) scale(1.4);
              }
            }

            @keyframes lfOrbB {
              from {
                transform: translate3d(0,0,0) scale(1.2);
              }
              to {
                transform: translate3d(-24vw,16vh,0) scale(.85);
              }
            }

            @keyframes lfOrbC {
              from {
                transform: translate3d(0,0,0) scale(.9);
              }
              to {
                transform: translate3d(-20vw,-14vh,0) scale(1.35);
              }
            }

            @media (prefers-reduced-motion: reduce) {
              .lf-orb {
                display: none;
              }
            }
          `}</style>

          {/* Dashboard content */}
          <div className="relative z-10 h-full overflow-y-auto custom-scrollbar">
            <div
              key={location.pathname}
              className={`min-h-full p-4 sm:p-6 ${
                navigation.loading
                  ? "page-content-waiting"
                  : "page-content-reveal"
              }`}
            >
              {showingSearch ? (
                // Keep your existing search results section here
                <section className="mx-auto max-w-5xl">
                  {/* Existing search results JSX */}
                </section>
              ) : (
                <Outlet context={{ reportPageReady, routeKey: location.key }} />
              )}
            </div>
          </div>
          <div className="h-full overflow-y-auto custom-scrollbar">
            <div key={location.pathname} className={`min-h-full p-4 sm:p-6 ${navigation.loading ? "page-content-waiting" : "page-content-reveal"}`}>
              {showingSearch ? (
                <section className="mx-auto max-w-5xl">
                  <div className="mb-8 flex flex-wrap items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-xl text-sky-500 ring-1 ring-sky-500/15">
                      <FaSearch />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                          Search Results
                        </h1>
                        {!searchLoading && !searchError && (
                          <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-300">
                            {totalResults} {totalResults === 1 ? "result" : "results"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                        Showing matches for{" "}
                        <span className="font-semibold text-sky-600 dark:text-sky-400">
                          “{searchQuery.trim()}”
                        </span>
                      </p>
                    </div>

                    <button
                      onClick={() => setSearchQuery("")}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      Clear search
                    </button>
                  </div>

                  {searchLoading ? (
                    <div className="rounded-2xl border border-slate-200 bg-white/70 px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500 dark:border-slate-700 dark:border-t-sky-400" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Searching your workspace...
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Looking through clients, projects, schedules, and media folders
                      </p>
                    </div>
                  ) : searchError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                      {searchError}
                    </div>
                  ) : totalResults === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/30">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                        <FaSearch />
                      </div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        No matching records found
                      </p>
                      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                        Try another client name, project title, email, folder name, or location.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {searchResults.clients.length > 0 && (
                        <section className="overflow-hidden rounded-2xl border border-sky-500/25 bg-white/60 shadow-sm dark:bg-slate-900/30">
                          <div className="flex items-center justify-between border-b border-sky-500/20 bg-gradient-to-r from-sky-500/15 via-sky-500/8 to-transparent px-4 py-3 dark:from-sky-500/20 dark:via-sky-500/10">
                            <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-500">
                              <FaUser />
                            </div>
                            <div>
                              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                Clients
                              </h2>
                              <p className="text-xs text-slate-500">
                                {searchResults.clients.length} matching {searchResults.clients.length === 1 ? "client" : "clients"}
                              </p>
                            </div>
                            </div>
                            <span className="text-xs font-semibold text-sky-600 dark:text-sky-300">View all <FaArrowRight className="ml-1 inline text-[10px]" /></span>
                          </div>

                          <div className="grid grid-cols-1 gap-3 p-3">
                            {searchResults.clients.map((client) => (
                              <button
                                key={client.id}
                                onClick={() => openClient(client)}
                                className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-sky-400/70 hover:shadow-lg hover:shadow-sky-950/5 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/60 dark:hover:bg-slate-900/90"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-lg text-sky-500 transition group-hover:bg-sky-500/15">
                                    <FaUser />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                                      <HighlightMatch text={client.name || "Unnamed client"} query={searchQuery} />
                                    </p>
                                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                                      <HighlightMatch text={client.email || client.type || "Client"} query={searchQuery} />
                                    </p>
                                  </div>
                                  <FaArrowRight className="mt-1 shrink-0 text-sm text-slate-300 transition group-hover:translate-x-1 group-hover:text-sky-500 dark:text-slate-600" />
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                                  <span className="text-xs text-slate-400">Associated project</span>
                                  <span className="max-w-full truncate rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {client.project || "No project linked"}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </section>
                      )}

                      {searchResults.projects.length > 0 && (
                        <section className="overflow-hidden rounded-2xl border border-fuchsia-500/25 bg-white/60 shadow-sm dark:bg-slate-900/30">
                          <div className="flex items-center justify-between border-b border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-500/15 via-fuchsia-500/8 to-transparent px-4 py-3 dark:from-fuchsia-500/20 dark:via-fuchsia-500/10">
                            <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-500">
                              <FaBriefcase />
                            </div>
                            <div>
                              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                Project Workflow
                              </h2>
                              <p className="text-xs text-slate-500">
                                {searchResults.projects.length} matching {searchResults.projects.length === 1 ? "project workflow" : "project workflows"}
                              </p>
                            </div>
                            </div>
                            <span className="text-xs font-semibold text-fuchsia-600 dark:text-fuchsia-300">View all <FaArrowRight className="ml-1 inline text-[10px]" /></span>
                          </div>

                          <div className="grid grid-cols-1 gap-3 p-3">
                            {searchResults.projects.map((project) => (
                              <button
                                key={project.id}
                                onClick={() => openProject(project)}
                                className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-sky-400/70 hover:shadow-lg hover:shadow-sky-950/5 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/60"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-lg text-violet-500">
                                    <FaBriefcase />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                                      <HighlightMatch text={project.title || "Untitled event"} query={searchQuery} />
                                    </p>
                                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                                      <HighlightMatch text={project.client || "No client linked"} query={searchQuery} />
                                    </p>
                                  </div>
                                  <FaArrowRight className="mt-1 shrink-0 text-sm text-slate-300 transition group-hover:translate-x-1 group-hover:text-sky-500 dark:text-slate-600" />
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                                  {project.category && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-1 text-xs font-medium text-violet-600 dark:text-violet-300">
                                      <FaTag className="text-[10px]" /> {project.category}
                                    </span>
                                  )}
                                  {project.location && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                      <FaMapMarkerAlt className="text-[10px]" /> {project.location}
                                    </span>
                                  )}
                                  {project.start_time && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                      <FaCalendarAlt className="text-[10px]" /> {new Date(project.start_time).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </section>
                      )}

                      {searchResults.schedules.length > 0 && (
                        <section className="overflow-hidden rounded-2xl border border-emerald-500/25 bg-white/60 shadow-sm dark:bg-slate-900/30">
                          <div className="flex items-center justify-between border-b border-emerald-500/20 bg-gradient-to-r from-emerald-500/15 via-emerald-500/8 to-transparent px-4 py-3 dark:from-emerald-500/20 dark:via-emerald-500/10">
                            <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                              <FaCalendarAlt />
                            </div>
                            <div>
                              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                Schedules
                              </h2>
                              <p className="text-xs text-slate-500">
                                {searchResults.schedules.length} matching {searchResults.schedules.length === 1 ? "schedule" : "schedules"}
                              </p>
                            </div>
                            </div>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">View all <FaArrowRight className="ml-1 inline text-[10px]" /></span>
                          </div>

                          <div className="grid grid-cols-1 gap-3 p-3">
                            {searchResults.schedules.map((event) => (
                              <button
                                key={event.id}
                                onClick={() => openSchedule(event)}
                                className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-sky-400/70 hover:shadow-lg hover:shadow-sky-950/5 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/60"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-lg text-emerald-500">
                                    <FaCalendarAlt />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                                      <HighlightMatch text={event.title || "Untitled event"} query={searchQuery} />
                                    </p>
                                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                                      <HighlightMatch text={event.client || "No client linked"} query={searchQuery} />
                                    </p>
                                  </div>
                                  <FaArrowRight className="mt-1 shrink-0 text-sm text-slate-300 transition group-hover:translate-x-1 group-hover:text-sky-500 dark:text-slate-600" />
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                                  {event.category && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                                      <FaTag className="text-[10px]" /> {event.category}
                                    </span>
                                  )}
                                  {event.location && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                      <FaMapMarkerAlt className="text-[10px]" /> {event.location}
                                    </span>
                                  )}
                                  {event.start_time && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                      <FaClock className="text-[10px]" /> {new Date(event.start_time).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </section>
                      )}

                      {searchResults.folders.length > 0 && (
                        <section className="overflow-hidden rounded-2xl border border-amber-500/25 bg-white/60 shadow-sm dark:bg-slate-900/30">
                          <div className="flex items-center justify-between border-b border-amber-500/20 bg-gradient-to-r from-amber-500/15 via-amber-500/8 to-transparent px-4 py-3 dark:from-amber-500/20 dark:via-amber-500/10">
                            <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                              <FaImages />
                            </div>
                            <div>
                              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                Media Storage
                              </h2>
                              <p className="text-xs text-slate-500">
                                {searchResults.folders.length} matching {searchResults.folders.length === 1 ? "folder" : "folders"}
                              </p>
                            </div>
                            </div>
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-300">View all <FaArrowRight className="ml-1 inline text-[10px]" /></span>
                          </div>

                          <div className="grid grid-cols-1 gap-3 p-3">
                            {searchResults.folders.map((folder) => (
                              <button
                                key={folder.id}
                                onClick={() => openFolder(folder)}
                                className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-sky-400/70 hover:shadow-lg hover:shadow-sky-950/5 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/60"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-lg text-amber-500">
                                    <FaFolderOpen />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                                      <HighlightMatch text={folder.name || "Unnamed folder"} query={searchQuery} />
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                      Media Storage folder
                                    </p>
                                  </div>
                                  <FaArrowRight className="shrink-0 text-sm text-slate-300 transition group-hover:translate-x-1 group-hover:text-sky-500 dark:text-slate-600" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  )}
                </section>              ) : <Outlet context={{ reportPageReady, routeKey: location.key }} />}
            </div>
          </div>
          <PageLoader visible={navigation.loading && !showingSearch} />
        </main>
      </div>
    </div>
  );
}
export default Layout;
