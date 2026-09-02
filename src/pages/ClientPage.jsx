import React, { useState } from "react";

import ClientCard from "../components/Clients/ClientCard.jsx";
import ClientList from "../components/Clients/ClientList.jsx";
import AddClientModal from "../components/Clients/AddClientModal.jsx";
import ViewClientModal from "../components/Clients/ViewClientModal.jsx";

import "../components/Clients/Clients.css";
import "../components/Clients/ClientCard.css";
import "../components/Clients/ClientList.css";
import "../components/Clients/AddClientModal.css";
import "../components/Clients/ViewClientModal.css";

import {
  FiGrid,
  FiList,
  FiSearch,
  FiX,
} from "react-icons/fi";


function ClientPage() {

  // Modal States
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

  // "grid" = card/block view
  // "list" = table/list view
  const [viewType, setViewType] = useState("grid");


  const [clients, setClients] = useState([
    {
      id: 1,
      name: "Jane Smith",
      type: "Individual Client",
      contact: "09123456789",
      email: "sarah@gmail.com",
      category: "Weddings",
      project: "Smith Wedding",
      projectStatus: "Ongoing",
      talentFee: "4500",
      initials: "JS",
    },
    {
      id: 2,
      name: "TechCorp Ltd.",
      type: "Business Client",
      contact: "09676543210",
      email: "contact@techcorp.com",
      category: "Corporate & Commercial",
      project: "TechCorp Event",
      projectStatus: "Completed",
      talentFee: "6200",
      initials: "TC",
    },
  ]);


  // ==========================================
  // ADD CLIENT
  // ==========================================

  const handleAddClient = (newClient) => {

    setClients((previousClients) => [
      ...previousClients,
      newClient,
    ]);

  };


  // ==========================================
  // DELETE CLIENT
  // ==========================================

  const handleDeleteClient = (id) => {

    const confirmed = window.confirm(
      "Are you sure you want to delete this client?"
    );

    if (confirmed) {

      setClients((previousClients) =>
        previousClients.filter(
          (client) => client.id !== id
        )
      );

    }
  };

  // ==========================================
  //  MARK AS COMPLETE PROJECT
  // ==========================================
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

const filteredClients = clients.filter((client) => {

  const matchesSearch =
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.project.toLowerCase().includes(searchTerm.toLowerCase());

  const matchesCategory =
    selectedCategory === "All Categories" ||
    client.category === selectedCategory;

  return matchesSearch && matchesCategory;
});


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

          <button
            className={`view-toggle-btn ${
              viewType === "grid" ? "active" : ""
            }`}
            onClick={() => setViewType("grid")}
            title="Block View"
          >
            <FiGrid />
          </button>


          <button
            className={`view-toggle-btn ${
              viewType === "list" ? "active" : ""
            }`}
            onClick={() => setViewType("list")}
            title="List View"
          >
            <FiList />
          </button>

        </div>

      </div>

      <div className="client-filter-bar">

        <div className="client-search">
          <FiSearch />

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
              title="Clear search"
              aria-label="Clear search"
            >
              <FiX />
            </button>
          )}
        </div>


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

      {/* ==========================================
          GRID / BLOCK VIEW
      ========================================== */}

      {viewType === "grid" && (

        <div className="clients-grid">

          {filteredClients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            onDelete={handleDeleteClient}
            onView={() => setSelectedClient(client)}
            onComplete={handleCompleteClient}
          />
        ))}

        </div>

      )}



      {/* ==========================================
          LIST VIEW
      ========================================== */}

      {viewType === "list" && (

        <ClientList
          clients={filteredClients}
            onDelete={handleDeleteClient}
            onView={(client) => setSelectedClient(client)}
            onComplete={handleCompleteClient}
        />

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
          onEdit={() => console.log("Edit client")}
        />
      )}

    </div>
  );
}


export default ClientPage;