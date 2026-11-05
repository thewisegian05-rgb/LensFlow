import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FaSearch, FaCamera, FaArrowLeft, FaCommentDots } from "react-icons/fa";
import Avatar from "../components/ui/Avatar";
import ChatThread from "../../../components/Chat/ChatThread";
import { supabase } from "../../../lib/supabaseClient";
import { getFeaturedPhotoSignedUrl, getProfile } from "../utils/portalUrls";

/*
  Client Messages page (inbox):
  - left: every photographer you are connected to, with the last message and unread count
  - right: the conversation with the selected photographer
  Table `messages` (see messages.sql).
*/

const MSG_COLUMNS = "id, photographer_id, sender_id, body, read_at, created_at";

const formatWhen = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
};

function Thumb({ url, size = "h-11 w-11" }) {
  return url ? (
    <img src={url} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-400`}
    >
      <FaCamera className="text-sm" />
    </span>
  );
}

export default function MessageTab() {
  const { portal, activeId } = /** @type {any} */ (useOutletContext());

  const [userId, setUserId] = useState(null);
  const [connections, setConnections] = useState([]);
  const [connLoading, setConnLoading] = useState(true);
  const [profiles, setProfiles] = useState({}); // photographer_id -> { name, avatarUrl }
  const [all, setAll] = useState([]); // every message of this client
  const [msgLoading, setMsgLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const didInit = useRef(false);

  // Who is the signed-in client?
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const id = data?.user?.id ?? null;
      setUserId(id);
      if (!id) setMsgLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // All connected photographers + their names/avatars
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: connError } = await supabase.rpc("my_connections");
      if (cancelled) return;
      if (connError) {
        console.error("Failed to load connections:", connError.message);
        setError("Couldn't load your conversations.");
        setConnLoading(false);
        return;
      }
      const rows = Array.isArray(data) ? data : [];
      setConnections(rows);
      setConnLoading(false);

      rows.forEach(async (c) => {
        const id = c.photographer_id;
        if (!id) return;
        const { data: p } = await supabase.rpc("get_portal", { p_photographer_id: id });
        if (!p || cancelled) return;
        let prof = {};
        try {
          prof = getProfile(p) || {};
        } catch {
          prof = {};
        }
        const path = prof.avatar_path || p.avatar_path || null;
        let avatarUrl = null;
        if (path) {
          try {
            avatarUrl = /^https?:\/\//i.test(path) ? path : await getFeaturedPhotoSignedUrl(path);
          } catch {
            avatarUrl = null;
          }
        }
        if (cancelled) return;
        setProfiles((prev) => ({
          ...prev,
          [id]: { name: prof.display_name || prof.username || prof.name || null, avatarUrl },
        }));
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Open the photographer you were viewing (once)
  useEffect(() => {
    if (didInit.current || connections.length === 0) return;
    didInit.current = true;
    if (activeId && connections.some((c) => c.photographer_id === activeId)) {
      setSelectedId(activeId);
    }
  }, [connections, activeId]);

  // Load every message, then listen for new ones and read receipts
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      setMsgLoading(true);
      const { data, error: loadError } = await supabase
        .from("messages")
        .select(MSG_COLUMNS)
        .eq("client_id", userId)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (cancelled) return;
      if (loadError) {
        console.error("Failed to load messages:", loadError);
        setError("Couldn't load your messages. Check your connection and try again.");
      } else {
        setAll((data || []).slice().reverse());
      }
      setMsgLoading(false);
    })();

    const filter = `client_id=eq.${userId}`;
    const channel = supabase
      .channel(`inbox:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter }, (payload) => {
        const row = payload.new;
        setAll((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter }, (payload) => {
        const row = payload.new;
        setAll((prev) => prev.map((m) => (m.id === row.id ? { ...m, read_at: row.read_at } : m)));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const nameOf = (c) => profiles[c.photographer_id]?.name || c.display_name || "Photographer";

  // One row per photographer, newest conversation first
  const conversations = useMemo(() => {
    const list = connections
      .filter((c) => c.photographer_id)
      .map((c) => {
        const id = c.photographer_id;
        const msgs = all.filter((m) => m.photographer_id === id);
        const last = msgs[msgs.length - 1] || null;
        const unread = msgs.filter((m) => m.sender_id !== userId && !m.read_at && !m.pending).length;
        return {
          id,
          name: nameOf(c),
          avatarUrl: profiles[id]?.avatarUrl || null,
          last,
          unread,
        };
      });
    list.sort((a, b) => {
      const ta = a.last ? new Date(a.last.created_at).getTime() : 0;
      const tb = b.last ? new Date(b.last.created_at).getTime() : 0;
      return tb - ta || a.name.localeCompare(b.name);
    });
    const term = search.trim().toLowerCase();
    return term
      ? list.filter((c) => c.name.toLowerCase().includes(term) || (c.last?.body || "").toLowerCase().includes(term))
      : list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections, all, profiles, userId, search]);

  const selected = selectedId ? conversations.find((c) => c.id === selectedId) || null : null;
  const threadMessages = useMemo(
    () => (selectedId ? all.filter((m) => m.photographer_id === selectedId) : []),
    [all, selectedId]
  );
  const isSelf = Boolean(userId && selectedId && userId === selectedId);

  // Messages from the photographer count as read while their chat is open
  useEffect(() => {
    if (!userId || !selectedId) return;
    const ids = threadMessages
      .filter((m) => m.sender_id !== userId && !m.read_at && !m.pending)
      .map((m) => m.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    setAll((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, read_at: now } : m)));
    supabase
      .from("messages")
      .update({ read_at: now })
      .in("id", ids)
      .then(({ error: e }) => {
        if (e) console.warn("Couldn't mark as read:", e.message);
      });
  }, [threadMessages, userId, selectedId]);

  const send = async (body) => {
    if (!selectedId || !userId) return false;
    const tempId = `temp-${Date.now()}`;
    setError("");
    setAll((prev) => [
      ...prev,
      {
        id: tempId,
        photographer_id: selectedId,
        sender_id: userId,
        body,
        created_at: new Date().toISOString(),
        pending: true,
      },
    ]);

    const { data, error: sendError } = await supabase
      .from("messages")
      .insert({ photographer_id: selectedId, client_id: userId, sender_id: userId, body })
      .select(MSG_COLUMNS)
      .single();

    if (sendError) {
      console.error("Failed to send message:", sendError);
      setAll((prev) => prev.filter((m) => m.id !== tempId));
      setError(
        sendError.code === "23514"
          ? "You can't message yourself. You're signed in as this photographer, so use a different client account."
          : `Message not sent: ${sendError.message || "unknown error"}${
              sendError.code ? ` (code ${sendError.code})` : ""
            }`
      );
      return false;
    }

    setAll((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== tempId);
      return withoutTemp.some((m) => m.id === data.id) ? withoutTemp : [...withoutTemp, data];
    });
    return true;
  };

  const card =
    "overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0B1628] shadow-sm shadow-black/10";

  return (
    <div className="grid h-[calc(100dvh-8rem)] min-h-[480px] min-w-0 gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Conversations */}
      <section className={`${card} ${selectedId ? "hidden lg:flex" : "flex"} min-h-0 flex-col`}>
        <div className="space-y-3 border-b border-slate-800 p-3">
          <h2 className="text-sm font-bold text-white">Messages</h2>
          <label className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#0B1120] px-3 py-2 text-xs text-slate-400 focus-within:border-sky-500">
            <FaSearch className="shrink-0 text-[11px]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              className="min-w-0 flex-1 bg-transparent text-slate-200 outline-none placeholder:text-slate-500"
            />
          </label>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
          {connLoading ? (
            <p className="px-4 py-10 text-center text-xs text-slate-500">Loading conversations...</p>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
              <FaCommentDots className="mb-2 text-xl text-slate-600" />
              <p className="text-sm font-semibold text-slate-200">
                {search.trim() ? "No matches" : "No conversations yet"}
              </p>
              <p className="text-xs text-slate-500">
                {search.trim()
                  ? "Try a different name or word."
                  : "Connect with a photographer to start chatting."}
              </p>
            </div>
          ) : (
            <ul>
              {conversations.map((c) => {
                const on = c.id === selectedId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setSelectedId(c.id);
                      }}
                      className={`flex w-full items-center gap-3 border-l-4 px-3 py-3 text-left transition ${
                        on
                          ? "border-sky-500 bg-sky-500/10"
                          : "border-transparent hover:bg-white/[0.04]"
                      }`}
                    >
                      <Thumb url={c.avatarUrl} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-100">{c.name}</span>
                          <span className="shrink-0 text-[10px] text-slate-500">
                            {formatWhen(c.last?.created_at)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-xs ${
                              c.unread > 0 ? "font-semibold text-slate-200" : "text-slate-500"
                            }`}
                          >
                            {c.last
                              ? `${c.last.sender_id === userId ? "You: " : ""}${c.last.body}`
                              : "No messages yet"}
                          </span>
                          {c.unread > 0 && (
                            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[10px] font-bold text-slate-950">
                              {c.unread > 9 ? "9+" : c.unread}
                            </span>
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
      </section>

      {/* Conversation */}
      <section className={`${card} ${selectedId ? "flex" : "hidden lg:flex"} min-h-0 flex-col`}>
        {selected ? (
          <>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-2 border-b border-slate-800 px-3 py-2 text-xs text-slate-400 hover:text-white lg:hidden"
            >
              <FaArrowLeft /> All conversations
            </button>
            <div className="min-h-0 flex-1">
              <ChatThread
                key={selected.id}
                name={selected.name}
                subtitle="Your photographer"
                avatar={
                  <div className="h-10 w-10 shrink-0 rounded-full ring-2 ring-blue-500/40">
                    <Avatar
                      path={selected.avatarUrl || (selected.id === activeId ? portal?.avatar_signed_url : null)}
                      name={selected.name}
                      className="h-full w-full rounded-full"
                    />
                  </div>
                }
                messages={threadMessages}
                myId={userId}
                onSend={send}
                loading={msgLoading}
                error={isSelf ? "You're signed in as this photographer, so you can't message yourself. Use a different client account." : error}
                disabled={!userId || isSelf}
                emptyTitle="No messages yet"
                emptyText={`Say hello to ${selected.name} to start the conversation.`}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <FaCommentDots className="text-2xl text-slate-600" />
            <p className="text-xs text-slate-500">Select a conversation to start chatting.</p>
          </div>
        )}
      </section>
    </div>
  );
}