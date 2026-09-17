import {
  FaCalendarAlt,
  FaClock,
  FaHeart,
  FaRing,
  FaUserFriends,
  FaBaby,
  FaCamera,
  FaGlassCheers,
  FaBriefcase,
  FaBuilding,
  FaBoxOpen,
  FaDove,
  FaPaw,
  FaEllipsisH,
} from "react-icons/fa";

import {
  getEventCategory,
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  CATEGORY_ICON_CLASSES,
} from "./eventCategory";

// One icon per category. Kept here rather than in eventCategory.js so
// that shared logic file doesn't need to depend on an icon library.
// Keys MUST match the keys in eventCategory.js — if a category is
// added/renamed there, mirror it here or it'll silently fall through
// to the default icon.
const CATEGORY_ICONS = {
  wedding: <FaHeart />,
  prenup: <FaRing />,
  "couple-shoot": <FaUserFriends />,
  "family-milestones": <FaBaby />,
  "portrait-lifestyle": <FaCamera />,
  "events-performance": <FaGlassCheers />,
  "corporate-commercial": <FaBriefcase />,
  "real-estate": <FaBuilding />,
  "product-business": <FaBoxOpen />,
  baptism: <FaDove />,
  "pet-photography": <FaPaw />,
  default: <FaEllipsisH />,
};

// Takes the SAME `events` array passed to Calendar / EventCard /
// TodaySchedule, so these counts always match what's actually on screen.
function ScheduleSummary({ events = [] }) {
  const today = new Date();

  const totalEvents = events.length;

  const upcomingEvents = events.filter((event) => {
    if (!event.start) return false;
    return new Date(event.start) >= today;
  }).length;

  // Count events per category using the same fuzzy detection as the rest
  // of the app, instead of an exact `event.category === "Wedding"` check.
  const categoryCounts = events.reduce((counts, event) => {
    const category = getEventCategory(event);
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});

  // One chip per real category, always — including ones with 0 events,
  // so the row shows the studio's full service lineup at a glance
  // rather than only categories that happen to have bookings today.
  // "Other" (the fuzzy-match fallback) is the exception: it's not a
  // real service category, so it only shows up once something actually
  // lands in it. Order follows CATEGORY_KEYS so the row is stable
  // instead of reshuffling as counts change.
  const categoryCards = [
    ...CATEGORY_KEYS,
    ...(categoryCounts.default > 0 ? ["default"] : []),
  ].map((category) => ({
    key: category,
    title: CATEGORY_LABELS[category],
    value: categoryCounts[category] || 0,
    icon: CATEGORY_ICONS[category] || CATEGORY_ICONS.default,
    iconClass: CATEGORY_ICON_CLASSES[category] || CATEGORY_ICON_CLASSES.default,
  }));

  return (
    <div className="projects-container custom-scrollbar">
    <div className="mb-6 space-y-4">
      {/* Overview row: exactly two cards, always full-width and even —
          this row's length never changes, so a plain 2-column grid is
          the right tool here. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Events"
          value={totalEvents}
          subtitle="Scheduled events"
          icon={<FaCalendarAlt />}
          iconClass="bg-sky-500/10 text-sky-400"
        />
        <StatCard
          title="Upcoming"
          value={upcomingEvents}
          subtitle="Future sessions"
          icon={<FaClock />}
          iconClass="bg-sky-500/10 text-sky-400"
        />
      </div>

      {/* Category breakdown: up to 12 possible categories. Rather than
          a horizontally-scrolling strip, this wraps into a responsive
          grid so every category is visible at once without scrolling —
          fewer columns (and more rows) on narrow viewports, up to one
          full row on very wide screens. */}
      {categoryCards.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            By Category
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-11 gap-3">
            {categoryCards.map((card) => (
              <CategoryChip key={card.key} {...card} />
            ))}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

// Shared stat-card presentation — used for the two pinned overview cards.
function StatCard({ title, value, subtitle, icon, iconClass }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>

        <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${iconClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Compact category chip — icon + count on one row, label below. Fills
// its grid cell rather than a fixed width, so it scales cleanly across
// the responsive column counts above.
// Zero-count categories are dimmed rather than hidden, so the full
// service lineup stays visible without competing visually with the
// categories that actually have bookings.
function CategoryChip({ title, value, icon, iconClass }) {
  const isEmpty = value === 0;

  return (
    <div
      className={`
        min-w-0
        bg-slate-900
        border
        border-slate-700
        rounded-xl
        p-3
        hover:border-slate-600
        transition
        ${isEmpty ? "opacity-50" : ""}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
            isEmpty ? "bg-slate-800 text-slate-500" : iconClass
          }`}
        >
          {icon}
        </div>
        <span className={`text-xl font-bold ${isEmpty ? "text-slate-500" : "text-white"}`}>
          {value}
        </span>
      </div>
      <p className="text-xs text-slate-400 leading-tight truncate" title={title}>
        {title}
      </p>
    </div>
  );
}

export default ScheduleSummary;