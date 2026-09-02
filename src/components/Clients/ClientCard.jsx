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

function ClientCard({ client, onView, onDelete, onComplete, onEdit }) {

  return (
    <div className={`client-card ${
    client.projectStatus?.toLowerCase() || ""
  }`}
>

      {/* Client Header */}

      <div className="client-card-top">

        <div className="client-avatar">
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
            <p>{client.contact}</p>
          </div>
        </div>


        <div className="client-detail">
          <FiMail />

          <div>
            <small>Email</small>
            <p>{client.email}</p>
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
          className="action-btn view-btn"
          title="View Client"
          onClick={onView}
        >
          <FiEye />
          <span>View</span>
        </button>


        <button
          className="action-btn edit-btn"
          title="Edit Client"
          onClick={onEdit}
        >
          <FiEdit2 />
          <span>Edit</span>
        </button>


        <button
          className="action-btn delete-btn"
          title="Delete Client"
          onClick={() => onDelete(client.id)}
        >
          <FiTrash2 />
          <span>Delete</span>
        </button>

      </div>

      <div className="message-action">
        <button 
        className="message-btn"
        title="Message">
            <FiMessageSquare/>
            <span>Message</span>
        </button>
        
      </div>

      {client.projectStatus !== "Completed" && (
        <div className="complete-action">
            <button
            className="complete-btn"
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
