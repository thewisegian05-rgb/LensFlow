import React from "react";

import {
  FiEye,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";


function ClientList({ clients, onDelete }) {

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

            <tr key={client.id}>


              {/* CLIENT */}

              <td>

                <div className="list-client-info">

                  <div className="list-client-avatar">
                    {client.initials}
                  </div>


                  <div>

                    <p className="list-client-name">
                      {client.name}
                    </p>

                    <span className="list-client-type">
                      {client.type}
                    </span>

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
                <span className="list-spent">
                  {client.spent}
                </span>
              </td>

              {/* ACTIONS */}

              <td>
                <div className="list-actions">
                  {/* VIEW */}
                  <button
                    className="list-action-btn list-view-btn"
                    title="View Client"
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