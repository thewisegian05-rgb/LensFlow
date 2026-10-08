import React, { useState, useEffect } from "react";
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
import "../components/Clients/Animations.css"; // <-- NEW (keep this last)

import {
  FiGrid,
  FiList,
  FiSearch,
  FiX,
} from "react-icons/fi";

import { FaFilter } from "react-icons/fa6";

// Key used to remember the client list's view type (grid/list) across
// page navigations and reloads.
const VIEW_TYPE_STORAGE_KEY = "clients:viewType";


function ClientPage() {

  // Modal States
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

  // "grid" = card/block view
  // "list" = table/list view
  //
  // Initialized from localStorage so navigating away and back (or
  // reloading the page) keeps whatever view the user last picked,
  // instead of always resetting to "grid".
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

  const fetchClients = async () => {
    setLoadingClients(true);

    const { data: { user }, } = await supabase.auth.getUser();

    if (!user) {
      setClients([]);
      setLoadingClients(false);
      return;
    }

    // Load clients
    const { data: clientRows, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (clientsError) {
      console.error(
        "Failed to load clients:",
        clientsError.message
      );

      setLoadingClients(false);
      return;
    }

    // Load schedule events
    const { data: eventRows, error: eventsError } = await supabase
      .from("schedule_events")
      .select(`
        id,
        client_id,
        title,
        location,
        category,
        start_time,
        end_time,
        status,
        project_id
      `)
      .eq("user_id", user.id)
      .order("start_time", { ascending: true });

    if (eventsError) {
      console.error(
        "Failed to load client events:",
        eventsError.message
      );

      setLoadingClients(false);
      return;
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


      // Upcoming events only
      const upcomingProjects = projects.filter(
        (project) =>
          new Date(project.start) >= now
      );


      // Because our Supabase query is already ascending,
      // index 0 is the nearest upcoming event.
      const activeProject =
        upcomingProjects[0] ||
        projects[projects.length - 1] ||
        null;


      return {
        id: row.id,
        name: row.name,
        type: row.type,
        contact: row.contact,
        email: row.email,

        projectStatus: row.project_status,
        talentFee: row.talent_fee,
        initials: row.initials,

        // All scheduled projects/events
        projects,

        // What Card/List should display
        activeProject,

        // Keep these for compatibility with your
        // existing components for now
        project:
          activeProject?.title ||
          row.project,

        venue:
          activeProject?.venue ||
          row.venue,

        category:
          activeProject?.category ||
          row.category,
      };
    });

    setClients(mappedClients);
    setLoadingClients(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Add New Client
  const handleAddClient = (newClient) => {

    setClients((previousClients) => [
      ...previousClients,
      newClient,
    ]);

  };


  // Delete Client
  const handleDeleteClient = (id) => {
    setClientToDelete(id);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("No authenticated user found.");
      return;
    }

    // Delete every schedule event tied to this client first. If this
    // fails we bail out before touching the client row, so we never
    // end up with a deleted client but orphaned events still on the
    // calendar.
    const { error: eventsDeleteError } = await supabase
      .from("schedule_events")
      .delete()
      .eq("client_id", clientToDelete)
      .eq("user_id", user.id);

    if (eventsDeleteError) {
      console.error(
        "Failed to delete client's schedule events:",
        eventsDeleteError.message
      );
      return;
    }

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientToDelete)
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "Failed to delete client:",
        error.message
      );
      return;
    }

    setClients((previousClients) =>
      previousClients.filter(
        (client) => client.id !== clientToDelete
      )
    );

    setClientToDelete(null);

    if (selectedClient?.id === clientToDelete) {
      setSelectedClient(null);
    }

    if (editingClient?.id === clientToDelete) {
      setEditingClient(null);
    }
  };

  // Mark Client as Completed
  const handleCompleteClient = (id) => {

  setClients((previousClients) =>
    previousClients.map((client) =>
      client.id === id
        ? { ...client, projectStatus: "Completed" }
        : client
    )
  );

  setSelectedClient((previousClient) =>
    previousClient?.id === id
      ? {
          ...previousClient,
          projectStatus: "Completed",
        }
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

  const { data, error } = await supabase
    .from("clients")
    .update(payload)
    .eq("id", updatedClient.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update client:", error.message);
    return;
  }

  const mappedClient = {
    id: data.id,
    name: data.name,
    type: data.type,
    contact: data.contact,
    email: data.email,
    project: data.project,
    venue: data.venue,
    category: data.category,
    projectStatus: data.project_status,
    talentFee: data.talent_fee,
    initials: data.initials,
  };

  setClients((previousClients) =>
    previousClients.map((client) =>
      client.id === mappedClient.id ? mappedClient : client
    )
  );

  setSelectedClient((previousClient) =>
    previousClient?.id === mappedClient.id
      ? mappedClient
      : previousClient
  );

  setEditingClient(null);
};


  return (

    <div className="clients-page">


      {/* ==========================================
          PAGE HEADER
      ========================================== */}

      <div className="clients-header">

        <div>

          <h1>
            Client Management
          </h1>

          <p>
            Manage your clients and their project information.
          </p>

        </div>


        <button
          className="add-client-btn"
          onClick={() => setShowAddClient(true)}
        >
          + Add New Client
        </button>

      </div>



      {/* ==========================================
          CLIENT TOOLBAR
      ========================================== */}

      <div className="clients-toolbar">


        {/* CLIENT COUNT */}

        <div className="client-count">

          <span>
            {filteredClients.length}
          </span>

          {" "}

          {filteredClients.length === 1
            ? "client"
            : "clients"}

        </div>



        {/* VIEW SWITCHER */}
        <div className="view-switcher">

          {/* GRID */}
          <button
            className={`view-toggle-btn ${
              viewType === "grid"
                ? "!border-sky-500 !bg-sky-500 !text-slate-950 dark:!border-sky-500 dark:!bg-sky-500 dark:!text-slate-950"
                : "!border-transparent !bg-transparent !text-slate-500 hover:!bg-slate-100 hover:!text-slate-800 dark:!text-slate-500 dark:hover:!bg-slate-800 dark:hover:!text-slate-300"
            }`}
            onClick={() => setViewType("grid")}
            title="Block View"
          >
            <FiGrid />
          </button>


          {/* LIST */}
          <button
            className={`view-toggle-btn ${
              viewType === "list"
                ? "!border-sky-500 !bg-sky-500 !text-slate-950 dark:!border-sky-500 dark:!bg-sky-500 dark:!text-slate-950"
                : "!border-transparent !bg-transparent !text-slate-500 hover:!bg-slate-100 hover:!text-slate-800 dark:!text-slate-500 dark:hover:!bg-slate-800 dark:hover:!text-slate-300"
            }`}
            onClick={() => setViewType("list")}
            title="List View"
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
                <option value="Weddings">Weddings</option>
                <option value="Prenup">Prenup</option>
                <option value="Couple Shoot">Couple Shoot</option>
                <option value="Life & Family Milestones">
                  Life & Family Milestones
                </option>
                <option value="Portrait & Lifestyle">
                  Portrait & Lifestyle
                </option>
                <option value="Events & Performance">
                  Events & Performance
                </option>
                <option value="Corporate & Commercial">
                  Corporate & Commercial
                </option>
                <option value="Real Estate">Real Estate</option>
                <option value="Product & Business">
                  Product & Business
                </option>
                <option value="Baptism">Baptism</option>
                <option value="Pet Photography">
                  Pet Photography
                </option>
        </select>
      </div>
    </div>

      {/* GRID / BLOCK VIEW */}

      {filteredClients.length === 0 ? (
        <div className="no-clients">
          <p>No clients found.</p>
        </div>
      ) : (
        <>
          {viewType === "grid" && (
            <div className="clients-grid">
              {filteredClients.map((client, index) => (   // <-- NEW: added index
                <ClientCard
                  key={client.id}
                  client={client}
                  index={index}                           // <-- NEW
                  onDelete={handleDeleteClient}
                  onView={() => setSelectedClient(client)}
                  onComplete={handleCompleteClient}
                  onEdit={() => setEditingClient(client)}
                />
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
          VIEW CLIENT MODAL
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