import React from "react";

import {
  FiX,
  FiPhone,
  FiMail,
  FiFolder,
  FiMapPin,
  FiTag,
  FiUser,
  FiEdit2,
  FiCheckCircle,
} from "react-icons/fi";

import { FaPesoSign } from "react-icons/fa6";

import "./ViewClientModal.css";

function ViewClientModal({ client, onClose, onComplete, onEdit }) {
  if (!client) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="view-client-modal"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="view-client-header">

          <div className="view-client-main-info">

            <div className="view-client-avatar">
              {client.initials}
            </div>

            <div>
              <h2>{client.name}</h2>
              <span>{client.type}</span>
            </div>

          </div>

          <button
            className="close-modal"
            onClick={onClose}
            title="Close"
          >
            <FiX />
          </button>
          

        </div>

        {/* primary actions moved to footer */}


        {/* Information */}
        <div className="view-client-details">

          <div className="view-detail-item">
            <FiPhone />

            <div>
              <span className="view-detail-label">
                Contact
              </span>

              <p>
                {client.contact || "Not provided"}
              </p>
            </div>
          </div>


          <div className="view-detail-item">
            <FiMail />

            <div>
              <span className="view-detail-label">
                Email
              </span>

              <p>
                {client.email || "Not provided"}
              </p>
            </div>
          </div>


          <div className="view-detail-item">
            <FiFolder />

            <div>
              <span className="view-detail-label">
                Project
              </span>

              <p>
                {client.project || "No active project"}
              </p>
            </div>
          </div>


          <div className="view-detail-item">
            <FiMapPin />

            <div>
              <span className="view-detail-label">
                Venue Location
              </span>

              <p>
                {client.venue || "Not provided"}
              </p>
            </div>
          </div>


          <div className="view-detail-item">
            <FiTag />

            <div>
              <span className="view-detail-label">
                Photography Category
              </span>

              <p>
                {client.category || "Not specified"}
              </p>
            </div>
          </div>


          <div className="view-detail-item">
            <FaPesoSign />

            <div>
              <span className="view-detail-label">
                Talent Fee
              </span>

              <p>
                ₱{Number(client.talentFee || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="view-detail-item">
            <FiUser />

            <div>
              <span className="view-detail-label">
                Client Type
              </span>

              <p>
                {client.type}
              </p>
            </div>
          </div>

        </div>


        {/* Bottom Actions */}
        <div className="view-client-actions">

          <div>
            <button
              className="view-edit-btn"
              onClick={() => onEdit && onEdit(client)}
            >
              <FiEdit2 />
              <span>Edit</span>
            </button>

            {client.projectStatus !== "Completed" && (
              <button
                className="view-complete-btn"
                onClick={() => onComplete && onComplete(client.id)}
              >
                <FiCheckCircle />
                <span>Mark as Complete</span>
              </button>
            )}
          </div>

          <button
            className="view-close-btn"
            onClick={onClose}
          >
            Close
          </button>

        </div>

      </div>
    </div>
  );
}

export default ViewClientModal;