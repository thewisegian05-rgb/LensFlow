import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FaRegCommentDots, FaSearch } from "react-icons/fa";
import { supabase } from "../lib/supabaseClient";
import ChatThread, { ChatAvatar, ReadTick, timeLabel } from "../components/Chat/ChatThread";

/*
  Photographer inbox: conversation list on the left, chat on the right.
  Uses the `messages` table from messages.sql.
  Client names come from the `profiles` table (any of full_name, name,
  display_name, username or email). Unknown clients show as "Client".
*/

const listTime = (iso) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? timeLabel(iso)
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const pickName = (row) =>
  row.full_name || row.name || row.display_name || row.username || row.email || "Client";

export default function PhotographersInbox() {
  // The dashboard layout keeps its loading screen up until the page says it's ready.
  const outlet = useOutletContext() || {};
  const { reportPageReady, routeKey } = outlet;

  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [names, setNames] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && typeof reportPageReady === "function") reportPageReady(routeKey);
  }, [loading, reportPageReady, routeKey]);

  const loadNames = useCallback(async (ids) => {
    if (!ids.length) return;
    const { data, error: nameError } = await supabase.from("profiles").select("*").in("id", ids);
    if (nameError) return console.warn("Couldn't load client names:", nameError.message);
    setNames((prev) => ({
      ...prev,
      ...Object.fromEntries((data || []).map((p) => [p.id, pickName(p)])),
    }));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const id = data?.user?.id ?? null;
      setUserId(id);
      if (!id) setLoading(false);
    });
  }, []);

  // Load everything once, then listen for new messages and read receipts.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      // Fetch newest first so limit(1000) keeps the LATEST 1000 messages.
      // (ascending: true would keep the oldest 1000 and hide recent ones once
      // the photographer passes 1000 total messages.) We reverse the result
      // afterwards because the rest of this component expects oldest→newest.
      const { data, error: loadError } = await supabase
        .from("messages")
        .select("id, client_id, sender_id, body, read_at, created_at")
        .eq("photographer_id", userId)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (cancelled) return;
      if (loadError) {
        console.error("Failed to load inbox:", loadError);
        setError("Couldn't load your inbox. Check your connection and try again.");
      } else {
        setMessages((data || []).reverse());
        loadNames([...new Set((data || []).map((m) => m.client_id))]);
      }
      setLoading(false);
    })();

    const filter = `photographer_id=eq.${userId}`;
    const channel = supabase
      .channel(`inbox:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter }, (payload) => {
        const row = payload.new;
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        loadNames([row.client_id]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter }, (payload) => {
        const row = payload.new;
        setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, read_at: row.read_at } : m)));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, loadNames]);

  // One row per client: latest message and unread count, newest first.
  const conversations = useMemo(() => {
    const map = new Map();
    for (const m of messages) {
      const c = map.get(m.client_id) || { clientId: m.client_id, last: m, unread: 0 };
      c.last = m;
      if (m.sender_id !== userId && !m.read_at) c.unread += 1;
      map.set(m.client_id, c);
    }
    return [...map.values()].sort((a, b) => new Date(b.last.created_at) - new Date(a.last.created_at));
  }, [messages, userId]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        (names[c.clientId] || "client").toLowerCase().includes(q) ||
        c.last.body.toLowerCase().includes(q)
    );
  }, [conversations, names, query]);

  const thread = useMemo(() => messages.filter((m) => m.client_id === activeId), [messages, activeId]);

  // Opening a thread (or receiving into it) marks the client's messages as read.
  useEffect(() => {
    if (!activeId || !userId) return;
    const unreadIds = thread.filter((m) => m.sender_id !== userId && !m.read_at).map((m) => m.id);
    if (!unreadIds.length) return;
    const now = new Date().toISOString();
    setMessages((prev) => prev.map((m) => (unreadIds.includes(m.id) ? { ...m, read_at: now } : m)));
    supabase
      .from("messages")
      .update({ read_at: now })
      .in("id", unreadIds)
      .then(({ error: e }) => {
        if (e) console.warn("Couldn't mark as read:", e.message);
      });
  }, [thread, activeId, userId]);

  const send = async (body) => {
    setError("");
    const { data, error: sendError } = await supabase
      .from("messages")
      .insert({ photographer_id: userId, client_id: activeId, sender_id: userId, body })
      .select("id, client_id, sender_id, body, read_at, created_at")
      .single();

    if (sendError) {
      console.error("Failed to send reply:", sendError);
      setError("Message not sent. Your text is still in the box, so you can try again.");
      return false;
    }
    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
    return true;
  };

  const activeName = names[activeId] || "Client";
  const panel = "min-h-0 overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0B1628] shadow-sm shadow-black/10";

  return (
    <div className="grid h-[calc(100dvh-8rem)] min-h-[480px] gap-4 md:grid-cols-[320px_1fr]">
      {/* Conversation list */}
      <aside className={`${activeId ? "hidden md:flex" : "flex"} ${panel} flex-col`}>
        <div className="space-y-3 border-b border-slate-800 px-4 py-4">
          <h2 className="text-base font-bold text-white">Messages</h2>
          <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 focus-within:border-sky-500">
            <FaSearch className="text-xs text-slate-500" aria-hidden="true" />
            <label htmlFor="inbox-search" className="sr-only">Search conversations</label>
            <input
              id="inbox-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              className="h-9 w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-3" aria-label="Loading inbox">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-800" />
              ))}
            </div>
          ) : error && conversations.length === 0 ? (
            <p role="alert" className="px-4 py-6 text-sm text-rose-300">{error}</p>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-slate-500">
              <FaRegCommentDots className="text-2xl text-slate-600" />
              <p className="font-medium text-slate-300">No messages yet</p>
              <p>When a client writes to you, the conversation will show up here.</p>
            </div>
          ) : visible.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No conversations match “{query}”.</p>
          ) : (
            <ul>
              {visible.map((c) => {
                const active = c.clientId === activeId;
                const mine = c.last.sender_id === userId;
                return (
                  <li key={c.clientId}>
                    <button
                      type="button"
                      onClick={() => setActiveId(c.clientId)}
                      aria-current={active}
                      className={`flex w-full items-center gap-3 border-l-[3px] px-4 py-3 text-left transition hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 ${
                        active ? "border-blue-500 bg-slate-800/70" : "border-transparent"
                      }`}
                    >
                      <ChatAvatar name={names[c.clientId]} className="h-11 w-11" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-white">
                            {names[c.clientId] || "Client"}
                          </span>
                          <span className="shrink-0 text-[11px] text-slate-500">
                            {listTime(c.last.created_at)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span className={`truncate text-xs ${c.unread ? "font-semibold text-slate-200" : "text-slate-400"}`}>
                            {mine ? "You: " : ""}
                            {c.last.body}
                          </span>
                          {c.unread > 0 ? (
                            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                              {c.unread > 9 ? "9+" : c.unread}
                            </span>
                          ) : (
                            mine && <ReadTick message={c.last} className="shrink-0 text-[10px] text-slate-500" />
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Chat */}
      <section className={`${activeId ? "block" : "hidden md:block"} ${panel}`}>
        {!activeId ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-500">
            <FaRegCommentDots className="text-3xl text-slate-600" />
            Select a conversation to start chatting.
          </div>
        ) : (
          <ChatThread
            key={activeId}
            name={activeName}
            subtitle="Client"
            messages={thread}
            myId={userId}
            onSend={send}
            onBack={() => setActiveId(null)}
            error={error}
          />
        )}
      </section>
    </div>
  );
}
