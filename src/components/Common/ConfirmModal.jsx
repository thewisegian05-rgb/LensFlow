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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">

      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">

        <div className="flex items-center justify-between mb-5">

          <h2 className="text-xl font-bold text-white">
            {title}
          </h2>

          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white"
          >
            <FaTimes />
          </button>

        </div>

        <p className="text-slate-300 leading-relaxed">
          {message}
        </p>

        <div className="flex justify-end gap-3 mt-8">

          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center gap-2"
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