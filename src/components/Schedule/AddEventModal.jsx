import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  CATEGORY_HEX,
} from "./eventCategory";
import { supabase } from "../../lib/supabaseClient";

const GEAR_OPTIONS = [
  { value: "camera-photo", label: "Camera (Photo)" },
  { value: "camera-video", label: "Camera (Video)" },
  { value: "drone", label: "Drone" },
  { value: "gimbal", label: "Gimbal / Stabilizer" },
  { value: "lighting", label: "Lighting Kit" },
  { value: "lens-kit", label: "Lens Kit" },
  { value: "audio", label: "Audio / Mic" },
  { value: "backup-body", label: "Backup Body" },
];

const peso = (n) => `₱${Math.round(Number(n) || 0).toLocaleString("en-PH")}`;

const todayString = () => new Date().toLocaleDateString("en-CA");

// "2026-10-25" -> ISO timestamp at local noon (avoids timezone day-shifts)
const dateToIso = (dateStr) => new Date(`${dateStr}T12:00:00`).toISOString();

// ---------- production team ----------
// The team is saved into the existing `photographer` field as readable text:
//   "Juan Dela Cruz (Lead Photographer) · Maria Santos (Videographer) · Pedro"
// so the calendar and event cards keep working without any database change.
const MEMBER_SEPARATOR = " · ";

const POSITION_SUGGESTIONS = [
  "Lead Photographer",
  "Second Shooter",
  "Videographer",
  "Drone Operator",
  "Assistant",
  "Photo Editor",
  "Video Editor",
  "Makeup Artist",
];

const emptyMember = () => ({ name: "", position: "" });

// ---------- client name ----------
// The client is still saved as one full name ("First Last") so existing
// clients, events and the calendar keep working.
const fullName = (first, last) =>
  [first, last].map((p) => String(p || "").trim()).filter(Boolean).join(" ");

// "Juan Dela Cruz" -> first "Juan Dela", last "Cruz" (split at the last space)
const splitName = (text) => {
  const t = String(text || "").trim();
  const i = t.lastIndexOf(" ");
  return i === -1
    ? { first: t, last: "" }
    : { first: t.slice(0, i).trim(), last: t.slice(i + 1).trim() };
};

// ---------- input limits ----------
// Each rule lists which characters are allowed, the maximum length, and how
// many times the same character may repeat in a row ("zzzz..." is cut to the
// limit as you type). Commas are not allowed in location parts because the
// location is saved as one comma-separated line.
const MAX_MONEY_DIGITS = 7; // up to ₱9,999,999.99

