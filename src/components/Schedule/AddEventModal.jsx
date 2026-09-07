import { useEffect, useState } from "react";
import {
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  CATEGORY_HEX,
} from "./eventCategory";
import { supabase } from "../../lib/supabaseClient";

const GEAR_OPTIONS = [
  { value: "camera-photo", label: "Camera (Photo)" },
  { value: "camera-video", label: "Camera (Video)" },
  { value: "drone", label: "Drone" },
  { value: "gimbal", label: "Gimbal / Stabilizer" },
  { value: "lighting", label: "Lighting Kit" },
  { value: "lens-kit", label: "Lens Kit" },
  { value: "audio", label: "Audio / Mic" },
  { value: "backup-body", label: "Backup Body" },
];

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
    category: CATEGORY_KEYS[0],
    photographer: "",
    location: "",
    gears: [],
    date: "",
    start: "",
    end: "",
    notes: "",
    projectId: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [projects, setProjects] = useState([]);

  // =========================================================
  // LOAD LINKABLE PROJECTS WHEN MODAL OPENS
  // =========================================================

  useEffect(() => {
    if (!open) return;

    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, project_code, client")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load projects for linking:", error.message);
        return;
      }

      setProjects(data || []);
    };

    fetchProjects();
  }, [open]);

  // =========================================================
  // LOAD EVENT WHEN EDITING
  // =========================================================

  useEffect(() => {
    if (editingEvent) {
      const startDate = editingEvent.start
        ? new Date(editingEvent.start)
        : null;

      const endDate = editingEvent.end
        ? new Date(editingEvent.end)
        : null;

      setForm({
        id: editingEvent.id,
        title: editingEvent.title || "",
        client: editingEvent.client || "",
        category:
          editingEvent.category ||
          editingEvent.type ||
          CATEGORY_KEYS[0],
        photographer: editingEvent.photographer || "",
        location: editingEvent.location || "",
        gears: Array.isArray(editingEvent.gears)
          ? editingEvent.gears
          : [],
        date:
          editingEvent.date ||
          (startDate
            ? startDate.toISOString().split("T")[0]
            : ""),
        start: startDate
          ? startDate.toTimeString().slice(0, 5)
          : "",
        end: endDate
          ? endDate.toTimeString().slice(0, 5)
          : "",
        notes: editingEvent.notes || "",
        projectId: editingEvent.project_id || "",
      });

      return;
    }

    setForm({
      ...emptyForm,
      date: selectedDate || "",
    });
  }, [editingEvent, selectedDate]);

  if (!open) {
    return null;
  }

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const toggleGear = (value) => {
    setForm((prev) => {
      const isSelected = prev.gears.includes(value);

      return {
        ...prev,
        gears: isSelected
          ? prev.gears.filter((g) => g !== value)
          : [...prev.gears, value],
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    onSave(form);

    setForm(emptyForm);
  };

  const activeColor = CATEGORY_HEX[form.category] || CATEGORY_HEX.default;

  return (
    <div className="event-modal custom-scrollbar">
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-black/60
        backdrop-blur-sm
        p-4
      "
      onClick={onClose}
    >
      <div
        className="
          bg-slate-900
          border
          border-slate-700
          rounded-xl
          w-full
          max-w-xl
          max-h-[90vh]
          overflow-y-auto
          p-6
          shadow-2xl
        "
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-6">
          {editingEvent ? "Edit Event" : "Add New Event"}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <input
            type="text"
            name="title"
            placeholder="Event Title"
            value={form.title}
            onChange={handleChange}
            className="
              w-full
              bg-slate-800
              border
              border-slate-700
              rounded-lg
              p-3
              text-white
              placeholder-slate-500
              outline-none
              focus:border-sky-500
            "
            required
          />

          <input
            type="text"
            name="client"
            placeholder="Client Name"
            value={form.client}
            onChange={handleChange}
            className="
              w-full
              bg-slate-800
              border
              border-slate-700
              rounded-lg
              p-3
              text-white
              placeholder-slate-500
              outline-none
              focus:border-sky-500
            "
            required
          />

          <input
            type="text"
            name="photographer"
            placeholder="Photographer / Shooter"
            value={form.photographer}
            onChange={handleChange}
            className="
              w-full
              bg-slate-800
              border
              border-slate-700
              rounded-lg
              p-3
              text-white
              placeholder-slate-500
              outline-none
              focus:border-sky-500
            "
          />

          <input
            type="text"
            name="location"
            placeholder="Location (venue, address, or area)"
            value={form.location}
            onChange={handleChange}
            className="
              w-full
              bg-slate-800
              border
              border-slate-700
              rounded-lg
              p-3
              text-white
              placeholder-slate-500
              outline-none
              focus:border-sky-500
            "
          />

          <div>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="
                w-full
                bg-slate-800
                border
                border-slate-700
                rounded-lg
                p-3
                text-white
                outline-none
                focus:border-sky-500
              "
              style={{ borderLeft: `4px solid ${activeColor}` }}
            >
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          {/* =================================================
              LINK TO WORKFLOW PROJECT
              ================================================= */}

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Link to Project (optional)
            </label>

            <select
              name="projectId"
              value={form.projectId}
              onChange={handleChange}
              className="
                w-full
                bg-slate-800
                border
                border-slate-700
                rounded-lg
                p-3
                text-white
                outline-none
                focus:border-sky-500
              "
            >
              <option value="">— No linked project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code} — {p.client}
                </option>
              ))}
            </select>

            <p className="text-xs text-slate-500 mt-1">
              Linking lets you mark this shoot "Complete" and auto-move
              the project to Shoot Completed in Workflow.
            </p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Gear needed
            </label>

            <div className="flex flex-wrap gap-2">
              {GEAR_OPTIONS.map((gear) => {
                const isSelected = form.gears.includes(gear.value);

                return (
                  <button
                    key={gear.value}
                    type="button"
                    onClick={() => toggleGear(gear.value)}
                    className={`
                      px-3
                      py-1.5
                      rounded-full
                      text-sm
                      border
                      transition
                      ${
                        isSelected
                          ? "bg-sky-500 border-sky-500 text-slate-900 font-semibold"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:border-sky-500/60"
                      }
                    `}
                  >
                    {gear.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="
                bg-slate-800
                border
                border-slate-700
                rounded-lg
                p-3
                text-white
                outline-none
                focus:border-sky-500
              "
              required
            />

            <input
              type="time"
              name="start"
              value={form.start}
              onChange={handleChange}
              className="
                bg-slate-800
                border
                border-slate-700
                rounded-lg
                p-3
                text-white
                outline-none
                focus:border-sky-500
              "
              required
            />

            <input
              type="time"
              name="end"
              value={form.end}
              onChange={handleChange}
              className="
                bg-slate-800
                border
                border-slate-700
                rounded-lg
                p-3
                text-white
                outline-none
                focus:border-sky-500
              "
              required
            />

          </div>

          <textarea
            rows="4"
            name="notes"
            placeholder="Notes..."
            value={form.notes}
            onChange={handleChange}
            className="
              w-full
              bg-slate-800
              border
              border-slate-700
              rounded-lg
              p-3
              text-white
              placeholder-slate-500
              outline-none
              resize-none
              focus:border-sky-500
            "
          />

          <div className="flex justify-end gap-3 pt-2">

            <button
              type="button"
              onClick={onClose}
              className="
                px-5
                py-2
                rounded-lg
                bg-slate-700
                hover:bg-slate-600
                text-white
                transition
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              className="
                px-5
                py-2
                rounded-lg
                bg-sky-500
                hover:bg-sky-600
                text-slate-900
                font-semibold
                transition
              "
            >
              {editingEvent
                ? "Update Event"
                : "Save Event"}
            </button>

          </div>
        </form>
      </div>
    </div>
    </div>
  );
}

export default AddEventModal;