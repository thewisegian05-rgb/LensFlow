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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl transition-colors dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
          {editingProject ? "Edit Project" : "New Project"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="client"
            placeholder="Client Name"
            value={form.client}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-900 placeholder-slate-500 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
            required
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="rounded-lg border border-slate-200 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
              className="rounded-lg border border-slate-200 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
            className="w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />

          <textarea
            rows="3"
            name="notes"
            placeholder="Notes..."
            value={form.notes}
            onChange={handleChange}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-slate-900 placeholder-slate-500 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-slate-100 px-5 py-2 text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-5 py-2 font-semibold text-slate-900 transition hover:bg-sky-600"
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