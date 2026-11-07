import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FaRegCommentDots, FaSearch, FaTrash } from "react-icons/fa";
import { supabase } from "../lib/supabaseClient";
import ChatThread, { ChatAvatar, ReadTick, timeLabel } from "../components/Chat/ChatThread";

/*
  Photographer inbox: conversation list on the left, chat on the right.
  Uses the `messages` table from messages.sql.
  Client full names come from their registration metadata through a
  restricted Supabase RPC. Falls back to email, then "Client".
  Delete: either hide the conversation (messages kept) or delete it with all its messages.
*/

const listTime = (iso) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? timeLabel(iso)
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function PhotographersInbox() {
  // The dashboard layout keeps its loading screen up until the page says it's ready.
  const outlet = useOutletContext() || {};
  const { reportPageReady, routeKey } = outlet;

  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [clientIdentities, setClientIdentities] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState({}); // client_id -> timestamp of last msg when hidden
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && typeof reportPageReady === "function") reportPageReady(routeKey);
  }, [loading, reportPageReady, routeKey]);

  // Look up registered names and emails for participants in this
  // photographer's conversations. The server verifies auth.uid().
  const loadClientIdentities = useCallback(async (ids) => {
    const clientIds = [...new Set(ids.filter(Boolean))];
    if (!clientIds.length) return;

    const { data, error: identityError } = await supabase.rpc(
      "inbox_client_identities",
      { p_client_ids: clientIds }
    );

    if (identityError) {
      console.warn("Couldn't load client names:", identityError.message);
      return;
    }

    setClientIdentities((prev) => ({
      ...prev,
      ...Object.fromEntries(
        (data || [])
          .filter((row) => row.client_id)
          .map((row) => [
            row.client_id,
            {
              name: row.display_name || row.email || "Client",
              email: row.email || "",
            },
          ])
      ),
    }));
  }, []);

  const clientName = (id) => clientIdentities[id]?.name || "Client";
  const clientEmail = (id) => clientIdentities[id]?.email || "";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const id = data?.user?.id ?? null;
      setUserId(id);
      if (!id) setLoading(false);
    });
  }, []);

  // Conversations this photographer removed from the inbox (messages kept)
  useEffect(() => {
    if (!userId) return;
    try {
      setHidden(JSON.parse(localStorage.getItem(`hiddenConvos:${userId}`) || "{}"));
    } catch {
      setHidden({});
    }
  }, [userId]);

  // Load everything once, then listen for new messages, read receipts and deletions.
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
        loadClientIdentities([...new Set((data || []).map((m) => m.client_id))]);
      }
      setLoading(false);
    })();

    const filter = `photographer_id=eq.${userId}`;
    const channel = supabase
      .channel(`inbox:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter }, (payload) => {
        const row = payload.new;
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        loadClientIdentities([row.client_id]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter }, (payload) => {
        const row = payload.new;
        setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, read_at: row.read_at } : m)));
      })
      // DELETE events can't be filtered by photographer_id, but we only remove ids we already have
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
        const id = payload.old?.id;
        if (!id) return;
        setMessages((prev) => prev.filter((m) => m.id !== id));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, loadClientIdentities]);

  // One row per client: latest message and unread count, newest first.
  const conversations = useMemo(() => {
    const map = new Map();
    for (const m of messages) {
      const c = map.get(m.client_id) || { clientId: m.client_id, last: m, unread: 0 };
      c.last = m;
      if (m.sender_id !== userId && !m.read_at) c.unread += 1;
      map.set(m.client_id, c);
    }
    return [...map.values()]
      .filter((c) => {
        const h = hidden[c.clientId];
        if (!h) return true;
        // show it again only if a newer message arrived after it was hidden
        return new Date(c.last.created_at).getTime() > h;
      })
      .sort((a, b) => new Date(b.last.created_at) - new Date(a.last.created_at));
  }, [messages, userId, hidden]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        (clientIdentities[c.clientId]?.name || "Client").toLowerCase().includes(q) ||
        (clientIdentities[c.clientId]?.email || "").toLowerCase().includes(q) ||
        c.last.body.toLowerCase().includes(q)
    );
  }, [conversations, clientIdentities, query]);

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

  const persistHidden = (next) => {
    setHidden(next);
    try {
      localStorage.setItem(`hiddenConvos:${userId}`, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  // Option 1: remove from inbox, keep messages
  const hideConversation = () => {
    const last = thread[thread.length - 1];
    const stamp = last ? new Date(last.created_at).getTime() : 1;
    persistHidden({ ...hidden, [activeId]: stamp });
    setConfirmOpen(false);
    setActiveId(null);
  };

  // Option 2: remove from inbox and permanently delete all messages
  const deleteConversationAndMessages = async () => {
    if (!userId || !activeId) return;
    setDeleting(true);
    setError("");
    const hadMessages = thread.length > 0;

    const { data, error: delError } = await supabase
      .from("messages")
      .delete()
      .eq("photographer_id", userId)
      .eq("client_id", activeId)
      .select("id");

    setDeleting(false);
    setConfirmOpen(false);

    if (delError || (hadMessages && (!data || data.length === 0))) {
      console.error("Failed to delete messages:", delError);
      setError(
        delError
          ? `Couldn't delete messages: ${delError.message}`
          : "Couldn't delete messages (permission denied)."
      );
      return;
    }

    setMessages((prev) => prev.filter((m) => m.client_id !== activeId));
    const { [activeId]: _removed, ...rest } = hidden;
    persistHidden(rest);
    setActiveId(null);
  };

  const activeName = clientName(activeId);
  const activeEmail = clientEmail(activeId);
  const panel =
    "min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 dark:border-slate-700/80 dark:bg-[#0B1628] dark:shadow-black/10";

  return (
    <div className="grid h-[calc(100dvh-8rem)] min-h-[480px] gap-4 md:grid-cols-[320px_1fr]">
      {/* Conversation list */}
      <aside className={`${activeId ? "hidden md:flex" : "flex"} ${panel} flex-col`}>
        <div className="space-y-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Messages
          </h2>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 focus-within:border-sky-500 dark:border-slate-700 dark:bg-slate-900">
            <FaSearch className="text-xs text-slate-500" aria-hidden="true" />

            <label htmlFor="inbox-search" className="sr-only">
              Search conversations
            </label>

            <input
              id="inbox-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              className="h-9 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-500"
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
              <FaRegCommentDots className="text-2xl text-slate-400 dark:text-slate-600" />

              <p className="font-medium text-slate-700 dark:text-slate-300">
                No messages yet
              </p>

              <p>
                When a client writes to you, the conversation will show up here.
              </p>
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
                      onClick={() => {
                        setError("");
                        setActiveId(c.clientId);
                      }}
                      aria-current={active}
                      className={`flex w-full items-center gap-3 border-l-[3px] px-4 py-3 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 dark:hover:bg-slate-800/60 ${
                        active
                          ? "border-blue-500 bg-blue-50 dark:bg-slate-800/70"
                          : "border-transparent"
                      }`}
                    >
                      <ChatAvatar name={clientName(c.clientId)} className="h-11 w-11" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span
                            className="truncate text-sm font-semibold text-slate-900 dark:text-white"
                            title={clientName(c.clientId)}
                          >
                            {clientName(c.clientId)}
                          </span>
                          <span className="shrink-0 text-[11px] text-slate-500">
                          {listTime(c.last.created_at)}
                        </span>
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span className={`truncate text-xs ${
                            c.unread
                              ? "font-semibold text-slate-700 dark:text-slate-200"
                              : "text-slate-500 dark:text-slate-400"
                          }`}>
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
      <section className={`${activeId ? "flex flex-col" : "hidden md:block"} ${panel}`}>
        {!activeId ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-500">
            <FaRegCommentDots className="text-3xl text-slate-400 dark:text-slate-600" />
            Select a conversation to start chatting.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-end border-b border-slate-200 px-3 py-1.5 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              >
                <FaTrash className="text-[11px]" /> Delete
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ChatThread
                key={activeId}
                name={activeName}
                subtitle={activeEmail && activeEmail !== activeName ? activeEmail : "Client"}
                messages={thread}
                myId={userId}
                onSend={send}
                onBack={() => setActiveId(null)}
                error={error}
              />
            </div>
          </>
        )}
      </section>

      {/* Delete confirmation */}
      {confirmOpen && activeId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !deleting && setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-[#0B1628]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Delete conversation with {activeName}?
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choose what you'd like to delete.</p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                disabled={deleting}
                onClick={hideConversation}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-white/[0.04]"
              >
                <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Delete conversation
                </span>
                <span className="block text-xs text-slate-500">
                  Removes it from your inbox. Messages are kept and it returns if a new message arrives.
                </span>
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={deleteConversationAndMessages}
                className="w-full rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-left transition hover:bg-red-100 disabled:opacity-50 dark:border-red-500/40 dark:bg-red-500/10 dark:hover:bg-red-500/20"
              >
                <span className="block text-sm font-semibold text-red-700 dark:text-red-300">
                  {deleting ? "Deleting..." : "Delete conversation and messages"}
                </span>
                <span className="block text-xs text-red-600/80 dark:text-red-300/70">
                  Permanently deletes all messages. This also removes them for {activeName} and can't be undone.
                </span>
              </button>
            </div>

            <button
              type="button"
              disabled={deleting}
              onClick={() => setConfirmOpen(false)}
              className="mt-3 w-full rounded-full py-2 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}