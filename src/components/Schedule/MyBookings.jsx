import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { supabase } from "../../lib/supabaseClient";

const STATUS = {
  pending: { label: "Waiting for photographer", cls: "bg-amber-500/10 text-amber-300" },
  offered: { label: "Quote received", cls: "bg-sky-500/10 text-sky-300" },
  awaiting_dp: { label: "Awaiting downpayment", cls: "bg-amber-500/10 text-amber-300" },
  approved: { label: "Booked", cls: "bg-emerald-500/10 text-emerald-400" },
  declined: { label: "Declined by photographer", cls: "bg-rose-500/10 text-rose-300" },
  rejected: { label: "You declined the quote", cls: "bg-slate-700/50 text-slate-400" },
  cancelled: { label: "Cancelled", cls: "bg-slate-700/50 text-slate-400" },
};

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const shortDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

// What the client is told before cancelling, depending on whether a downpayment is involved.
function refundNote(r) {
  const hasDown = r.downpayment_amount != null && Number(r.downpayment_amount) > 0;
  if (r.status === "approved") {
    if (hasDown && r.downpayment_received_at) {
      return `Your downpayment of ${peso(r.downpayment_amount)} has already been received and is non-refundable, even if your cancellation is approved.`;
    }
    if (hasDown) {
      return `If you already sent your downpayment of ${peso(r.downpayment_amount)}, it is non-refundable, even if your cancellation is approved.`;
    }
    return "Any downpayment you have paid is non-refundable, even if your cancellation is approved.";
  }
  if (!hasDown) return null;
  return `If you already sent your downpayment of ${peso(r.downpayment_amount)}, it is non-refundable. Please do not send it if you are cancelling.`;
}

/**
 * The client's list of booking requests, with Accept / Decline on quotes.
 *  photographerId - active photographer's id
 *  refreshKey     - change this number to reload the list
 *  onChanged      - called after the client answers a quote or cancels
 */
