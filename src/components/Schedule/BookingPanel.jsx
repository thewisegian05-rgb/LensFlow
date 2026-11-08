import { useEffect, useState } from "react";
import { FaCalendarPlus } from "react-icons/fa";
import { supabase } from "../../lib/supabaseClient";
import { CATEGORY_LABELS } from "./eventCategory";
import { emptyCrew, cleanCrew, crewProblem } from "./CrewNeededField";
// ==========================================
// STYLES
// ==========================================
const input = "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:shadow-none dark:focus:ring-sky-500/20";
// ==========================================
// REPEATED LETTER VALIDATION
// ==========================================
// Checks three identical consecutive letters.
// Examples: aaa, AAA, aAa, bbb
const hasTripleRepeatedLetters = (value) => /([a-z])\1{2}/i.test(value);
const repeatedMessage = (field) => `${field} cannot contain three consecutive identical letters.`;
// Error message displayed underneath the input.
function RepeatError({ message }) {
    if (!message)
        return null;
    return (<p role="alert" className="mt-1.5 flex items-start gap-2 text-xs leading-5 text-rose-600 dark:text-rose-400">

      <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">

        !

      </span>

      <span>{message}</span>

    </p>);
}
// ==========================================
// DATE UTILITIES
// ==========================================
const pad = (n) => String(n).padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Get the current date/time in Philippine time.
const manilaParts = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);
    return Object.fromEntries(parts
        .filter((p) => p.type !== "literal")
        .map((p) => [p.type, p.value]));
};
const today = () => {
    const p = manilaParts();
    return `${p.year}-${p.month}-${p.day}`;
};
// Maximum booking date: December 31 of next year.
const lastBookableDate = () => {
    const year = Number(manilaParts().year) + 1;
    return `${year}-12-31`;
};
// Minimum booking time: two hours from now.
const minimumBooking = () => {
    const minimumTimestamp = Math.ceil((Date.now() + 2 * 60 * 60 * 1000) / 60000) * 60000;
    const p = manilaParts(new Date(minimumTimestamp));
    return {
        date: `${p.year}-${p.month}-${p.day}`,
        time: `${p.hour}:${p.minute}`,
    };
};
// Interpret date and time using Philippine time.
const bookingTimestamp = (date, time) => Date.parse(`${date}T${time}:00+08:00`);
// ==========================================
// CREW
// ==========================================
const defaultCrew = () => ({
    ...emptyCrew(),
    photographers: 1,
});
// ==========================================
// CREATIVES NEEDED - INLINE TAILWIND UI
// No separate styled component file is required.
// Read the role keys from the existing crew helper so the data
// sent to Supabase remains in the same format.
// ==========================================
const CREW_KEYS = Object.keys(emptyCrew());
const MAX_CREW_PER_ROLE = 10;

function crewRoleInfo(key) {
  const readable = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .toLowerCase();

  if (readable.includes("photo")) {
    return { label: "Photographers", singular: "photographer", description: "Still photo coverage" };
  }
  if (readable.includes("video")) {
    return { label: "Videographers", singular: "videographer", description: "Video coverage" };
  }
  if (readable.includes("drone")) {
    return { label: "Drone operators", singular: "drone operator", description: "Aerial shots" };
  }
  if (readable.includes("assist")) {
    return { label: "Assistants", singular: "assistant", description: "Lighting, gear and support" };
  }

  return {
    label: readable.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    singular: readable,
    description: "Additional creative support",
  };
}

function InlineCrewNeededField({ value, onChange, disabled = false }) {
  const countFor = (key) => {
    const count = Number(value?.[key] ?? 0);
    return Number.isFinite(count)
      ? Math.max(0, Math.min(MAX_CREW_PER_ROLE, Math.trunc(count)))
      : 0;
  };

  const total = CREW_KEYS.reduce((sum, key) => sum + countFor(key), 0);
  const summary = CREW_KEYS
    .filter((key) => countFor(key) > 0)
    .map((key) => {
      const count = countFor(key);
      const { singular } = crewRoleInfo(key);
      return `${count} ${singular}${count === 1 ? "" : "s"}`;
    })
    .join(" · ");

  const updateCount = (key, number) => {
    if (disabled) return;
    const parsed = Number(number);
    const nextCount = Number.isFinite(parsed)
      ? Math.max(0, Math.min(MAX_CREW_PER_ROLE, Math.trunc(parsed)))
      : 0;
    onChange?.({ ...value, [key]: nextCount });
  };

  return (
    <section className="min-w-0 space-y-3" aria-label="Creatives needed">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Creatives needed
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          How many of each do you need for this event? Up to 10 per role.
        </p>
      </div>

      <div className="space-y-2.5">
        {CREW_KEYS.map((key) => {
          const count = countFor(key);
          const { label, singular, description } = crewRoleInfo(key);
          const inputId = `booking-crew-${key}`;

          return (
            <div
              key={key}
              className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition-colors sm:flex-nowrap dark:border-slate-600 dark:bg-slate-800/80"
            >
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={inputId}
                  className="block text-sm font-semibold text-slate-800 dark:text-slate-100"
                >
                  {label}
                </label>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  aria-label={`Remove one ${singular}`}
                  disabled={disabled || count <= 0}
                  onClick={() => updateCount(key, count - 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-semibold text-slate-600 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  −
                </button>
                <input
                  id={inputId}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_CREW_PER_ROLE}
                  step={1}
                  value={count}
                  disabled={disabled}
                  onChange={(event) => updateCount(key, event.target.value)}
                  aria-label={`Number of ${label.toLowerCase()}`}
                  className="h-9 w-14 rounded-lg border border-slate-300 bg-white text-center text-sm font-bold tabular-nums text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="button"
                  aria-label={`Add one ${singular}`}
                  disabled={disabled || count >= MAX_CREW_PER_ROLE}
                  onClick={() => updateCount(key, count + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-semibold text-slate-600 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
        {total} {total === 1 ? "creative" : "creatives"} in total
        {summary ? `: ${summary}` : ""}
      </p>
    </section>
  );
}

// ==========================================
// CONTACT VALIDATION
// ==========================================
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneDigits = (value) => String(value || "").replace(/\D/g, "");
// ==========================================
// PHILIPPINE REGIONS
// ==========================================
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
// ==========================================
// ADDRESS UTILITIES
// ==========================================
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
    const brgy = barangay && !/^(brgy|barangay)\b/i.test(barangay)
        ? `Brgy. ${barangay}`
        : barangay;
    return [
        a.venue,
        a.street,
        brgy,
        a.city,
        a.municipality,
        a.region,
    ]
        .map((part) => String(part || "").trim())
        .filter(Boolean)
        .join(", ");
};
// ==========================================
// BOOKING PANEL
// ==========================================
export default function BookingPanel({ photographerId, events = [], onChanged, initialDate, onBooked, }) {
    // ==========================================
    // STATES
    // ==========================================
    const [form, setForm] = useState({
        title: "",
        category: Object.keys(CATEGORY_LABELS)[0] || "",
        date: initialDate || today(),
        callTime: "",
        start: "09:00",
        end: "12:00",
        notes: "",
    });
    const [address, setAddress] = useState(emptyAddress);
    const [contact, setContact] = useState({
        email: "",
        phone: "",
    });
    const [crew, setCrew] = useState(defaultCrew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    // Store validation errors for individual inputs.
    const [repeatErrors, setRepeatErrors] = useState({});
    // ==========================================
    // UPDATE SELECTED DATE
    // ==========================================
    useEffect(() => {
        if (initialDate) {
            setForm((prev) => ({
                ...prev,
                date: initialDate,
            }));
        }
    }, [initialDate]);
    // ==========================================
    // AUTO-FILL CONTACT DETAILS
    // ==========================================
    useEffect(() => {
        let active = true;
        supabase.auth.getUser().then(({ data }) => {
            const user = data?.user;
            if (!active || !user)
                return;
            setContact((prev) => ({
                email: prev.email || user.email || "",
                phone: prev.phone ||
                    user.phone ||
                    user.user_metadata?.phone ||
                    "",
            }));
        });
        return () => {
            active = false;
        };
    }, []);
    // ==========================================
    // CONTACT INPUT HANDLER
    // ==========================================
    const setContactPart = (key) => (e) => {
        const raw = e.target.value;
        const value = key === "phone"
            ? raw.replace(/\D/g, "").slice(0, 11)
            : raw.replace(/\s/g, "");
        setContact((prev) => ({
            ...prev,
            [key]: value,
        }));
    };
    // ==========================================
    // BOOKING INPUT VALIDATION
    // ==========================================
    const set = (key) => (e) => {
        const value = e.target.value;
        // Reject three consecutive identical letters in title and notes.
        // The check is case-insensitive (e.g., aaa, AAA, aAa).
        const limitsTripleLetters = key === "title" || key === "notes";
        if (limitsTripleLetters && hasTripleRepeatedLetters(value)) {
            setRepeatErrors((prev) => ({
                ...prev,
                [key]: repeatedMessage(key === "notes" ? "Notes" : "Booking title"),
            }));
            // Keep the previously valid value until the user corrects the input.
            return;
        }
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
        if (limitsTripleLetters) {
            setRepeatErrors((prev) => ({
                ...prev,
                [key]: "",
            }));
        }
    };
    // ==========================================
    // LOCATION INPUT VALIDATION
    // ==========================================
    const setPart = (key) => (e) => {
        const value = e.target.value;
        const labels = {
            venue: "Venue",
            barangay: "Barangay",
            city: "City",
            municipality: "Municipality",
        };
        // Street is unrestricted.
        // Region is a dropdown.
        const shouldValidate = key !== "street" && key !== "region";
        if (shouldValidate &&
            hasTripleRepeatedLetters(value)) {
            setRepeatErrors((prev) => ({
                ...prev,
                [key]: repeatedMessage(labels[key] || "This field"),
            }));
            // Reject the third repeated letter.
            // Do not update the address state.
            return;
        }
        // Save only valid input.
        setAddress((prev) => ({
            ...prev,
            [key]: value,
        }));
        // Clear the error on valid input.
        if (shouldValidate) {
            setRepeatErrors((prev) => ({
                ...prev,
                [key]: "",
            }));
        }
    };
    // ==========================================
    // DYNAMIC INPUT STYLING
    // ==========================================
    const textClass = (key) => `${input} ${repeatErrors[key]
        ? "!border-rose-500 ring-1 ring-rose-500/40 focus:!border-rose-500"
        : ""}`;
    // ==========================================
    // BOOKING TIME CALCULATIONS
    // ==========================================
    const minimum = minimumBooking();
    const earliestStart = form.date === minimum.date
        ? minimum.time
        : undefined;
    const meetsAdvanceNotice = form.date &&
        form.start &&
        bookingTimestamp(form.date, form.start) >=
            bookingTimestamp(minimum.date, minimum.time);
    const validCallTime = form.callTime &&
        form.start &&
        form.callTime <= form.start;
    // ==========================================
    // REQUIRED FIELD VALIDATION
    // ==========================================
    const missing = [];
    if (!form.title.trim()) {
        missing.push("a title");
    }
    if (!form.date || !form.start || !form.end) {
        missing.push("the date and time");
    }
    else if (form.date < minimum.date ||
        form.date > lastBookableDate() ||
        !meetsAdvanceNotice ||
        form.end <= form.start) {
        missing.push("a valid date and time");
    }
    if (!form.callTime) {
        missing.push("the photographer's call time");
    }
    else if (!validCallTime) {
        missing.push("a call time before or at the event start time");
    }
    if (!address.venue.trim()) {
        missing.push("the venue");
    }
    if (!address.city.trim() &&
        !address.municipality.trim()) {
        missing.push("the city or municipality");
    }
    if (!address.region) {
        missing.push("the region");
    }
    if (!EMAIL_RULE.test(contact.email.trim())) {
        missing.push("a valid email");
    }
    if (phoneDigits(contact.phone).length !== 11) {
        missing.push("an 11-digit contact number");
    }
    if (crewProblem(crew)) {
        missing.push("at least one creative");
    }
    // ==========================================
    // CHECK SCHEDULE CONFLICTS
    // ==========================================
    const conflict = () => {
        const start = new Date(`${form.date}T${form.start}`);
        const end = new Date(`${form.date}T${form.end}`);
        return events.some((e) => dateKey(new Date(e.start)) === form.date &&
            e.start < end &&
            e.end > start);
    };
    // ==========================================
    // SUBMIT BOOKING REQUEST
    // ==========================================
    async function submit(e) {
        e.preventDefault();
        setError("");
        const title = form.title.trim();
        if (!title) {
            return setError("Please give your booking a title.");
        }
        const currentMinimum = minimumBooking();
        // Maximum booking date.
        if (form.date > lastBookableDate()) {
            return setError(`Bookings can only be made up to December 31, ${Number(manilaParts().year) + 1}.`);
        }
        // Two-hour advance booking requirement.
        if (!form.date ||
            !form.start ||
            bookingTimestamp(form.date, form.start) <
                bookingTimestamp(currentMinimum.date, currentMinimum.time)) {
            return setError("Bookings must be scheduled at least 2 hours in advance. Please choose a later date or time.");
        }
        // Validate call time.
        if (!form.callTime) {
            return setError("Please specify the photographer's call time.");
        }
        if (form.callTime > form.start) {
            return setError("The photographer's call time cannot be later than the event start time.");
        }
        // Validate event end.
        if (form.end <= form.start) {
            return setError("The end time must be later than the start time on the same day. For an event that runs past midnight, set the end to 11:59 pm and mention the rest in your notes.");
        }
        // Validate venue.
        if (!address.venue.trim()) {
            return setError("Please enter the venue.");
        }
        // Validate city or municipality.
        if (!address.city.trim() &&
            !address.municipality.trim()) {
            return setError("Please enter the city or municipality.");
        }
        // Validate region.
        if (!address.region) {
            return setError("Please choose the region.");
        }
        // Validate email.
        if (!EMAIL_RULE.test(contact.email.trim())) {
            return setError("Please enter a valid email address.");
        }
        // Validate phone.
        if (phoneDigits(contact.phone).length !== 11) {
            return setError("Please enter an 11-digit contact number (e.g. 09171234567).");
        }
        // Validate booking conflicts.
        if (conflict()) {
            return setError("That time is already booked. Please pick another slot.");
        }
        // Validate crew.
        const crewError = crewProblem(crew);
        if (crewError) {
            return setError(crewError);
        }
        setSaving(true);
        // ==========================================
        // CREATE BOOKING REQUEST
        // ==========================================
        const { error: err } = await supabase.rpc("request_booking", {
            p_photographer_id: photographerId,
            p_title: title,
            p_category: form.category,
            p_date: form.date,
            p_call_time: form.callTime,
            p_start: form.start,
            p_end: form.end,
            p_location: joinAddress(address),
            p_notes: form.notes.trim(),
        });
        if (err) {
            setSaving(false);
            return setError(err.message);
        }
        // ==========================================
        // SAVE CREW DETAILS
        // ==========================================
        const { error: crewErr } = await supabase.rpc("set_booking_crew", {
            p_photographer_id: photographerId,
            p_title: title,
            p_date: form.date,
            p_start: form.start,
            p_crew: cleanCrew(crew),
        });
        // ==========================================
        // SAVE CONTACT DETAILS
        // ==========================================
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
            window.alert("Your booking request was sent, but your email and number could not be saved on it. Please mention them in your message to the photographer.");
        }
        if (crewErr) {
            console.error("Could not save the creatives needed:", crewErr.message);
            window.alert("Your booking request was sent, but the number of creatives you asked for could not be saved. Please mention it in your message to the photographer.");
        }
        // ==========================================
        // RESET FORM
        // ==========================================
        setForm((prev) => ({
            ...prev,
            title: "",
            callTime: "",
            notes: "",
        }));
        setAddress(emptyAddress());
        setCrew(defaultCrew());
        // Clear repeated-letter errors.
        setRepeatErrors({});
        onChanged?.();
        onBooked?.();
    }
    // ==========================================
    // BOOKING PANEL INTERFACE
    // ==========================================
    return (<form onSubmit={submit} className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-white p-3 text-slate-900 shadow-sm transition-colors duration-300 sm:p-4 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100 dark:shadow-none">

      {/* ======================================
  
            HEADER
  
           ====================================== */}

      <p className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-300">

        <FaCalendarPlus className="text-sky-600 dark:text-sky-400"/>

        Send a booking request

      </p>

      <p className="text-xs text-slate-500">

        Your photographer will review it and send back a

        quote. You confirm it in "My Bookings".

      </p>

      {/* ======================================
  
            BOOKING TITLE
  
           ====================================== */}

      <div>

        <input className={textClass("title")} placeholder="What is the shoot for? (e.g. Wedding of Ana & Ben)" aria-label="Booking title" aria-invalid={Boolean(repeatErrors.title)} value={form.title} onChange={set("title")} maxLength={120}/>

        <RepeatError message={repeatErrors.title}/>

      </div>

      {/* ======================================
  
            CATEGORY AND DATE
  
           ====================================== */}

      <div className="grid gap-3 sm:grid-cols-2">

        <select className={input} value={form.category} onChange={set("category")}>

          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (<option key={value} value={value}>

                {label}

              </option>))}

        </select>

        <input className={input} type="date" min={minimum.date} max={lastBookableDate()} value={form.date} onChange={set("date")}/>

      </div>

      {/* ======================================
  
            SCHEDULE DETAILS
  
           ====================================== */}

      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 dark:border-slate-700 dark:bg-slate-900/70">

        <div>

          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">

            Schedule Details

          </h3>

          <p className="mt-0.5 text-xs text-slate-500">

            Set the photographer's arrival and event duration.

          </p>

        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

          {/* CALL TIME */}

          <div className="min-w-0">

            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">

              Call Time

            </label>

            <input className={input} type="time" value={form.callTime} onChange={set("callTime")} aria-label="Photographer call time" required/>

            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">

              Photographer arrival

            </p>

          </div>

          {/* EVENT START */}

          <div className="min-w-0">

            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">

              Event Start

            </label>

            <input className={input} type="time" min={earliestStart} value={form.start} onChange={set("start")} aria-label="Event start time"/>

            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">

              Actual event begins

            </p>

          </div>

          {/* EVENT END */}

          <div className="min-w-0">

            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">

              Event End

            </label>

            <input className={input} type="time" value={form.end} onChange={set("end")} aria-label="Event end time"/>

            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">

              Scheduled finish

            </p>

          </div>

        </div>

      </div>

      {/* ======================================
  
            ADVANCE BOOKING NOTICE
  
           ====================================== */}

      {form.date === minimum.date && (<p className="text-xs text-slate-500">

          For today, your booking must start at least 2

          hours from the current time. Earliest available

          start: {minimum.time}.

        </p>)}

      {/* ======================================
  
            LOCATION
  
           ====================================== */}

      <div className="space-y-3">

        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">

          Location

        </p>

        {/* VENUE */}

        <div>

          <input className={textClass("venue")} placeholder="Venue" aria-label="Venue" aria-invalid={Boolean(repeatErrors.venue)} value={address.venue} onChange={setPart("venue")} maxLength={80}/>

          <RepeatError message={repeatErrors.venue}/>

        </div>

        {/* STREET - NO REPEATED LETTER RESTRICTION */}

        <div>

          <input className={input} placeholder="Street" aria-label="Street" value={address.street} onChange={setPart("street")} maxLength={60}/>

        </div>

        {/* BARANGAY, CITY, MUNICIPALITY, REGION */}

        <div className="grid gap-3 sm:grid-cols-2">

          {/* BARANGAY */}

          <div className="min-w-0">

            <input className={textClass("barangay")} placeholder="Barangay" aria-label="Barangay" aria-invalid={Boolean(repeatErrors.barangay)} value={address.barangay} onChange={setPart("barangay")} maxLength={40}/>

            <RepeatError message={repeatErrors.barangay}/>

          </div>

          {/* CITY */}

          <div className="min-w-0">

            <input className={textClass("city")} placeholder="City" aria-label="City" aria-invalid={Boolean(repeatErrors.city)} value={address.city} onChange={setPart("city")} maxLength={40}/>

            <RepeatError message={repeatErrors.city}/>

          </div>

          {/* MUNICIPALITY */}

          <div className="min-w-0">

            <input className={textClass("municipality")} placeholder="Municipality" aria-label="Municipality" aria-invalid={Boolean(repeatErrors.municipality)} value={address.municipality} onChange={setPart("municipality")} maxLength={40}/>

            <RepeatError message={repeatErrors.municipality}/>

          </div>

          {/* REGION */}

          <div className="min-w-0">

            <select className={`${input} ${address.region
            ? ""
            : "text-slate-500"}`} aria-label="Region" value={address.region} onChange={setPart("region")}>

              <option value="" disabled>

                Select region

              </option>

              {PH_REGIONS.map((region) => (<option key={region} value={region} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">

                  {region}

                </option>))}

            </select>

          </div>

        </div>

        <p className="text-xs text-slate-500">

          Fill in the city or the municipality, whichever

          applies to the venue.

        </p>

      </div>

      {/* ======================================
  
            CONTACT DETAILS
  
           ====================================== */}

      <div className="space-y-3">

        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">

          Contact

        </p>

        <div className="grid gap-3 sm:grid-cols-2">

          {/* EMAIL */}

          <input className={input} type="email" inputMode="email" autoComplete="email" placeholder="Email address" aria-label="Email address" value={contact.email} onChange={setContactPart("email")} maxLength={120}/>

          {/* PHONE */}

          <input className={input} type="tel" inputMode="tel" autoComplete="tel" placeholder="Contact number (e.g. 09171234567)" aria-label="Contact number" value={contact.phone} onChange={setContactPart("phone")} maxLength={11}/>

        </div>

        <p className="text-xs text-slate-500">

          Your email is filled in from your account. Your

          photographer uses these to reach you about this

          booking.

        </p>

      </div>

      {/* ======================================
  
            CREATIVES NEEDED
  
           ====================================== */}

      <InlineCrewNeededField value={crew} onChange={setCrew} disabled={saving} />

      {/* ======================================
  
            NOTES
  
           ====================================== */}

      <div>

        <textarea
          className={textClass("notes")}
          rows={2}
          placeholder="Notes for your photographer (optional)"
          aria-label="Notes for your photographer"
          aria-invalid={Boolean(repeatErrors.notes)}
          value={form.notes}
          onChange={set("notes")}
          maxLength={200}
        />
        <RepeatError message={repeatErrors.notes} />

      </div>

      {/* NOTES CHARACTER COUNTER */}

      <div className="mt-1 flex justify-end">

        <span className={`text-xs ${form.notes.length >= 200
            ? "text-rose-400"
            : "text-slate-500"}`}>

          {form.notes.length}/200 characters

        </span>

      </div>

      {/* ======================================
  
            SUBMISSION ERRORS
  
           ====================================== */}

      {error && (<p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-red-400">

          {error}

        </p>)}

      {/* ======================================
  
            MISSING REQUIREMENTS
  
           ====================================== */}

      {missing.length > 0 && (<p className="text-xs text-slate-500" aria-live="polite">

          Still needed: {missing.join(", ")}.

        </p>)}

      {/* ======================================
  
            SUBMIT BUTTON
  
           ====================================== */}

      <div className="flex justify-end">

        <button type="submit" disabled={saving || missing.length > 0} className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-500 dark:text-slate-900 dark:hover:bg-sky-400">

          {saving ? "Sending..." : "Send request"}

        </button>

      </div>

    </form>);
}
