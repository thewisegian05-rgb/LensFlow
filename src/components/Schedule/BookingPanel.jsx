import { useEffect, useState } from "react";
import { FaCalendarPlus } from "react-icons/fa";

import { supabase } from "../../lib/supabaseClient";
import { CATEGORY_LABELS } from "./eventCategory";
import CrewNeededField, { emptyCrew, cleanCrew, crewProblem } from "./CrewNeededField";

const input =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none";

const pad = (n) => String(n).padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => dateKey(new Date());

// Most bookings need at least one photographer, so start there.
const defaultCrew = () => ({ ...emptyCrew(), photographers: 1 });

/**
 * Booking request form (the client's side).
 *  photographerId - active photographer's id
 *  events         - the portal's calendarEvents (start/end are Date objects)
 *  initialDate    - "YYYY-MM-DD" picked on the calendar
 *  onChanged      - called after a request is sent
 *  onBooked       - called after a request is sent (used to close the popup)
 */
export default function BookingPanel({
  photographerId,
  events = [],
  onChanged,
  initialDate,
  onBooked,
}) {
  const [form, setForm] = useState({
    title: "",
    category: Object.keys(CATEGORY_LABELS)[0] || "",
    date: initialDate || today(),
    start: "09:00",
    end: "12:00",
    location: "",
    notes: "",
  });
  const [crew, setCrew] = useState(defaultCrew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialDate) setForm((f) => ({ ...f, date: initialDate }));
  }, [initialDate]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const conflict = () => {
    const start = new Date(`${form.date}T${form.start}`);
    const end = new Date(`${form.date}T${form.end}`);
    return events.some((e) => dateKey(new Date(e.start)) === form.date && e.start < end && e.end > start);
  };

  async function submit(e) {
    e.preventDefault();
    setError("");

    const title = form.title.trim();

    if (!title) return setError("Please give your booking a title.");
    if (form.end <= form.start) return setError("End time must be after start time.");
    if (conflict()) return setError("That time is already booked. Please pick another slot.");

    const crewError = crewProblem(crew);
    if (crewError) return setError(crewError);

    setSaving(true);
    const { error: err } = await supabase.rpc("request_booking", {
      p_photographer_id: photographerId,
      p_title: title,
      p_category: form.category,
      p_date: form.date,
      p_start: form.start,
      p_end: form.end,
      p_location: form.location.trim(),
      p_notes: form.notes.trim(),
    });

    if (err) {
      setSaving(false);
      return setError(err.message);
    }

    // The request is saved. Now attach the creatives the client asked for.
    // If this step fails the booking still exists, so we tell the client
    // instead of letting them send a duplicate.
    const { error: crewErr } = await supabase.rpc("set_booking_crew", {
      p_photographer_id: photographerId,
      p_title: title,
      p_date: form.date,
      p_start: form.start,
      p_crew: cleanCrew(crew),
    });

    setSaving(false);

    if (crewErr) {
      console.error("Could not save the creatives needed:", crewErr.message);
      window.alert(
        "Your booking request was sent, but the number of creatives you asked for could not be saved. Please mention it in your message to the photographer."
      );
    }

    setForm((f) => ({ ...f, title: "", location: "", notes: "" }));
    setCrew(defaultCrew());
    onChanged?.();
    onBooked?.();
  }

  return (
    <form
      onSubmit={submit}
      className="min-w-0 space-y-3 rounded-lg border border-slate-700 bg-slate-950/50 p-3 sm:p-4"
    >
      <p className="flex items-center gap-2 text-xs font-semibold text-slate-300">
        <FaCalendarPlus className="text-sky-400" /> Send a booking request
      </p>
      <p className="text-xs text-slate-500">
        Your photographer will review it and send back a quote. You confirm it in "My Bookings".
      </p>

      <input
        className={input}
        placeholder="What is the shoot for? (e.g. Wedding of Ana & Ben)"
        value={form.title}
        onChange={set("title")}
        maxLength={120}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <select className={input} value={form.category} onChange={set("category")}>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input className={input} type="date" min={today()} value={form.date} onChange={set("date")} />
        <input className={input} type="time" value={form.start} onChange={set("start")} />
        <input className={input} type="time" value={form.end} onChange={set("end")} />
      </div>

      <input
        className={input}
        placeholder="Venue / location"
        value={form.location}
        onChange={set("location")}
        maxLength={200}
      />

      <CrewNeededField value={crew} onChange={setCrew} disabled={saving} />

      <textarea
        className={input}
        rows={2}
        placeholder="Notes for your photographer (optional)"
        value={form.notes}
        onChange={set("notes")}
        maxLength={1000}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-sky-400 disabled:opacity-50"
        >
          {saving ? "Sending..." : "Send request"}
        </button>
      </div>
    </form>
  );
}