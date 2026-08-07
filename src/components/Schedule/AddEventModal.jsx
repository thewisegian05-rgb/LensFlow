import { useEffect, useState } from "react";

function AddEventModal({
  open,
  onClose,
  onSave,
  selectedDate,
  editingEvent,
}) {
  const emptyForm = {
    title: "",
    client: "",
    category: "Wedding",
    photographer: "",
    date: "",
    start: "",
    end: "",
    notes: "",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (editingEvent) {
      setForm({
        id: editingEvent.id,
        title: editingEvent.title || "",
        client: editingEvent.client || "",
        category: editingEvent.category || editingEvent.type || "Wedding",
        photographer: editingEvent.photographer || "",
        date:
          editingEvent.date ||
          (editingEvent.start
            ? editingEvent.start.toISOString().split("T")[0]
            : ""),
        start:
          editingEvent.start
            ? editingEvent.start.toTimeString().slice(0, 5)
            : "",
        end:
          editingEvent.end
            ? editingEvent.end.toTimeString().slice(0, 5)
            : "",
        notes: editingEvent.notes || "",
      });

      return;
    }

    setForm({
      ...emptyForm,
      date: selectedDate || "",
    });
  }, [editingEvent, selectedDate]);

  if (!open) return null;

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    onSave(form);

    setForm(emptyForm);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">

      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-xl p-6">

        <h2 className="text-2xl font-bold text-white mb-6">
          {editingEvent ? "Edit Event" : "Add New Event"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            type="text"
            name="title"
            placeholder="Event Title"
            value={form.title}
            onChange={handleChange}
            className="w-full bg-slate-800 rounded-lg p-3 text-white"
            required
          />

          <input
            type="text"
            name="client"
            placeholder="Client Name"
            value={form.client}
            onChange={handleChange}
            className="w-full bg-slate-800 rounded-lg p-3 text-white"
            required
          />

          <input
            type="text"
            name="photographer"
            placeholder="Photographer"
            value={form.photographer}
            onChange={handleChange}
            className="w-full bg-slate-800 rounded-lg p-3 text-white"
          />

          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full bg-slate-800 rounded-lg p-3 text-white"
          >
            <option>Wedding</option>
            <option>Prenup</option>
            <option>Portrait</option>
            <option>Corporate</option>
            <option>Birthday</option>
          </select>

          <div className="grid grid-cols-3 gap-4">

            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="bg-slate-800 rounded-lg p-3 text-white"
              required
            />

            <input
              type="time"
              name="start"
              value={form.start}
              onChange={handleChange}
              className="bg-slate-800 rounded-lg p-3 text-white"
              required
            />

            <input
              type="time"
              name="end"
              value={form.end}
              onChange={handleChange}
              className="bg-slate-800 rounded-lg p-3 text-white"
              required
            />

          </div>

          <textarea
            rows="4"
            name="notes"
            placeholder="Notes..."
            value={form.notes}
            onChange={handleChange}
            className="w-full bg-slate-800 rounded-lg p-3 text-white"
          />

          <div className="flex justify-end gap-3">

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-slate-900 font-semibold"
            >
              {editingEvent ? "Update Event" : "Save Event"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default AddEventModal;