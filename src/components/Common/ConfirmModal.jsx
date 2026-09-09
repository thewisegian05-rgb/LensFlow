import { FaTrash, FaTimes } from "react-icons/fa";

function ConfirmModal({
  open,
  title,
  message,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {title}
          </h2>

          <button
            onClick={onCancel}
            className="text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <FaTimes />
          </button>
        </div>

        <p className="leading-relaxed text-slate-700 dark:text-slate-300">
          {message}
        </p>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-200 bg-slate-100 px-5 py-2 text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-5 py-2 text-white transition hover:bg-red-600"
          >
            <FaTrash />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;