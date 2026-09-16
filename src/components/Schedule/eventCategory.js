// =========================================================
// eventCategory.js
// =========================================================
// Single source of truth for "what category is this event, and what
// color/label goes with it." Calendar.jsx, EventCard.jsx, and
// AddEventModal.jsx all import from here so they can never drift out
// of sync again.
//
// Events don't reliably have a clean `type` field — categorize by
// scanning the free-text `category`/`title` fields instead.
//
// Color palette: each category sits on an evenly-spaced hue around
// the color wheel (~25-30° apart) so no two ever read as "basically
// the same color" at badge size. `default` is a neutral slate gray
// on purpose — it's the uncategorized bucket, so it shouldn't compete
// visually with real categories.
// =========================================================

// Canonical category keys, in the order they should appear in dropdowns.
export const CATEGORY_KEYS = [
  "wedding",
  "prenup",
  "couple-shoot",
  "family-milestones",
  "portrait-lifestyle",
  "events-performance",
  "corporate-commercial",
  "real-estate",
  "product-business",
  "baptism",
  "pet-photography",
];

// Human-readable label shown in badges/pills/dropdowns.
export const CATEGORY_LABELS = {
  wedding: "Weddings",
  prenup: "Prenup",
  "couple-shoot": "Couple Shoot",
  "family-milestones": "Life & Family Milestones",
  "portrait-lifestyle": "Portrait & Lifestyle",
  "events-performance": "Events & Performance",
  "corporate-commercial": "Corporate & Commercial",
  "real-estate": "Real Estate",
  "product-business": "Product & Business",
  baptism: "Baptism",
  "pet-photography": "Pet Photography",
  default: "Other",
};

// Solid-fill Tailwind class for small badges/pills (EventCard).
// Each category gets its own hue, spaced around the wheel so they
// stay visually distinguishable at a glance on the calendar.
export const CATEGORY_BADGE_CLASSES = {
  wedding: "bg-purple-500",
  prenup: "bg-orange-500",
  "couple-shoot": "bg-pink-500",
  "family-milestones": "bg-green-500",
  "portrait-lifestyle": "bg-blue-500",
  "events-performance": "bg-red-500",
  "corporate-commercial": "bg-indigo-500",
  "real-estate": "bg-cyan-500",
  "product-business": "bg-lime-500",
  baptism: "bg-yellow-500",
  "pet-photography": "bg-fuchsia-500",
  default: "bg-slate-500",
};

// Translucent background + tinted text, for softer badges (TodaySchedule,
// and anywhere else that wants the low-contrast pill style rather than
// a solid fill).
export const CATEGORY_SOFT_BADGE_CLASSES = {
  wedding: "bg-purple-500/20 text-purple-400",
  prenup: "bg-orange-500/20 text-orange-400",
  "couple-shoot": "bg-pink-500/20 text-pink-400",
  "family-milestones": "bg-green-500/20 text-green-400",
  "portrait-lifestyle": "bg-blue-500/20 text-blue-400",
  "events-performance": "bg-red-500/20 text-red-400",
  "corporate-commercial": "bg-indigo-500/20 text-indigo-400",
  "real-estate": "bg-cyan-500/20 text-cyan-400",
  "product-business": "bg-lime-500/20 text-lime-400",
  baptism: "bg-yellow-500/20 text-yellow-400",
  "pet-photography": "bg-fuchsia-500/20 text-fuchsia-400",
  default: "bg-slate-500/20 text-slate-400",
};

// Border color to glow in on hover — same hue family as the badge, so a
// card's hover state always matches its own category.
export const CATEGORY_HOVER_BORDER_CLASSES = {
  wedding: "hover:border-purple-500/60",
  prenup: "hover:border-orange-500/60",
  "couple-shoot": "hover:border-pink-500/60",
  "family-milestones": "hover:border-green-500/60",
  "portrait-lifestyle": "hover:border-blue-500/60",
  "events-performance": "hover:border-red-500/60",
  "corporate-commercial": "hover:border-indigo-500/60",
  "real-estate": "hover:border-cyan-500/60",
  "product-business": "hover:border-lime-500/60",
  baptism: "hover:border-yellow-500/60",
  "pet-photography": "hover:border-fuchsia-500/60",
  default: "hover:border-slate-500/60",
};

