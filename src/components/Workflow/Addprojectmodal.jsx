import { useEffect, useState } from "react";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "../Schedule/eventCategory";
import { STAGE_KEYS, STAGE_LABELS } from "./workflowStages";

function AddProjectModal({ open, onClose, onSave, editingProject }) {
  const emptyForm = {
    client: "",
    category: CATEGORY_KEYS[0],
    date: "",
    stage: STAGE_KEYS[0],
    notes: "",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (editingProject) {
      setForm({
        id: editingProject.id,
        client: editingProject.client || "",
        category: editingProject.category || CATEGORY_KEYS[0],
        date: editingProject.date || "",
        stage: editingProject.stage || STAGE_KEYS[0],
        notes: editingProject.notes || "",
      });
      return;
    }

    setForm(emptyForm);
  }, [editingProject, open]);

  if (!open) return null;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
    setForm(emptyForm);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-6">
          {editingProject ? "Edit Project" : "New Project"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="client"
            placeholder="Client Name"
            value={form.client}
            onChange={handleChange}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 outline-none focus:border-sky-500"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-sky-500"
            >
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>

            <select
              name="stage"
              value={form.stage}
              onChange={handleChange}
              className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-sky-500"
            >
              {STAGE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {STAGE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-sky-500"
          />

          <textarea
            rows="3"
            name="notes"
            placeholder="Notes..."
            value={form.notes}
            onChange={handleChange}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 outline-none resize-none focus:border-sky-500"
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-slate-900 font-semibold transition"
            >
              {editingProject ? "Update Project" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddProjectModal;