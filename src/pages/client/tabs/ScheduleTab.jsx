
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";

import { supabase } from "../../../lib/supabaseClient";

import Calendar from "../../../components/Schedule/Calendar";
import BookingModal from "../../../components/Schedule/BookingModal";

import { crewSummary } from "../../../components/Schedule/CrewNeededField";

import Section from "../components/ui/Section";
import TabHeader from "../components/ui/TabHeader";

// ==========================================
// BOOKING STATUS LABELS
// ==========================================

const STATUS_LABEL = {
  pending: "Waiting for photographer",
  offered: "Quote received",
  awaiting_dp: "Awaiting downpayment",
  approved: "Booked",
};

// ==========================================
// CURRENCY FORMATTER
// ==========================================

const peso = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

// ==========================================
// BOOKING DATE RULES
// ==========================================

// Same booking window used by the
// photographer's Add Event form.
const MAX_YEARS_AHEAD = 2;

// Use Manila dates regardless of the
// customer's device timezone.
const getManilaDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

const addYearsToKey = (key, years) => {
  const [year, month, day] = key
    .split("-")
    .map(Number);

  return new Date(
    Date.UTC(year + years, month - 1, day)
  )
    .toISOString()
    .slice(0, 10);
};

// ==========================================
// REUSABLE BOOKING DETAILS ROW
// ==========================================

function BookingDetailRow({
  label,
  children,
  highlight = false,
}) {
  return (
    <div
      className="
        flex items-start
        justify-between gap-4
      "
    >
      <dt
        className="
          min-w-0 shrink-0
          text-slate-500

          dark:text-slate-400
        "
      >
        {label}
      </dt>

      <dd
        className={`
          min-w-0 break-words
          text-right font-medium

          ${
            highlight
              ? "text-sky-600 dark:text-sky-400"
              : "text-slate-800 dark:text-slate-100"
          }
        `}
      >
        {children}
      </dd>
    </div>
  );
}

// ==========================================
// CLIENT SCHEDULE TAB
// ==========================================

