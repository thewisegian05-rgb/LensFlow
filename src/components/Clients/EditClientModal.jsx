
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

import "./AddClientModal.css";

function EditClientModal({ client, onClose, onSave }) {
  const [formData, setFormData] = useState({
    ...client,
  });

  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
  };

  const handleOverlayAnimationEnd = (e) => {
    if (e.target === e.currentTarget && isClosing) {
      onClose();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const initials = formData.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    onSave({
      ...formData,
      initials,
    });

    handleClose();
  };

  return createPortal(
    <div
      className={`modal-overlay ${
        isClosing ? "modal-closing" : "modal-entering"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      onAnimationEnd={handleOverlayAnimationEnd}
    >
      <div
        className="client-modal custom-scrollbar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-client-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="edit-client-title">Edit Client</h2>
            <p>Update client and project information.</p>
          </div>

          <button
            className="close-modal transition-all duration-200 ease-out hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            onClick={handleClose}
            type="button"
            aria-label="Close edit client form"
          >
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="edit-client-name">Client Name</label>
            <input
              id="edit-client-name"
              type="text"
              name="name"
              value={formData.name || ""}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-client-type">Client Type</label>
            <select
              id="edit-client-type"
              name="type"
              value={formData.type || "Individual Client"}
              onChange={handleChange}
            >
              <option value="Individual Client">
                Individual Client
              </option>
              <option value="Business Client">
                Business Client
              </option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-client-contact">Contact</label>
              <input
                id="edit-client-contact"
                type="text"
                name="contact"
                value={formData.contact || ""}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-client-email">Email</label>
              <input
                id="edit-client-email"
                type="email"
                name="email"
                value={formData.email || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="edit-client-project">Project</label>
            <input
              id="edit-client-project"
              type="text"
              name="project"
              value={formData.project || ""}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-client-venue">Venue Location</label>
            <input
              id="edit-client-venue"
              type="text"
              name="venue"
              value={formData.venue || ""}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-client-category">
              Photography Category
            </label>
            <select
              id="edit-client-category"
              name="category"
              value={formData.category || "Weddings"}
              onChange={handleChange}
            >
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

          <div className="form-group">
            <label htmlFor="edit-client-talent-fee">Talent Fee</label>
            <input
              id="edit-client-talent-fee"
              type="number"
              name="talentFee"
              value={formData.talentFee ?? ""}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-client-status">Project Status</label>
            <select
              id="edit-client-status"
              name="projectStatus"
              value={formData.projectStatus || "Pending"}
              onChange={handleChange}
            >
              <option value="Pending">Pending</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={handleClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-client-btn"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default EditClientModal;
