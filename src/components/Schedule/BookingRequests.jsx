import { useCallback, useEffect, useState } from "react";

import { supabase } from "../../lib/supabaseClient";
import { CATEGORY_LABELS } from "./eventCategory";

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const field =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none";

/**
 * Photographer's inbox of client booking requests.
 * Offer a talent fee (or decline). The event is created only after the client accepts.
 */
export default function BookingRequests() {
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({}); // { [id]: { fee, message } }
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("booking_requests")
      .select("*")
      .in("status", ["pending", "offered"])
      .order("event_date", { ascending: true });

    if (err) {
      console.error("Failed to load booking requests:", err.message);
      setLoadError(err.message);
      return;
    }
    setLoadError("");
    console.log("Booking requests loaded:", data);
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

  const draft = (id) => drafts[id] || { fee: "", message: "" };
  const setDraft = (id, patch) =>
    setDrafts((d) => ({ ...d, [id]: { ...draft(id), ...patch } }));

  async function sendOffer(r) {
    const { fee, message } = draft(r.id);
    const amount = Number(fee);

    if (fee === "" || Number.isNaN(amount) || amount < 0) {
      setError("Enter a valid talent fee before sending the offer.");
      return;
    }

    setBusyId(r.id);
    setError("");

    const { error: err } = await supabase
      .from("booking_requests")
      .update({
        status: "offered",
        offered_fee: amount,
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

  if (loadError) {
    return (
      <p className="mb-4 rounded-xl border border-rose-500/40 p-3 text-xs text-rose-300">
        Could not load booking requests: {loadError}
      </p>
    );
  }

  if (rows.length === 0) {
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

  return (
    <section className="mb-4 rounded-xl border border-amber-500/30 bg-slate-900 p-4">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Booking Requests
        </h3>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-300">
          {rows.length}
        </span>
      </header>

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      <div className="space-y-3">
        {rows.map((r) => {
          const d = draft(r.id);
          const busy = busyId === r.id;

          return (
            <div
              key={r.id}
              className="rounded-lg border border-slate-700 bg-slate-950/40 p-3"
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
                  <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                    Waiting for client
                  </span>
                )}
              </div>

              {r.status === "pending" ? (
                <div className="mt-3 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
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
                      placeholder="Message to client (optional)"
                      value={d.message}
                      onChange={(e) => setDraft(r.id, { message: e.target.value })}
                      maxLength={500}
                    />
                  </div>
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
              ) : (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900 px-3 py-2">
                  <p className="text-sm text-slate-300">
                    Offered <span className="font-semibold text-sky-300">{peso(r.offered_fee)}</span>
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
            </div>
          );
        })}
      </div>
    </section>
  );
}