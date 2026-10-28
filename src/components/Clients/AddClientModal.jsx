
import { useState } from "react";
import { createPortal } from "react-dom";

import { FiX } from "react-icons/fi";

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

  const [errors, setErrors] = useState({});

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

    setForm((s) => ({ ...s, [name]: value }));

    setErrors((prev) => {
      if (!prev[name]) return prev;

      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const nextErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.name.trim()) {
      nextErrors.name = "Client name is required.";
    }

    if (
      form.email.trim() &&
      !emailPattern.test(form.email.trim())
    ) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (form.talentFee !== "") {
      const talentFee = Number(form.talentFee);

      if (!Number.isFinite(talentFee) || talentFee < 0) {
        nextErrors.talentFee =
          "Enter a valid, non-negative talent fee.";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const initials = form.name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const newClient = {
      id: Date.now(),
      name: form.name.trim(),
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
    setErrors({});
    handleClose();
  };

  const inputClass = (field) =>
    errors[field] ? "input-error" : "";

  const errorMessage = (field) =>
    errors[field] ? (
      <p className="field-error" role="alert">
        {errors[field]}
      </p>
    ) : null;

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
        aria-labelledby="add-client-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="add-client-title">Add New Client</h2>
            <p>Enter client details to add them to your list.</p>
          </div>

          <button
            type="button"
            className="close-modal transition-all duration-200 ease-out hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            onClick={handleClose}
            aria-label="Close add client form"
          >
            <FiX/>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="client-name">Name</label>
            <input
              id="client-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full name"
              className={inputClass("name")}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={
                errors.name ? "client-name-error" : undefined
              }
            />

            {errors.name && (
              <div id="client-name-error">
                {errorMessage("name")}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="client-type">Type</label>
            <select
              id="client-type"
              name="type"
              value={form.type}
              onChange={handleChange}
            >
              <option>Individual Client</option>
              <option>Business Client</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="client-contact">Contact</label>
              <input
                id="client-contact"
                name="contact"
                value={form.contact}
                onChange={handleChange}
                placeholder="09XXXXXXXXX"
              />
            </div>

            <div className="form-group">
              <label htmlFor="client-email">Email</label>
              <input
                id="client-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="email@example.com"
                className={inputClass("email")}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={
                  errors.email ? "client-email-error" : undefined
                }
              />

              {errors.email && (
                <div id="client-email-error">
                  {errorMessage("email")}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="client-project">Project</label>
            <input
              id="client-project"
              name="project"
              value={form.project}
              onChange={handleChange}
              placeholder="Project name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="client-venue">Venue Location</label>
            <input
              id="client-venue"
              name="venue"
              value={form.venue}
              onChange={handleChange}
              placeholder="Location (venue, address, or area)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="client-category">
              Photography Category
            </label>

            <select
              id="client-category"
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
            <label htmlFor="client-talent-fee">Talent Fee</label>
            <input
              id="client-talent-fee"
              type="number"
              name="talentFee"
              value={form.talentFee}
              onChange={handleChange}
              placeholder="₱0"
              min="0"
              step="any"
              className={inputClass("talentFee")}
              aria-invalid={Boolean(errors.talentFee)}
              aria-describedby={
                errors.talentFee ? "client-fee-error" : undefined
              }
            />

            {errors.talentFee && (
              <div id="client-fee-error">
                {errorMessage("talentFee")}
              </div>
            )}
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
              Save Client
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default AddClientModal;
