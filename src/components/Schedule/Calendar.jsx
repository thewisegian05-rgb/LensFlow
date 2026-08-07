import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";

import "./Calendar.css";
import CalendarToolbar from "./CalendarToolbar";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

function Calendar({ events, onSelectSlot }) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-5">

      <div className="mb-5">
        <h2 className="text-xl font-semibold text-white">
          Studio Calendar
        </h2>
      </div>

      <div className="h-[700px] rounded-xl overflow-hidden">

        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView="month"
          selectable
          onSelectSlot={onSelectSlot}
          components={{
            toolbar: CalendarToolbar,
          }}
        />

      </div>

    </div>
  );
}

export default Calendar;