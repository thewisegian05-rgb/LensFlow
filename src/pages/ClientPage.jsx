import React from "react";

import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiPhone,
  FiMail,
  FiFolder,
  FiCheckCircle,
  FiMessageSquare,
} from "react-icons/fi";

import { FaPesoSign } from "react-icons/fa6";

import "./ClientCard.css";
import "./client-delete-animation.css";

// `isLeaving` = this client is being deleted right now (comes from
// usePendingDeletes() in the parent). It plays the exit animation.
function ClientCard({
  client,
  onView,
  onDelete,
  onComplete,
  onEdit,
  isLeaving = false,
}) {

  return (
    <div
      className={`client-card ${
        client.projectStatus?.toLowerCase() || ""
      } ${isLeaving ? "client-leaving" : ""}`}
    >

      {/* Client Header */}

      <div className="client-card-top">

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

        <div className="client-heading">
          <h2>{client.name}</h2>
          <span>{client.type}</span>
        </div>

        <div className="client-status">
          <span
            className={`status-dot ${
              (client.projectStatus || "").toLowerCase()
            }`}
            aria-hidden
          />
          <span className="status-label">
            {client.projectStatus}
          </span>
        </div>

      </div>


      {/* Client Information */}

      <div className="client-details">

        <div className="client-detail">
          <FiPhone />

          <div>
            <small>Contact</small>
            <p>{client.contact || "No contact provided"}</p>
          </div>
        </div>


        <div className="client-detail">
          <FiMail />

          <div>
            <small>Email</small>
            <p
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "150px",
            }} title={client.email}
            >{client.email || "No email provided"}</p>
          </div>
        </div>


        <div className="client-detail">
          <FiFolder />
          <div>
            <small>Active Project</small>
            <p className="project-name">
              {client.project}
            </p>
          </div>
        </div>


        <div className="client-detail">
          <FaPesoSign />

          <div>
            <small>Talent Fee</small>
            <p className="talent-fee">
              ₱{Number(client.talentFee || 0).toLocaleString()}
            </p>
          </div>
        </div>

      </div>


      {/* Actions */}

      <div className="client-actions">

        <button
          className="action-btn rounded-lg border !border-slate-400 !bg-transparent !text-slate-600 transition hover:!border-slate-500 hover:!bg-slate-100 hover:!text-slate-900 dark:!border-slate-600 dark:!text-slate-400 dark:hover:!bg-slate-800 dark:hover:!text-white"
          title="View Client"
          onClick={onView}
        >
          <FiEye />
          <span>View</span>
        </button>


        <button
          className="action-btn rounded-lg border !border-sky-500 !bg-transparent !text-sky-600 transition hover:!border-sky-600 hover:!bg-sky-50 hover:!text-sky-700 dark:!border-sky-500/70 dark:!text-sky-400 dark:hover:!bg-sky-500/10 dark:hover:!text-sky-300"
          title="Edit Client"
          onClick={onEdit}
        >
          <FiEdit2 />
          <span>Edit</span>
        </button>


        {/* DELETE */}
        <button
          className="action-btn rounded-lg border !border-red-500 !bg-transparent !text-red-600 transition hover:!border-red-600 hover:!bg-red-50 hover:!text-red-700 dark:!border-red-500/70 dark:!text-red-400 dark:hover:!bg-red-500/10 dark:hover:!text-red-300"
          title="Delete Client"
          disabled={isLeaving}
          onClick={() => onDelete(client.id)}
        >
          <FiTrash2 />
          <span>Delete</span>
        </button>

      </div>

      <div className="message-action">
        <button
          className="message-btn rounded-lg border !border-sky-500 !bg-sky-500 !text-slate-950 transition hover:!border-sky-400 hover:!bg-sky-400 dark:!border-sky-500 dark:!bg-sky-500 dark:!text-slate-950 dark:hover:!bg-sky-400"
          title="Message"
        >
          <FiMessageSquare />
          <span>Message</span>
        </button>
      </div>

      {client.projectStatus !== "Completed" && (
        <div className="complete-action">
          <button
            className="complete-btn rounded-lg border !border-emerald-500 !bg-transparent !text-emerald-600 transition hover:!border-emerald-600 hover:!bg-emerald-50 hover:!text-emerald-700 dark:!border-emerald-500/70 dark:!bg-emerald-500/10 dark:!text-emerald-400 dark:hover:!bg-emerald-500/15 dark:hover:!text-emerald-300"
            title="Mark as Complete"
            onClick={() => onComplete(client.id)}
          >
            <FiCheckCircle />
            <span>Mark as Complete</span>
          </button>
        </div>
      )}

    </div>
  );
}

export default ClientCard;