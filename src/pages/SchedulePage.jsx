import { useEffect, useState } from "react";

import ScheduleHeader from "../components/Schedule/ScheduleHeader";
import ScheduleSummary from "../components/Schedule/ScheduleSummary";
import ScheduleFilters from "../components/Schedule/ScheduleFilters";
import Calendar from "../components/Schedule/Calendar";
import EventCard from "../components/Schedule/EventCard";
import AddEventModal from "../components/Schedule/AddEventModal";
import EventDetailsModal from "../components/Schedule/EventDetailsModal";
import ConfirmModal from "../components/Common/ConfirmModal";

import { sampleEvents } from "../components/Schedule/sampleEvents";

function SchedulePage() {

  // =========================================================
  // EVENTS
  // =========================================================

  const [events, setEvents] = useState(() => {

    const savedEvents =
      localStorage.getItem(
        "lensease_events"
      );

    if (savedEvents) {

      try {

        return JSON.parse(
          savedEvents
        ).map((event) => ({
          ...event,

          start: new Date(
            event.start
          ),

          end: new Date(
            event.end
          ),
        }));

      } catch (error) {

        console.error(
          "Failed to load saved events:",
          error
        );

      }

    }

    return sampleEvents;
  });


  // =========================================================
  // MODALS
  // =========================================================

  const [modalOpen, setModalOpen] =
    useState(false);

  const [detailsOpen, setDetailsOpen] =
    useState(false);

  const [confirmOpen, setConfirmOpen] =
    useState(false);


  // =========================================================
  // SELECTED DATA
  // =========================================================

  const [selectedDate, setSelectedDate] =
    useState("");

  const [selectedEvent, setSelectedEvent] =
    useState(null);

  const [eventToDelete, setEventToDelete] =
    useState(null);


  // =========================================================
  // SEARCH + FILTER
  // =========================================================

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("All");


  // =========================================================
  // SAVE EVENTS TO LOCAL STORAGE
  // =========================================================

  useEffect(() => {

    localStorage.setItem(
      "lensease_events",
      JSON.stringify(events)
    );

  }, [events]);


  // =========================================================
  // ADD / UPDATE EVENT
  // =========================================================

  const addOrUpdateEvent = (
    form
  ) => {

    const event = {

      ...form,

      start: new Date(
        `${form.date}T${form.start}`
      ),

      end: new Date(
        `${form.date}T${form.end}`
      ),
    };


    // =======================================================
    // UPDATE EXISTING EVENT
    // =======================================================

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

    }

    // =======================================================
    // ADD NEW EVENT
    // =======================================================

    else {

      setEvents((prev) => [

        ...prev,

        {
          ...event,
          id: Date.now(),
        },

      ]);

    }


    // Close modal

    setModalOpen(false);

    setSelectedEvent(null);
  };


  // =========================================================
  // REQUEST DELETE
  // =========================================================

  const requestDelete = (
    id
  ) => {

    const event =
      events.find(
        (item) =>
          item.id === id
      );

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

  const confirmDelete = () => {

    if (!eventToDelete) {
      return;
    }


    setEvents((prev) =>
      prev.filter(
        (event) =>
          event.id !==
          eventToDelete.id
      )
    );


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

  const filteredEvents =
    events.filter((event) => {

      const searchText =
        search.toLowerCase();


      const matchesSearch =

        event.title
          ?.toLowerCase()
          .includes(searchText)

        ||

        event.client
          ?.toLowerCase()
          .includes(searchText)

        ||

        event.photographer
          ?.toLowerCase()
          .includes(searchText);


      const matchesCategory =
        category === "All" ||
        event.category ===
          category;


      return (
        matchesSearch &&
        matchesCategory
      );

    });


  // =========================================================
  // CALENDAR EVENT CLICK
  // =========================================================

  const handleCalendarEventClick = (
    event
  ) => {

    setSelectedEvent(event);

    setDetailsOpen(true);
  };


  // =========================================================
  // PAGE
  // =========================================================

  return (

    <div className="schedule-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <ScheduleHeader
        onAdd={() => {

          setSelectedDate("");

          setSelectedEvent(null);

          setModalOpen(true);

        }}
      />


      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <ScheduleSummary
        events={events}
      />


      {/* =====================================================
          SEARCH + FILTER
      ===================================================== */}

      <ScheduleFilters

        search={search}

        setSearch={setSearch}

        category={category}

        setCategory={setCategory}

      />


      {/* =====================================================
          CALENDAR
      ===================================================== */}

      <Calendar

        events={filteredEvents}


        onSelectSlot={({
          start,
        }) => {

          setSelectedDate(

            new Date(start)
              .toISOString()
              .split("T")[0]

          );

          setSelectedEvent(null);

          setModalOpen(true);

        }}


        /*
          IMPORTANT:

          This MUST be called onEventClick.

          The custom Calendar.jsx uses:

          onEventClick(event)
        */

        onEventClick={
          handleCalendarEventClick
        }

      />


      {/* =====================================================
          EVENT CARDS
      ===================================================== */}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">

        {filteredEvents.length >
        0 ? (

          filteredEvents.map(
            (event) => (

              <div
                key={event.id}

                className="cursor-pointer"

                onClick={() => {

                  setSelectedEvent(
                    event
                  );

                  setDetailsOpen(
                    true
                  );

                }}
              >

                <EventCard
                  event={event}
                />

              </div>

            )
          )

        ) : (

          <div className="col-span-full rounded-xl border border-slate-700 bg-slate-900 p-8 text-center">

            <p className="text-slate-400">
              No events found.
            </p>

            <p className="text-sm text-slate-500 mt-1">
              Try changing your
              search or category
              filter.
            </p>

          </div>

        )}

      </div>


      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      <AddEventModal

        open={modalOpen}

        onClose={() => {

          setModalOpen(false);

          setSelectedEvent(null);

        }}

        onSave={
          addOrUpdateEvent
        }

        selectedDate={
          selectedDate
        }

        editingEvent={
          selectedEvent
        }

      />


      {/* =====================================================
          EVENT DETAILS MODAL
      ===================================================== */}

      <EventDetailsModal

        open={detailsOpen}

        event={selectedEvent}

        onClose={() => {

          setDetailsOpen(false);

        }}

        onEdit={(event) => {

          setDetailsOpen(false);

          setSelectedEvent(event);

          setModalOpen(true);

        }}

        onDelete={
          requestDelete
        }

      />


      {/* =====================================================
          DELETE CONFIRMATION
      ===================================================== */}

      <ConfirmModal

        open={confirmOpen}

        title="Delete Event"

        message={
          eventToDelete

            ? `Are you sure you want to delete "${eventToDelete.title}"? This action cannot be undone.`

            : "Are you sure you want to delete this event?"
        }

        onCancel={
          cancelDelete
        }

        onConfirm={
          confirmDelete
        }

      />

    </div>

  );
}

export default SchedulePage;