import { useEffect, useState } from "react";
import { FaMinus, FaPlus } from "react-icons/fa";

/*
  "Creatives needed" field for the client's booking request form.

  The value is a plain object of counts, e.g.
    { photographers: 2, videographers: 1, drone_operators: 0, assistants: 0 }
  Saved on the booking request as `crew_needed` (see crew_needed.sql).

  To offer another role later (e.g. makeup artists), add one entry to CREW_ROLES.
*/

export const CREW_ROLES = [
  { key: "photographers", label: "Photographers", single: "Photographer", hint: "Still photo coverage" },
  { key: "videographers", label: "Videographers", single: "Videographer", hint: "Video coverage" },
  { key: "drone_operators", label: "Drone operators", single: "Drone operator", hint: "Aerial shots" },
  { key: "assistants", label: "Assistants", single: "Assistant", hint: "Lighting, gear and support" },
];

export const MAX_PER_ROLE = 10;

const clamp = (n) => Math.min(Math.max(Math.floor(Number(n) || 0), 0), MAX_PER_ROLE);

export const emptyCrew = () => Object.fromEntries(CREW_ROLES.map((r) => [r.key, 0]));

export const crewTotal = (crew) =>
  CREW_ROLES.reduce((sum, r) => sum + clamp(crew?.[r.key]), 0);

// What gets saved: only the roles that have at least one person.
export const cleanCrew = (crew) =>
  Object.fromEntries(
    CREW_ROLES.map((r) => [r.key, clamp(crew?.[r.key])]).filter(([, n]) => n > 0)
  );

// "2 photographers · 1 videographer"
export const crewSummary = (crew) =>
  CREW_ROLES.map((r) => {
    const n = clamp(crew?.[r.key]);
    return n > 0 ? `${n} ${(n === 1 ? r.single : r.label).toLowerCase()}` : null;
  })
    .filter(Boolean)
    .join(" · ");

// Use when submitting the form. Returns a message, or null if it's fine.
export const crewProblem = (crew) =>
  crewTotal(crew) === 0
    ? "Choose at least one photographer, videographer or other creative."
    : null;

// The number box. While the client is typing it keeps its own text, so the box
// can be emptied and retyped. The real number (0 when empty) is still sent up
// on every keystroke, and the box is tidied when the client leaves it.
function CountInput({ value, onChange, label }) {
  const [text, setText] = useState(String(value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setText(String(value));
  }, [value, editing]);

  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 2);

    if (digits === "") {
      setText("");
      onChange(0);
      return;
    }

    const n = clamp(parseInt(digits, 10));
    setText(String(n));
    onChange(n);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      value={text}
      placeholder="0"
      onFocus={(e) => {
        setEditing(true);
        e.target.select();
      }}
      onBlur={() => {
        setEditing(false);
        setText(String(value));
      }}
      onChange={handleChange}
      aria-label={label}
      className="h-8 w-12 rounded-lg border border-slate-600 bg-slate-900 text-center text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
    />
  );
}

export default function CrewNeededField({ value, onChange, disabled = false }) {
  const crew = { ...emptyCrew(), ...value };
  const total = crewTotal(crew);

  const set = (key, n) => onChange({ ...crew, [key]: clamp(n) });

  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="mb-1 text-sm font-medium text-slate-200">Creatives needed</legend>
      <p className="mb-3 text-xs text-slate-400">
        How many of each do you need for this event? Up to {MAX_PER_ROLE} per role.
      </p>

      <div className="space-y-2">
        {CREW_ROLES.map((role) => {
          const n = clamp(crew[role.key]);
          return (
            <div
              key={role.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{role.label}</p>
                <p className="text-xs text-slate-400">{role.hint}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => set(role.key, n - 1)}
                  disabled={n <= 0}
                  aria-label={`Fewer ${role.label.toLowerCase()}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 text-slate-200 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FaMinus className="text-[10px]" />
                </button>

                <CountInput
                  value={n}
                  onChange={(next) => set(role.key, next)}
                  label={`Number of ${role.label.toLowerCase()}`}
                />

                <button
                  type="button"
                  onClick={() => set(role.key, n + 1)}
                  disabled={n >= MAX_PER_ROLE}
                  aria-label={`More ${role.label.toLowerCase()}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 text-slate-200 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FaPlus className="text-[10px]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-slate-400" aria-live="polite">
        {total === 0
          ? "No creatives selected yet."
          : `${total} ${total === 1 ? "creative" : "creatives"} in total: ${crewSummary(crew)}`}
      </p>
    </fieldset>
  );
}