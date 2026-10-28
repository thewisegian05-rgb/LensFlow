
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

import { FaPesoSign } from "react-icons/fa6";
import { CATEGORY_LABELS } from "../Schedule/eventCategory";

import "./ViewClientModal.css";

function ViewClientModal({ client, onClose, onComplete, onEdit }) {
  const [projectIndex, setProjectIndex] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  const projects = client?.projects || [];

  useEffect(() => {
    if (!client) return;

    const activeIndex = projects.findIndex(
      (project) => project.id === client.activeProject?.id
    );

    setProjectIndex(activeIndex >= 0 ? activeIndex : 0);
  }, [client]);

  useEffect(() => {
    if (!client) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [client, isClosing]);

  if (!client) return null;

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
  };

  const handleOverlayAnimationEnd = (e) => {
    if (e.target === e.currentTarget && isClosing) {
      onClose();
    }
  };

  const selectedProject = projects[projectIndex] || null;

  const rawCategory =
    selectedProject?.category || client.category || "";

  const categoryLabel =
    CATEGORY_LABELS[rawCategory.trim().toLowerCase()] ||
    rawCategory
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase()) ||
    "Not specified";

  const handlePreviousProject = () => {
    setProjectIndex((prev) =>
      prev === 0 ? projects.length - 1 : prev - 1
    );
  };

  const handleNextProject = () => {
    setProjectIndex((prev) =>
      prev === projects.length - 1 ? 0 : prev + 1
    );
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(client);
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(client.id);
    }
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
        className="view-client-modal custom-scrollbar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="view-client-title"
      >
        {/* Header */}
        <div className="view-client-header">
          <div className="view-client-main-info">
            <div className="view-client-avatar">
              {client.initials}
            </div>

            <div>
              <h2 id="view-client-title">{client.name}</h2>
              <span>{client.type}</span>
            </div>
          </div>

          <button
            type="button"
            className="close-modal transition-all duration-200 ease-out hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            onClick={handleClose}
            title="Close"
            aria-label="Close client details"
          >
            <FiX />
          </button>
        </div>

        {/* Client Information */}
        <div className="view-client-details">
          <div className="view-detail-item">
            <FiPhone />
            <div>
              <span className="view-detail-label">Contact</span>
              <p>{client.contact || "Not provided"}</p>
            </div>
          </div>

          <div className="view-detail-item">
            <FiMail />
            <div>
              <span className="view-detail-label">Email</span>
              <p>{client.email || "Not provided"}</p>
            </div>
          </div>

          <div className="view-detail-item">
            <FiFolder />
            <div className="view-project-info">
              <span className="view-detail-label">Project</span>

              {selectedProject ? (
                <>
                  <div className="view-project-navigation">
                    {projects.length > 1 && (
                      <button
                        type="button"
                        className="project-nav-btn"
                        onClick={handlePreviousProject}
                        title="Previous project"
                        aria-label="Previous project"
                      >
                        <FiChevronLeft />
                      </button>
                    )}

                    <div className="view-project-content">
                      <p>{selectedProject.title}</p>

                      <span className="view-project-date">
                        {selectedProject.start
                          ? new Date(
                              selectedProject.start
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Date not specified"}
                      </span>
                    </div>

                    {projects.length > 1 && (
                      <button
                        type="button"
                        className="project-nav-btn"
                        onClick={handleNextProject}
                        title="Next project"
                        aria-label="Next project"
                      >
                        <FiChevronRight />
                      </button>
                    )}
                  </div>

                  {projects.length > 1 && (
                    <span className="project-counter">
                      {projectIndex + 1} of {projects.length}
                    </span>
                  )}
                </>
              ) : (
                <p>No projects found</p>
              )}
            </div>
          </div>

          <div className="view-detail-item">
            <FiMapPin />
            <div>
              <span className="view-detail-label">
                Venue Location
              </span>
              <p>
                {selectedProject?.venue ||
                  client.venue ||
                  "Not provided"}
              </p>
            </div>
          </div>

          <div className="view-detail-item">
            <FiTag />
            <div>
              <span className="view-detail-label">
                Photography Category
              </span>
              <p>{categoryLabel}</p>
            </div>
          </div>

          <div className="view-detail-item">
            <FaPesoSign />
            <div>
              <span className="view-detail-label">Talent Fee</span>
              <p>
                ₱
                {Number(client.talentFee || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="view-detail-item">
            <FiUser />
            <div>
              <span className="view-detail-label">Client Type</span>
              <p>{client.type}</p>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="view-client-actions">
          <div>
            <button
              type="button"
              className="view-edit-btn transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0"
              onClick={handleEdit}
            >
              <FiEdit2 />
              <span>Edit</span>
            </button>

            {client.projectStatus !== "Completed" && (
              <button
                type="button"
                className="view-complete-btn transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0"
                onClick={handleComplete}
              >
                <FiCheckCircle />
                <span>Mark as Complete</span>
              </button>
            )}
          </div>

          <button
            type="button"
            className="view-close-btn transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0"
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ViewClientModal;
