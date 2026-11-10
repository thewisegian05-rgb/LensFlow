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

const MAX_YEARS_AHEAD = 2;

const addYears = (dateStr, years) => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setFullYear(d.getFullYear() + years);
  return d.toLocaleDateString("en-CA");
};

const nowTimeString = () => new Date().toTimeString().slice(0, 5);

const dateToIso = (dateStr) => new Date(`${dateStr}T12:00:00`).toISOString();

const Req = () => (
  <span className="ml-0.5 text-red-500" aria-hidden="true" title="Required">
    *
  </span>
);

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

const fullName = (first, last) =>
  [first, last].map((p) => String(p || "").trim()).filter(Boolean).join(" ");

const splitName = (text) => {
  const t = String(text || "").trim();
  const i = t.lastIndexOf(" ");
  return i === -1
    ? { first: t, last: "" }
    : { first: t.slice(0, i).trim(), last: t.slice(i + 1).trim() };
};

const MAX_MONEY_DIGITS = 6;

const RULES = {
  title: { allowed: /[^\p{L}\p{M}\p{N}\s&''.,:!#()\/+-]/gu, max: 80, repeat: 3 },
  clientFirst: { allowed: /[^\p{L}\p{M}\s.''-]/gu, max: 30, repeat: 2 },
  clientLast: { allowed: /[^\p{L}\p{M}\s.''-]/gu, max: 30, repeat: 2 },
  clientEmail: { allowed: /[^a-z0-9.@]/g, max: 40, repeat: 3 },
  name: { allowed: /[^\p{L}\p{M}\s.''-]/gu, max: 50, repeat: 2 },
  position: { allowed: /[^\p{L}\p{M}\s\/&.-]/gu, max: 30, repeat: 2 },
  venue: { allowed: /[^\p{L}\p{M}\p{N}\s&''.#\/()-]/gu, max: 60, repeat: 3 },
  street: { allowed: /[^\p{L}\p{M}\p{N}\s''.#\/-]/gu, max: 80, repeat: 3 },
  barangay: { allowed: /[^\p{L}\p{M}\p{N}\s''.-]/gu, max: 50, repeat: 3 },
  city: { allowed: /[^\p{L}\p{M}\s''.-]/gu, max: 50, repeat: 2 },
  province: { allowed: /[^\p{L}\p{M}\s''.-]/gu, max: 50, repeat: 2 },
};

const NOTES_MAX = 500;

const sanitize = (value, { allowed, max, repeat }) => {
  let v = String(value).replace(allowed, "");
  v = v.replace(/^\s+/, "").replace(/\s{2,}/g, " ");
  v = v.replace(/([^\p{L}\p{N}\s])\1+/gu, "$1");
  v = v.replace(
    new RegExp(`([\\p{L}\\p{N}])\\1{${repeat},}`, "giu"),
    (_, c) => c.repeat(repeat)
  );
  return v.slice(0, max);
};

const MONEY_PATTERN = new RegExp(`^\\d{0,${MAX_MONEY_DIGITS}}(\\.\\d{0,2})?$`);
const isMoneyOk = (value) => value === "" || MONEY_PATTERN.test(value);
const blockNumberKeys = (e) => {
  if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
};

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

// ---- FIX: peso sign prefix uses inline style so p-3 never hides it ----
const MoneyInput = ({ id, name, value, onChange, onKeyDown, errClass, placeholder = "0.00" }) => (
  <div className="relative">
    <span
      className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
      style={{ left: "12px" }}
    >
      ₱
    </span>
    <input
      id={id}
      type="number"
      name={name}
      placeholder={placeholder}
      min="0"
      max="999999.99"
      step="0.01"
      inputMode="decimal"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      style={{ paddingLeft: "28px" }}
      className={`${inputClass}${errClass}`}
    />
  </div>
);

function PositionCombobox({ value, onChange, ariaLabel, isDarkMode }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

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
    category: "",
    team: [emptyMember()],
    location: emptyLocation(),
    gears: [],
    date: "",
    callTime: "",
    start: "",
    end: "",
    notes: "",
    projectId: "",
    talentFee: "",
    downpaymentDue: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [projects, setProjects] = useState([]);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const clientBoxRef = useRef(null);
  const [formError, setFormError] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!formError) return;
    document
      .getElementById("form-error")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [formError]);

  useEffect(() => {
    if (!clientDropdownOpen) return;
    const onPointerDown = (e) => {
      if (clientBoxRef.current && !clientBoxRef.current.contains(e.target))
        setClientDropdownOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [clientDropdownOpen]);

  const [payments, setPayments] = useState([]);
  const [paymentsError, setPaymentsError] = useState("");
  const [newPayment, setNewPayment] = useState({
    amount: "",
    type: "balance",
    date: todayString(),
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

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
      observer.observe(target, { attributes: true, attributeFilter: ["class"], subtree: true })
    );
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) { setIsVisible(false); return; }
    setIsVisible(false);
    setShowErrors(false);
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const typedClientName = fullName(form.clientFirst, form.clientLast);
  const filteredClients = clients.filter((client) =>
    String(client.name || "").toLowerCase().includes(typedClientName.toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, project_code, client")
        .order("created_at", { ascending: true });
      if (error) { console.error("Failed to load projects for linking:", error.message); return; }
      setProjects(data || []);
    };
    fetchProjects();
  }, [open]);

  const loadPayments = useCallback(async (eventId) => {
    const { data, error } = await supabase
      .from("event_payments")
      .select("id, amount, type, paid_at")
      .eq("event_id", eventId)
      .order("paid_at", { ascending: true });
    if (error) { console.error("Failed to load payments:", error.message); setPaymentsError(error.message); return; }
    setPaymentsError("");
    const list = data || [];
    setPayments(list);
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

  useEffect(() => {
    setFormError("");
    setShowErrors(false);
    if (editingEvent) {
      const startDate = editingEvent.start ? new Date(editingEvent.start) : null;
      const endDate = editingEvent.end ? new Date(editingEvent.end) : null;
      setForm({
        id: editingEvent.id,
        title: editingEvent.title || "",
        clientFirst: splitName(editingEvent.client).first,
        clientLast: splitName(editingEvent.client).last,
        clientId: editingEvent.clientId || null,
        clientEmail:
          editingEvent.clientEmail ||
          editingEvent.client_email ||
          clients.find((c) => c.id === editingEvent.clientId)?.email ||
          "",
        category: editingEvent.category || editingEvent.type || "",
        team: parseTeam(editingEvent.photographer),
        location: parseLocation(editingEvent.location),
        gears: Array.isArray(editingEvent.gears) ? editingEvent.gears : [],
        date: editingEvent.date || (startDate ? startDate.toISOString().split("T")[0] : ""),
        callTime: editingEvent.call_time || "",
        start: startDate ? startDate.toTimeString().slice(0, 5) : "",
        end: endDate ? endDate.toTimeString().slice(0, 5) : "",
        notes: editingEvent.notes || "",
        projectId: editingEvent.project_id || "",
        talentFee: editingEvent.talentFee ?? editingEvent.talent_fee ?? "",
        downpaymentDue: "",
      });
      return;
    }
    setForm({ ...emptyForm, date: selectedDate || "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingEvent, selectedDate]);

  if (!open) return null;

  const handleClose = () => setIsVisible(false);

  const handleOverlayTransitionEnd = (e) => {
    if (e.target === e.currentTarget && e.propertyName === "opacity" && !isVisible) onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const rule = RULES[name];
    setForm((prev) => ({ ...prev, [name]: rule ? sanitize(value, rule) : value }));
  };

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
        talentFee: matchedClient && prev.talentFee === "" ? matchedClient.talentFee ?? "" : prev.talentFee,
        clientEmail: matchedClient && !prev.clientEmail ? matchedClient.email || "" : prev.clientEmail,
      };
    });
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
      talentFee: prev.talentFee === "" ? client.talentFee ?? "" : prev.talentFee,
      clientEmail: prev.clientEmail || client.email || "",
    }));
    setClientDropdownOpen(false);
  };

  const handleEmailChange = (e) => {
    let clean = sanitize(e.target.value.toLowerCase(), RULES.clientEmail);
    const at = clean.indexOf("@");
    if (at !== -1) clean = clean.slice(0, at + 1) + clean.slice(at + 1).replace(/@/g, "");
    setForm((prev) => ({ ...prev, clientEmail: clean }));
  };

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
      location: { ...prev.location, [name]: rule ? sanitize(value, rule) : value },
    }));
  };

  const toggleGear = (value) => {
    setForm((prev) => ({
      ...prev,
      gears: prev.gears.includes(value) ? prev.gears.filter((g) => g !== value) : [...prev.gears, value],
    }));
  };

  const updateMember = (index, field, value) => {
    const clean = sanitize(value, field === "name" ? RULES.name : RULES.position);
    setForm((prev) => ({
      ...prev,
      team: prev.team.map((member, i) => i === index ? { ...member, [field]: clean } : member),
    }));
  };

  const addMember = () => setForm((prev) => ({ ...prev, team: [...prev.team, emptyMember()] }));

  const removeMember = (index) =>
    setForm((prev) => {
      const next = prev.team.filter((_, i) => i !== index);
      return { ...prev, team: next.length ? next : [emptyMember()] };
    });

  const fee = parseFloat(form.talentFee) || 0;
  const downpaymentDue = parseFloat(form.downpaymentDue) || 0;
  const collected = editingEvent ? payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) : 0;
  const balanceDue = Math.max(fee - collected, 0);

  const minDate = todayString();
  const maxDate = addYears(minDate, MAX_YEARS_AHEAD);

  const originalDate = editingEvent
    ? editingEvent.date || (editingEvent.start ? new Date(editingEvent.start).toLocaleDateString("en-CA") : "")
    : "";
  const originalStart =
    editingEvent && editingEvent.start ? new Date(editingEvent.start).toTimeString().slice(0, 5) : "";
  const scheduleUnchanged = Boolean(editingEvent) && form.date === originalDate && form.start === originalStart;

  const getScheduleError = () => {
    if (form.start && form.end && form.end <= form.start)
      return { message: "End time must be after the start time.", field: "end" };
    if (scheduleUnchanged || !form.date) return null;
    if (form.date < minDate)
      return { message: "That date has already passed. Choose today or a later date.", field: "date" };
    if (form.date > maxDate)
      return { message: `Bookings are only open up to ${MAX_YEARS_AHEAD} years ahead (until ${maxDate}).`, field: "date" };
    if (form.date === minDate && form.start && form.start <= nowTimeString())
      return { message: "That start time has already passed today. Choose a later time.", field: "start" };
    return null;
  };

  const scheduleResult = getScheduleError();
  const scheduleError = scheduleResult ? scheduleResult.message : null;
  const scheduleField = scheduleResult ? scheduleResult.field : null;

  const missingItems = [];
  const need = (id, label) => missingItems.push({ id, label });

  if (form.title.trim().length < 3) need("title", "event title (at least 3 characters)");
  if (!form.clientFirst.trim()) need("clientFirst", "client first name");
  if (!form.clientLast.trim()) need("clientLast", "client last name");
  if (gmailProblem(form.clientEmail)) need("clientEmail", "a valid client Gmail address");
  if (!form.team.some((m) => m.name.trim())) need("team", "at least one production member");
  else if (form.team.some((m) => m.position.trim() && !m.name.trim())) need("team", "a name for every production member");
  if (!form.location.city.trim()) need("city", "location city");
  if (!form.location.province.trim()) need("province", "location province");
  if (!form.location.region) need("region", "location region");
  if (!editingEvent) {
    if (fee <= 0) need("fee", "talent fee");
    if (form.downpaymentDue === "") need("downpayment", "downpayment due");
    else if (downpaymentDue > fee) need("downpayment", "a downpayment that isn't more than the fee");
  }
  if (!form.category) need("category", "event type");
  if (!form.date) need("date", "date");
  if (!form.start) need("start", "start time");
  if (!form.end) need("end", "end time");

  const missing = missingItems.map((m) => m.label);
  const missingIds = new Set(missingItems.map((m) => m.id));

  const flag = (id) => showErrors && (missingIds.has(id) || scheduleField === id);
  const errRing = (id) => (flag(id) ? " !border-red-500 ring-2 ring-red-500/40" : "");

  const flagMissing = () => {
    setShowErrors(true);
    const firstId = missingItems.length ? missingItems[0].id : scheduleField;
    if (!firstId) return;
    setTimeout(() => {
      const el = document.getElementById(`f-${firstId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const target = el.matches("input, select, textarea") ? el : el.querySelector("input, select, textarea");
      target?.focus({ preventScroll: true });
    }, 0);
  };

  const addPayment = async () => {
    const amount = parseFloat(newPayment.amount);
    if (!editingEvent?.id) return;
    if (!amount || amount <= 0) { setPaymentsError("Enter an amount greater than 0."); return; }
    if (collected + amount > fee) {
      setPaymentsError(`That would be more than the talent fee. Only ${peso(balanceDue)} is still due.`);
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
    if (error) { console.error("Failed to save payment:", error.message); setPaymentsError(error.message); return; }
    setNewPayment((prev) => ({ ...prev, amount: "" }));
    loadPayments(editingEvent.id);
  };

  const removePayment = async (payment) => {
    if (!window.confirm(`Remove this ${peso(payment.amount)} payment?`)) return;
    const { error } = await supabase.from("event_payments").delete().eq("id", payment.id);
    if (error) { console.error("Failed to remove payment:", error.message); setPaymentsError(error.message); return; }
    loadPayments(editingEvent.id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (missing.length > 0 || scheduleError) { setFormError(""); flagMissing(); return; }
    if (!editingEvent) {
      if (fee <= 0) { setFormError("Enter the talent fee. It's needed to create the booking request."); return; }
      if (form.downpaymentDue === "") { setFormError("Enter the downpayment due to secure the date (use 0 if none)."); return; }
      if (downpaymentDue > fee) { setFormError("The downpayment can't be more than the talent fee."); return; }
    }
    if (!form.category) { setFormError("Choose the event type."); return; }
    if (!form.team.some((m) => m.name.trim())) { setFormError("Add at least one production member."); return; }
    if (form.team.some((m) => m.position.trim() && !m.name.trim())) { setFormError("Add a name for each production member, or remove the empty row."); return; }

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

    const locationChanged = locationText !== String(editingEvent?.location || "");
    if (!problem && (!loc.city.trim() || !loc.province.trim() || !loc.region))
      problem = "Please fill in the location's city, province and region.";
    if (!problem && locationChanged)
      problem =
        textProblem("Venue", loc.venue) ||
        textProblem("Street", loc.street) ||
        textProblem("Barangay", loc.barangay, { minLetters: 0 }) ||
        textProblem("City", loc.city) ||
        textProblem("Province", loc.province);

    if (problem) { setFormError(problem); return; }
    setFormError("");

    const { downpaymentDue: _downpaymentDue, team, location: _location, clientFirst: _clientFirst, clientLast: _clientLast, ...rest } = form;
    onSave({
      ...rest,
      title,
      client: clientName,
      clientEmail: form.clientEmail.trim().toLowerCase(),
      location: locationText,
      photographer: teamToText(team),
      talentFee: form.talentFee === "" ? 0 : parseFloat(form.talentFee),
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
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      onTransitionEnd={handleOverlayTransitionEnd}
    >
      <div
        className={`w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-xl border border-slate-200 bg-white p-6 shadow-2xl transition-all duration-300 ease-out dark:border-slate-700 dark:bg-slate-900 ${
          isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
          {editingEvent ? "Edit Event" : "Add New Event"}
        </h2>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Event Title <Req />
            </label>
            <input
              type="text"
              id="f-title"
              name="title"
              placeholder="Event Title"
              value={form.title}
              onChange={handleChange}
              maxLength={RULES.title.max}
              className={inputClass + errRing("title")}
              required
            />
          </div>

          <div ref={clientBoxRef} className="relative">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Client Name <Req />
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
                id="f-clientFirst"
                name="clientFirst"
                placeholder="First name"
                aria-label="Client first name"
                maxLength={RULES.clientFirst.max}
                autoComplete="off"
                value={form.clientFirst}
                onChange={handleClientNameChange}
                className={inputClass + errRing("clientFirst")}
                required
              />
              <input
                type="text"
                id="f-clientLast"
                name="clientLast"
                placeholder="Last name"
                aria-label="Client last name"
                maxLength={RULES.clientLast.max}
                autoComplete="off"
                value={form.clientLast}
                onChange={handleClientNameChange}
                className={inputClass + errRing("clientLast")}
                required
              />
            </div>
            {clientDropdownOpen && filteredClients.length > 0 && (
              <div
                className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-xl"
                style={{ backgroundColor: isDarkMode ? "#1e293b" : "#ffffff", borderColor: isDarkMode ? "#334155" : "#e2e8f0" }}
              >
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => chooseClient(client)}
                    className="block w-full border-0 px-4 py-3 text-left"
                    style={{ backgroundColor: "transparent", color: isDarkMode ? "#ffffff" : "#1e293b" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDarkMode ? "#334155" : "#f1f5f9"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
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

          <div>
            <label htmlFor="f-clientEmail" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Client Google Email <Req />
            </label>
            <input
              id="f-clientEmail"
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
              className={inputClass + errRing("clientEmail")}
              required
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              The booking confirmation is sent here, so use the client's real Gmail address (ends in @gmail.com). Temporary or made-up addresses are rejected.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Production Team <Req />
            </label>
            <div
              id="f-team"
              className={`space-y-2${flag("team") ? " rounded-lg p-2 ring-2 ring-red-500/60" : ""}`}
            >
              {form.team.map((member, index) => (
                <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
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

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Location <Req />
            </label>
            <div className="space-y-2">
              <input type="text" name="venue" placeholder="Venue / place name (optional)" aria-label="Venue or place name" maxLength={RULES.venue.max} autoComplete="off" value={form.location.venue} onChange={handleLocationChange} className={inputClass} />
              <input type="text" name="street" placeholder="Street / address (optional)" aria-label="Street or address" maxLength={RULES.street.max} autoComplete="off" value={form.location.street} onChange={handleLocationChange} className={inputClass} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input type="text" name="barangay" placeholder="Barangay (optional)" aria-label="Barangay" maxLength={RULES.barangay.max} autoComplete="off" value={form.location.barangay} onChange={handleLocationChange} className={inputClass} />
                <input type="text" id="f-city" name="city" placeholder="City / Municipality *" aria-label="City or municipality" maxLength={RULES.city.max} autoComplete="off" value={form.location.city} onChange={handleLocationChange} className={inputClass + errRing("city")} />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input type="text" id="f-province" name="province" placeholder="Province (or Metro Manila) *" aria-label="Province" maxLength={RULES.province.max} autoComplete="off" value={form.location.province} onChange={handleLocationChange} className={inputClass + errRing("province")} />
                <select id="f-region" name="region" aria-label="Region" value={form.location.region} onChange={handleLocationChange} className={inputClass + errRing("region")}>
                  <option value="">Select region *</option>
                  {REGIONS.map((region) => (
                    <option key={region.value} value={region.value}>{region.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              The city, province and region are required. Venue, street and barangay are optional.
            </p>
          </div>

          {/* ---- Talent Fee ---- */}
          <div>
            <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">
              Talent Fee (₱) {!editingEvent && <Req />}
            </label>
            <MoneyInput
              id="f-fee"
              name="talentFee"
              value={form.talentFee}
              onChange={handleMoneyChange}
              onKeyDown={blockNumberKeys}
              errClass={errRing("fee")}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              {editingEvent
                ? "The total price for this event. Saved on this event and synced to the client's profile. Leave blank if not yet agreed."
                : "The total price for this event. Required for a new event. Saved on this event and synced to the client's profile."}
            </p>
          </div>

          {/* ---- Downpayment (new events) ---- */}
          {!editingEvent && (
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <p className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">Downpayment</p>
              <p className="mb-3 text-xs text-slate-500">
                New events are added as a booking request that waits for the downpayment. When the client pays, open Booking Requests and confirm it was received. Only then is the date added to your schedule.
              </p>
              <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                Downpayment due (₱) <Req />
              </label>
              <MoneyInput
                id="f-downpayment"
                name="downpaymentDue"
                value={form.downpaymentDue}
                onChange={handleMoneyChange}
                onKeyDown={blockNumberKeys}
                errClass={errRing("downpayment")}
              />
              {fee > 0 && form.downpaymentDue !== "" && (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {peso(fee)} fee − {peso(downpaymentDue)} down ={" "}
                  <span className="font-semibold">{peso(Math.max(fee - downpaymentDue, 0))}</span> due after the event
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Downpayments are non-refundable and stay as income if the event is cancelled.
              </p>
            </div>
          )}

          {/* ---- Payments (existing events) ---- */}
          {editingEvent && (
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Payments</p>
              <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
                {peso(fee)} fee − {peso(collected)} received ={" "}
                <span className="font-semibold">{peso(balanceDue)}</span>{" "}
                {balanceDue === 0 && fee > 0 ? "(paid in full)" : "still due"}
              </p>
              {payments.length > 0 && (
                <ul className="mb-3 space-y-1.5">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-md bg-slate-500/[0.06] px-3 py-1.5 text-sm">
                      <span className="text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">{peso(p.amount)}</span>
                        {" · "}{p.type === "downpayment" ? "Downpayment" : "Balance"}
                        {" · "}{new Date(p.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <button type="button" onClick={() => removePayment(p)} className="text-xs text-red-500 hover:underline">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <input
                  type="number"
                  placeholder="Amount"
                  min="0" max="999999.99" step="0.01" inputMode="decimal"
                  value={newPayment.amount}
                  onChange={(e) => { if (!isMoneyOk(e.target.value)) return; setNewPayment((prev) => ({ ...prev, amount: e.target.value })); }}
                  onKeyDown={(e) => { blockNumberKeys(e); if (e.key === "Enter") { e.preventDefault(); addPayment(); } }}
                  className={inputClass}
                />
                <select value={newPayment.type} onChange={(e) => setNewPayment((prev) => ({ ...prev, type: e.target.value }))} className={inputClass}>
                  <option value="downpayment">Downpayment</option>
                  <option value="balance">Balance</option>
                </select>
                <input type="date" value={newPayment.date} onChange={(e) => setNewPayment((prev) => ({ ...prev, date: e.target.value }))} className={inputClass} />
                <button type="button" onClick={addPayment} disabled={savingPayment} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-600 disabled:opacity-50">
                  {savingPayment ? "Saving…" : "Add"}
                </button>
              </div>
              {paymentsError && <p className="mt-2 text-xs text-red-500">{paymentsError}</p>}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Event Type <Req /></label>
            <select
              id="f-category"
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              className="category-select w-full rounded-lg border p-3 outline-none transition border-slate-300 bg-white text-slate-900 focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              style={{
                "--category-color": activeColor,
                ...(flag("category") ? { borderColor: "#ef4444", boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.4)" } : {}),
              }}
            >
              <option value="">Select event type</option>
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>{CATEGORY_LABELS[key]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">Link to Project (optional)</label>
            <select name="projectId" value={form.projectId} onChange={handleChange} className="w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              <option value="">— No linked project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.project_code} — {p.client}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              Linking lets you mark this shoot "Complete" and auto-move the project to Shoot Completed in Workflow.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-600 dark:text-slate-400">Gear needed</label>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-600 dark:text-slate-400">Date <Req /></label>
              <input type="date" name="date" value={form.date} onChange={handleChange} min={editingEvent ? undefined : minDate} max={maxDate} className="w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600 dark:text-slate-400">
                Photographer Call Time <span className="text-xs text-slate-400">(Optional)</span>
              </label>
              <input type="time" name="callTime" value={form.callTime} onChange={handleChange} className="w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600 dark:text-slate-400">Start time <Req /></label>
              <input type="time" name="start" value={form.start} onChange={handleChange} min={form.date === minDate && !editingEvent ? nowTimeString() : undefined} className="w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600 dark:text-slate-400">End time <Req /></label>
              <input type="time" name="end" value={form.end} onChange={handleChange} min={form.start || undefined} className="w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" required />
            </div>
          </div>

          <p className="-mt-2 text-xs text-slate-500 dark:text-slate-500">
            Bookings can be made from today up to {MAX_YEARS_AHEAD} years ahead (until {maxDate}). Past dates and times can't be booked.
          </p>

          {scheduleError && <p className="text-sm text-red-500" aria-live="polite">{scheduleError}</p>}

          <textarea
            rows="4"
            name="notes"
            placeholder={`Notes (up to ${NOTES_MAX} characters)`}
            maxLength={NOTES_MAX}
            value={form.notes}
            onChange={handleChange}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-slate-900 placeholder-slate-500 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
          />

          <p className="text-xs text-slate-500"><span className="text-red-500">*</span> Required</p>

          {missing.length > 0 && (
            <p className="text-xs text-slate-500" aria-live="polite">To save, add: {missing.join(", ")}.</p>
          )}

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="rounded-lg border border-slate-200 bg-slate-100 px-5 py-2 text-slate-700 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-200 active:translate-y-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button type="submit" disabled={missing.length > 0 || Boolean(scheduleError)} className="rounded-lg bg-sky-500 px-5 py-2 font-semibold text-slate-900 transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sky-500">
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