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
  const [clients, setClients] = useState([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  // =========================================================
  // FETCH CLIENTS FOR SCHEDULE
  // =========================================================
  const fetchClients = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Also pull talent_fee so AddEventModal can pre-fill the fee
    // field when an existing client is picked, instead of always
    // starting blank.
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, talent_fee")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load clients:", error.message);
      return;
    }

    const mapped = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      talentFee: row.talent_fee,
    }));

    setClients(mapped);
  };

  // =========================================================
  // SYNC SCHEDULE CLIENT -> CLIENTS TABLE
  // =========================================================

  const syncClientFromSchedule = async (form, userId) => {
    console.log("SYNC CLIENT STARTED");
    console.log("Form:", form);
    console.log("User ID:", userId);

    const clientName = form.client?.trim();

    if (!clientName) {
      console.log("No client name found.");
      return;
    }

    const { data: existingClients, error: findError } = await supabase
      .from("clients")
      .select("id, name")
      .eq("user_id", userId)
      .ilike("name", clientName)
      .limit(1);

    console.log("Existing client result:", existingClients);

    if (findError) {
      console.error("CLIENT LOOKUP MESSAGE:", findError?.message);
      console.error("CLIENT LOOKUP CODE:", findError?.code);
      console.error("CLIENT LOOKUP DETAILS:", findError?.details);
      console.error("CLIENT LOOKUP HINT:", findError?.hint);
      return;
    }

    const existingClient = existingClients?.[0];

    const scheduleData = {
      project: form.title,
      venue: form.location,
      category: form.category,
      project_status: "Ongoing",
    };

    if (existingClient) {
      console.log("Updating existing client:", existingClient);

      const { data, error } = await supabase
        .from("clients")
        .update(scheduleData)
        .eq("id", existingClient.id)
        .select();

      console.log("Update result:", data);

      if (error) {
        console.error("CLIENT UPDATE ERROR:", error);
      }

      return;
    }

    const initials = clientName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();

    console.log("Creating new client:", clientName);

    const { data, error } = await supabase
      .from("clients")
      .insert([
        {
          user_id: userId,
          name: clientName,
          project: form.title,
          venue: form.location,
          category: form.category,
          project_status: "Ongoing",
          initials,
          talent_fee: 0,
          type: null,
          contact: null,
          email: null,
        },
      ])
      .select();

    console.log("Insert result:", data);

    if (error) {
      console.error("CLIENT INSERT ERROR:", error);
    }
  };

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
        clientId: row.client_id,
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
        // Per-event fee, now actually persisted (see addOrUpdateEvent
        // below) instead of only living on the client record.
        talentFee: Number(row.talent_fee) || 0,
      };
    });

    setEvents(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
    fetchClients();
  }, []);


  // =========================================================
  // RESYNC A CLIENT'S CACHED PROJECT SNAPSHOT
  // =========================================================
  //
  // `clients.project` / `venue` / `category` are a snapshot written
  // whenever an event is saved (see addOrUpdateEvent below) — they're
  // what ClientPage falls back to display when a client has no
  // *current* events. That snapshot is never touched on delete, so
  // deleting a client's last remaining event left stale data behind
  // and made it look like the event was never actually removed.
  // Call this after any schedule_events delete that could affect a
  // client, so their snapshot always reflects what's really left.

  const syncClientProjectSnapshot = async (clientId) => {
    if (!clientId) return;

    const { data: remainingEvents, error } = await supabase
      .from("schedule_events")
      .select("title, location, category, start_time")
      .eq("client_id", clientId)
      .order("start_time", { ascending: true });

    if (error) {
      console.error(
        "Failed to resync client project snapshot:",
        error.message
      );
      return;
    }

    const now = new Date();
    const upcoming = (remainingEvents || []).filter(
      (event) => new Date(event.start_time) >= now
    );

    // Prefer the nearest upcoming event, same as ClientPage's own
    // "activeProject" logic; otherwise fall back to the most recent
    // past one; otherwise there's genuinely nothing left, so clear it.
    const active =
      upcoming[0] ||
      (remainingEvents && remainingEvents[remainingEvents.length - 1]) ||
      null;

    const { error: updateError } = await supabase
      .from("clients")
      .update({
        project: active?.title || null,
        venue: active?.location || null,
        category: active?.category || null,
      })
      .eq("id", clientId);

    if (updateError) {
      console.error(
        "Failed to update client project snapshot:",
        updateError.message
      );
    }
  };

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

    const talentFee = Number(form.talentFee) || 0;
    let clientId = form.clientId;

    if (!clientId) {
      const clientName = form.client?.trim();

      if (!clientName) {
        console.error("Client name is required.");
        return;
      }

      const initials = clientName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();

      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert([
          {
            user_id: user.id,
            name: clientName,
            project: form.title,
            venue: form.location,
            category: form.category,
            project_status: "Ongoing",
            initials,
            talent_fee: talentFee,
          },
        ])
        .select()
        .single();

      if (clientError) {
        console.error(
          "Failed to create new client:",
          clientError.message
        );
        return;
      }

      clientId = newClient.id;

      setClients((prev) => [
        ...prev,
        {
          id: newClient.id,
          name: newClient.name,
          talentFee,
        },
      ]);
    }

    const { error: clientFeeError } = await supabase
      .from("clients")
      .update({ talent_fee: talentFee })
      .eq("id", clientId)
      .eq("user_id", user.id);

    if (clientFeeError) {
      console.error(
        "Failed to update client talent fee:",
        clientFeeError.message
      );
      return;
    }

    const payload = {
      title: form.title,
      client: form.client,
      client_id: clientId,
      category: form.category,
      photographer: form.photographer,
      location: form.location,
      gears: form.gears,
      notes: form.notes,
      start_time: new Date(`${form.date}T${form.start}`).toISOString(),
      end_time: new Date(`${form.date}T${form.end}`).toISOString(),
      project_id: form.projectId || null,
      // This was being computed above and synced onto the client, but
      // never actually saved onto the event row itself — added here
      // so each event keeps its own fee going forward.
      talent_fee: talentFee,
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
    await fetchClients();

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

    // If this event was promoted into (or linked to) a real project in
    // Workflow, delete that project too so it disappears from there as
    // well, not just here.
    if (eventToDelete.project_id) {
      const { error: projectDeleteError } = await supabase
        .from("projects")
        .delete()
        .eq("id", eventToDelete.project_id);

      if (projectDeleteError) {
        console.error(
          "Failed to delete linked project:",
          projectDeleteError.message
        );
        return;
      }
    }

    const { error } = await supabase
      .from("schedule_events")
      .delete()
      .eq("id", eventToDelete.id);

    if (error) {
      console.error("Failed to delete event:", error.message);
      return;
    }

    await syncClientProjectSnapshot(eventToDelete.clientId);

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
        clients={clients}
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