import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import Calendar from "../../../components/Schedule/Calendar";
import BookingModal from "../../../components/Schedule/BookingModal";
import Section from "../components/ui/Section";
import TabHeader from "../components/ui/TabHeader";

export default function ScheduleTab() {
  const { portal, activeId, reload } = /** @type {any} */ (useOutletContext());
  const [bookingDate, setBookingDate] = useState(null);

  /* shape the data for the existing Calendar component */
  const calendarEvents = useMemo(
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

  /* calendar date click -> open the booking form (today or later only) */
  const handleSelectSlot = ({ start }) => {
    const d = new Date(start);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    const todayKey = new Date().toLocaleDateString("en-CA");
    if (key >= todayKey) setBookingDate(key);
  };

  return (
    <div className="min-w-0 space-y-4">
      <TabHeader
        eyebrow="Availability"
        title="Schedule"
        text="View the photographer's availability. Select an available date to start a booking request. Other clients' event details remain private."
      />

      <Section title="Photographer Calendar" dot="bg-sky-400">
        <div className="min-w-0 max-w-full overflow-x-auto rounded-lg">
          <Calendar events={calendarEvents} onSelectSlot={handleSelectSlot} onEventClick={() => {}} />
        </div>
      </Section>

      <BookingModal
        open={!!bookingDate}
        date={bookingDate}
        photographerId={activeId}
        events={calendarEvents}
        onClose={() => setBookingDate(null)}
        onChanged={reload}
      />
    </div>
  );
}