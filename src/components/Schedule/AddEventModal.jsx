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
  clients = [],
}) {
  const emptyForm = {
    title: "",
    client: "",
    clientId: null,
    category: CATEGORY_KEYS[0],
    photographer: "",
    location: "",
    gears: [],
    date: "",
    start: "",
    end: "",
    notes: "",
    projectId: "",
    talentFee: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [projects, setProjects] = useState([]);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  const filteredClients = clients.filter((client) =>
    client.name
      .toLowerCase()
      .includes(form.client.toLowerCase())
  );

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
        talentFee:
          editingEvent.talentFee ??
          editingEvent.talent_fee ??
          "",
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

    onSave({
      ...form,
      // Keep this numeric so downstream income totals don't have to
      // guess whether it's a string. Empty input -> 0, not NaN.
      talentFee: form.talentFee === "" ? 0 : parseFloat(form.talentFee),
    });

    setForm(emptyForm);
  };

  const activeColor = CATEGORY_HEX[form.category] || CATEGORY_HEX.default;

  return (
    <div className="event-modal custom-scrollbar">
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl transition-colors dark:border-slate-700 dark:bg-slate-900"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
            {editingEvent ? "Edit Event" : "Add New Event"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="title"
              placeholder="Event Title"
              value={form.title}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-900 placeholder-slate-500 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
              required
            />

            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Client Name
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={form.client}
                  onFocus={() => setClientDropdownOpen(true)}
                  onChange={(e) => {
                    const value = e.target.value;

                    const matchedClient = clients.find(
                      (client) =>
                        client.name.toLowerCase() === value.toLowerCase()
                    );

                    setForm((prev) => ({
                      ...prev,
                      client: value,
                      clientId: matchedClient?.id || null,
                      // Pre-fill the fee from this client's last known
                      // rate, but only if the user hasn't already
                      // typed one in — don't clobber a manual edit.
                      talentFee:
                        matchedClient && prev.talentFee === ""
                          ? matchedClient.talentFee ?? ""
                          : prev.talentFee,
                    }));

                    setClientDropdownOpen(true);
                  }}
                  placeholder="Select or enter a client"
                  required
                  className="
                    w-full rounded-lg border border-slate-700
                    bg-slate-800 px-4 py-3 pr-10
                    text-white outline-none
                    transition
                    focus:border-sky-500
                  "
                />

                <button
                  type="button"
                  onClick={() =>
                    setClientDropdownOpen((prev) => !prev)
                  }
                  className="
                    absolute right-0 top-0 flex h-full w-10
                    items-center justify-center
                    !border-none !bg-transparent
                    text-slate-300
                    hover:!bg-transparent
                    focus:!bg-transparent
                  "
                >
                  {clientDropdownOpen ? "▲" : "▼"}
                </button>
              </div>

              {clientDropdownOpen && (
                <div
                  className="
                    absolute left-0 right-0 z-50 mt-1
                    max-h-60 overflow-y-auto
                    rounded-lg border border-slate-700
                    bg-slate-800 shadow-xl
                  "
                >
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            client: client.name,
                            clientId: client.id,
                            talentFee:
                              prev.talentFee === ""
                                ? client.talentFee ?? ""
                                : prev.talentFee,
                          }));

                          setClientDropdownOpen(false);
                        }}
                        className="
                          block w-full
                          !border-none !bg-transparent
                          px-4 py-3 text-left
                          text-white
                          hover:!bg-slate-700
                          focus:!bg-slate-700
                        "
                      >
                        {client.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-400">
                      No existing client found
                    </div>
                  )}
                </div>
              )}

              {form.client && !form.clientId && (
                <p className="mt-1 text-xs text-sky-400">
                  New client — this client will be created when you save the event.
                </p>
              )}
            </div>

            <input
              type="text"
              name="photographer"
              placeholder="Photographer / Shooter"
              value={form.photographer}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-900 placeholder-slate-500 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
            />

            <input
              type="text"
              name="location"
              placeholder="Location (venue, address, or area)"
              value={form.location}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-900 placeholder-slate-500 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
            />

            <div>
              <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">
                Talent Fee (₱)
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  ₱
                </span>

                <input
                  type="number"
                  name="talentFee"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.talentFee}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 pl-7 text-slate-900 placeholder-slate-500 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                />
              </div>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                Saved on this event and synced to the client's profile.
                Leave blank if not yet agreed.
              </p>
            </div>

            <div>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                style={{ borderLeft: `4px solid ${activeColor}` }}
              >
                {CATEGORY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">
                Link to Project (optional)
              </label>

              <select
                name="projectId"
                value={form.projectId}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">— No linked project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_code} — {p.client}
                  </option>
                ))}
              </select>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                Linking lets you mark this shoot "Complete" and auto-move
                the project to Shoot Completed in Workflow.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">
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
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        isSelected
                          ? "border-sky-500 bg-sky-500 text-slate-900 font-semibold"
                          : "border-slate-200 bg-slate-100 text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500/60"
                      }`}
                    >
                      {gear.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="rounded-lg border border-slate-200 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />

              <input
                type="time"
                name="start"
                value={form.start}
                onChange={handleChange}
                className="rounded-lg border border-slate-200 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />

              <input
                type="time"
                name="end"
                value={form.end}
                onChange={handleChange}
                className="rounded-lg border border-slate-200 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>

            <textarea
              rows="4"
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
                {editingEvent ? "Update Event" : "Save Event"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddEventModal;