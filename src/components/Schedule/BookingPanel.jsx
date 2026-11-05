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
// Bookings can be made up to the end of the year after next
// (in 2026 the last bookable day is December 31, 2028).
const lastBookableDate = () => `${new Date().getFullYear() + 2}-12-31`;
const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Most bookings need at least one photographer, so start there.
const defaultCrew = () => ({ ...emptyCrew(), photographers: 1 });

const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneDigits = (value) => String(value || "").replace(/\D/g, "");

// Regions of the Philippines, shown in the Region dropdown.
const PH_REGIONS = [
  "NCR (National Capital Region)",
  "CAR (Cordillera Administrative Region)",
  "Region I (Ilocos Region)",
  "Region II (Cagayan Valley)",
  "Region III (Central Luzon)",
  "Region IV-A (CALABARZON)",
  "MIMAROPA (Region IV-B)",
  "Region V (Bicol Region)",
  "Region VI (Western Visayas)",
  "NIR (Negros Island Region)",
  "Region VII (Central Visayas)",
  "Region VIII (Eastern Visayas)",
  "Region IX (Zamboanga Peninsula)",
  "Region X (Northern Mindanao)",
  "Region XI (Davao Region)",
  "Region XII (SOCCSKSARGEN)",
  "Region XIII (Caraga)",
  "BARMM (Bangsamoro Autonomous Region)",
];

// The address is typed in separate boxes and saved as one line of text
// (the same `location` the photographer's inbox and schedule already show):
//   "Venue, Street, Brgy. X, City, Municipality, Region"
const emptyAddress = () => ({
  venue: "",
  street: "",
  barangay: "",
  city: "",
  municipality: "",
  region: "",
});

const joinAddress = (a) => {
  const barangay = a.barangay.trim();
  const brgy = barangay && !/^(brgy|barangay)\b/i.test(barangay) ? `Brgy. ${barangay}` : barangay;

  return [a.venue, a.street, brgy, a.city, a.municipality, a.region]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
};

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
    notes: "",
  });
  const [address, setAddress] = useState(emptyAddress);
  const [contact, setContact] = useState({ email: "", phone: "" });
  const [crew, setCrew] = useState(defaultCrew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialDate) setForm((f) => ({ ...f, date: initialDate }));
  }, [initialDate]);

  // Fill in the client's email (and phone, if their account has one) automatically.
  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (!active || !user) return;

      setContact((c) => ({
        email: c.email || user.email || "",
        phone: c.phone || user.phone || user.user_metadata?.phone || "",
      }));
    });

    return () => {
      active = false;
    };
  }, []);

  const setContactPart = (key) => (e) => {
    const raw = e.target.value;
    const value = key === "phone" ? raw.replace(/\D/g, "").slice(0, 11) : raw.replace(/\s/g, "");
    setContact((c) => ({ ...c, [key]: value }));
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setPart = (key) => (e) => setAddress((a) => ({ ...a, [key]: e.target.value }));

  // For today, the earliest start time is "right now".
  const isToday = form.date === today();
  const earliestStart = isToday ? nowTime() : undefined;

  // What is still missing. "Send request" stays disabled until this is empty.
  const missing = [];
  if (!form.title.trim()) missing.push("a title");
  if (!form.date || !form.start || !form.end) {
    missing.push("the date and time");
  } else if (
    form.date < today() ||
    form.date > lastBookableDate() ||
    form.end <= form.start ||
    (isToday && form.start <= nowTime())
  ) {
    missing.push("a valid date and time");
  }
  if (!address.venue.trim()) missing.push("the venue");
  if (!address.city.trim() && !address.municipality.trim()) missing.push("the city or municipality");
  if (!address.region) missing.push("the region");
  if (!EMAIL_RULE.test(contact.email.trim())) missing.push("a valid email");
  if (phoneDigits(contact.phone).length !== 11) missing.push("an 11-digit contact number");
  if (crewProblem(crew)) missing.push("at least one creative");

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

    // Nothing can be booked in the past.
    if (form.date < today()) return setError("That date has already passed. Please pick today or a later date.");
    if (form.date > lastBookableDate()) {
      return setError(
        `Bookings can only be made up to ${new Date().getFullYear() + 2}. Please pick an earlier date.`
      );
    }
    if (form.date === today() && form.start <= nowTime()) {
      return setError("That start time has already passed. Please pick a later time today.");
    }
    if (form.end <= form.start) {
      return setError(
        "The end time must be later than the start time on the same day. For an event that runs past midnight, set the end to 11:59 pm and mention the rest in your notes."
      );
    }

    if (!address.venue.trim()) return setError("Please enter the venue.");
    if (!address.city.trim() && !address.municipality.trim()) {
      return setError("Please enter the city or municipality.");
    }
    if (!address.region) return setError("Please choose the region.");

    if (!EMAIL_RULE.test(contact.email.trim())) {
      return setError("Please enter a valid email address.");
    }
    if (phoneDigits(contact.phone).length !== 11) {
      return setError("Please enter an 11-digit contact number (e.g. 09171234567).");
    }

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
      p_location: joinAddress(address),
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

    // Save the client's email and number on the request. A failure here never
    // undoes the booking; the client is told so they can mention it instead.
    const { error: contactErr } = await supabase.rpc("set_booking_contact", {
      p_photographer_id: photographerId,
      p_title: title,
      p_date: form.date,
      p_start: form.start,
      p_email: contact.email.trim(),
      p_phone: contact.phone.trim(),
    });

    setSaving(false);

    if (contactErr) {
      console.error("Could not save the contact details:", contactErr.message);
      window.alert(
        "Your booking request was sent, but your email and number could not be saved on it. Please mention them in your message to the photographer."
      );
    }

    if (crewErr) {
      console.error("Could not save the creatives needed:", crewErr.message);
      window.alert(
        "Your booking request was sent, but the number of creatives you asked for could not be saved. Please mention it in your message to the photographer."
      );
    }

    setForm((f) => ({ ...f, title: "", notes: "" }));
    setAddress(emptyAddress());
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
        <input
          className={input}
          type="date"
          min={today()}
          max={lastBookableDate()}
          value={form.date}
          onChange={set("date")}
        />
        <input
          className={input}
          type="time"
          min={earliestStart}
          value={form.start}
          onChange={set("start")}
          aria-label="Start time"
        />
        <input
          className={input}
          type="time"
          value={form.end}
          onChange={set("end")}
          aria-label="End time"
        />
      </div>
      {isToday && (
        <p className="-mt-1 text-xs text-slate-500">
          For today, the start time can't be earlier than the current time.
        </p>
      )}

      {/* ---- location, one box per part ---- */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-200">Location</p>

        <input
          className={input}
          placeholder="Venue"
          aria-label="Venue"
          value={address.venue}
          onChange={setPart("venue")}
          maxLength={80}
        />
        <input
          className={input}
          placeholder="Street"
          aria-label="Street"
          value={address.street}
          onChange={setPart("street")}
          maxLength={60}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={input}
            placeholder="Barangay"
            aria-label="Barangay"
            value={address.barangay}
            onChange={setPart("barangay")}
            maxLength={40}
          />
          <input
            className={input}
            placeholder="City"
            aria-label="City"
            value={address.city}
            onChange={setPart("city")}
            maxLength={40}
          />
          <input
            className={input}
            placeholder="Municipality"
            aria-label="Municipality"
            value={address.municipality}
            onChange={setPart("municipality")}
            maxLength={40}
          />
          <select
            className={`${input} ${address.region ? "" : "text-slate-500"}`}
            aria-label="Region"
            value={address.region}
            onChange={setPart("region")}
          >
            <option value="" disabled>
              Select region
            </option>
            {PH_REGIONS.map((region) => (
              <option key={region} value={region} className="bg-slate-800 text-white">
                {region}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500">
          Fill in the city or the municipality, whichever applies to the venue.
        </p>
      </div>

      {/* ---- contact details ---- */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-200">Contact</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={input}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Email address"
            aria-label="Email address"
            value={contact.email}
            onChange={setContactPart("email")}
            maxLength={120}
          />
          <input
            className={input}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Contact number (e.g. 09171234567)"
            aria-label="Contact number"
            value={contact.phone}
            onChange={setContactPart("phone")}
            maxLength={11}
          />
        </div>
        <p className="text-xs text-slate-500">
          Your email is filled in from your account. Your photographer uses these to reach you about
          this booking.
        </p>
      </div>

      <CrewNeededField value={crew} onChange={setCrew} disabled={saving} />

      <textarea
        className={input}
        rows={2}
        placeholder="Notes for your photographer (optional)"
        value={form.notes}
        onChange={set("notes")}
        maxLength={500}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      {missing.length > 0 && (
        <p className="text-xs text-slate-500" aria-live="polite">
          Still needed: {missing.join(", ")}.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || missing.length > 0}
          className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Sending..." : "Send request"}
        </button>
      </div>
    </form>
  );
}