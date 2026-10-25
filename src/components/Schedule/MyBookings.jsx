import { useCallback, useEffect, useState } from "react";

import { supabase } from "../../lib/supabaseClient";

const STATUS = {
  pending: { label: "Waiting for photographer", cls: "bg-amber-500/10 text-amber-300" },
  offered: { label: "Quote received", cls: "bg-sky-500/10 text-sky-300" },
  approved: { label: "Booked", cls: "bg-emerald-500/10 text-emerald-400" },
  declined: { label: "Declined by photographer", cls: "bg-rose-500/10 text-rose-300" },
  rejected: { label: "You declined the quote", cls: "bg-slate-700/50 text-slate-400" },
  cancelled: { label: "Cancelled", cls: "bg-slate-700/50 text-slate-400" },
};

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const shortDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

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
  const [loadError, setLoadError] = useState("");

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

  async function run(id, call) {
    setBusyId(id);
    setError("");
    const { error: err } = await call();
    setBusyId(null);
    if (err) setError(err.message);
    await load();
    onChanged?.();
  }

  const accept = (id) => run(id, () => supabase.rpc("respond_to_offer", { p_id: id, p_accept: true }));
  const decline = (id) => run(id, () => supabase.rpc("respond_to_offer", { p_id: id, p_accept: false }));
  const cancel = (id) => run(id, () => supabase.rpc("cancel_booking", { p_id: id }));

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
      {error && <p className="text-xs text-red-400">{error}</p>}

      {rows.map((r) => {
        const s = STATUS[r.status] || STATUS.cancelled;
        const busy = busyId === r.id;
        const hasDown = r.downpayment_amount != null && Number(r.downpayment_amount) > 0;
        const balance = Math.max(Number(r.offered_fee || 0) - Number(r.downpayment_amount || 0), 0);

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

            {r.status === "declined" && r.admin_message && (
              <p className="mt-2 text-xs text-slate-400">{r.admin_message}</p>
            )}

            {["pending", "offered", "approved"].includes(r.status) && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => cancel(r.id)}
                  className="text-xs text-slate-500 hover:text-white disabled:opacity-50"
                >
                  Cancel request
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}