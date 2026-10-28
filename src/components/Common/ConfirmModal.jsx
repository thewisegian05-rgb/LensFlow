
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaTrash, FaTimes } from "react-icons/fa";

function ConfirmModal({
  open,
  title,
  message,
  onCancel,
  onConfirm,
}) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setIsClosing(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, isClosing]);

  if (!open) return null;

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
  };

  const handleTransitionEnd = (e) => {
    if (
      e.target === e.currentTarget &&
      isClosing &&
      e.propertyName === "opacity"
    ) {
      onCancel();
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-opacity duration-200 ease-out ${
        isClosing ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        className={`w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 ${
        isClosing
          ? "translate-y-2 scale-95 opacity-0"
          : "translate-y-0 scale-100 opacity-100"
      }`}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2
            id="confirm-modal-title"
            className="text-xl font-bold text-slate-900 dark:text-white"
          >
            {title}
          </h2>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close confirmation dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-all duration-200 hover:rotate-90 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <FaTimes />
          </button>
        </div>

        {/* Message */}
        <p
          id="confirm-modal-message"
          className="leading-relaxed text-slate-700 dark:text-slate-300"
        >
          {message}
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-5 py-2.5 font-medium text-slate-700 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-200 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-5 py-2.5 font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-red-600 hover:shadow-md active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <FaTrash className="shrink-0" />
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ConfirmModal;