// Low-opacity fill for icon containers on stat cards (ScheduleSummary).
export const CATEGORY_ICON_CLASSES = {
  wedding: "bg-purple-500/10 text-purple-400",
  prenup: "bg-orange-500/10 text-orange-400",
  "couple-shoot": "bg-pink-500/10 text-pink-400",
  "family-milestones": "bg-green-500/10 text-green-400",
  "portrait-lifestyle": "bg-blue-500/10 text-blue-400",
  "events-performance": "bg-red-500/10 text-red-400",
  "corporate-commercial": "bg-indigo-500/10 text-indigo-400",
  "real-estate": "bg-cyan-500/10 text-cyan-400",
  "product-business": "bg-lime-500/10 text-lime-400",
  baptism: "bg-yellow-500/10 text-yellow-400",
  "pet-photography": "bg-fuchsia-500/10 text-fuchsia-400",
  default: "bg-slate-500/10 text-slate-400",
};

// Raw hex values, for anywhere that needs an actual color instead of a
// Tailwind class (e.g. inline SVG fills, chart legends).
export const CATEGORY_HEX = {
  wedding: "#a855f7",
  prenup: "#f97316",
  "couple-shoot": "#ec4899",
  "family-milestones": "#22c55e",
  "portrait-lifestyle": "#3b82f6",
  "events-performance": "#ef4444",
  "corporate-commercial": "#6366f1",
  "real-estate": "#06b6d4",
  "product-business": "#84cc16",
  baptism: "#eab308",
  "pet-photography": "#d946ef",
  default: "#64748b",
};

// Detects the category from an event's `category` and/or `title` text.
// Returns one of the CATEGORY_KEYS above, or "default" — always
// something, so callers never need to handle "no match" separately.
//
// Order matters: more specific keywords are checked before broader
// ones so overlapping terms (e.g. "couple" inside "engagement couple
// shoot") resolve to the right bucket.
export function getEventCategory(event) {
  const category = event?.category?.toString().trim().toLowerCase() || "";
  const title = event?.title?.toString().trim().toLowerCase() || "";
  const value = `${category} ${title}`;

  // Direct key match first (e.g. category field already stores the key).
  if (CATEGORY_KEYS.includes(category)) return category;

  if (value.includes("baptism") || value.includes("christening"))
    return "baptism";

  if (
    value.includes("pet") ||
    value.includes("dog") ||
    value.includes("cat shoot") ||
    value.includes("fur baby")
  )
    return "pet-photography";

  if (value.includes("prenup") || value.includes("pre-nup") || value.includes("pre nup"))
    return "prenup";

  if (value.includes("wedding") || value.includes("marriage"))
    return "wedding";

  if (
    value.includes("couple shoot") ||
    value.includes("couple") ||
    value.includes("anniversary shoot")
  )
    return "couple-shoot";

  if (
    value.includes("real estate") ||
    value.includes("property") ||
    value.includes("listing")
  )
    return "real-estate";

  if (
    value.includes("product") ||
    value.includes("ecommerce") ||
    value.includes("e-commerce") ||
    value.includes("catalog")
  )
    return "product-business";

  if (
    value.includes("corporate") ||
    value.includes("commercial") ||
    value.includes("meeting") ||
    value.includes("conference") ||
    value.includes("headshot")
  )
    return "corporate-commercial";

  if (
    value.includes("event") ||
    value.includes("concert") ||
    value.includes("performance") ||
    value.includes("birthday") ||
    value.includes("bday") ||
    value.includes("debut") ||
    value.includes("graduation") ||
    value.includes("party") ||
    value.includes("celebration")
  )
    return "events-performance";

  if (
    value.includes("family") ||
    value.includes("milestone") ||
    value.includes("maternity") ||
    value.includes("newborn") ||
    value.includes("baby shower") ||
    value.includes("gender reveal")
  )
    return "family-milestones";

  if (
    value.includes("portrait") ||
    value.includes("lifestyle") ||
    value.includes("personal branding") ||
    value.includes("photoshoot") ||
    value.includes("photo shoot")
  )
    return "portrait-lifestyle";

  return "default";
}