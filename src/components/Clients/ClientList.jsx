import React from "react";

import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiMessageSquare,
  FiCheckCircle,
} from "react-icons/fi";


function ClientList({ clients, onView, onDelete, onComplete }) {

  return (

    <div className="client-list-container">


      <table className="client-list-table">


        {/* ==========================================
            TABLE HEADER
        ========================================== */}

        <thead>

          <tr>

            <th>
              Client Name
            </th>

            <th>
              Contact
            </th>

            <th>
              Active Project
            </th>

            <th>
              Total Spent
            </th>

            <th className="actions-heading">
              Actions
            </th>

          </tr>

        </thead>



        {/* ==========================================
            TABLE BODY
        ========================================== */}

        <tbody>

          {clients.map((client) => (

            <tr key={client.id} className={(client.projectStatus || "").toLowerCase()}>


              {/* CLIENT */}

              <td>

                <div className="list-client-info">

                  <span className={`list-status-dot ${(client.projectStatus || "").toLowerCase()}`} aria-hidden />

                  <div className="list-client-avatar">
                    {client.initials}
                  </div>


                  <div>

                    <p className="list-client-name">
                      {client.name}
                    </p>

                    <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                      <span className="list-client-type">
                        {client.type}
                      </span>
                      <span className="list-status-label">{client.projectStatus}</span>
                    </div>

                  </div>

                </div>

              </td>



              {/* CONTACT */}

              <td>

                <div className="list-contact">

                  <p>
                    {client.contact}
                  </p>

                  <span>
                    {client.email}
                  </span>

                </div>

              </td>

              {/* PROJECT */}

              <td>

                <span className="list-project">
                  {client.project}
                </span>

              </td>

              {/* SPENT */}

              <td>
                <span className="list-talentFee">
                  ₱{Number(client.talentFee || 0).toLocaleString()}
                </span>
              </td>

              {/* ACTIONS */}

              <td>
                <div className="list-actions">
                  {/* VIEW */}
                  <button
                    className="list-action-btn list-view-btn"
                    title="View Client"
                    onClick={() => onView(client)}
                  >
                    <FiEye />
                  </button>

                  {/* EDIT */}

                  <button
                    className="list-action-btn list-edit-btn"
                    title="Edit Client"
                  >
                    <FiEdit2 />
                  </button>

                  {/* DELETE */}

                  <button
                    className="list-action-btn list-delete-btn"
                    title="Delete Client"
                    onClick={() =>
                      onDelete(client.id)
                    }
                  >
                    <FiTrash2 />
                  </button>

                  {/* COMPLETE (hidden when already completed) */}
                  {(client.projectStatus || "").toLowerCase() !== "completed" && (
                    <button
                      className="list-action-btn list-complete-btn"
                      title="Mark Complete"
                      onClick={() => onComplete && onComplete(client.id)}
                    >
                      <FiCheckCircle />
                    </button>
                  )}

                  <button 
                    className="list-action-btn list-message-btn"
                    title="Message">
                    <FiMessageSquare/>
                    </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* EMPTY STATE */}

      {clients.length === 0 && (
        <div className="list-empty-state">
          <h3>
            No clients yet
          </h3>
          <p>
            Add a new client to get started.
          </p>
        </div>
      )}
    </div>
  );
}

export default ClientList;