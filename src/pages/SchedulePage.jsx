import { useState } from "react";

import ScheduleHeader from "../components/Schedule/ScheduleHeader";
import Calendar from "../components/Schedule/Calendar";
import EventCard from "../components/Schedule/EventCard";
import AddEventModal from "../components/Schedule/AddEventModal";
import EventDetailsModal from "../components/Schedule/EventDetailsModal";
import { sampleEvents } from "../components/Schedule/sampleEvents";

function SchedulePage() {
  const [events, setEvents] = useState(sampleEvents);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const addOrUpdateEvent = (form) => {
    const event = {
      ...form,

      start: new Date(`${form.date}T${form.start}`),
      end: new Date(`${form.date}T${form.end}`),
    };

    if (form.id) {
      setEvents((prev) =>
        prev.map((item) =>
          item.id === form.id
            ? {
                ...event,
                id: form.id,
              }
            : item
        )
      );
    } else {
      setEvents((prev) => [
        ...prev,
        {
          ...event,
          id: Date.now(),
        },
      ]);
    }

    setModalOpen(false);
    setSelectedEvent(null);
  };

  const deleteEvent = (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this event?"
    );

    if (!confirmed) return;

    setEvents((prev) =>
      prev.filter((event) => event.id !== id)
    );

    setDetailsOpen(false);
    setSelectedEvent(null);
  };

  return (
    <div className="space-y-6">

      <ScheduleHeader
        onAdd={() => {
          setSelectedDate("");
          setSelectedEvent(null);
          setModalOpen(true);
        }}
      />

      <Calendar
        events={events}
        onSelectSlot={({ start }) => {
          setSelectedDate(start.toISOString().split("T")[0]);
          setSelectedEvent(null);
          setModalOpen(true);
        }}
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">

        {events.map((event) => (
          <div
            key={event.id}
            className="cursor-pointer"
            onClick={() => {
              setSelectedEvent(event);
              setDetailsOpen(true);
            }}
          >
            <EventCard event={event} />
          </div>
        ))}

      </div>

      <AddEventModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedEvent(null);
        }}
        onSave={addOrUpdateEvent}
        selectedDate={selectedDate}
        editingEvent={selectedEvent}
      />

      <EventDetailsModal
        open={detailsOpen}
        event={selectedEvent}
        onClose={() => setDetailsOpen(false)}
        onEdit={(event) => {
          setDetailsOpen(false);
          setSelectedEvent(event);
          setModalOpen(true);
        }}
        onDelete={deleteEvent}
      />

    </div>
  );
}

export default SchedulePage;