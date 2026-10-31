import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";

function ReportProblemModal({ onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const closeTimerRef = useRef(null);
  const closeStartedRef = useRef(false);

  useEffect(() => {
    const firstFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsVisible(true));
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const closeModal = () => {
    if (closeStartedRef.current) return;
    closeStartedRef.current = true;
    setIsVisible(false);

    // Fallback also handles reduced-motion settings where transitionend may not fire.
    closeTimerRef.current = setTimeout(() => {
      setIsMounted(false);
      onClose?.();
    }, 220);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleBackdropMouseDown = (event) => {
    if (event.target === event.currentTarget) closeModal();
  };

  if (!isMounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 ease-out motion-reduce:transition-none ${
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onMouseDown={handleBackdropMouseDown}
      aria-hidden={!isVisible}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-problem-title"
        className={`my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-300 bg-white p-6 shadow-2xl transition-all duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900 ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-[0.97] opacity-0"
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3
              id="report-problem-title"
              className="text-xl font-semibold text-slate-900 dark:text-white"
            >
              Report a Problem
            </h3>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Tell us what went wrong.
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg p-2 text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            title="Close"
            aria-label="Close report problem modal"
          >
            <FaTimes />
          </button>
        </div>

        {/* Form */}
        <form>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Subject
              </label>

              <input
                type="text"
                placeholder="Briefly describe the problem"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Category
              </label>

              <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                <option value="">Select a category</option>
                <option value="bug">Bug</option>
                <option value="performance">Performance</option>
                <option value="account">Account</option>
                <option value="feature">Feature Issue</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Description
              </label>

              <textarea
                rows="5"
                placeholder="Describe what happened..."
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-300 active:scale-[0.98] dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-black transition-all duration-200 hover:bg-sky-600 active:scale-[0.98]"
            >
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default ReportProblemModal;