export default function MyBookings({ photographerId, refreshKey = 0, onChanged }) {
  const [rows, setRows] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [errorId, setErrorId] = useState(null); // which card the error belongs to
  const [loadError, setLoadError] = useState("");
  const [confirmRow, setConfirmRow] = useState(null); // the booking the client is about to cancel
  const [reason, setReason] = useState(""); // optional note sent with a cancellation request

  const load = useCallback(async () => {
    if (!photographerId) return;
    const { data, error: err } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("photographer_id", photographerId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (err) {
      console.error("Failed to load bookings:", err.message);
      setLoadError(err.message);
      return;
    }
    setLoadError("");
    setRows(data || []);
  }, [photographerId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    // Check for a new quote from the photographer every 10 seconds.
    const timer = setInterval(load, 10000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [load]);

  // Escape closes the cancel confirmation
  useEffect(() => {
    if (!confirmRow) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !busyId) setConfirmRow(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmRow, busyId]);

  async function run(id, call) {
    setBusyId(id);
    setError("");
    setErrorId(null);
    const { error: err } = await call();
    setBusyId(null);
    if (err) {
      console.error("Booking action failed:", err);
      setError(err.message);
      setErrorId(id);
    }
    await load();
    onChanged?.();
  }

  const accept = (id) => run(id, () => supabase.rpc("respond_to_offer", { p_id: id, p_accept: true }));
  const decline = (id) => run(id, () => supabase.rpc("respond_to_offer", { p_id: id, p_accept: false }));
  const cancel = (id) => run(id, () => supabase.rpc("cancel_booking", { p_id: id }));
  const cancelAwaiting = (id) =>
    run(id, () => supabase.rpc("cancel_awaiting_request", { p_id: id }));

  // Runs after the client confirms in the popup
  async function confirmCancel() {
    if (!confirmRow) return;
    const row = confirmRow;
    if (row.status === "approved") {
      // A booked event needs the photographer to confirm, so this sends a request.
      await run(row.id, () =>
        supabase.rpc("request_booking_cancellation", { p_id: row.id, p_reason: reason })
      );
    } else {
      // Nothing is booked yet, so these cancel straight away.
      await (row.status === "awaiting_dp" ? cancelAwaiting(row.id) : cancel(row.id));
    }
    setConfirmRow(null);
    setReason("");
  }

  if (loadError) {
    return (
      <p className="rounded-lg border border-rose-500/40 p-3 text-xs text-rose-300">
        Could not load your bookings: {loadError}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-700 py-6 text-center text-sm text-slate-500">
        No booking requests yet. Click an open date on the calendar to start one.
      </p>
    );
  }

  return (
    <div className="custom-scrollbar max-h-[420px] space-y-2 overflow-y-auto pr-2">
      {error && !errorId && <p className="text-xs text-red-400">{error}</p>}

      {rows.map((r) => {
        const cancelPending = r.status === "approved" && Boolean(r.cancel_requested_at);
        const s = cancelPending
          ? { label: "Cancellation requested", cls: "bg-amber-500/10 text-amber-300" }
          : STATUS[r.status] || STATUS.cancelled;
        const busy = busyId === r.id;
        const hasDown = r.downpayment_amount != null && Number(r.downpayment_amount) > 0;
        const balance = Math.max(Number(r.offered_fee || 0) - Number(r.downpayment_amount || 0), 0);
        const canCancel =
          ["pending", "offered", "awaiting_dp", "approved"].includes(r.status) && !cancelPending;

        return (
          <article
            key={r.id}
            className="rounded-lg border border-slate-700 bg-slate-950/40 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{r.title}</p>
                <p className="text-xs text-slate-500">
                  {r.event_date} · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
                  {r.location ? ` · ${r.location}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
                {s.label}
              </span>
            </div>

            {r.status === "offered" && (
              <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
                <p className="text-xs text-slate-400">Photographer's quote</p>
                <p className="text-xl font-bold text-sky-300">{peso(r.offered_fee)}</p>

                {hasDown && (
                  <div className="mt-2 space-y-0.5 text-sm text-slate-300">
                    <p>
                      Downpayment to secure your date:{" "}
                      <span className="font-semibold text-white">{peso(r.downpayment_amount)}</span>
                    </p>
                    <p>
                      Balance, paid at the end of the event:{" "}
                      <span className="font-semibold text-white">{peso(balance)}</span>
                    </p>
                    <p className="pt-1 text-xs text-slate-500">
                      The downpayment is non-refundable. Send it to your photographer to confirm
                      your date.
                    </p>
                  </div>
                )}

                {r.admin_message && (
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{r.admin_message}</p>
                )}
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decline(r.id)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => accept(r.id)}
                    className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-sky-400 disabled:opacity-50"
                  >
                    {busy ? "Please wait..." : "Accept & book"}
                  </button>
                </div>
              </div>
            )}

            {r.status === "awaiting_dp" && (
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-sm text-slate-300">
                  Send your downpayment of{" "}
                  <span className="font-semibold text-white">{peso(r.downpayment_amount)}</span> to
                  your photographer. Your date is added to their schedule once they confirm they
                  received it.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Total fee {peso(r.offered_fee)} · balance of {peso(balance)} is due at the end of
                  the event. The downpayment is non-refundable.
                </p>
              </div>
            )}

            {r.status === "approved" && r.offered_fee != null && (
              <div className="mt-2 space-y-0.5 text-xs text-slate-400">
                <p>Agreed fee: {peso(r.offered_fee)}</p>
                {hasDown &&
                  (r.downpayment_received_at ? (
                    <p className="text-emerald-400">
                      Downpayment of {peso(r.downpayment_amount)} received on{" "}
                      {shortDate(r.downpayment_received_at)}. Balance of {peso(balance)} is due at
                      the end of the event.
                    </p>
                  ) : (
                    <p className="text-amber-300">
                      Waiting for your {peso(r.downpayment_amount)} downpayment.
                    </p>
                  ))}
              </div>
            )}

            {cancelPending && (
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-sm text-slate-300">
                  You asked to cancel this event on{" "}
                  <span className="font-semibold text-white">{shortDate(r.cancel_requested_at)}</span>.
                  Your date stays booked until your photographer confirms.
                </p>
                {r.cancel_reason && (
                  <p className="mt-1 whitespace-pre-line text-xs text-slate-400">
                    Your note: {r.cancel_reason}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  The downpayment is non-refundable.
                </p>
              </div>
            )}

            {error && errorId === r.id && (
              <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
                {error}
              </p>
            )}

            {r.status === "declined" && r.admin_message && (
              <p className="mt-2 text-xs text-slate-400">{r.admin_message}</p>
            )}

            {canCancel && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setReason("");
                    setConfirmRow(r);
                  }}
                  className={
                    r.status === "approved"
                      ? "rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                      : "text-xs text-slate-500 hover:text-white disabled:opacity-50"
                  }
                >
                  {r.status === "approved" ? "Request cancellation" : "Cancel request"}
                </button>
              </div>
            )}
          </article>
        );
      })}

      {/* Cancel confirmation: makes the no-refund rule clear before anything happens */}
      {confirmRow &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !busyId) setConfirmRow(null);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-booking-title"
              className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl"
            >
              <h3 id="cancel-booking-title" className="mb-2 text-lg font-bold text-white">
                {confirmRow.status === "approved" ? "Request to cancel this event?" : "Cancel this request?"}
              </h3>

              <p className="text-sm font-medium text-slate-200">{confirmRow.title}</p>
              <p className="mb-3 text-xs text-slate-500">
                {confirmRow.event_date} · {confirmRow.start_time.slice(0, 5)}–
                {confirmRow.end_time.slice(0, 5)}
              </p>

              <p className="mb-3 text-sm leading-relaxed text-slate-300">
                {confirmRow.status === "approved"
                  ? "You're about to send a cancellation request to your photographer. Your event stays booked until they confirm."
                  : "You're about to cancel this request."}
              </p>

              {refundNote(confirmRow) && (
                <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
                  {refundNote(confirmRow)}
                </p>
              )}

              {confirmRow.status === "approved" && (
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Reason for cancelling (optional)"
                  className="mb-4 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-left text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                />
              )}

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={busyId === confirmRow.id}
                  onClick={() => setConfirmRow(null)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
                >
                  Keep booking
                </button>
                <button
                  type="button"
                  disabled={busyId === confirmRow.id}
                  onClick={confirmCancel}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:bg-red-500 disabled:opacity-50"
                >
                  {busyId === confirmRow.id
                    ? "Sending..."
                    : confirmRow.status === "approved"
                    ? "Send request"
                    : "Yes, cancel"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}