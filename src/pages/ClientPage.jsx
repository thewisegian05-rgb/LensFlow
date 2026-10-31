import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

import ClientCard from "../components/Clients/ClientCard.jsx";
import ClientList from "../components/Clients/ClientList.jsx";
import AddClientModal from "../components/Clients/AddClientModal.jsx";
import ViewClientModal from "../components/Clients/ViewClientModal.jsx";
import EditClientModal from "../components/Clients/EditClientModal.jsx";
import ConfirmModal from "../components/Common/ConfirmModal.jsx";

import "../components/Clients/Clients.css";
import "../components/Clients/ClientCard.css";
import "../components/Clients/ClientList.css";
import "../components/Clients/AddClientModal.css";
import "../components/Clients/ViewClientModal.css";
import "../components/Clients/ClientPageAnimations.css";

import { FiGrid, FiList, FiSearch, FiX } from "react-icons/fi";
import { FaFilter, FaPlus } from "react-icons/fa";

// Key used to remember the client list's view type (grid/list) across
// page navigations and reloads.
const VIEW_TYPE_STORAGE_KEY = "clients:viewType";

// Must match the longest delete animation duration in ClientPageAnimations.css
const DELETE_ANIM_MS = 500;

// Event statuses come from the Workflow tab (schedule_events.status).
const statusOf = (event) => String(event?.status || "").toLowerCase();
// "Completed" is the last Workflow stage (after Delivered).
const isCompleted = (event) => statusOf(event) === "completed";
const isCancelled = (event) => statusOf(event) === "cancelled";

