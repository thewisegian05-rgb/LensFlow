import React, { useState } from "react";

import "./AddClientModal.css";

function AddClientModal({ onClose, onAddClient }) {
  const [form, setForm] = useState({
    name: "",
    type: "Individual Client",
    contact: "",
    email: "",
    project: "",
    venue: "",
    category: "Weddings",
    talentFee: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const initials = form.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const newClient = {
      id: Date.now(),
      name: form.name || "New Client",
      type: form.type,
      contact: form.contact,
      email: form.email,
      project: form.project,
      venue: form.venue,
      category: form.category,
      talentFee: form.talentFee || "₱0",
      initials,
    };

    onAddClient(newClient);
    onClose();
  };

  return (
    <div className="client-modal custom-scrollbar">
    <div className="modal-overlay">
      <div className="client-modal">
        <div className="modal-header">
          <div>
            <h2>Add New Client</h2>
            <p>Enter client details to add them to your list.</p>
          </div>
          <button className="close-modal" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full name"
            />
          </div>

          <div className="form-group">
            <label>Type</label>
            <select name="type" value={form.type} onChange={handleChange}>
              <option>Individual Client</option>
              <option>Business Client</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Contact</label>
              <input
                name="contact"
                value={form.contact}
                onChange={handleChange}
                placeholder="09XXXXXXXXX"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Project</label>
            <input
              name="project"
              value={form.project}
              onChange={handleChange}
              placeholder="Project name"
            />
          </div>

          <div className="form-group">
            <label>Venue Location</label>
            <input
            name="venue"
            value={form.venue}
            onChange={handleChange}
            placeholder="Location (venue, address, or area)"
            />
          </div>

          <div className="form-group">
            <label>Photography Category</label>

            <select
                name="category"
                value={form.category}
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
            <label>Talent Fee</label>
            <input
              type="number"
              name="talentFee"
              value={form.talentFee}
              onChange={handleChange}
              placeholder="₱0"
              min="0"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-client-btn">
              Save Client
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
}

export default AddClientModal;