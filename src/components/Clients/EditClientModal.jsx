import React, { useState } from "react";
import { FiX } from "react-icons/fi";

import "./AddClientModal.css";

function EditClientModal({
  client,
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState({
    ...client,
  });

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
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    onSave({
      ...formData,
      initials,
    });
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="client-modal"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="modal-header">
          <div>
            <h2>Edit Client</h2>
            <p>
              Update client and project information.
            </p>
          </div>

          <button
            className="close-modal"
            onClick={onClose}
            type="button"
          >
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Client Name</label>

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Client Type</label>

            <select
              name="type"
              value={formData.type}
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
              <label>Contact</label>

              <input
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Email</label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Project</label>

            <input
              type="text"
              name="project"
              value={formData.project}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Venue Location</label>

            <input
              type="text"
              name="venue"
              value={formData.venue || ""}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Photography Category</label>

            <select
              name="category"
              value={formData.category || "Weddings"}
              onChange={handleChange}
            >
              <option value="Weddings">Weddings</option>
              <option value="Prenup">Prenup</option>
              <option value="Couple Shoot">
                Couple Shoot
              </option>
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
              <option value="Real Estate">
                Real Estate
              </option>
              <option value="Product & Business">
                Product & Business
              </option>
              <option value="Baptism">
                Baptism
              </option>
              <option value="Pet Photography">
                Pet Photography
              </option>
            </select>
          </div>

          <div className="form-group">
            <label>Talent Fee</label>

            <input
              type="number"
              name="talentFee"
              value={formData.talentFee || ""}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Project Status</label>

            <select
              name="projectStatus"
              value={formData.projectStatus || "Pending"}
              onChange={handleChange}
            >
              <option value="Pending">
                Pending
              </option>

              <option value="Ongoing">
                Ongoing
              </option>

              <option value="Completed">
                Completed
              </option>
            </select>
          </div>

          <div className="modal-actions">

            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
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
    </div>
  );
}

export default EditClientModal;