const RULES = {
  title: { allowed: /[^\p{L}\p{M}\p{N}\s&'’.,:!#()\/+-]/gu, max: 80, repeat: 3 },
  // Client first and last names: letters, spaces (e.g. "Mary Ann", "Dela Cruz"),
  // and . ' - only.
  clientFirst: { allowed: /[^\p{L}\p{M}\s.'’-]/gu, max: 30, repeat: 2 },
  clientLast: { allowed: /[^\p{L}\p{M}\s.'’-]/gu, max: 30, repeat: 2 },
  // Gmail address: lowercase letters, digits, dots and one "@" (30-character
  // account name + "@gmail.com" fits in 40).
  clientEmail: { allowed: /[^a-z0-9.@]/g, max: 40, repeat: 3 },
  name: { allowed: /[^\p{L}\p{M}\s.'’-]/gu, max: 50, repeat: 2 },
  position: { allowed: /[^\p{L}\p{M}\s\/&.-]/gu, max: 30, repeat: 2 },
  venue: { allowed: /[^\p{L}\p{M}\p{N}\s&'’.#\/()-]/gu, max: 60, repeat: 3 },
  street: { allowed: /[^\p{L}\p{M}\p{N}\s'’.#\/-]/gu, max: 80, repeat: 3 },
  barangay: { allowed: /[^\p{L}\p{M}\p{N}\s'’.-]/gu, max: 50, repeat: 3 },
  city: { allowed: /[^\p{L}\p{M}\s'’.-]/gu, max: 50, repeat: 2 },
  province: { allowed: /[^\p{L}\p{M}\s'’.-]/gu, max: 50, repeat: 2 },
};

const NOTES_MAX = 500;

const sanitize = (value, { allowed, max, repeat }) => {
  let v = String(value).replace(allowed, "");
  v = v.replace(/^\s+/, "").replace(/\s{2,}/g, " ");
  // Punctuation can't repeat at all ("..", "--").
  v = v.replace(/([^\p{L}\p{N}\s])\1+/gu, "$1");
  // Letters and digits can repeat up to `repeat` times in a row.
  v = v.replace(
    new RegExp(`([\\p{L}\\p{N}])\\1{${repeat},}`, "giu"),
    (_, c) => c.repeat(repeat)
  );
  return v.slice(0, max);
};

// Money: digits with up to 2 decimals, at most 7 whole digits. Anything else
// is ignored, so the field simply won't accept it.
const MONEY_PATTERN = new RegExp(`^\\d{0,${MAX_MONEY_DIGITS}}(\\.\\d{0,2})?$`);
const isMoneyOk = (value) => value === "" || MONEY_PATTERN.test(value);
const blockNumberKeys = (e) => {
  if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
};

// Checks used when saving. Returns an error message, or null if it looks fine.
const textProblem = (label, text, { maxWord = 25, minLetters = 2 } = {}) => {
  const t = String(text || "").trim();
  if (!t) return null;
  if ((t.match(/\p{L}/gu) || []).length < minLetters) {
    return `${label} looks incomplete.`;
  }
  if (t.split(/\s+/).some((w) => w.length > maxWord) || /(.{2,4})\1{2,}/i.test(t)) {
    return `${label} doesn't look right. Please enter a real value.`;
  }
  return null;
};

// Google (Gmail) address check used when saving.
const gmailProblem = (email) => {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return "Enter the client's Google email (name@gmail.com).";

  const match = e.match(/^([a-z0-9.]+)@(gmail|googlemail)\.com$/);
  if (!match) return "Use a Google email that ends in @gmail.com.";

  const local = match[1];
  if (
    local.length < 6 ||
    local.length > 30 ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..")
  ) {
    return "That Google email doesn't look right. Gmail names use 6–30 letters, numbers or dots.";
  }

  // Reject placeholder, keyboard-mash and random-looking names, since the
  // booking confirmation is sent to this address.
  const letters = local.replace(/[^a-z]/g, "");
  const digits = local.replace(/[^0-9]/g, "");
  const looksFake =
    /^(test|testing|fake|temp|tempmail|dummy|sample|example|noemail|none|null|admin|user|email|mail|abc|xyz|asd|qwe|name|client)\d*$/.test(local.replace(/\./g, "")) ||
    /(qwert|asdf|zxcv|qazwsx|abcde|12345|09876|password|fakeemail|noemail|nomail|sample|minutemail|mailinator|yopmail|guerrilla|tempmail|throwaway|trashmail|burner)/.test(local) ||
    /(.{2,4})\1{2,}/.test(local) ||
    letters.length < 3 ||
    digits.length / local.replace(/\./g, "").length > 0.6 ||
    local
      .split(".")
      .some((part) => /[a-z]{5,}/.test(part) && !/[aeiou]/.test(part.replace(/[^a-z]/g, "")));

  if (looksFake) {
    return "Please use the client's real, personal Gmail address. We'll send the booking confirmation there.";
  }

  return null;
};

// ---------- location ----------
// Saved into the existing `location` field as one readable line:
//   "Hacienda Isabella, Km 5 Aguinaldo Hwy, Brgy. Poblacion, Pila, Laguna, Calabarzon"
const REGIONS = [
  { value: "NCR", label: "NCR – National Capital Region" },
  { value: "CAR", label: "CAR – Cordillera Administrative Region" },
  { value: "Ilocos Region", label: "Region I – Ilocos Region" },
  { value: "Cagayan Valley", label: "Region II – Cagayan Valley" },
  { value: "Central Luzon", label: "Region III – Central Luzon" },
  { value: "Calabarzon", label: "Region IV-A – Calabarzon" },
  { value: "MIMAROPA", label: "Region IV-B – MIMAROPA" },
  { value: "Bicol Region", label: "Region V – Bicol Region" },
  { value: "Western Visayas", label: "Region VI – Western Visayas" },
  { value: "Central Visayas", label: "Region VII – Central Visayas" },
  { value: "Eastern Visayas", label: "Region VIII – Eastern Visayas" },
  { value: "Zamboanga Peninsula", label: "Region IX – Zamboanga Peninsula" },
  { value: "Northern Mindanao", label: "Region X – Northern Mindanao" },
  { value: "Davao Region", label: "Region XI – Davao Region" },
  { value: "Soccsksargen", label: "Region XII – Soccsksargen" },
  { value: "Caraga", label: "Region XIII – Caraga" },
  { value: "BARMM", label: "BARMM – Bangsamoro" },
];

const LOCATION_SEPARATOR = ", ";
const emptyLocation = () => ({
  venue: "",
  street: "",
  barangay: "",
  city: "",
  province: "",
  region: "",
});

const locationToText = (loc) =>
  [loc.venue, loc.street, loc.barangay, loc.city, loc.province, loc.region]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(LOCATION_SEPARATOR);

// Best-effort reverse of locationToText. Older events were saved as one free
// text line, so anything we can't place goes into "Street / address" and
// nothing is lost.
const parseLocation = (text) => {
  const loc = emptyLocation();
  const parts = String(text || "")
    .split(LOCATION_SEPARATOR)
    .map((p) => p.trim())
    .filter(Boolean);

  if (!parts.length) return loc;

  const last = parts[parts.length - 1].toLowerCase();
  const region = REGIONS.find((r) => r.value.toLowerCase() === last);
  if (region) {
    loc.region = region.value;
    parts.pop();
  }

  // Only trust the city/province split when the line has the shape this form
  // saves: [venue, street, barangay,] city, province.
  if (region && parts.length >= 2) {
    loc.province = parts.pop();
    loc.city = parts.pop();
  }

  if (parts.length === 3) {
    [loc.venue, loc.street, loc.barangay] = parts;
  } else if (parts.length) {
    loc.street = parts.join(LOCATION_SEPARATOR);
  }

  return loc;
};

// "Juan (Lead Photographer) · Maria (Videographer)" -> [{ name, position }, ...]
const parseTeam = (text) => {
  const members = String(text || "")
    .split(MEMBER_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.*?)\s*\(([^()]*)\)$/);
      return match
        ? { name: match[1].trim(), position: match[2].trim() }
        : { name: part, position: "" };
    });

  return members.length ? members : [emptyMember()];
};

const teamToText = (members) =>
  members
    .filter((m) => m.name.trim())
    .map((m) =>
      m.position.trim()
        ? `${m.name.trim()} (${m.position.trim()})`
        : m.name.trim()
    )
    .join(MEMBER_SEPARATOR);

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-900 placeholder-slate-500 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500";

// Position field: type anything, or pick a suggestion from a dropdown styled
// like the client dropdown (replaces the browser's native <datalist> popup).
function PositionCombobox({ value, onChange, ariaLabel, isDarkMode }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Show every suggestion when empty or already an exact match; otherwise
  // narrow the list down as the person types.
  const query = value.trim().toLowerCase();
  const isExact = POSITION_SUGGESTIONS.some((p) => p.toLowerCase() === query);
  const options =
    !query || isExact
      ? POSITION_SUGGESTIONS
      : POSITION_SUGGESTIONS.filter((p) => p.toLowerCase().includes(query));

  const choose = (position) => {
    onChange(position);
    setOpen(false);
    setHighlight(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (options.length ? (h + 1) % options.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) =>
        options.length ? (h <= 0 ? options.length - 1 : h - 1) : -1
      );
    } else if (e.key === "Enter" && open && highlight >= 0 && options[highlight]) {
      e.preventDefault();
      choose(options[highlight]);
    } else if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  const surface = isDarkMode ? "#1e293b" : "#ffffff";
  const border = isDarkMode ? "#334155" : "#e2e8f0";
  const text = isDarkMode ? "#ffffff" : "#1e293b";
  const hover = isDarkMode ? "#334155" : "#f1f5f9";

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        placeholder="Position (e.g. Photographer)"
        maxLength={RULES.position.max}
        autoComplete="off"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onKeyDown={handleKeyDown}
        className={`${inputClass} pr-10`}
      />

      <button
        type="button"
        tabIndex={-1}
        aria-label="Show position suggestions"
        onClick={() => setOpen((prev) => !prev)}
        className="absolute right-0 top-0 flex h-full w-10 items-center justify-center !border-none !bg-transparent text-slate-500 hover:!bg-transparent focus:!bg-transparent dark:text-slate-300"
      >
        {open ? "▲" : "▼"}
      </button>

      {open && options.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border py-1 shadow-xl"
          style={{ backgroundColor: surface, borderColor: border }}
        >
          {options.map((position, i) => (
            <li key={position} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => choose(position)}
                onMouseEnter={() => setHighlight(i)}
                className="block w-full border-0 px-4 py-2 text-left text-sm"
                style={{
                  color: text,
                  backgroundColor: i === highlight ? hover : "transparent",
                }}
              >
                {position}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddEventModal({
  open,
  onClose,
  onSave,
  selectedDate,
  editingEvent,
  clients = [],
}) {
  const emptyForm = {
    title: "",
    clientFirst: "",
    clientLast: "",
    clientEmail: "",
    clientId: null,
    category: CATEGORY_KEYS[0],
    team: [emptyMember()],
    location: emptyLocation(),
    gears: [],
    date: "",
    start: "",
    end: "",
    notes: "",
    projectId: "",
    talentFee: "",
    // New events only: how much the client must pay to secure the date.
    // Nothing is recorded as RECEIVED here; that happens later, when the
    // photographer confirms it from Booking Requests.
    downpaymentDue: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [projects, setProjects] = useState([]);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const clientBoxRef = useRef(null);
  const [formError, setFormError] = useState("");

  // Close the client dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!clientDropdownOpen) return;

    const onPointerDown = (e) => {
      if (clientBoxRef.current && !clientBoxRef.current.contains(e.target)) {
        setClientDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [clientDropdownOpen]);

  // Payments (edit mode only: the event already exists)
  const [payments, setPayments] = useState([]);
  const [paymentsError, setPaymentsError] = useState("");
  const [newPayment, setNewPayment] = useState({
    amount: "",
    type: "balance",
    date: todayString(),
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // The modal is rendered through a portal, so it may sit outside the
  // element that receives the application's `.dark` class. Detect the
  // active theme at document level and keep it in sync with theme changes.
  const getIsDarkMode = () => {
    const root = document.documentElement;
    const body = document.body;
    const appRoot = document.getElementById("root");

    return (
      root.classList.contains("dark") ||
      body.classList.contains("dark") ||
      appRoot?.classList.contains("dark") ||
      Boolean(appRoot?.querySelector(".dark"))
    );
  };

  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof document !== "undefined" ? getIsDarkMode() : false
  );

  useEffect(() => {
    if (typeof document === "undefined") return;

    const syncTheme = () => setIsDarkMode(getIsDarkMode());
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    const targets = [
      document.documentElement,
      document.body,
      document.getElementById("root"),
    ].filter(Boolean);

    targets.forEach((target) =>
      observer.observe(target, {
        attributes: true,
        attributeFilter: ["class"],
        subtree: true,
      })
    );

    return () => observer.disconnect();
  }, []);

  // Animate the modal in after it mounts. Keep it mounted while closing.
  useEffect(() => {
    if (!open) {
      setIsVisible(false);
      return;
    }

    setIsVisible(false);
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const typedClientName = fullName(form.clientFirst, form.clientLast);

  const filteredClients = clients.filter((client) =>
    String(client.name || "")
      .toLowerCase()
      .includes(typedClientName.toLowerCase())
  );

  // =========================================================
  // LOAD LINKABLE PROJECTS WHEN MODAL OPENS
  // =========================================================

  useEffect(() => {
    if (!open) return;

    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, project_code, client")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load projects for linking:", error.message);
        return;
      }

      setProjects(data || []);
    };

    fetchProjects();
  }, [open]);

  // =========================================================
  // LOAD PAYMENTS WHEN EDITING
  // =========================================================

  const loadPayments = useCallback(async (eventId) => {
    const { data, error } = await supabase
      .from("event_payments")
      .select("id, amount, type, paid_at")
      .eq("event_id", eventId)
      .order("paid_at", { ascending: true });

    if (error) {
      console.error("Failed to load payments:", error.message);
      setPaymentsError(error.message);
      return;
    }

    setPaymentsError("");
    const list = data || [];
    setPayments(list);

    // Suggest the next payment type: balance once a downpayment exists.
    setNewPayment((prev) => ({
      ...prev,
      type: list.some((p) => p.type === "downpayment") ? "balance" : "downpayment",
    }));
  }, []);

  useEffect(() => {
    if (!open) return;

    if (editingEvent?.id) {
      loadPayments(editingEvent.id);
    } else {
      setPayments([]);
      setPaymentsError("");
      setNewPayment({ amount: "", type: "downpayment", date: todayString() });
    }
  }, [open, editingEvent, loadPayments]);

  // =========================================================
  // LOAD EVENT WHEN EDITING
  // =========================================================

  useEffect(() => {
    setFormError("");

    if (editingEvent) {
      const startDate = editingEvent.start
        ? new Date(editingEvent.start)
        : null;

      const endDate = editingEvent.end
        ? new Date(editingEvent.end)
        : null;

      setForm({
        id: editingEvent.id,
        title: editingEvent.title || "",
        clientFirst: splitName(editingEvent.client).first,
        clientLast: splitName(editingEvent.client).last,
        // Keep the event linked to its existing client, otherwise saving an
        // edit would create a duplicate client.
        clientId: editingEvent.clientId || null,
        clientEmail:
          editingEvent.clientEmail ||
          editingEvent.client_email ||
          clients.find((c) => c.id === editingEvent.clientId)?.email ||
          "",
        category:
          editingEvent.category ||
          editingEvent.type ||
          CATEGORY_KEYS[0],
        team: parseTeam(editingEvent.photographer),
        location: parseLocation(editingEvent.location),
        gears: Array.isArray(editingEvent.gears)
          ? editingEvent.gears
          : [],
        date:
          editingEvent.date ||
          (startDate
            ? startDate.toISOString().split("T")[0]
            : ""),
        start: startDate
          ? startDate.toTimeString().slice(0, 5)
          : "",
        end: endDate
          ? endDate.toTimeString().slice(0, 5)
          : "",
        notes: editingEvent.notes || "",
        projectId: editingEvent.project_id || "",
        talentFee:
          editingEvent.talentFee ??
          editingEvent.talent_fee ??
          "",
        downpaymentDue: "",
      });

      return;
    }

    setForm({
      ...emptyForm,
      date: selectedDate || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingEvent, selectedDate]);

  if (!open) {
    return null;
  }

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleOverlayTransitionEnd = (e) => {
    if (
      e.target === e.currentTarget &&
      e.propertyName === "opacity" &&
      !isVisible
    ) {
      onClose();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const rule = RULES[name];

    setForm((prev) => ({
      ...prev,
      [name]: rule ? sanitize(value, rule) : value,
    }));
  };

  // First/last name boxes. If the typed full name matches an existing client,
  // link it (and fill the talent fee if it's still empty).
  const handleClientNameChange = (e) => {
    const { name, value } = e.target;
    const clean = sanitize(value, RULES[name]);

    setForm((prev) => {
      const next = { ...prev, [name]: clean };
      const typed = fullName(next.clientFirst, next.clientLast).toLowerCase();
      const matchedClient = clients.find(
        (client) => String(client.name || "").trim().toLowerCase() === typed
      );

      return {
        ...next,
        clientId: matchedClient?.id || null,
        talentFee:
          matchedClient && prev.talentFee === ""
            ? matchedClient.talentFee ?? ""
            : prev.talentFee,
        clientEmail:
          matchedClient && !prev.clientEmail
            ? matchedClient.email || ""
            : prev.clientEmail,
      };
    });

    // Suggestions only appear once something is typed.
    const other = name === "clientFirst" ? form.clientLast : form.clientFirst;
    setClientDropdownOpen(Boolean(clean.trim() || other.trim()));
  };

  const chooseClient = (client) => {
    const { first, last } = splitName(client.name);

    setForm((prev) => ({
      ...prev,
      clientFirst: first,
      clientLast: last,
      clientId: client.id,
      talentFee:
        prev.talentFee === "" ? client.talentFee ?? "" : prev.talentFee,
      clientEmail: prev.clientEmail || client.email || "",
    }));

    setClientDropdownOpen(false);
  };

  // Lowercase, no spaces, and only one "@".
  const handleEmailChange = (e) => {
    let clean = sanitize(e.target.value.toLowerCase(), RULES.clientEmail);
    const at = clean.indexOf("@");
    if (at !== -1) {
      clean = clean.slice(0, at + 1) + clean.slice(at + 1).replace(/@/g, "");
    }

    setForm((prev) => ({ ...prev, clientEmail: clean }));
  };

  // Money fields ignore anything that isn't a valid amount.
  const handleMoneyChange = (e) => {
    const { name, value } = e.target;
    if (!isMoneyOk(value)) return;

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    const rule = RULES[name];

    setForm((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        [name]: rule ? sanitize(value, rule) : value,
      },
    }));
  };

  const toggleGear = (value) => {
    setForm((prev) => {
      const isSelected = prev.gears.includes(value);

      return {
        ...prev,
        gears: isSelected
          ? prev.gears.filter((g) => g !== value)
          : [...prev.gears, value],
      };
    });
  };

  // ---------- production team ----------
  // Names and positions only accept letters and a few symbols. Parentheses and
  // "·" are never allowed because they separate members when the team is saved
  // as text.
  const updateMember = (index, field, value) => {
    const clean = sanitize(value, field === "name" ? RULES.name : RULES.position);

    setForm((prev) => ({
      ...prev,
      team: prev.team.map((member, i) =>
        i === index ? { ...member, [field]: clean } : member
      ),
    }));
  };

  const addMember = () =>
    setForm((prev) => ({ ...prev, team: [...prev.team, emptyMember()] }));

  const removeMember = (index) =>
    setForm((prev) => {
      const next = prev.team.filter((_, i) => i !== index);
      return { ...prev, team: next.length ? next : [emptyMember()] };
    });

  // ---------- money ----------
  const fee = parseFloat(form.talentFee) || 0;
  // New events: this is only the amount DUE. It is recorded as received later,
  // from Booking Requests, when the photographer confirms the payment.
  const downpaymentDue = parseFloat(form.downpaymentDue) || 0;
  // Existing events: what has actually been received so far.
  const collected = editingEvent
    ? payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : 0;
  const balanceDue = Math.max(fee - collected, 0);

  // ---------- record a payment on an existing event ----------
  const addPayment = async () => {
    const amount = parseFloat(newPayment.amount);

    if (!editingEvent?.id) return;

    if (!amount || amount <= 0) {
      setPaymentsError("Enter an amount greater than 0.");
      return;
    }

    if (collected + amount > fee) {
      setPaymentsError(
        `That would be more than the talent fee. Only ${peso(balanceDue)} is still due.`
      );
      return;
    }

    setSavingPayment(true);
    setPaymentsError("");

    const { error } = await supabase.from("event_payments").insert({
      event_id: editingEvent.id,
      amount,
      type: newPayment.type,
      paid_at: dateToIso(newPayment.date || todayString()),
    });

    setSavingPayment(false);

    if (error) {
      console.error("Failed to save payment:", error.message);
      setPaymentsError(error.message);
      return;
    }

    setNewPayment((prev) => ({ ...prev, amount: "" }));
    loadPayments(editingEvent.id);
  };

  const removePayment = async (payment) => {
    if (!window.confirm(`Remove this ${peso(payment.amount)} payment?`)) return;

    const { error } = await supabase
      .from("event_payments")
      .delete()
      .eq("id", payment.id);

    if (error) {
      console.error("Failed to remove payment:", error.message);
      setPaymentsError(error.message);
      return;
    }

    loadPayments(editingEvent.id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // New events become a booking request that waits for its downpayment,
    // so the fee and the downpayment due are both needed.
    if (!editingEvent) {
      if (fee <= 0) {
        setFormError("Enter the talent fee. It's needed to create the booking request.");
        return;
      }

      if (form.downpaymentDue === "") {
        setFormError("Enter the downpayment due to secure the date (use 0 if none).");
        return;
      }

      if (downpaymentDue > fee) {
        setFormError("The downpayment can't be more than the talent fee.");
        return;
      }
    }

    if (form.team.some((m) => m.position.trim() && !m.name.trim())) {
      setFormError("Add a name for each production member, or remove the empty row.");
      return;
    }

    // ---- make sure the text fields hold real values ----
    const title = form.title.trim();
    const clientName = fullName(form.clientFirst, form.clientLast);
    const loc = form.location;
    const locationText = locationToText(loc);

    let problem =
      (title.length < 3 && "Event title must be at least 3 characters.") ||
      (!form.clientFirst.trim() && "Enter the client's first name.") ||
      (!form.clientLast.trim() && "Enter the client's last name.") ||
      textProblem("Client first name", form.clientFirst, { maxWord: 20 }) ||
      textProblem("Client last name", form.clientLast, { maxWord: 20 }) ||
      gmailProblem(form.clientEmail) ||
      textProblem("Event title", title, { maxWord: 30 });

    if (!problem) {
      for (const [i, m] of form.team.entries()) {
        problem =
          textProblem(`Production member ${i + 1}'s name`, m.name, { maxWord: 20 }) ||
          textProblem(`Production member ${i + 1}'s position`, m.position, { maxWord: 20 });
        if (problem) break;
      }
    }

    // Locations of older events (or an unchanged location) are not re-checked.
    const locationChanged = locationText !== String(editingEvent?.location || "");

    if (!problem && locationText && locationChanged) {
      if (!loc.city.trim() || !loc.province.trim() || !loc.region) {
        problem = "For the location, please fill in the city, province and region.";
      } else {
        problem =
          textProblem("Venue", loc.venue) ||
          textProblem("Street", loc.street) ||
          textProblem("Barangay", loc.barangay, { minLetters: 0 }) ||
          textProblem("City", loc.city) ||
          textProblem("Province", loc.province);
      }
    }

    if (problem) {
      setFormError(problem);
      return;
    }

    setFormError("");

    const {
      downpaymentDue: _downpaymentDue,
      team,
      location: _location,
      clientFirst: _clientFirst,
      clientLast: _clientLast,
      ...rest
    } = form;

    onSave({
      ...rest,
      title,
      client: clientName,
      clientEmail: form.clientEmail.trim().toLowerCase(),
      // The structured location is saved as one readable line in the existing
      // location field.
      location: locationText,
      // The production team is saved as text in the existing photographer field.
      photographer: teamToText(team),
      // Keep this numeric so downstream income totals don't have to
      // guess whether it's a string. Empty input -> 0, not NaN.
      talentFee: form.talentFee === "" ? 0 : parseFloat(form.talentFee),
      // New events only: the amount the client must pay to secure the date.
      // The parent saves the event as a booking request that waits for this
      // downpayment; it is recorded as received when the photographer
      // confirms it from Booking Requests.
      downpaymentDue: editingEvent ? 0 : downpaymentDue,
    });

    setForm(emptyForm);
  };

  const activeColor = CATEGORY_HEX[form.category] || CATEGORY_HEX.default;

  return createPortal(
    <div
      className={`fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-opacity duration-200 ease-out ${
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      onTransitionEnd={handleOverlayTransitionEnd}
    >
      <div
        className={`w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-xl border border-slate-200 bg-white p-6 shadow-2xl transition-all duration-300 ease-out dark:border-slate-700 dark:bg-slate-900 ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-95 opacity-0"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
          <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
            {editingEvent ? "Edit Event" : "Add New Event"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="title"
              placeholder="Event Title"
              value={form.title}
              onChange={handleChange}
              maxLength={RULES.title.max}
              className={inputClass}
              required
            />

            {/* ---------- Client name (first + last) ---------- */}
            <div ref={clientBoxRef} className="relative">
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Client Name
                </label>

                <button
                  type="button"
                  onClick={() => setClientDropdownOpen((prev) => !prev)}
                  className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
                >
                  {clientDropdownOpen ? "Hide list" : "Choose existing client"}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  name="clientFirst"
                  placeholder="First name"
                  aria-label="Client first name"
                  maxLength={RULES.clientFirst.max}
                  autoComplete="off"
                  value={form.clientFirst}
                  onChange={handleClientNameChange}
                  className={inputClass}
                  required
                />

                <input
                  type="text"
                  name="clientLast"
                  placeholder="Last name"
                  aria-label="Client last name"
                  maxLength={RULES.clientLast.max}
                  autoComplete="off"
                  value={form.clientLast}
                  onChange={handleClientNameChange}
                  className={inputClass}
                  required
                />
              </div>

              {clientDropdownOpen && filteredClients.length > 0 && (
                <div
                  className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-xl"
                  style={{
                    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
                    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
                  }}
                >
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => chooseClient(client)}
                      className="block w-full border-0 px-4 py-3 text-left"
                      style={{
                        backgroundColor: "transparent",
                        color: isDarkMode ? "#ffffff" : "#1e293b",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDarkMode
                          ? "#334155"
                          : "#f1f5f9";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {client.name}
                    </button>
                  ))}
                </div>
              )}

              {form.clientFirst.trim() && form.clientLast.trim() && !form.clientId && (
                <p className="mt-1 text-xs text-sky-600 dark:text-sky-400">
                  New client — this client will be created when you save the event.
                </p>
              )}
            </div>

            {/* ---------- Client Google email ---------- */}
            <div>
              <label
                htmlFor="client-email"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Client Google Email
              </label>

              <input
                id="client-email"
                type="text"
                name="clientEmail"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="name@gmail.com"
                maxLength={RULES.clientEmail.max}
                value={form.clientEmail}
                onChange={handleEmailChange}
                className={inputClass}
                required
              />

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                The booking confirmation is sent here, so use the client's real
                Gmail address (ends in @gmail.com). Temporary or made-up
                addresses are rejected.
              </p>
            </div>

            {/* ---------- Production team (name + position) ---------- */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Production Team
              </label>

              <div className="space-y-2">
                {form.team.map((member, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <input
                      type="text"
                      placeholder="Name"
                      aria-label={`Production member ${index + 1} name`}
                      maxLength={RULES.name.max}
                      value={member.name}
                      onChange={(e) => updateMember(index, "name", e.target.value)}
                      className={inputClass}
                    />

                    <PositionCombobox
                      value={member.position}
                      ariaLabel={`Production member ${index + 1} position`}
                      isDarkMode={isDarkMode}
                      onChange={(position) => updateMember(index, "position", position)}
                    />

                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      aria-label={`Remove production member ${index + 1}`}
                      className="rounded-lg border border-slate-200 px-3 text-slate-500 transition hover:text-red-500 dark:border-slate-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addMember}
                className="mt-2 text-sm font-semibold text-sky-600 hover:underline dark:text-sky-400"
              >
                + Add more production member
              </button>
            </div>

            {/* ---------- Location (split into parts) ---------- */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Location
              </label>

              <div className="space-y-2">
                <input
                  type="text"
                  name="venue"
                  placeholder="Venue / place name (optional)"
                  aria-label="Venue or place name"
                  maxLength={RULES.venue.max}
                  autoComplete="off"
                  value={form.location.venue}
                  onChange={handleLocationChange}
                  className={inputClass}
                />

                <input
                  type="text"
                  name="street"
                  placeholder="Street / address (optional)"
                  aria-label="Street or address"
                  maxLength={RULES.street.max}
                  autoComplete="off"
                  value={form.location.street}
                  onChange={handleLocationChange}
                  className={inputClass}
                />

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    name="barangay"
                    placeholder="Barangay (optional)"
                    aria-label="Barangay"
                    maxLength={RULES.barangay.max}
                    autoComplete="off"
                    value={form.location.barangay}
                    onChange={handleLocationChange}
                    className={inputClass}
                  />

                  <input
                    type="text"
                    name="city"
                    placeholder="City / Municipality"
                    aria-label="City or municipality"
                    maxLength={RULES.city.max}
                    autoComplete="off"
                    value={form.location.city}
                    onChange={handleLocationChange}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    name="province"
                    placeholder="Province (or Metro Manila)"
                    aria-label="Province"
                    maxLength={RULES.province.max}
                    autoComplete="off"
                    value={form.location.province}
                    onChange={handleLocationChange}
                    className={inputClass}
                  />

                  <select
                    name="region"
                    aria-label="Region"
                    value={form.location.region}
                    onChange={handleLocationChange}
                    className={inputClass}
                  >
                    <option value="">Select region</option>
                    {REGIONS.map((region) => (
                      <option key={region.value} value={region.value}>
                        {region.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                Leave all blank if the location isn't set yet. If you fill any
                part in, the city, province and region are required.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">
                Talent Fee (₱)
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  ₱
                </span>

                <input
                  type="number"
                  name="talentFee"
                  placeholder="0.00"
                  min="0"
                  max="9999999.99"
                  step="0.01"
                  inputMode="decimal"
                  value={form.talentFee}
                  onChange={handleMoneyChange}
                  onKeyDown={blockNumberKeys}
                  className={`${inputClass} pl-7`}
                />
              </div>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                {editingEvent
                  ? "The total price for this event. Saved on this event and synced to the client's profile. Leave blank if not yet agreed."
                  : "The total price for this event. Required for a new event. Saved on this event and synced to the client's profile."}
              </p>
            </div>

            {/* ---------- Downpayment due (new events) ---------- */}
            {!editingEvent && (
              <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <p className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
                  Downpayment
                </p>

                <p className="mb-3 text-xs text-slate-500">
                  New events are added as a booking request that waits for the
                  downpayment. When the client pays, open Booking Requests and
                  confirm it was received. Only then is the date added to your
                  schedule.
                </p>

                <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                  Downpayment due (₱)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    ₱
                  </span>
                  <input
                    type="number"
                    name="downpaymentDue"
                    placeholder="0.00"
                    min="0"
                    max="9999999.99"
                    step="0.01"
                    inputMode="decimal"
                    value={form.downpaymentDue}
                    onChange={handleMoneyChange}
                    onKeyDown={blockNumberKeys}
                    className={`${inputClass} pl-7`}
                  />
                </div>

                {fee > 0 && form.downpaymentDue !== "" && (
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {peso(fee)} fee − {peso(downpaymentDue)} down ={" "}
                    <span className="font-semibold">
                      {peso(Math.max(fee - downpaymentDue, 0))}
                    </span>{" "}
                    due after the event
                  </p>
                )}

                <p className="mt-2 text-xs text-slate-500">
                  Downpayments are non-refundable and stay as income if the event is
                  cancelled.
                </p>
              </div>
            )}

            {/* ---------- Payments (existing events) ---------- */}
            {editingEvent && (
              <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                  Payments
                </p>

                <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
                  {peso(fee)} fee − {peso(collected)} received ={" "}
                  <span className="font-semibold">{peso(balanceDue)}</span>{" "}
                  {balanceDue === 0 && fee > 0 ? "(paid in full)" : "still due"}
                </p>

                {payments.length > 0 && (
                  <ul className="mb-3 space-y-1.5">
                    {payments.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between rounded-md bg-slate-500/[0.06] px-3 py-1.5 text-sm"
                      >
                        <span className="text-slate-600 dark:text-slate-300">
                          <span className="font-semibold">{peso(p.amount)}</span>
                          {" · "}
                          {p.type === "downpayment" ? "Downpayment" : "Balance"}
                          {" · "}
                          {new Date(p.paid_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePayment(p)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <input
                    type="number"
                    placeholder="Amount"
                    min="0"
                    max="9999999.99"
                    step="0.01"
                    inputMode="decimal"
                    value={newPayment.amount}
                    onChange={(e) => {
                      if (!isMoneyOk(e.target.value)) return;
                      setNewPayment((prev) => ({ ...prev, amount: e.target.value }));
                    }}
                    onKeyDown={(e) => {
                      blockNumberKeys(e);
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPayment();
                      }
                    }}
                    className={inputClass}
                  />

                  <select
                    value={newPayment.type}
                    onChange={(e) =>
                      setNewPayment((prev) => ({ ...prev, type: e.target.value }))
                    }
                    className={inputClass}
                  >
                    <option value="downpayment">Downpayment</option>
                    <option value="balance">Balance</option>
                  </select>

                  <input
                    type="date"
                    value={newPayment.date}
                    onChange={(e) =>
                      setNewPayment((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={addPayment}
                    disabled={savingPayment}
                    className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-600 disabled:opacity-50"
                  >
                    {savingPayment ? "Saving…" : "Add"}
                  </button>
                </div>

                {paymentsError && (
                  <p className="mt-2 text-xs text-red-500">{paymentsError}</p>
                )}
              </div>
            )}

            <div>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="
                  category-select
                  w-full rounded-lg border p-3 outline-none transition
                  border-slate-300 bg-white text-slate-900
                  focus:border-sky-500
                  dark:border-slate-700 dark:bg-slate-800 dark:text-white
                "
                style={{
                  "--category-color": activeColor,
                }}
              >
                {CATEGORY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">
                Link to Project (optional)
              </label>

              <select
                name="projectId"
                value={form.projectId}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">— No linked project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_code} — {p.client}
                  </option>
                ))}
              </select>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                Linking lets you mark this shoot "Complete" and auto-move
                the project to Shoot Completed in Workflow.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">
                Gear needed
              </label>

              <div className="flex flex-wrap gap-2">
                {GEAR_OPTIONS.map((gear) => {
                  const isSelected = form.gears.includes(gear.value);

                  return (
                    <button
                      key={gear.value}
                      type="button"
                      onClick={() => toggleGear(gear.value)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        isSelected
                          ? "border-sky-500 bg-sky-500 text-slate-900 font-semibold"
                          : "border-slate-200 bg-slate-100 text-slate-700 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500/60"
                      }`}
                    >
                      {gear.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="rounded-lg border border-slate-200 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />

              <input
                type="time"
                name="start"
                value={form.start}
                onChange={handleChange}
                className="rounded-lg border border-slate-200 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />

              <input
                type="time"
                name="end"
                value={form.end}
                onChange={handleChange}
                className="rounded-lg border border-slate-200 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>

            <textarea
              rows="4"
              name="notes"
              placeholder={`Notes (up to ${NOTES_MAX} characters)`}
              maxLength={NOTES_MAX}
              value={form.notes}
              onChange={handleChange}
              className="w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-slate-900 placeholder-slate-500 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
            />

            {formError && <p className="text-sm text-red-500">{formError}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-slate-200 bg-slate-100 px-5 py-2 text-slate-700 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-200 active:translate-y-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-5 py-2 font-semibold text-slate-900 transition hover:bg-sky-600"
              >
                {editingEvent ? "Update Event" : "Add to Booking Requests"}
              </button>
            </div>
          </form>
      </div>
    </div>,
    document.body
  );
}

export default AddEventModal;