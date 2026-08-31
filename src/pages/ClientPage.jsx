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
} from "react-icons/fi";


function ClientPage() {

  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

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
      project: "Smith Wedding",
      talentFee: "₱4,500",
      initials: "JS",
    },
    {
      id: 2,
      name: "TechCorp Ltd.",
      type: "Business Client",
      contact: "09676543210",
      email: "contact@techcorp.com",
      project: "TechCorp Event",
      talentFee: "₱6,200",
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
            {clients.length}
          </span>

          {" "}

          {clients.length === 1
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



      {/* ==========================================
          GRID / BLOCK VIEW
      ========================================== */}

      {viewType === "grid" && (

        <div className="clients-grid">

          {clients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            onDelete={handleDeleteClient}
            onView={() => setSelectedClient(client)}
          />
        ))}

        </div>

      )}



      {/* ==========================================
          LIST VIEW
      ========================================== */}

      {viewType === "list" && (

        <ClientList
          clients={clients}
          onDelete={handleDeleteClient}
          onView={(client) => setSelectedClient(client)}
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
        />
      )}

    </div>
  );
}


export default ClientPage;