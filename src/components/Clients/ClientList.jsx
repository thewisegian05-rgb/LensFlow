import React from "react";

import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiMessageSquare,
  FiCheckCircle,
} from "react-icons/fi";


function ClientList({ clients, onView, onDelete, onComplete, onEdit }) {

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
              Talent Fee
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

                  <div
                    className="
                      client-avatar
                      !border !border-sky-200
                      !bg-sky-100
                      !text-sky-700
                      dark:!border-sky-700
                      dark:!bg-sky-950
                      dark:!text-sky-400
                    "
                  >
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
                    {client.contact ? client.contact : "No contact provided"}
                  </p>

                  <span>
                    {client.email ? client.email : "No email provided"}
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
                    className="list-action-btn shrink-0 rounded-lg border !border-slate-400 !bg-transparent !text-slate-600 transition hover:!border-slate-500 hover:!bg-slate-100 hover:!text-slate-900 dark:!border-slate-600 dark:!text-slate-400 dark:hover:!bg-slate-800 dark:hover:!text-white"
                    title="View Client"
                    onClick={() => onView(client)}
                  >
                    <FiEye />
                  </button>


                  {/* EDIT */}
                  <button
                    className="list-action-btn shrink-0 rounded-lg border !border-sky-500 !bg-transparent !text-sky-600 transition hover:!border-sky-600 hover:!bg-sky-50 hover:!text-sky-700 dark:!border-sky-500/70 dark:!text-sky-400 dark:hover:!bg-sky-500/10"
                    title="Edit Client"
                    onClick={() => onEdit(client)}
                  >
                    <FiEdit2 />
                  </button>


                  {/* DELETE */}
                  <button
                    className="list-action-btn shrink-0 rounded-lg border !border-red-500 !bg-transparent !text-red-600 transition hover:!bg-red-50 hover:!text-red-700 dark:!border-red-500/70 dark:!text-red-400 dark:hover:!bg-red-500/10"
                    title="Delete Client"
                    onClick={() => onDelete(client.id)}
                  >
                    <FiTrash2 />
                  </button>


                  {/* COMPLETE */}
                  {client.projectStatus !== "Completed" && (
                     <button
                        className="list-action-btn shrink-0 rounded-lg border !border-emerald-500 !bg-transparent !text-emerald-600 transition hover:!bg-emerald-50 hover:!text-emerald-700 dark:!border-emerald-500/70 dark:!text-emerald-400 dark:hover:!bg-emerald-500/10"
                        title="Mark as Complete"
                        onClick={() => onComplete(client.id)}
                      >
                        <FiCheckCircle />
                      </button>
                  )}


                  {/* MESSAGE */}
                  <button
                    className="list-action-btn shrink-0 rounded-lg border !border-sky-500 !bg-sky-500 !text-slate-950 transition hover:!border-sky-400 hover:!bg-sky-400 dark:!border-sky-500 dark:!bg-sky-500 dark:!text-slate-950 dark:hover:!bg-sky-400"
                    title="Message"
                  >
                    <FiMessageSquare />
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