import React from "react";

import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiPhone,
  FiMail,
  FiFolder,
  FiMessageSquare,
} from "react-icons/fi";

import { FaPesoSign, FaMessage } from "react-icons/fa6";

import "./ClientCard.css";

function ClientCard({ client, onDelete }) {

  return (
    <div className="client-card">

      {/* Client Header */}

      <div className="client-card-top">

        <div className="client-avatar">
          {client.initials}
        </div>

        <div className="client-heading">
          <h2>{client.name}</h2>
          <span>{client.type}</span>
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
            <p className="total-spent">
              {client.spent}
            </p>
          </div>
        </div>

      </div>


      {/* Actions */}

      <div className="client-actions">

        <button
          className="action-btn view-btn"
          title="View Client"
        >
          <FiEye />
          <span>View</span>
        </button>


        <button
          className="action-btn edit-btn"
          title="Edit Client"
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

    </div>
  );
}

export default ClientCard;
