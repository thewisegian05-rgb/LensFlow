
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaPaperPlane,
  FaRegCommentDots,
  FaArrowLeft,
  FaCheck,
  FaCheckDouble,
} from "react-icons/fa";

/*
  Shared chat pane: header, scrolling conversation and composer.
  Used by the photographer inbox and the client Messages tab.

  messages: [{ id, sender_id, body, created_at, read_at?, pending? }]
  onSend(body) -> true/false. On false the text is put back in the box.
  Give it a `key` (e.g. the client id) so the draft resets when you switch chats.
*/

export const timeLabel = (iso) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

const dayLabel = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export function ChatAvatar({ name, className = "h-10 w-10" }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold uppercase text-blue-700 ring-2 ring-blue-200 dark:bg-blue-950 dark:text-sky-300 dark:ring-blue-500/40 ${className}`}
    >
      {(name?.trim()?.[0] || "C").toUpperCase()}
    </span>
  );
}

// Sent = one tick, read = two sky-colored ticks.
export function ReadTick({ message, className = "" }) {
  if (message.pending) return null;

  return message.read_at ? (
    <FaCheckDouble
      className={`text-sky-500 dark:text-sky-300 ${className}`}
      aria-label="Read"
    />
  ) : (
    <FaCheck
      className={`opacity-70 ${className}`}
      aria-label="Sent"
    />
  );
}

const patternStyle = {
  backgroundImage:
    "radial-gradient(rgba(148,163,184,0.12) 1px, transparent 1px)",
  backgroundSize: "20px 20px",
};

export default function ChatThread({
  name,
  subtitle,
  avatar,
  messages,
  myId,
  onSend,
  onBack,
  loading = false,
  error = "",
  disabled = false,
  emptyTitle = "No messages yet",
  emptyText = "",
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Insert a date pill whenever the day changes.
  const rows = useMemo(() => {
    const out = [];
    let lastDay = "";

    for (const m of messages) {
      const day = new Date(m.created_at).toDateString();

      if (day !== lastDay) {
        out.push({
          type: "day",
          key: `day-${day}`,
          label: dayLabel(m.created_at),
        });
        lastDay = day;
      }

      out.push({ type: "msg", key: m.id, message: m });
    }

    return out;
  }, [messages]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, loading]);

  // Grow the box with the text, up to a limit.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [draft]);

  const submit = async () => {
    const body = draft.trim();

    if (!body || sending || disabled) return;

    setSending(true);
    setDraft("");

    let ok = true;

    try {
      ok = (await onSend(body)) !== false;
    } catch {
      ok = false;
    }

    if (!ok) setDraft(body);

    setSending(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-white dark:bg-[#0B1628]">

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#0B1628]">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to all conversations"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
          >
            <FaArrowLeft />
          </button>
        )}

        {avatar || <ChatAvatar name={name} />}

        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {name}
          </h3>

          {subtitle && (
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label={`Conversation with ${name}`}
        style={patternStyle}
        className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6 dark:bg-[#08111f]"
      >
        {loading ? (
          <div className="space-y-3" aria-label="Loading messages">
            <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800/80" />
            <div className="ml-auto h-10 w-1/2 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800/80" />
            <div className="h-10 w-1/2 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800/80" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-slate-500 dark:text-slate-500">
            <FaRegCommentDots className="text-3xl text-slate-400 dark:text-slate-600" />

            <p className="font-medium text-slate-700 dark:text-slate-300">
              {emptyTitle}
            </p>

            {emptyText && (
              <p className="max-w-xs">{emptyText}</p>
            )}
          </div>
        ) : (
          rows.map((row) => {
            if (row.type === "day") {
              return (
                <div key={row.key} className="flex justify-center py-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {row.label}
                  </span>
                </div>
              );
            }

            const m = row.message;
            const mine = m.sender_id === myId;

            return (
              <div
                key={row.key}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm sm:max-w-[65%] ${
                    mine
                      ? "rounded-br-md bg-blue-600 text-white"
                      : "rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  } ${m.pending ? "opacity-70" : ""}`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {m.body}
                  </p>

                  <p
                    className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
                      mine
                        ? "text-blue-100"
                        : "text-slate-400 dark:text-slate-400"
                    }`}
                  >
                    {m.pending ? "Sending…" : timeLabel(m.created_at)}

                    {mine && (
                      <ReadTick message={m} className="text-[10px]" />
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Error message */}
      {error && (
        <p
          role="alert"
          className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {/* Composer */}
      <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0B1628]">
        <div className="flex items-end gap-2 rounded-3xl border border-slate-200 bg-slate-50 py-1.5 pl-4 pr-1.5 focus-within:border-sky-500 dark:border-slate-700 dark:bg-slate-900">
          <label htmlFor="chat-input" className="sr-only">
            Message {name}
          </label>

          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={2000}
            disabled={disabled}
            placeholder="Write a message"
            className="max-h-32 min-h-[36px] flex-1 resize-none self-center bg-transparent py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50 dark:text-white dark:placeholder:text-slate-500"
          />

          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim() || sending || disabled}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
            <FaPaperPlane className="text-xs" />
          </button>
        </div>
      </div>
    </div>
  );
}
