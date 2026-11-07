import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CATEGORY_LABELS,
  getEventCategory,
} from "./eventCategory";
import {
  FaTimes,
  FaUser,
  FaCalendarAlt,
  FaClock,
  FaCamera,
  FaTag,
  FaStickyNote,
  FaTrash,
  FaEdit,
  FaCheckCircle,
} from "react-icons/fa";
// The team is saved as text: "Juan (Photographer) · Maria (Videographer)".
// This turns it back into [{ name, position }] so it can be shown as a list.
const MEMBER_SEPARATOR = "·";
function parseTeam(text) {
  return String(text || "")
    .split(MEMBER_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
      if (match && match[1]) {
        return { name: match[1].trim(), position: match[2].trim() };
      }
      return { name: part, position: "" };
    });
}
function formatCallTime(value) {
  if (!value) return null;
  const [hours, minutes] = String(value).slice(0, 5).split(":").map(Number);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 || hours > 23 ||
    minutes < 0 || minutes > 59
  ) return value;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function EventDetailsModal({
  open,
  event,
  onClose,
  onEdit,
  onDelete,
  onComplete,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    if (!open || !event) {
      setIsVisible(false);
      return;
    }
    setIsMounted(true);
    setIsVisible(false);
    // Give the browser time to render the initial hidden state.
    let firstFrame;
    let secondFrame;
    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [open, event]);
  const handleClose = () => {
    setIsVisible(false);
  };
  const handleTransitionEnd = (e) => {
    if (
      e.target === e.currentTarget &&
      e.propertyName === "opacity" &&
      !isVisible
    ) {
      setIsMounted(false);
      onClose();
    }
  };
  // Keep the modal mounted long enough to animate out.
  if (!isMounted || !event) return null;
  const isLinked = Boolean(event.project_id);
  const isCompleted = event.status === "completed";
  const team = parseTeam(event.photographer);
  return createPortal(
    <div
      className={`
        fixed inset-0 z-[99999]
        flex items-center justify-center
        overflow-y-auto p-4
        bg-slate-950/60 backdrop-blur-sm
        transition-opacity duration-200 ease-out
        ${
          isVisible
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }
        motion-reduce:transition-none
      `}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      onTransitionEnd={handleTransitionEnd}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-details-title"
        className={`
          my-auto w-full max-w-2xl
          max-h-[calc(100dvh-2rem)] overflow-y-auto
          rounded-3xl border border-slate-200
          bg-white p-6 shadow-2xl sm:p-7
          transition-all duration-300 ease-out
          dark:border-slate-700 dark:bg-slate-900
          ${
            isVisible
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-2 scale-[0.97] opacity-0"
          }
          motion-reduce:transform-none
          motion-reduce:transition-none
        `}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-7 flex items-start justify-between gap-4">
          <h2
            id="event-details-title"
            className="min-w-0 break-words text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl"
          >
            {event.title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close event details"
            className="
              flex h-9 w-9 shrink-0 items-center justify-center
              rounded-lg text-slate-500
              transition-all duration-200 ease-out
              hover:scale-105 hover:bg-red-50 hover:text-red-500
              active:scale-95
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-sky-500
              dark:text-slate-400 dark:hover:bg-red-500/10
              dark:hover:text-red-400
            "
          >
            <FaTimes size={20} />
          </button>
        </div>
        {/* Event information */}
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/80 dark:bg-slate-800/50">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500"><FaUser /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Client</p>
                <p className="mt-1 break-words font-semibold text-slate-800 dark:text-slate-100">{event.client || "No client"}</p>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/80 dark:bg-slate-800/50">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500"><FaCalendarAlt /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Event date</p>
                <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{event.start ? event.start.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : event.date || "No date"}</p>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/80 dark:bg-slate-800/50">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500"><FaClock /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Event schedule</p>
                <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
                  {event.start ? event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : event.time}
                  {event.end && <>{" – "}{event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>}
                </p>
              </div>
            </div>
            {event.call_time && (
              <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/[0.07] p-4 dark:border-sky-400/25 dark:bg-sky-400/[0.08]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-500"><FaClock /></span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-300">Photographer call time</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{formatCallTime(event.call_time)}</p>
                </div>
              </div>
            )}
            <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/80 dark:bg-slate-800/50">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500"><FaTag /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Category</p>
                <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{CATEGORY_LABELS[getEventCategory({ category: event.category || event.type, title: event.title })] || CATEGORY_LABELS.default}</p>
              </div>
            </div>
          </div>
          {/* Team */}
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700/80">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500"><FaCamera /></span>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Assigned team</p>
              {team.length > 0 && <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-600 dark:text-sky-300">{team.length}</span>}
            </div>
            {team.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No team members assigned yet.</p>
            ) : (
              <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                {team.map((member, index) => (
                  <li key={`${member.name}-${index}`} className="flex items-center justify-between gap-3 bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
                    <span className="min-w-0 break-words text-sm font-medium text-slate-800 dark:text-slate-100">{member.name}</span>
                    {member.position && <span className="shrink-0 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-300">{member.position}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700/80">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500"><FaStickyNote /></span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Notes</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">{event.notes || "No notes available."}</p>
            </div>
          </div>
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${isCompleted ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
            <FaCheckCircle className={isCompleted ? "shrink-0 text-emerald-500" : "shrink-0 text-slate-400"} />
            {isCompleted ? "Shoot marked complete" : isLinked ? "Linked to a project — not completed yet" : "Not linked to a project"}
          </div>
        </div>
        {/* Actions */}
        <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
          <button
            type="button"
            onClick={() => onDelete(event.id)}
            className="
              flex items-center gap-2 rounded-xl
              border border-red-200 bg-red-50 px-4 py-2
              font-semibold text-red-700
              transition-all duration-200 ease-out
              hover:-translate-y-0.5 hover:bg-red-100
              active:translate-y-0
              dark:border-red-500/30 dark:bg-red-500/10
              dark:text-red-300 dark:hover:bg-red-500/20
            "
          >
            <FaTrash />
            Delete
          </button>
          <button
            type="button"
            onClick={() => onEdit(event)}
            className="
              flex items-center gap-2 rounded-xl
              border border-sky-200 bg-sky-50 px-4 py-2
              font-semibold text-sky-700
              transition-all duration-200 ease-out
              hover:-translate-y-0.5 hover:bg-sky-100
              active:translate-y-0
              dark:border-sky-500/30 dark:bg-sky-500/10
              dark:text-sky-300 dark:hover:bg-sky-500/20
            "
          >
            <FaEdit />
            Edit
          </button>
          {isLinked && !isCompleted && (
            <button
              type="button"
              onClick={() => onComplete(event)}
              className="
                flex items-center gap-2 rounded-xl
                border border-emerald-200 bg-emerald-50 px-4 py-2
                font-semibold text-emerald-700
                transition-all duration-200 ease-out
                hover:-translate-y-0.5 hover:bg-emerald-100
                active:translate-y-0
                dark:border-emerald-500/30 dark:bg-emerald-500/10
                dark:text-emerald-300 dark:hover:bg-emerald-500/20
              "
            >
              <FaCheckCircle />
              Complete
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
export default EventDetailsModal;