function ClientPage() {
  const { reportPageReady, routeKey } = useOutletContext();
  const location = useLocation();
  const [highlightedClientId, setHighlightedClientId] = useState(null);

  // Briefly emphasize the client selected from global header search.
  useEffect(() => {
    const targetId = location.state?.highlightClientId;
    if (!targetId) return;
    setHighlightedClientId(targetId);
    setViewType("grid");
    const timer = setTimeout(() => setHighlightedClientId(null), 3000);
    return () => clearTimeout(timer);
  }, [location.key, location.state]);

  // Modal States
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);

  // Tracks which client ids are currently playing their exit animation
  const [leavingIds, setLeavingIds] = useState(new Set());

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

  // "grid" = card/block view, "list" = table/list view.
  // Initialized from localStorage so the last picked view is remembered.
  const [viewType, setViewType] = useState(() => {
    if (typeof window === "undefined") return "grid";

    try {
      return localStorage.getItem(VIEW_TYPE_STORAGE_KEY) || "grid";
    } catch (error) {
      console.error("Failed to read saved view type:", error);
      return "grid";
    }
  });

  // Persist whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_TYPE_STORAGE_KEY, viewType);
    } catch (error) {
      console.error("Failed to save view type:", error);
    }
  }, [viewType]);

  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    if (!loadingClients) {
      reportPageReady(routeKey);
    }
  }, [loadingClients, reportPageReady, routeKey]);

  // silent = refresh the data without showing the loading skeleton.
  // Returns the mapped clients so callers can use the fresh data.
  const fetchClients = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingClients(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setClients([]);
      setLoadingClients(false);
      return [];
    }

    // Load clients
    const { data: clientRows, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (clientsError) {
      console.error("Failed to load clients:", clientsError.message);
      setLoadingClients(false);
      return null;
    }

    // Load schedule events
    const { data: eventRows, error: eventsError } = await supabase
      .from("schedule_events")
      .select(
        `
        id,
        client_id,
        title,
        location,
        category,
        start_time,
        end_time,
        status,
        project_id
      `
      )
      .eq("user_id", user.id)
      .order("start_time", { ascending: true });

    if (eventsError) {
      console.error("Failed to load client events:", eventsError.message);
      setLoadingClients(false);
      return null;
    }

    const now = new Date();

    const mappedClients = clientRows.map((row) => {
      // All events belonging to this client
      const projects = eventRows
        .filter((event) => event.client_id === row.id)
        .map((event) => ({
          id: event.id,
          projectId: event.project_id,

          title: event.title,
          venue: event.location,
          category: event.category,

          start: event.start_time,
          end: event.end_time,

          status: event.status,
        }));

      // Events that still need work (not completed, not cancelled)
      const openProjects = projects.filter(
        (project) => !isCompleted(project) && !isCancelled(project)
      );

      // Query is already ascending, so index 0 is the nearest event.
      const upcomingOpen = openProjects.filter(
        (project) => new Date(project.start) >= now
      );

      // Prefer the next upcoming open event, then any open event,
      // then fall back to the most recent one (e.g. all delivered).
      const activeProject =
        upcomingOpen[0] ||
        openProjects[openProjects.length - 1] ||
        projects[projects.length - 1] ||
        null;

      // Keep the Client tab in sync with the Workflow tab:
      // when every (non-cancelled) event is completed, the client is Completed.
      const countedProjects = projects.filter((p) => !isCancelled(p));
      const allDelivered =
        countedProjects.length > 0 && countedProjects.every(isCompleted);

      return {
        id: row.id,
        name: row.name,
        type: row.type,
        contact: row.contact,
        email: row.email,

        projectStatus: allDelivered ? "Completed" : row.project_status,
        talentFee: row.talent_fee,
        initials: row.initials,

        // All scheduled projects/events
        projects,

        // What Card/List should display
        activeProject,

        // Kept for compatibility with existing components
        project: activeProject?.title || row.project,
        venue: activeProject?.venue || row.venue,
        category: activeProject?.category || row.category,
      };
    });

    setClients(mappedClients);
    setLoadingClients(false);
    return mappedClients;
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Pick up changes made on other tabs (e.g. Workflow marking an event
  // delivered) whenever the user comes back to this page or window.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        fetchClients({ silent: true });
      }
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchClients]);

  // Live sync: refresh whenever events or clients change in Supabase
  // (needs Realtime enabled for these tables), plus a light poll as a fallback.
  useEffect(() => {
    const refresh = () => fetchClients({ silent: true });

    const channel = supabase
      .channel("clients-page-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedule_events" },
        refresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        refresh
      )
      .subscribe();

    const poll = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 15000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [fetchClients]);

  // Add New Client
  const handleAddClient = (newClient) => {
    setClients((previousClients) => [...previousClients, newClient]);
    // Pull the saved row + its events so everything stays in sync.
    fetchClients({ silent: true });
  };

  // Delete Client — opens the confirm modal.
  // The actual deletion (with animation) happens in confirmDeleteClient.
  const handleDeleteClient = (id) => {
    setClientToDelete(id);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;

    const id = clientToDelete;

    // Close the confirm modal immediately so the user sees the animation
    setClientToDelete(null);

    // 1. Play the exit animation by marking this id as "leaving"
    setLeavingIds((prev) => new Set([...prev, id]));

    // 2. Wait for the animation to finish, THEN hit the DB and remove from state
    setTimeout(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No authenticated user found.");
        setLeavingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      // Delete every schedule event tied to this client first.
      const { error: eventsDeleteError } = await supabase
        .from("schedule_events")
        .delete()
        .eq("client_id", id)
        .eq("user_id", user.id);

      if (eventsDeleteError) {
        console.error(
          "Failed to delete client's schedule events:",
          eventsDeleteError.message
        );
        setLeavingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to delete client:", error.message);
        setLeavingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      // Remove from state and clean up the leaving set
      setClients((prev) => prev.filter((client) => client.id !== id));
      setLeavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      if (selectedClient?.id === id) setSelectedClient(null);
      if (editingClient?.id === id) setEditingClient(null);
    }, DELETE_ANIM_MS);
  };

  // Mark Client as Completed
  const handleCompleteClient = (id) => {
    setClients((previousClients) =>
      previousClients.map((client) =>
        client.id === id ? { ...client, projectStatus: "Completed" } : client
      )
    );

    setSelectedClient((previousClient) =>
      previousClient?.id === id
        ? { ...previousClient, projectStatus: "Completed" }
        : previousClient
    );
  };

  // Filter clients based on search term or selected category
  const filteredClients = clients.filter((client) => {
    const searchText = searchTerm.toLowerCase();
    const matchesSearch =
      client.name?.toLowerCase().includes(searchText) ||
      client.email?.toLowerCase().includes(searchText) ||
      client.project?.toLowerCase().includes(searchText);

    const matchesCategory =
      selectedCategory === "All Categories" ||
      client.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Edit Client
  const handleEditClient = async (updatedClient) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("No authenticated user found.");
      return;
    }

    const payload = {
      name: updatedClient.name,
      type: updatedClient.type,
      contact: updatedClient.contact,
      email: updatedClient.email,
      project: updatedClient.project,
      venue: updatedClient.venue,
      category: updatedClient.category,
      project_status: updatedClient.projectStatus,
      talent_fee: updatedClient.talentFee,
      initials: updatedClient.initials,
    };

    const { error } = await supabase
      .from("clients")
      .update(payload)
      .eq("id", updatedClient.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to update client:", error.message);
      return;
    }

    // Reload so the client keeps its events and the status stays in sync
    // with the Workflow tab (a plain row update would drop both).
    const fresh = await fetchClients({ silent: true });

    if (fresh) {
      setSelectedClient((previousClient) =>
        previousClient?.id === updatedClient.id
          ? fresh.find((client) => client.id === updatedClient.id) ||
            previousClient
          : previousClient
      );
    }

    setEditingClient(null);
  };

  const activeToggleClass =
    "!border-sky-500 !bg-sky-500 !text-slate-950 dark:!border-sky-500 dark:!bg-sky-500 dark:!text-slate-950";
  const inactiveToggleClass =
    "!border-transparent !bg-transparent !text-slate-500 hover:!bg-slate-100 hover:!text-slate-800 dark:!text-slate-500 dark:hover:!bg-slate-800 dark:hover:!text-slate-300";

  return (
    <div className="clients-page">
      {/* ==========================================
          PAGE HEADER
      ========================================== */}

      <div className="clients-header">
        <div>
          <h1>Client Management</h1>
          <p>Manage your clients and their project information.</p>
        </div>

        <button
          className="add-client-btn text-sm font-semibold text-slate-950 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          onClick={() => setShowAddClient(true)}
        >
          <FaPlus />
          Add New Client
        </button>
      </div>

      {/* ==========================================
          CLIENT TOOLBAR
      ========================================== */}

      <div className="clients-toolbar">
        {/* CLIENT COUNT */}
        <div className="client-count">
          <span>{loadingClients ? "–" : filteredClients.length}</span>{" "}
          {!loadingClients && filteredClients.length === 1 ? "client" : "clients"}
        </div>

        
        {/* VIEW SWITCHER */}
        <div
          className={`view-switcher ${
            viewType === "list" ? "is-list" : "is-grid"
          }`}
        >
          <span className="view-switcher-indicator" aria-hidden="true" />

          <button
            type="button"
            className={`view-toggle-btn ${
              viewType === "grid" ? "is-active" : ""
            }`}
            onClick={() => setViewType("grid")}
            title="Block View"
            aria-label="Block View"
            aria-pressed={viewType === "grid"}
          >
            <FiGrid />
          </button>

          <button
            type="button"
            className={`view-toggle-btn ${
              viewType === "list" ? "is-active" : ""
            }`}
            onClick={() => setViewType("list")}
            title="List View"
            aria-label="List View"
            aria-pressed={viewType === "list"}
          >
            <FiList />
          </button>
        </div>
      </div>

      {/* Search Bar and Category Filter */}
      <div className="client-filter-bar">
        <div className="client-search">
          <FiSearch className="search-icon" />

          <input
            type="text"
            placeholder="Search by client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {searchTerm && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchTerm("")}
            >
              <FiX />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="category-filter-wrapper">
          <FaFilter className="category-filter-icon" />

          <select
            className="client-category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All Categories">All Categories</option>
            <option value="wedding">Weddings</option>
            <option value="prenup">Prenup</option>
            <option value="couple-shoot">Couple Shoot</option>
            <option value="family-milestones">
              Life & Family Milestones
            </option>
            <option value="portrait-lifestyle">Portrait & Lifestyle</option>
            <option value="events-performance">Events & Performance</option>
            <option value="corporate-commercial">
              Corporate & Commercial
            </option>
            <option value="real-estate">Real Estate</option>
            <option value="product-business">Product & Business</option>
            <option value="baptism">Baptism</option>
            <option value="pet-photography">Pet Photography</option>
          </select>
        </div>
      </div>

      {/* ==========================================
          LOADER / GRID / LIST
      ========================================== */}

      {loadingClients ? (
        <div className="clients-grid clients-skeleton-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="client-skeleton" style={{ "--i": i }}>
              <div className="skeleton-top">
                <div className="skeleton-avatar shimmer" />
                <div className="skeleton-lines">
                  <div className="skeleton-line shimmer w60" />
                  <div className="skeleton-line shimmer w40" />
                </div>
              </div>
              <div className="skeleton-line shimmer w90" />
              <div className="skeleton-line shimmer w70" />
              <div className="skeleton-btn shimmer" />
            </div>
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="no-clients">
          <p>No clients found.</p>
        </div>
      ) : (
        <>
          {viewType === "grid" && (
            <div className="clients-grid">
              {filteredClients.map((client, index) => (
                <div
                  key={client.id}
                  className={`client-card-wrap transition-all duration-500 ${
                    leavingIds.has(client.id) ? " client-leaving" : ""
                  } ${highlightedClientId === client.id ? "rounded-2xl ring-4 ring-sky-400 ring-offset-4 ring-offset-slate-100 dark:ring-offset-slate-950" : ""}`}
                  style={{ "--i": Math.min(index, 12) }}
                >
                  <ClientCard
                    client={client}
                    onDelete={handleDeleteClient}
                    onView={() => setSelectedClient(client)}
                    onComplete={handleCompleteClient}
                    onEdit={() => setEditingClient(client)}
                    isLeaving={leavingIds.has(client.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {viewType === "list" && (
            <ClientList
              clients={filteredClients}
              onDelete={handleDeleteClient}
              onView={(client) => setSelectedClient(client)}
              onEdit={(client) => setEditingClient(client)}
              onComplete={handleCompleteClient}
              leavingIds={leavingIds}
            />
          )}
        </>
      )}

      {/* ==========================================
          ADD CLIENT MODAL
      ========================================== */}

      {showAddClient && (
        <AddClientModal
          onClose={() => setShowAddClient(false)}
          onAddClient={handleAddClient}
        />
      )}

      {/* ==========================================
          VIEW / EDIT CLIENT MODALS
      ========================================== */}

      {selectedClient && (
        <ViewClientModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onComplete={handleCompleteClient}
          onEdit={(client) => setEditingClient(client)}
        />
      )}

      {editingClient && (
        <EditClientModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSave={handleEditClient}
        />
      )}

      <ConfirmModal
        open={Boolean(clientToDelete)}
        title="Delete Client"
        message="This will permanently delete this client and all of their scheduled events. This action cannot be undone."
        onCancel={() => setClientToDelete(null)}
        onConfirm={confirmDeleteClient}
      />
    </div>
  );
}

export default ClientPage;