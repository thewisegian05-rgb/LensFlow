import { useEffect, useState } from "react";

import ScheduleHeader from "../components/Schedule/ScheduleHeader";
import ScheduleSummary from "../components/Schedule/ScheduleSummary";
import ScheduleFilters from "../components/Schedule/ScheduleFilters";
import Calendar from "../components/Schedule/Calendar";
import EventCard from "../components/Schedule/EventCard";
import AddEventModal from "../components/Schedule/AddEventModal";
import EventDetailsModal from "../components/Schedule/EventDetailsModal";
import ConfirmModal from "../components/Common/ConfirmModal";

import { supabase } from "../lib/supabaseClient";

const formatDateForInput = (date) => {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

function SchedulePage() {

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");


  // =========================================================
  // LOAD EVENTS FROM SUPABASE
  // =========================================================

  const fetchEvents = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("schedule_events")
      .select("*")
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Failed to load events:", error.message);
      setLoading(false);
      return;
    }

    const mapped = data.map((row) => {
      const start = new Date(row.start_time);
      const end = new Date(row.end_time);

      return {
        id: row.id,
        title: row.title,
        client: row.client,
        category: row.category,
        photographer: row.photographer,
        location: row.location,
        gears: row.gears || [],
        notes: row.notes,
        start,
        end,
        date: start.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        time: start.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        project_id: row.project_id,
        status: row.status,
      };
    });

    setEvents(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);


  // =========================================================
  // ADD / UPDATE EVENT
  // =========================================================

  const addOrUpdateEvent = async (form) => {

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("No authenticated user found.");
      return;
    }

    const payload = {
      title: form.title,
      client: form.client,
      category: form.category,
      photographer: form.photographer,
      location: form.location,
      gears: form.gears,
      notes: form.notes,
      start_time: new Date(`${form.date}T${form.start}`).toISOString(),
      end_time: new Date(`${form.date}T${form.end}`).toISOString(),
      project_id: form.projectId || null,
    };

    if (form.id) {
      const { error } = await supabase
        .from("schedule_events")
        .update(payload)
        .eq("id", form.id);

      if (error) {
        console.error("Failed to update event:", error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("schedule_events")
        .insert([{ ...payload, user_id: user.id }]);

      if (error) {
        console.error("Failed to add event:", error.message);
        return;
      }
    }

    await fetchEvents();

    setModalOpen(false);
    setSelectedEvent(null);
  };


  // =========================================================
  // COMPLETE EVENT -> ADVANCE LINKED PROJECT
  // =========================================================

  const handleCompleteEvent = async (event) => {
    if (!event.project_id) return;

    const { error: eventError } = await supabase
      .from("schedule_events")
      .update({ status: "completed" })
      .eq("id", event.id);

    if (eventError) {
      console.error("Failed to mark event complete:", eventError.message);
      return;
    }

    const { error: projectError } = await supabase
      .from("projects")
      .update({ stage: "shoot-completed" })
      .eq("id", event.project_id);

    if (projectError) {
      console.error(
        "Failed to advance linked project:",
        projectError.message
      );
      return;
    }

    await fetchEvents();

    setDetailsOpen(false);
    setSelectedEvent(null);
  };


  // =========================================================
  // REQUEST DELETE
  // =========================================================

  const requestDelete = (id) => {
    const event = events.find((item) => item.id === id);

    if (!event) {
      return;
    }

    setEventToDelete(event);
    setDetailsOpen(false);
    setConfirmOpen(true);
  };


  // =========================================================
  // CONFIRM DELETE
  // =========================================================

  const confirmDelete = async () => {
    if (!eventToDelete) {
      return;
    }

    const { error } = await supabase
      .from("schedule_events")
      .delete()
      .eq("id", eventToDelete.id);

    if (error) {
      console.error("Failed to delete event:", error.message);
      return;
    }

    await fetchEvents();

    setConfirmOpen(false);
    setEventToDelete(null);
    setSelectedEvent(null);
  };


  // =========================================================
  // CANCEL DELETE
  // =========================================================

  const cancelDelete = () => {
    setConfirmOpen(false);
    setEventToDelete(null);
  };


  // =========================================================
  // SEARCH + CATEGORY FILTER
  // =========================================================

  const filteredEvents = events.filter((event) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      event.title?.toLowerCase().includes(searchText) ||
      event.client?.toLowerCase().includes(searchText) ||
      event.photographer?.toLowerCase().includes(searchText);

    const matchesCategory =
      category === "All" || event.category === category;

    return matchesSearch && matchesCategory;
  });


  // =========================================================
  // CALENDAR EVENT CLICK
  // =========================================================

  const handleCalendarEventClick = (event) => {
    setSelectedEvent(event);
    setDetailsOpen(true);
  };


  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="schedule-page">

      <ScheduleHeader
        onAdd={() => {
          setSelectedDate("");
          setSelectedEvent(null);
          setModalOpen(true);
        }}
      />

      <ScheduleSummary events={events} />

      <ScheduleFilters
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={setCategory}
      />

      <Calendar
        events={filteredEvents}
        onSelectSlot={({ start }) => {
          setSelectedDate(formatDateForInput(start));
          setSelectedEvent(null);
          setModalOpen(true);
        }}
        onEventClick={handleCalendarEventClick}
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">

        {loading ? (
          <div className="col-span-full rounded-xl border border-slate-700 bg-slate-900 p-8 text-center">
            <p className="text-slate-400">Loading events...</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
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
          ))
        ) : (
          <div className="col-span-full rounded-xl border border-slate-700 bg-slate-900 p-8 text-center">
            <p className="text-slate-400">No events found.</p>
            <p className="text-sm text-slate-500 mt-1">
              Try changing your search or category filter.
            </p>
          </div>
        )}

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
        onDelete={requestDelete}
        onComplete={handleCompleteEvent}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Delete Event"
        message={
          eventToDelete
            ? `Are you sure you want to delete "${eventToDelete.title}"? This action cannot be undone.`
            : "Are you sure you want to delete this event?"
        }
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />

    </div>
  );
}

export default SchedulePage;