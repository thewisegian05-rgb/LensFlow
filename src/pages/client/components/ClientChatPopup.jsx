import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import Avatar from "./ui/Avatar";
import ChatThread from "../../../components/Chat/ChatThread";
import { supabase } from "../../../lib/supabaseClient";
import { getFeaturedPhotoSignedUrl } from "../utils/portalUrls";

/*
  Chat with ONE photographer, opened from the right panel.
  Same logic as the Messages tab, but photographerId comes from the clicked item.
*/
export default function ClientChatPopup({
  photographerId,
  name = "Photographer",
  avatarPath = null,
  avatarSignedUrl = null,
  right = 264,
  onClose,
}) {
  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(avatarSignedUrl || null);

  // The avatar is in a private bucket, so a plain path must be signed first.
  useEffect(() => {
    let cancelled = false;
    if (avatarSignedUrl) {
      setAvatarUrl(avatarSignedUrl);
      return;
    }
    if (!avatarPath) {
      setAvatarUrl(null);
      return;
    }
    if (/^https?:\/\//i.test(avatarPath)) {
      setAvatarUrl(avatarPath);
      return;
    }
    (async () => {
      try {
        const signed = await getFeaturedPhotoSignedUrl(avatarPath);
        if (!cancelled) setAvatarUrl(signed || null);
      } catch {
        if (!cancelled) setAvatarUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [avatarPath, avatarSignedUrl]);

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
    setMessages([]);
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
      .channel(`popup-messages:${photographerId}:${userId}`)
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

  // Messages from the photographer count as read while this chat is open.
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
      setError(
        `Message not sent: ${sendError.message || "unknown error"}${
          sendError.code ? ` (code ${sendError.code})` : ""
        }`
      );
      return false;
    }

    setMessages((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== tempId);
      return withoutTemp.some((m) => m.id === data.id) ? withoutTemp : [...withoutTemp, data];
    });
    return true;
  };

  // the database refuses messages where both sides are the same account
  const isSelf = Boolean(userId && photographerId && userId === photographerId);

  return (
    <div
      style={{ right }}
      className="fixed bottom-4 z-50 hidden h-[min(560px,calc(100dvh-2rem))] w-[360px] overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0B1628] shadow-2xl shadow-black/40 xl:block"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close chat"
        className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800/80 text-xs text-slate-300 transition hover:bg-slate-700 hover:text-white"
      >
        <FaTimes />
      </button>

      <ChatThread
        name={name}
        subtitle="Your photographer"
        avatar={
          <div className="h-10 w-10 shrink-0 rounded-full ring-2 ring-blue-500/40">
            <Avatar
              path={avatarUrl}
              name={name}
              className="h-full w-full rounded-full"
            />
          </div>
        }
        messages={messages}
        myId={userId}
        onSend={send}
        loading={loading}
        error={error}
        disabled={!photographerId || !userId || isSelf}
        emptyTitle={
          isSelf
            ? "You can't message yourself"
            : photographerId
            ? "No messages yet"
            : "Couldn't find your photographer"
        }
        emptyText={
          isSelf
            ? "You're signed in as this photographer. Sign in with a different client account to chat."
            : photographerId
            ? `Say hello to ${name} to start the conversation.`
            : "Reconnect with their code and try again."
        }
      />
    </div>
  );
}

