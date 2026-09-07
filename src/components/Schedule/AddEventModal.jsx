import { useEffect, useState } from "react";
import {
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  CATEGORY_HEX,
} from "./eventCategory";

// =========================================================
// GEAR OPTIONS
// =========================================================
// What the assigned shooter(s) need to bring. Kept as a flat multi-select
// so it works the same whether the booking is photo-only, video-only, or
// a hybrid shoot.
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
  };

  const [form, setForm] = useState(emptyForm);

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

        photographer:
          editingEvent.photographer || "",

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
      });

      return;
    }

    setForm({
      ...emptyForm,
      date: selectedDate || "",
    });
  }, [editingEvent, selectedDate]);

  // =========================================================
  // CLOSE
  // =========================================================

  if (!open) {
    return null;
  }

  // =========================================================
  // INPUT CHANGE
  // =========================================================

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // =========================================================
  // GEAR TOGGLE
  // =========================================================

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

  // =========================================================
  // SUBMIT
  // =========================================================

  const handleSubmit = (e) => {
    e.preventDefault();

    onSave(form);

    setForm(emptyForm);
  };

  const activeColor = CATEGORY_HEX[form.category] || CATEGORY_HEX.default;

  // =========================================================
  // MODAL
  // =========================================================

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
      {/* =====================================================
          MODAL CONTENT
          ===================================================== */}

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
        {/* ===================================================
            TITLE
            =================================================== */}

        <h2 className="text-2xl font-bold text-white mb-6">
          {editingEvent ? "Edit Event" : "Add New Event"}
        </h2>

        {/* ===================================================
            FORM
            =================================================== */}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* EVENT TITLE */}

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

          {/* CLIENT */}

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

          {/* PHOTOGRAPHER */}

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

          {/* LOCATION */}

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

          {/* CATEGORY */}

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
              GEAR / EQUIPMENT
              ================================================= */}

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

          {/* =================================================
              DATE + START + END
              ================================================= */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* DATE */}

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

            {/* START */}

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

            {/* END */}

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

          {/* NOTES */}

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

          {/* =================================================
              BUTTONS
              ================================================= */}

          <div className="flex justify-end gap-3 pt-2">

            {/* CANCEL */}

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

            {/* SAVE / UPDATE */}

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