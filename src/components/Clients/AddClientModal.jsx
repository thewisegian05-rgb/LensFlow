import React, { useState } from "react";

import "./AddClientModal.css";

function AddClientModal({ onClose, onAddClient }) {
  const [form, setForm] = useState({
    name: "",
    type: "Individual Client",
    contact: "",
    email: "",
    project: "",
    spent: "",
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
      spent: form.spent || "$0",
      initials,
    };

    onAddClient(newClient);
    onClose();
  };

  return (
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
            <label>Talent Fee</label>
            <input
              name="talentFee"
              value={form.spent}
              onChange={handleChange}
              placeholder="₱0"
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
  );
}

export default AddClientModal;