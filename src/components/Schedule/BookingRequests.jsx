import { useCallback, useEffect, useState } from "react";

import { supabase } from "../../lib/supabaseClient";
import { CATEGORY_LABELS } from "./eventCategory";

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const todayString = () => new Date().toLocaleDateString("en-CA");

const field =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none";

/**
 * Photographer's inbox of client booking requests.
 * 1. Quote a talent fee + downpayment (or decline).
 * 2. After the client accepts, the request waits here as "Awaiting downpayment".
 * 3. "Downpayment received" puts the event on the schedule; "Cancel" drops it.
 *
 *  onBooked - called after a downpayment is confirmed (refresh the schedule)
 */
export default function BookingRequests({ hideWhenEmpty = false, onBooked }) {
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({}); // { [id]: { fee, downpayment, message } }
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  // "Downpayment received / Cancel" modal
  const [modal, setModal] = useState(null); // the request being reviewed
  const [paidDate, setPaidDate] = useState(todayString());
  const [modalBusy, setModalBusy] = useState(null); // "confirm" | "cancel" | null
  const [modalError, setModalError] = useState("");

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("booking_requests")
      .select("*")
      .in("status", ["pending", "offered", "awaiting_dp"])
      .order("event_date", { ascending: true });

    if (err) {
      console.error("Failed to load booking requests:", err.message);
      setLoadError(err.message);
      return;
    }
    setLoadError("");
    setRows(data || []);
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    // Check for new client requests every 10 seconds.
    const timer = setInterval(load, 10000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [load]);

  const draft = (id) => drafts[id] || { fee: "", downpayment: "", message: "" };
  const setDraft = (id, patch) =>
    setDrafts((d) => ({ ...d, [id]: { ...draft(id), ...patch } }));

  async function sendOffer(r) {
    const { fee, downpayment, message } = draft(r.id);
    const amount = Number(fee);
    const down = Number(downpayment);

    if (fee === "" || Number.isNaN(amount) || amount < 0) {
      setError("Enter a valid talent fee before sending the offer.");
      return;
    }

    if (downpayment === "" || Number.isNaN(down) || down < 0) {
      setError("Enter the downpayment the client must pay to secure the date (use 0 if none).");
      return;
    }

    if (down > amount) {
      setError("The downpayment can't be more than the talent fee.");
      return;
    }

    setBusyId(r.id);
    setError("");

    const { error: err } = await supabase
      .from("booking_requests")
      .update({
        status: "offered",
        offered_fee: amount,
        downpayment_amount: down,
        admin_message: message.trim() || null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", r.id)
      .eq("status", "pending");

    setBusyId(null);
    if (err) setError(err.message);
    load();
  }

  async function decline(r) {
    setBusyId(r.id);
    setError("");

    const { error: err } = await supabase
      .from("booking_requests")
      .update({
        status: "declined",
        admin_message: draft(r.id).message.trim() || null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", r.id)
      .in("status", ["pending", "offered"]);

    setBusyId(null);
    if (err) setError(err.message);
    load();
  }

  // ---------- awaiting-downpayment modal ----------

  function openModal(r) {
    setModal(r);
    setPaidDate(todayString());
    setModalError("");
    setModalBusy(null);
  }

  function closeModal() {
    if (modalBusy) return;
    setModal(null);
    setModalError("");
  }

  async function confirmDownpayment() {
    if (!modal) return;

    setModalBusy("confirm");
    setModalError("");

    const { error: err } = await supabase.rpc("confirm_downpayment", {
      p_id: modal.id,
      p_paid_at: new Date(`${paidDate || todayString()}T12:00:00`).toISOString(),
    });

    setModalBusy(null);

    if (err) {
      console.error("Failed to confirm downpayment:", err);
      setModalError(err.message);
      return;
    }

    setModal(null);
    await load();
    onBooked?.();
  }

  async function cancelAwaiting() {
    if (!modal) return;

    if (
      !window.confirm(
        "Cancel this booking? Nothing will be added to your schedule and the client will see it as cancelled."
      )
    ) {
      return;
    }

    setModalBusy("cancel");
    setModalError("");

    const { error: err } = await supabase.rpc("cancel_awaiting_request", { p_id: modal.id });

    setModalBusy(null);

    if (err) {
      console.error("Failed to cancel request:", err);
      setModalError(err.message);
      return;
    }

    setModal(null);
    await load();
  }

  if (loadError) {
    return (
      <p className="mb-4 rounded-xl border border-rose-500/40 p-3 text-xs text-rose-300">
        Could not load booking requests: {loadError}
      </p>
    );
  }

  if (rows.length === 0) {
    // On the dashboard the Booking Requests number already says "all caught up".
    if (hideWhenEmpty) return null;

    return (
      <section className="mb-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Booking Requests
        </h3>
        <p className="mt-2 text-xs text-slate-500">
          No pending requests. New client requests will appear here automatically.
        </p>
      </section>
    );
  }

  const modalFee = Number(modal?.offered_fee || 0);
  const modalDown = Number(modal?.downpayment_amount || 0);

  return (
    <section className="mb-4 rounded-xl border border-amber-500/30 bg-slate-900 p-4">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Booking Requests
        </h3>
        <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-xs font-semibold tabular-nums">
          {rows.length}
        </span>
      </header>

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      <div className="space-y-3">
        {rows.map((r) => {
          const d = draft(r.id);
          const busy = busyId === r.id;
          const feeNum = Number(d.fee) || 0;
          const downNum = Number(d.downpayment) || 0;

          return (
            <div
              key={r.id}
              className="rounded-lg border border-slate-700 bg-slate-500/[0.04] p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{r.title}</p>
                  <p className="truncate text-xs text-slate-400">
                    {r.client_name} · {CATEGORY_LABELS[r.category] || r.category || "Event"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.event_date} · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
                    {r.location ? ` · ${r.location}` : ""}
                  </p>
                  {r.notes && <p className="mt-1 text-xs text-slate-400">{r.notes}</p>}
                </div>

                {r.status === "offered" && (
                  <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-500">
                    Waiting for client
                  </span>
                )}
                {r.status === "awaiting_dp" && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                    Awaiting downpayment
                  </span>
                )}
              </div>

              {r.status === "pending" && (
                <div className="mt-3 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-[9rem_9rem_1fr]">
                    <input
                      className={field}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Talent fee (₱)"
                      value={d.fee}
                      onChange={(e) => setDraft(r.id, { fee: e.target.value })}
                    />
                    <input
                      className={field}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Downpayment (₱)"
                      value={d.downpayment}
                      onChange={(e) => setDraft(r.id, { downpayment: e.target.value })}
                    />
                    <input
                      className={field}
                      placeholder="Message to client (optional)"
                      value={d.message}
                      onChange={(e) => setDraft(r.id, { message: e.target.value })}
                      maxLength={500}
                    />
                  </div>

                  {feeNum > 0 && d.downpayment !== "" && (
                    <p className="text-xs text-slate-400">
                      {peso(feeNum)} fee − {peso(downNum)} down ={" "}
                      <span className="font-semibold">{peso(Math.max(feeNum - downNum, 0))}</span>{" "}
                      due after the event
                    </p>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => decline(r)}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => sendOffer(r)}
                      className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-sky-400 disabled:opacity-50"
                    >
                      {busy ? "Sending..." : "Send offer"}
                    </button>
                  </div>
                </div>
              )}

              {r.status === "offered" && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-500/10 px-3 py-2">
                  <p className="text-sm">
                    Offered <span className="font-semibold text-sky-500">{peso(r.offered_fee)}</span>
                    {r.downpayment_amount != null && (
                      <>
                        {" · "}Downpayment{" "}
                        <span className="font-semibold text-sky-500">{peso(r.downpayment_amount)}</span>
                      </>
                    )}
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decline(r)}
                    className="text-xs text-slate-500 hover:text-white disabled:opacity-50"
                  >
                    Withdraw offer
                  </button>
                </div>
              )}

              {r.status === "awaiting_dp" && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-500/10 px-3 py-2">
                  <p className="text-sm">
                    Fee <span className="font-semibold">{peso(r.offered_fee)}</span>
                    {" · "}Downpayment due{" "}
                    <span className="font-semibold text-amber-600">{peso(r.downpayment_amount)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => openModal(r)}
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-400"
                  >
                    Review downpayment
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ---------- Downpayment received / Cancel ---------- */}
      {modal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">Downpayment</h3>
            <p className="mt-1 text-sm text-slate-400">
              The client accepted the quote. The date is added to your schedule once you confirm
              the downpayment.
            </p>

            <div className="mt-4 space-y-1 rounded-lg bg-slate-500/10 p-3 text-sm">
              <p className="font-semibold text-white">{modal.title}</p>
              <p className="text-slate-400">
                {modal.client_name} · {modal.event_date} · {modal.start_time.slice(0, 5)}–
                {modal.end_time.slice(0, 5)}
              </p>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Talent fee</span>
                <span className="font-semibold">{peso(modalFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Downpayment to receive</span>
                <span className="font-semibold text-amber-600">{peso(modalDown)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Balance after the event</span>
                <span className="font-semibold">{peso(Math.max(modalFee - modalDown, 0))}</span>
              </div>
            </div>

            <label className="mt-4 block text-xs text-slate-400">Date received</label>
            <input
              type="date"
              className={`${field} mt-1`}
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
            />

            <p className="mt-2 text-xs text-slate-500">
              Downpayments are non-refundable. Confirming adds the event to your schedule and
              records {peso(modalDown)} as income.
            </p>

            {modalError && (
              <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
                {modalError}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={!!modalBusy}
                className="text-xs text-slate-500 hover:text-white disabled:opacity-50"
              >
                Close
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelAwaiting}
                  disabled={!!modalBusy}
                  className="rounded-lg border border-rose-500/50 px-4 py-2 text-sm font-semibold text-rose-500 hover:bg-rose-500/10 disabled:opacity-50"
                >
                  {modalBusy === "cancel" ? "Cancelling…" : "Cancel booking"}
                </button>
                <button
                  type="button"
                  onClick={confirmDownpayment}
                  disabled={!!modalBusy}
                  className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-sky-400 disabled:opacity-50"
                >
                  {modalBusy === "confirm" ? "Saving…" : "Downpayment received"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}