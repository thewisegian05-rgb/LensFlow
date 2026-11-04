import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import Avatar from "../components/ui/Avatar";
import ChatThread from "../../../components/Chat/ChatThread";
import { supabase } from "../../../lib/supabaseClient";
import { getProfile } from "../utils/portalUrls";

/*
  Client Messages tab: one conversation with the connected photographer.
  Table `messages` (see messages.sql).
  photographerId must be the photographer's auth user id.
*/

export default function MessageTab() {
  const { portal, activeId } = /** @type {any} */ (useOutletContext());
  const profile = getProfile(portal);
  const photographerName =
    profile.display_name || profile.username || profile.name || "Photographer";
  const photographerId =
    portal.photographer_id || profile.id || profile.user_id || activeId;

  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Who is the signed-in client?
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const id = data?.user?.id ?? null;
      setUserId(id);
      if (!id) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the conversation, then listen for new messages and read receipts.
  useEffect(() => {
    if (!userId) return;
    if (!photographerId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      const { data, error: loadError } = await supabase
        .from("messages")
        .select("id, sender_id, body, read_at, created_at")
        .eq("photographer_id", photographerId)
        .eq("client_id", userId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (cancelled) return;
      if (loadError) {
        console.error("Failed to load messages:", loadError);
        setError("Couldn't load your messages. Check your connection and try again.");
      } else {
        setMessages(data || []);
      }
      setLoading(false);
    })();

    const filter = `client_id=eq.${userId}`;
    const channel = supabase
      .channel(`messages:${photographerId}:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter }, (payload) => {
        const row = payload.new;
        if (row.photographer_id !== photographerId) return;
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
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
  }, [userId, photographerId]);

  // Messages from the photographer count as read while this tab is open.
  useEffect(() => {
    if (!userId) return;
    const ids = messages
      .filter((m) => m.sender_id !== userId && !m.read_at && !m.pending)
      .map((m) => m.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    setMessages((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, read_at: now } : m)));
    supabase
      .from("messages")
      .update({ read_at: now })
      .in("id", ids)
      .then(({ error: e }) => {
        if (e) console.warn("Couldn't mark as read:", e.message);
      });
  }, [messages, userId]);

  const send = async (body) => {
    const tempId = `temp-${Date.now()}`;
    setError("");
    setMessages((prev) => [
      ...prev,
      { id: tempId, sender_id: userId, body, created_at: new Date().toISOString(), pending: true },
    ]);

    const { data, error: sendError } = await supabase
      .from("messages")
      .insert({ photographer_id: photographerId, client_id: userId, sender_id: userId, body })
      .select("id, sender_id, body, read_at, created_at")
      .single();

    if (sendError) {
      console.error("Failed to send message:", sendError);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError("Message not sent. Your text is still in the box, so you can try again.");
      return false;
    }

    // Swap the placeholder for the saved row. The realtime event may have added it already.
    setMessages((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== tempId);
      return withoutTemp.some((m) => m.id === data.id) ? withoutTemp : [...withoutTemp, data];
    });
    return true;
  };

  return (
    <div className="h-[calc(100dvh-12rem)] min-h-[440px] min-w-0 overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0B1628] shadow-sm shadow-black/10">
      <ChatThread
        name={photographerName}
        subtitle="Your photographer"
        avatar={
          <div className="h-10 w-10 shrink-0 rounded-full ring-2 ring-blue-500/40">
            <Avatar
              path={portal.avatar_signed_url || profile.avatar_path}
              name={photographerName}
              className="h-full w-full rounded-full"
            />
          </div>
        }
        messages={messages}
        myId={userId}
        onSend={send}
        loading={loading}
        error={error}
        disabled={!photographerId || !userId}
        emptyTitle={photographerId ? "No messages yet" : "Couldn't find your photographer"}
        emptyText={
          photographerId
            ? `Say hello to ${photographerName} to start the conversation.`
            : "Reconnect with their code and try again."
        }
      />
    </div>
  );
}