export default function ScheduleTab() {
  const { portal, activeId, reload } =
    useOutletContext() || {};

  // ========================================
  // STATES
  // ========================================

  const [bookingDate, setBookingDate] =
    useState(null);

  const [myRequests, setMyRequests] =
    useState([]);

  const [selected, setSelected] =
    useState(null);

  // ========================================
  // BOOKING WINDOW
  // ========================================

  const minimumBookingDate =
    getManilaDateKey();

  const maximumBookingDate =
    addYearsToKey(
      minimumBookingDate,
      MAX_YEARS_AHEAD
    );

  // ========================================
  // LOAD THIS CLIENT'S OWN BOOKINGS
  // ========================================

  useEffect(() => {
    if (!activeId) {
      setMyRequests([]);
      return;
    }

    let cancelled = false;

    const loadMine = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user || cancelled) {
          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("booking_requests")
          .select("*")
          .eq(
            "photographer_id",
            activeId
          )
          .eq("client_id", user.id)
          .in("status", [
            "pending",
            "offered",
            "awaiting_dp",
            "approved",
          ]);

        if (cancelled) {
          return;
        }

        if (error) {
          throw error;
        }

        setMyRequests(data || []);
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Could not load your bookings for the calendar:",
            error
          );
        }
      }
    };

    loadMine();

    // Refresh the customer's bookings when
    // they return to this browser tab.
    const onFocus = () => {
      loadMine();
    };

    window.addEventListener(
      "focus",
      onFocus
    );

    return () => {
      cancelled = true;

      window.removeEventListener(
        "focus",
        onFocus
      );
    };
  }, [activeId, portal]);

  // ========================================
  // PHOTOGRAPHER'S BUSY EVENTS
  // ========================================

  // Other clients' event details stay hidden.
  // Their calendar entries display "Booked".

  const bookedEvents = useMemo(
    () =>
      (portal?.events || []).map((row) => {
        const start = new Date(
          row.start_time
        );

        const end = new Date(
          row.end_time
        );

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

          date: start.toLocaleDateString(
            undefined,
            {
              month: "short",
              day: "numeric",
              year: "numeric",
            }
          ),

          time: start.toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
        };
      }),
    [portal]
  );

  // ========================================
  // CLIENT'S OWN BOOKINGS
  // ========================================

  // These entries include full booking details
  // because they belong to the signed-in client.

  const myEvents = useMemo(
    () =>
      myRequests
        .filter(
          (request) =>
            request.event_date &&
            request.start_time &&
            request.end_time
        )
        .map((request) => {
          const start = new Date(
            `${request.event_date}T${request.start_time}`
          );

          const end = new Date(
            `${request.event_date}T${request.end_time}`
          );

          const approved =
            request.status === "approved";

          return {
            id: `mine-${request.id}`,

            mine: true,
            request,

            title:
              `★ ${
                request.title ||
                "Your booking"
              }` +
              (approved
                ? ""
                : " (pending)"),

            client: "Your booking",
            photographer: "",

            category: request.category,
            location:
              request.location || "",

            gears: [],
            notes: "",

            start,
            end,

            date: start.toLocaleDateString(
              undefined,
              {
                month: "short",
                day: "numeric",
                year: "numeric",
              }
            ),

            time: start.toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            ),
          };
        }),
    [myRequests]
  );

  // ========================================
  // COMBINE CALENDAR EVENTS
  // ========================================

  // Replace generic "Booked" blocks with
  // the client's own approved booking where
  // the time ranges overlap.

  const calendarEvents = useMemo(() => {
    const myApproved = myEvents.filter(
      (event) =>
        event.request.status === "approved"
    );

    const others = bookedEvents.filter(
      (booked) =>
        !myApproved.some(
          (mine) =>
            booked.start < mine.end &&
            booked.end > mine.start
        )
    );

    return [
      ...others,
      ...myEvents,
    ];
  }, [bookedEvents, myEvents]);

  // ========================================
  // SELECT DATE
  // ========================================

  const handleSelectSlot = ({ start }) => {
    const key = getManilaDateKey(start);

    if (
      key >= minimumBookingDate &&
      key <= maximumBookingDate
    ) {
      setBookingDate(key);
    }
  };

  // ========================================
  // SELECT EXISTING BOOKING
  // ========================================

  // Only this customer's own events
  // can show booking information.

  const handleEventClick = (event) => {
    if (event?.mine) {
      setSelected(event.request);
    }
  };

  // ========================================
  // BOOKING DETAILS
  // ========================================

  const balance = selected
    ? Math.max(
        Number(
          selected.offered_fee || 0
        ) -
          Number(
            selected.downpayment_amount ||
              0
          ),
        0
      )
    : 0;

  const crewText = selected
    ? crewSummary(
        selected.crew_needed
      )
    : "";

  // ========================================
  // PAGE
  // ========================================

  return (
    <div
      className="
        min-w-0 space-y-4

        text-slate-900
        dark:text-slate-100
      "
    >
      {/* ======================================
          PAGE HEADER
         ====================================== */}

      <TabHeader
        eyebrow="Availability"
        title="Schedule"
        text="View the photographer's availability. Select an available date to start a booking request. Your own bookings are marked with a star. Other clients' event details remain private."
      />

      {/* ======================================
          PHOTOGRAPHER CALENDAR
         ====================================== */}

      <Section
        title="Photographer Calendar"
        dot="bg-sky-400"
      >
        <div
          className="
            min-w-0 max-w-full
            overflow-x-auto
            rounded-lg

            bg-white
            text-slate-900

            dark:bg-[#10192C]
            dark:text-slate-100
          "
        >
          <Calendar
            events={calendarEvents}
            onSelectSlot={
              handleSelectSlot
            }
            onEventClick={
              handleEventClick
            }
            minSelectableDate={
              minimumBookingDate
            }
            maxSelectableDate={
              maximumBookingDate
            }
          />
        </div>
      </Section>

      {/* ======================================
          NEW BOOKING MODAL
         ====================================== */}

      <BookingModal
        open={Boolean(bookingDate)}
        date={bookingDate}
        photographerId={activeId}
        events={bookedEvents}
        onClose={() =>
          setBookingDate(null)
        }
        onChanged={reload}
      />

      {/* ======================================
          CUSTOMER'S BOOKING DETAILS MODAL
         ====================================== */}

      {selected &&
        createPortal(
          <div
            className="
              fixed inset-0
              z-[100]

              flex items-center
              justify-center

              bg-slate-950/70
              p-4

              backdrop-blur-sm
            "
            onClick={() =>
              setSelected(null)
            }
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="client-booking-details-title"
              onClick={(event) =>
                event.stopPropagation()
              }
              className="
                custom-scrollbar

                max-h-[90vh]
                w-full max-w-sm
                overflow-y-auto

                rounded-2xl

                border border-slate-200
                bg-white

                p-5

                text-slate-900
                shadow-2xl

                dark:border-slate-700
                dark:bg-slate-900
                dark:text-white
              "
            >
              {/* ==============================
                  MODAL HEADER
                 ============================== */}

              <div
                className="
                  flex items-start
                  justify-between gap-3
                "
              >
                <div className="min-w-0">
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wider

                      text-sky-600
                      dark:text-sky-400
                    "
                  >
                    Your booking
                  </p>

                  <h3
                    id="client-booking-details-title"
                    className="
                      mt-0.5 break-words
                      text-lg font-bold

                      text-slate-900
                      dark:text-white
                    "
                  >
                    {selected.title ||
                      "Your booking"}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelected(null)
                  }
                  aria-label="Close booking details"
                  className="
                    shrink-0 rounded-lg
                    px-2 py-1

                    text-slate-500

                    transition-colors

                    hover:bg-slate-100
                    hover:text-slate-900

                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-sky-500

                    dark:text-slate-400
                    dark:hover:bg-slate-800
                    dark:hover:text-white
                  "
                >
                  ✕
                </button>
              </div>

              {/* ==============================
                  BOOKING STATUS
                 ============================== */}

              <span
                className={`
                  mt-3 inline-flex
                  rounded-full
                  px-3 py-1

                  text-[10px]
                  font-semibold

                  ${
                    selected.status ===
                    "approved"
                      ? `
                        bg-emerald-100
                        text-emerald-700

                        dark:bg-emerald-500/10
                        dark:text-emerald-400
                      `
                      : `
                        bg-amber-100
                        text-amber-700

                        dark:bg-amber-500/10
                        dark:text-amber-300
                      `
                  }
                `}
              >
                {STATUS_LABEL[
                  selected.status
                ] || selected.status}
              </span>

              {/* ==============================
                  BOOKING DETAILS
                 ============================== */}

              <dl
                className="
                  mt-5 space-y-3
                  border-t
                  border-slate-200
                  pt-4 text-sm

                  dark:border-slate-700
                "
              >
                {/* DATE */}
                <BookingDetailRow label="Date">
                  {new Date(
                    `${selected.event_date}T00:00:00`
                  ).toLocaleDateString(
                    undefined,
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
                </BookingDetailRow>

                {/* TIME */}
                <BookingDetailRow label="Time">
                  {selected.start_time.slice(
                    0,
                    5
                  )}
                  –
                  {selected.end_time.slice(
                    0,
                    5
                  )}
                </BookingDetailRow>

                {/* PHOTOGRAPHER CALL TIME */}
                {selected.call_time && (
                  <BookingDetailRow
                    label="Photographer Call Time"
                    highlight
                  >
                    {new Date(
                      `2000-01-01T${selected.call_time.slice(
                        0,
                        5
                      )}:00`
                    ).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </BookingDetailRow>
                )}

                {/* LOCATION */}
                {selected.location && (
                  <BookingDetailRow label="Location">
                    {selected.location}
                  </BookingDetailRow>
                )}

                {/* CREATIVES NEEDED */}
                {crewText && (
                  <BookingDetailRow label="Creatives needed">
                    {crewText}
                  </BookingDetailRow>
                )}

                {/* AGREED FEE */}
                {selected.offered_fee !=
                  null && (
                  <BookingDetailRow label="Agreed fee">
                    {peso(
                      selected.offered_fee
                    )}
                  </BookingDetailRow>
                )}

                {/* DOWNPAYMENT AND BALANCE */}
                {selected.downpayment_amount !=
                  null &&
                  Number(
                    selected.downpayment_amount
                  ) > 0 && (
                    <>
                      <BookingDetailRow label="Downpayment">
                        {peso(
                          selected.downpayment_amount
                        )}

                        {selected.downpayment_received_at
                          ? " · received"
                          : " · not yet received"}
                      </BookingDetailRow>

                      <BookingDetailRow label="Balance (end of event)">
                        {peso(balance)}
                      </BookingDetailRow>
                    </>
                  )}
              </dl>

              {/* ==============================
                  PRIVACY NOTE
                 ============================== */}

              <div
                className="
                  mt-5 rounded-xl
                  border border-sky-200
                  bg-sky-50

                  px-3 py-3

                  dark:border-sky-500/20
                  dark:bg-sky-500/[0.06]
                "
              >
                <p
                  className="
                    text-xs leading-relaxed

                    text-slate-600
                    dark:text-slate-400
                  "
                >
                  Only you can see these
                  booking details. Other
                  clients see this date
                  as "Booked".
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
