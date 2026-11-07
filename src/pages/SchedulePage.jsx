import { useEffect, useState } from "react";
import { useOutletContext, useSearchParams, useLocation } from "react-router-dom";

import ScheduleHeader from "../components/Schedule/ScheduleHeader";
import ScheduleSummary from "../components/Schedule/ScheduleSummary";
import ScheduleFilters from "../components/Schedule/ScheduleFilters";
import Calendar from "../components/Schedule/Calendar";
import AddEventModal from "../components/Schedule/AddEventModal";
import EventDetailsModal from "../components/Schedule/EventDetailsModal";
import BookingRequests from "../components/Schedule/BookingRequests";
import ConfirmModal from "../components/Common/ConfirmModal";

import { supabase } from "../lib/supabaseClient";
import {
  markDeleting,
  unmarkDeleting,
  usePendingDeletes,
} from "../lib/pendingDeletes";
import {
  getEventCategory,
  CATEGORY_HEX,
  CATEGORY_LABELS,
} from "../components/Schedule/eventCategory";

const MIN_DELETE_MS = 1000; // keeps the toast visible long enough to read

const formatDateForInput = (date) => {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// Same category colors the Calendar uses, so a wedding looks the same
// in the lists as it does on the calendar.
const hexToRgba = (hex, alpha = 1) => {
  const normalized = (hex || "#d946ef").replace("#", "");
  const safeHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const value = Number.parseInt(safeHex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getCategoryStyle = (event) => {
  const category = getEventCategory(event);
  const hex = CATEGORY_HEX[category] || CATEGORY_HEX.default;

  return {
    backgroundColor: hexToRgba(hex, 0.1),
    borderColor: hexToRgba(hex, 0.3),
    borderLeftColor: hex,
    color: hex,
  };
};

// =========================================================
// COMPACT EVENT LIST (Today's Events / Coming Events)
// =========================================================

function EventList({
  title,
  dot,
  events,
  loading,
  emptyText,
  showDate = false,
  limit = 5,
  onSelect,
  leavingIds,
  highlightedEventId,
}) {
  const visible = events.slice(0, limit);
  const hidden = events.length - visible.length;

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          {title}
        </h3>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-300">
          {events.length}
        </span>
      </header>

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-500">Loading...</p>
      ) : events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 py-6 text-center text-sm text-slate-500">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((event) => {
            const category = getEventCategory(event);
            const categoryLabel = CATEGORY_LABELS[category] || event.category;
            const isLeaving = leavingIds?.has(event.id);

            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelect(event)}
                style={getCategoryStyle(event)}
                className={`flex w-full items-center gap-3 rounded-lg border border-l-4 px-3 py-2 text-left transition hover:brightness-125 ${
                  `${isLeaving ? "event-row-leaving" : ""} ${
                    event.id === highlightedEventId
                      ? "ring-2 ring-sky-400 shadow-lg shadow-sky-500/20"
                      : ""
                  }`
                }`}
              >
                <div className="w-16 flex-shrink-0 text-xs">
                  <p className="font-semibold">{event.time}</p>
                  {showDate && (
                    <p className="mt-0.5 opacity-70">
                      {event.start.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  <p className="truncate text-xs opacity-70">
                    {[event.client, categoryLabel].filter(Boolean).join(" · ")}
                  </p>
                </div>

                {event.status === "completed" && (
                  <span className="flex-shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    Done
                  </span>
                )}
              </button>
            );
          })}

          {hidden > 0 && (
            <p className="pt-1 text-center text-xs text-slate-500">
              +{hidden} more in the calendar below
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function SchedulePage() {
  const { reportPageReady, routeKey } = useOutletContext();
  const location = useLocation();
  const [highlightedEventId, setHighlightedEventId] = useState(null);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      reportPageReady(routeKey);
    }
  }, [loading, reportPageReady, routeKey]);

  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [clients, setClients] = useState([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  // Bumped after a manual event is added, so the Booking Requests box
  // reloads right away and shows it as "Awaiting downpayment".
  const [requestsVersion, setRequestsVersion] = useState(0);

  // IDs of events currently being deleted. Lives in a shared module,
  // so it survives switching to another page and coming back.
  const pendingIds = usePendingDeletes();

  // The top bar's "New Project" button sends people here with ?new=1:
  // open the New Event form, then clear the flag from the URL.
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setSelectedDate("");
      setSelectedEvent(null);
      setModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const targetId = location.state?.highlightEventId;
    if (!targetId || events.length === 0) return;
    const target = events.find((event) => event.id === targetId);
    if (!target) return;
    setHighlightedEventId(targetId);
    setSelectedEvent(target);
    setDetailsOpen(true);
    const timer = setTimeout(() => setHighlightedEventId(null), 3000);
    return () => clearTimeout(timer);
  }, [location.key, location.state, events]);

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
      .select("id, name, talent_fee, email")
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
      // Lets AddEventModal pre-fill the client's Google email.
      email: row.email || "",
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

  // `silent` skips the "Loading..." state so refetches after a delete
  // don't flash the lists.
  const fetchEvents = async (silent = false) => {
    if (!silent) setLoading(true);

    const { data, error } = await supabase
      .from("schedule_events")
      .select("*")
      .or("status.is.null,status.neq.cancelled") // cancelled bookings leave the schedule
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
        call_time: row.call_time || null,
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

  // Reload when you come back to this tab, so events that a client
  // just accepted show up without a manual refresh.
  useEffect(() => {
    const refresh = () => {
      fetchEvents(true);
      fetchClients();
    };

    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);


  // =========================================================
  // RESYNC OR REMOVE A CLIENT AFTER THEIR EVENTS CHANGE
  // =========================================================
  //
  // `clients.project` / `venue` / `category` are a snapshot written
  // whenever an event is saved (see addOrUpdateEvent below) — it's
  // what ClientPage falls back to display when a client has no
  // *current* events. If the client still has other events left, we
  // just refresh that snapshot to the next one. If they have none at
  // all, the client record itself is deleted — including any manually
  // entered contact info, email, or notes — rather than left behind
  // as an empty shell. This is a deliberate, confirmed choice: there
  // is no "keep the client but empty" middle ground here.

  const syncOrRemoveClient = async (clientId) => {
    if (!clientId) return;

    const { data: remainingEvents, error } = await supabase
      .from("schedule_events")
      .select("title, location, category, start_time")
      .eq("client_id", clientId)
      .order("start_time", { ascending: true });

    if (error) {
      console.error(
        "Failed to check remaining events for client:",
        error.message
      );
      return;
    }

    if (!remainingEvents || remainingEvents.length === 0) {
      const { error: deleteError } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId);

      if (deleteError) {
        console.error(
          "Failed to delete client with no remaining events:",
          deleteError.message
        );
      }

      return;
    }

    const now = new Date();
    const upcoming = remainingEvents.filter(
      (event) => new Date(event.start_time) >= now
    );

    const active = upcoming[0] || remainingEvents[remainingEvents.length - 1];

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

  // Emails the client through the `send-event-email` Edge Function. Only an
  // id is sent: the function looks up the details and the client's email
  // itself, so nothing is trusted from the browser. A failure never blocks
  // saving; it just tells the creative.
  //
  //   "awaiting_downpayment"  `id` is a booking request id (a new event that
  //                           is waiting for its downpayment)
  //   "created" / "updated"   `id` is a schedule event id
  const notifyClient = async (id, kind) => {
    const body =
      kind === "awaiting_downpayment"
        ? { request_id: id, kind }
        : { event_id: id, kind };

    const { error } = await supabase.functions.invoke("send-event-email", {
      body,
    });

    if (!error) return;

    let detail = error.message;

    try {
      const response = await error.context.json();
      if (response?.error) detail = response.error;
    } catch {
      // keep the default message
    }

    console.error("Failed to email the client:", detail);

    const saved =
      kind === "awaiting_downpayment"
        ? "The booking request was saved"
        : "The event was saved";

    window.alert(
      `${saved}, but the email to the client could not be sent (${detail}).`
    );
  };

  const addOrUpdateEvent = async (form) => {

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("No authenticated user found.");
      return;
    }

    const talentFee = Number(form.talentFee) || 0;
    const clientEmail = String(form.clientEmail || "").trim().toLowerCase();

    // The email we already had for this client, read before anything is
    // saved. If the creative typed a different address, the new address
    // hasn't been told about the event yet.
    const previousEmail = String(
      clients.find((c) => c.id === form.clientId)?.email || ""
    )
      .trim()
      .toLowerCase();

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
            email: clientEmail || null,
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
          email: clientEmail,
        },
      ]);
    }

    // The fee, and the client's Google email (used for booking emails).
    const { error: clientFeeError } = await supabase
      .from("clients")
      .update({
        talent_fee: talentFee,
        ...(clientEmail ? { email: clientEmail } : {}),
      })
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
      call_time: form.callTime || null,
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

      // Email the client again only when something they care about changed
      // (or when this is the first time this address hears about the event),
      // so small edits like notes or gear don't send an email.
      const original = events.find((e) => e.id === form.id);

      const detailsChanged =
        !original ||
        original.title !== payload.title ||
        original.start.getTime() !== new Date(payload.start_time).getTime() ||
        original.end.getTime() !== new Date(payload.end_time).getTime() ||
        (original.location || "") !== (payload.location || "") ||
        Number(original.talentFee || 0) !== talentFee;

      if (clientEmail) {
        if (clientEmail !== previousEmail) {
          notifyClient(form.id, "created");
        } else if (detailsChanged) {
          notifyClient(form.id, "updated");
        }
      }

    } else {
      // A NEW event is not put on the schedule straight away. It is saved as a
      // booking request that waits for its downpayment ("Awaiting downpayment"
      // in Booking Requests). The photographer confirms the downpayment was
      // received from there, and only then does the confirm_manual_downpayment
      // function create the schedule event and record the payment.
      //
      // The details a booking request has no column for (team, gear, project,
      // client, exact times, email) travel in `manual_details` and are copied
      // onto the schedule event at that point.
      const downpaymentDue = Number(form.downpaymentDue) || 0;

      const { data: createdRequest, error } = await supabase
        .from("booking_requests")
        .insert({
          photographer_id: user.id,
          client_name: form.client,
          title: form.title,
          category: form.category,
          event_date: form.date,
          call_time: form.callTime || null,
          start_time: form.start,
          end_time: form.end,
          location: form.location || null,
          notes: form.notes || null,
          status: "awaiting_dp",
          offered_fee: talentFee,
          downpayment_amount: downpaymentDue,
          responded_at: new Date().toISOString(),
          manual_details: {
            client_id: clientId,
            client_email: clientEmail || null,
            photographer: form.photographer || null,
            gears: form.gears || [],
            project_id: form.projectId || null,
            start_time: payload.start_time,
            end_time: payload.end_time,
          },
        })
        .select("id")
        .single();

      if (error) {
        console.error("Failed to add booking request:", error.message);
        window.alert(`The event could not be added (${error.message}).`);
        return;
      }

      setRequestsVersion((v) => v + 1);

      // Tell the client right away that the booking is waiting for its
      // downpayment. This doesn't hold up saving: if the email fails, the
      // creative gets an alert and the request stays in Booking Requests.
      notifyClient(createdRequest.id, "awaiting_downpayment");
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
  // CONFIRM DELETE (with exit animation)
  // =========================================================
  //
  // The "deleting" flag lives in lib/pendingDeletes.js, not in this
  // component's state. That way, if you switch to another page while
  // the delete is running, the animation state isn't lost — and other
  // pages (TodaySchedule) can play the same animation.

  const confirmDelete = async () => {
    if (!eventToDelete) {
      return;
    }

    const target = eventToDelete;

    // close the modal right away, then let the row animate out
    setConfirmOpen(false);
    setEventToDelete(null);
    setSelectedEvent(null);

    markDeleting(target.id, target.title);

    // make sure the animation always plays fully,
    // even if the DB responds faster than the animation duration
    const animationDone = new Promise((resolve) =>
      setTimeout(resolve, MIN_DELETE_MS)
    );

    try {
      // If this event was promoted into (or linked to) a real project in
      // Workflow, delete that project too so it disappears from there as
      // well, not just here.
      if (target.project_id) {
        const { error: projectDeleteError } = await supabase
          .from("projects")
          .delete()
          .eq("id", target.project_id);

        if (projectDeleteError) throw projectDeleteError;
      }

      const { error } = await supabase
        .from("schedule_events")
        .delete()
        .eq("id", target.id);

      if (error) throw error;

      await syncOrRemoveClient(target.clientId);
    } catch (err) {
      console.error("Failed to delete event:", err.message);
      // failed: bring the row back
      unmarkDeleting(target.id);
      return;
    }

    await animationDone;
    await fetchEvents(true);
    await fetchClients();

    // only now un-mark, so the row never flickers back
    unmarkDeleting(target.id);
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
  // TODAY'S EVENTS + COMING EVENTS (follow the search/category filters)
  // =========================================================

  const todayKey = formatDateForInput(new Date());

  const todaysEvents = filteredEvents.filter(
    (event) => formatDateForInput(event.start) === todayKey
  );

  const comingEvents = filteredEvents.filter(
    (event) => formatDateForInput(event.start) > todayKey
  );

  const openEventDetails = (event) => {
    setSelectedEvent(event);
    setDetailsOpen(true);
  };


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

      <BookingRequests
        refreshKey={requestsVersion}
        onBooked={() => {
          fetchEvents(true);
          fetchClients();
        }}
      />

      <ScheduleFilters
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={setCategory}
      />

      <div className="mb-4 mt-4 grid gap-4 md:grid-cols-2">
        <EventList
          title="Today's Events"
          dot="bg-amber-400"
          events={todaysEvents}
          loading={loading}
          emptyText="No events today."
          onSelect={openEventDetails}
          leavingIds={pendingIds}
          highlightedEventId={highlightedEventId}
        />
        <EventList
          title="Coming Events"
          dot="bg-sky-400"
          events={comingEvents}
          loading={loading}
          emptyText="No upcoming events."
          showDate
          onSelect={openEventDetails}
          leavingIds={pendingIds}
          highlightedEventId={highlightedEventId}
        />
      </div>

      <Calendar
        events={filteredEvents}
        onSelectSlot={({ start }) => {
          setSelectedDate(formatDateForInput(start));
          setSelectedEvent(null);
          setModalOpen(true);
        }}
        onEventClick={handleCalendarEventClick}
      />

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