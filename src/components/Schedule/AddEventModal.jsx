import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

const peso = (n) => `₱${Math.round(Number(n) || 0).toLocaleString("en-PH")}`;

const todayString = () => new Date().toLocaleDateString("en-CA");

// "2026-10-25" -> ISO timestamp at local noon (avoids timezone day-shifts)
const dateToIso = (dateStr) => new Date(`${dateStr}T12:00:00`).toISOString();

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-900 placeholder-slate-500 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500";

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
    downpayment: "",
    downpaymentDate: todayString(),
  };

  const [form, setForm] = useState(emptyForm);
  const [projects, setProjects] = useState([]);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [formError, setFormError] = useState("");

  // Payments (edit mode only: the event already exists)
  const [payments, setPayments] = useState([]);
  const [paymentsError, setPaymentsError] = useState("");
  const [newPayment, setNewPayment] = useState({
    amount: "",
    type: "balance",
    date: todayString(),
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Animate the modal in after it mounts. Keep it mounted while closing.
  useEffect(() => {
    if (!open) {
      setIsVisible(false);
      return;
    }

    setIsVisible(false);
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

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
  // LOAD PAYMENTS WHEN EDITING
  // =========================================================

  const loadPayments = useCallback(async (eventId) => {
    const { data, error } = await supabase
      .from("event_payments")
      .select("id, amount, type, paid_at")
      .eq("event_id", eventId)
      .order("paid_at", { ascending: true });

    if (error) {
      console.error("Failed to load payments:", error.message);
      setPaymentsError(error.message);
      return;
    }

    setPaymentsError("");
    const list = data || [];
    setPayments(list);

    // Suggest the next payment type: balance once a downpayment exists.
    setNewPayment((prev) => ({
      ...prev,
      type: list.some((p) => p.type === "downpayment") ? "balance" : "downpayment",
    }));
  }, []);

  useEffect(() => {
    if (!open) return;

    if (editingEvent?.id) {
      loadPayments(editingEvent.id);
    } else {
      setPayments([]);
      setPaymentsError("");
      setNewPayment({ amount: "", type: "downpayment", date: todayString() });
    }
  }, [open, editingEvent, loadPayments]);

  // =========================================================
  // LOAD EVENT WHEN EDITING
  // =========================================================

  useEffect(() => {
    setFormError("");

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
        downpayment: "",
        downpaymentDate: todayString(),
      });

      return;
    }

    setForm({
      ...emptyForm,
      date: selectedDate || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingEvent, selectedDate]);

  if (!open) {
    return null;
  }

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleOverlayTransitionEnd = (e) => {
    if (
      e.target === e.currentTarget &&
      e.propertyName === "opacity" &&
      !isVisible
    ) {
      onClose();
    }
  };

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

  // ---------- money ----------
  const fee = parseFloat(form.talentFee) || 0;
  const downpayment = parseFloat(form.downpayment) || 0;
  const collected = editingEvent
    ? payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : downpayment;
  const balanceDue = Math.max(fee - collected, 0);

  // ---------- record a payment on an existing event ----------
  const addPayment = async () => {
    const amount = parseFloat(newPayment.amount);

    if (!editingEvent?.id) return;

    if (!amount || amount <= 0) {
      setPaymentsError("Enter an amount greater than 0.");
      return;
    }

    if (collected + amount > fee) {
      setPaymentsError(
        `That would be more than the talent fee. Only ${peso(balanceDue)} is still due.`
      );
      return;
    }

    setSavingPayment(true);
    setPaymentsError("");

    const { error } = await supabase.from("event_payments").insert({
      event_id: editingEvent.id,
      amount,
      type: newPayment.type,
      paid_at: dateToIso(newPayment.date || todayString()),
    });

    setSavingPayment(false);

    if (error) {
      console.error("Failed to save payment:", error.message);
      setPaymentsError(error.message);
      return;
    }

    setNewPayment((prev) => ({ ...prev, amount: "" }));
    loadPayments(editingEvent.id);
  };

  const removePayment = async (payment) => {
    if (!window.confirm(`Remove this ${peso(payment.amount)} payment?`)) return;

    const { error } = await supabase
      .from("event_payments")
      .delete()
      .eq("id", payment.id);

    if (error) {
      console.error("Failed to remove payment:", error.message);
      setPaymentsError(error.message);
      return;
    }

    loadPayments(editingEvent.id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!editingEvent && downpayment > fee) {
      setFormError(
        fee === 0
          ? "Enter the talent fee first, then the downpayment."
          : "The downpayment can't be more than the talent fee."
      );
      return;
    }

    setFormError("");

    const { downpayment: _dp, downpaymentDate, ...rest } = form;

    onSave({
      ...rest,
      // Keep this numeric so downstream income totals don't have to
      // guess whether it's a string. Empty input -> 0, not NaN.
      talentFee: form.talentFee === "" ? 0 : parseFloat(form.talentFee),
      // New events only: the parent should insert an `event_payments` row
      // (type "downpayment") with this amount and paidAt after saving the event.
      downpayment: editingEvent ? 0 : downpayment,
      downpaymentPaidAt:
        !editingEvent && downpayment > 0
          ? dateToIso(downpaymentDate || todayString())
          : null,
    });

    setForm(emptyForm);
  };

  const activeColor = CATEGORY_HEX[form.category] || CATEGORY_HEX.default;

  return createPortal(
    <div
      className={`fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-opacity duration-200 ease-out ${
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      onTransitionEnd={handleOverlayTransitionEnd}
    >
      <div
        className={`w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl transition-all duration-300 ease-out dark:border-slate-700 dark:bg-slate-900 ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-95 opacity-0"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
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
              className={inputClass}
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
              className={inputClass}
            />

            <input
              type="text"
              name="location"
              placeholder="Location (venue, address, or area)"
              value={form.location}
              onChange={handleChange}
              className={inputClass}
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
                  className={`${inputClass} pl-7`}
                />
              </div>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                The total price for this event. Saved on this event and synced to
                the client's profile. Leave blank if not yet agreed.
              </p>
            </div>

            {/* ---------- Downpayment (new events) ---------- */}
            {!editingEvent && (
              <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                  Downpayment
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                      Amount received (₱)
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                        ₱
                      </span>
                      <input
                        type="number"
                        name="downpayment"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={form.downpayment}
                        onChange={handleChange}
                        className={`${inputClass} pl-7`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                      Date received
                    </label>
                    <input
                      type="date"
                      name="downpaymentDate"
                      value={form.downpaymentDate}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>

                {fee > 0 && (
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {peso(fee)} fee − {peso(downpayment)} down ={" "}
                    <span className="font-semibold">{peso(balanceDue)}</span> due
                    after the event
                  </p>
                )}

                {downpayment === 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    No downpayment yet. This date isn't locked in until one is received.
                  </p>
                )}

                <p className="mt-1 text-xs text-slate-500">
                  Downpayments are non-refundable and stay as income if the event is
                  cancelled.
                </p>
              </div>
            )}

            {/* ---------- Payments (existing events) ---------- */}
            {editingEvent && (
              <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                  Payments
                </p>

                <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
                  {peso(fee)} fee − {peso(collected)} received ={" "}
                  <span className="font-semibold">{peso(balanceDue)}</span>{" "}
                  {balanceDue === 0 && fee > 0 ? "(paid in full)" : "still due"}
                </p>

                {payments.length > 0 && (
                  <ul className="mb-3 space-y-1.5">
                    {payments.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between rounded-md bg-slate-500/[0.06] px-3 py-1.5 text-sm"
                      >
                        <span className="text-slate-600 dark:text-slate-300">
                          <span className="font-semibold">{peso(p.amount)}</span>
                          {" · "}
                          {p.type === "downpayment" ? "Downpayment" : "Balance"}
                          {" · "}
                          {new Date(p.paid_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePayment(p)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <input
                    type="number"
                    placeholder="Amount"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={newPayment.amount}
                    onChange={(e) =>
                      setNewPayment((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPayment();
                      }
                    }}
                    className={inputClass}
                  />

                  <select
                    value={newPayment.type}
                    onChange={(e) =>
                      setNewPayment((prev) => ({ ...prev, type: e.target.value }))
                    }
                    className={inputClass}
                  >
                    <option value="downpayment">Downpayment</option>
                    <option value="balance">Balance</option>
                  </select>

                  <input
                    type="date"
                    value={newPayment.date}
                    onChange={(e) =>
                      setNewPayment((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={addPayment}
                    disabled={savingPayment}
                    className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-600 disabled:opacity-50"
                  >
                    {savingPayment ? "Saving…" : "Add"}
                  </button>
                </div>

                {paymentsError && (
                  <p className="mt-2 text-xs text-red-500">{paymentsError}</p>
                )}
              </div>
            )}

            <div>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="
                  category-select
                  w-full rounded-lg border p-3 outline-none transition
                  border-slate-300 bg-white text-slate-900
                  focus:border-sky-500
                  dark:border-slate-700 dark:bg-slate-800 dark:text-white
                "
                style={{
                  "--category-color": activeColor,
                }}
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

            {formError && <p className="text-sm text-red-500">{formError}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-slate-200 bg-slate-100 px-5 py-2 text-slate-700 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-200 active:translate-y-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
    </div>,
    document.body
  );
}

export default AddEventModal;