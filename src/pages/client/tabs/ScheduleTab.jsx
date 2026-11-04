import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import Calendar from "../../../components/Schedule/Calendar";
import BookingModal from "../../../components/Schedule/BookingModal";
import Section from "../components/ui/Section";
import TabHeader from "../components/ui/TabHeader";

const STATUS_LABEL = {
  pending: "Waiting for photographer",
  offered: "Quote received",
  awaiting_dp: "Awaiting downpayment",
  approved: "Booked",
};

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function ScheduleTab() {
  const { portal, activeId, reload } = /** @type {any} */ (useOutletContext());
  const [bookingDate, setBookingDate] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [selected, setSelected] = useState(null);

  /* ---------------------------------------------------------
     THIS CLIENT'S OWN BOOKINGS
     booking_requests is protected by row-level security, so a client
     can only ever read their own rows. Other clients' details are
     never loaded here.
     --------------------------------------------------------- */
  useEffect(() => {
    if (!activeId) {
      setMyRequests([]);
      return;
    }

    let cancelled = false;

    const loadMine = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      const { data, error } = await supabase
        .from("booking_requests")
        .select("*")
        .eq("photographer_id", activeId)
        .eq("client_id", user.id)
        .in("status", ["pending", "offered", "awaiting_dp", "approved"]);

      if (cancelled) return;

      if (error) {
        console.error("Could not load your bookings for the calendar:", error.message);
        return;
      }

      setMyRequests(data || []);
    };

    loadMine();

    const onFocus = () => loadMine();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [activeId, portal]);

  /* The photographer's busy blocks. Everyone sees these as just "Booked". */
  const bookedEvents = useMemo(
    () =>
      (portal?.events || []).map((row) => {
        const start = new Date(row.start_time);
        const end = new Date(row.end_time);
        return {
          id: row.id,
          title: "Booked",
          client: "",
          photographer: "",
          category: row.category,
          location: "",
          gears: [],
          notes: "",
          start,
          end,
          date: start.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          time: start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      }),
    [portal]
  );

  /* This client's own bookings, with full details. */
  const myEvents = useMemo(
    () =>
      myRequests
        .filter((r) => r.event_date && r.start_time && r.end_time)
        .map((r) => {
          const start = new Date(`${r.event_date}T${r.start_time}`);
          const end = new Date(`${r.event_date}T${r.end_time}`);
          const approved = r.status === "approved";

          return {
            id: `mine-${r.id}`,
            mine: true,
            request: r,
            title: `★ ${r.title || "Your booking"}${approved ? "" : " (pending)"}`,
            client: "Your booking",
            photographer: "",
            category: r.category,
            location: r.location || "",
            gears: [],
            notes: "",
            start,
            end,
            date: start.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            time: start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
        }),
    [myRequests]
  );

  /* What the calendar draws: other people's dates stay "Booked", your own
     bookings replace the generic block that sits on the same time. */
  const calendarEvents = useMemo(() => {
    const myApproved = myEvents.filter((e) => e.request.status === "approved");

    const others = bookedEvents.filter(
      (b) => !myApproved.some((m) => b.start < m.end && b.end > m.start)
    );

    return [...others, ...myEvents];
  }, [bookedEvents, myEvents]);

  /* calendar date click -> open the booking form (today or later only) */
  const handleSelectSlot = ({ start }) => {
    const d = new Date(start);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    const todayKey = new Date().toLocaleDateString("en-CA");
    if (key >= todayKey) setBookingDate(key);
  };

  /* Only your own bookings open details. Other dates stay private. */
  const handleEventClick = (event) => {
    if (event?.mine) setSelected(event.request);
  };

  const balance = selected
    ? Math.max(Number(selected.offered_fee || 0) - Number(selected.downpayment_amount || 0), 0)
    : 0;

  return (
    <div className="min-w-0 space-y-4">
      <TabHeader
        eyebrow="Availability"
        title="Schedule"
        text="View the photographer's availability. Select an available date to start a booking request. Your own bookings are marked with a star. Other clients' event details remain private."
      />

      <Section title="Photographer Calendar" dot="bg-sky-400">
        <div className="min-w-0 max-w-full overflow-x-auto rounded-lg">
          <Calendar
            events={calendarEvents}
            onSelectSlot={handleSelectSlot}
            onEventClick={handleEventClick}
          />
        </div>
      </Section>

      <BookingModal
        open={!!bookingDate}
        date={bookingDate}
        photographerId={activeId}
        events={bookedEvents}
        onClose={() => setBookingDate(null)}
        onChanged={reload}
      />

      {/* YOUR BOOKING DETAILS */}
      {selected &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                    Your booking
                  </p>
                  <h3 className="mt-0.5 break-words text-lg font-bold">
                    {selected.title || "Your booking"}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <span
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  selected.status === "approved"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-amber-500/10 text-amber-300"
                }`}
              >
                {STATUS_LABEL[selected.status] || selected.status}
              </span>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Date</dt>
                  <dd className="text-right">
                    {new Date(`${selected.event_date}T00:00:00`).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Time</dt>
                  <dd className="text-right">
                    {selected.start_time.slice(0, 5)}–{selected.end_time.slice(0, 5)}
                  </dd>
                </div>

                {selected.location && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-400">Location</dt>
                    <dd className="break-words text-right">{selected.location}</dd>
                  </div>
                )}

                {selected.offered_fee != null && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-400">Agreed fee</dt>
                    <dd className="text-right">{peso(selected.offered_fee)}</dd>
                  </div>
                )}

                {selected.downpayment_amount != null &&
                  Number(selected.downpayment_amount) > 0 && (
                    <>
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-400">Downpayment</dt>
                        <dd className="text-right">
                          {peso(selected.downpayment_amount)}
                          {selected.downpayment_received_at ? " · received" : " · not yet received"}
                        </dd>
                      </div>

                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-400">Balance (end of event)</dt>
                        <dd className="text-right">{peso(balance)}</dd>
                      </div>
                    </>
                  )}
              </dl>

              <p className="mt-4 text-xs text-slate-500">
                Only you can see these details. Other clients see this date as "Booked".
              </p>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}