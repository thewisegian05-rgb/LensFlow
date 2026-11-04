import { useEffect, useRef, useState } from "react";
import { FaKey, FaCamera, FaCommentDots } from "react-icons/fa";
import { supabase } from "../../../lib/supabaseClient";
import { getFeaturedPhotoSignedUrl, getProfile } from "../utils/portalUrls";
import ClientChatPopup from "./ClientChatPopup";
import NotificationBell from "./NotificationBell";

/* my_connections() rows use `photographer_id` as their id. */
const getId = (c) => c?.photographer_id ?? c?.id ?? null;

const PREFERRED_NAME_KEYS = [
  "photographer_name",
  "display_name",
  "business_name",
  "studio_name",
  "full_name",
  "name",
  "username",
];
const NESTED_KEYS = ["photographer", "profile", "profiles", "photographers"];

function firstString(obj, keys) {
  for (const key of keys) {
    const v = obj?.[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function nestedSources(obj) {
  const sources = [obj];
  for (const key of NESTED_KEYS) {
    let v = obj?.[key];
    if (Array.isArray(v)) v = v[0];
    if (v && typeof v === "object") sources.push(v);
  }
  return sources;
}

function findName(obj) {
  if (!obj || typeof obj !== "object") return null;
  for (const src of nestedSources(obj)) {
    const hit = firstString(src, PREFERRED_NAME_KEYS);
    if (hit) return hit;
  }
  return null;
}

function findAvatarPath(obj) {
  if (!obj || typeof obj !== "object") return null;
  for (const src of nestedSources(obj)) {
    for (const [key, value] of Object.entries(src)) {
      if (/avatar/i.test(key) && typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}

/* Same profile shape the Messages tab uses (getProfile) */
function profileOf(portal) {
  if (!portal) return {};
  try {
    return getProfile(portal) || {};
  } catch {
    return {};
  }
}
const profileName = (p) => p?.display_name || p?.username || p?.name || null;

/* The avatar lives in a private bucket, so a path must be signed first. */
function Avatar({ path, signedUrl }) {
  const [url, setUrl] = useState(signedUrl || null);

  useEffect(() => {
    let cancelled = false;
    if (signedUrl) {
      setUrl(signedUrl);
      return;
    }
    if (!path) {
      setUrl(null);
      return;
    }
    if (/^https?:\/\//i.test(path)) {
      setUrl(path);
      return;
    }
    (async () => {
      try {
        const signed = await getFeaturedPhotoSignedUrl(path);
        if (!cancelled) setUrl(signed || null);
      } catch {
        if (!cancelled) setUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path, signedUrl]);

  if (url) {
    return <img src={url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-400">
      <FaCamera className="text-sm" />
    </span>
  );
}

export default function ClientRightPanel({ connections = [], activeId, portal, onSelect, onOpenCode }) {
  const asideRef = useRef(null);
  const requested = useRef(new Set());
  const [profiles, setProfiles] = useState({}); // photographer_id -> { name, avatarPath }
  const [chatId, setChatId] = useState(null);
  const [chatRight, setChatRight] = useState(264);

  /* my_connections has no display name, so load each photographer's profile once */
  useEffect(() => {
    connections.forEach((c) => {
      const id = getId(c);
      if (!id || requested.current.has(id) || findName(c)) return;
      requested.current.add(id);
      supabase.rpc("get_portal", { p_photographer_id: id }).then(({ data, error }) => {
        if (error || !data) return;
        const p = profileOf(data);
        setProfiles((prev) => ({
          ...prev,
          [id]: { name: profileName(p), avatarPath: p.avatar_path || data.avatar_path || null },
        }));
      });
    });
  }, [connections]);

  /* keep the chat popup right next to this panel */
  useEffect(() => {
    if (!chatId) return;
    const update = () => {
      const r = asideRef.current?.getBoundingClientRect();
      if (r) setChatRight(Math.max(8, window.innerWidth - r.left + 12));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [chatId]);

  /* close the chat if that photographer is no longer in the list */
  useEffect(() => {
    if (chatId && !connections.some((c) => getId(c) === chatId)) setChatId(null);
  }, [connections, chatId]);

  const describe = (c) => {
    const id = getId(c);
    const active = id != null && id === activeId;
    const prof = active ? profileOf(portal) : {};
    const name =
      findName(c) || (active ? profileName(prof) : null) || profiles[id]?.name || "Photographer";
    const avatarPath =
      findAvatarPath(c) || (active ? prof.avatar_path : null) || profiles[id]?.avatarPath || null;
    const signedUrl = active ? portal?.avatar_signed_url || null : null;
    return { id, active, name, avatarPath, signedUrl };
  };

  const chatConn = chatId ? connections.find((c) => getId(c) === chatId) : null;
  const chat = chatConn ? describe(chatConn) : null;

  const handleClick = (id) => {
    onSelect(id); // switch the portal to this photographer
    setChatId((cur) => (cur === id ? null : id)); // open (or close) their messages
  };

  /* "Messages" button: opens the chat of the active photographer (or the first one) */
  const openMessages = () => {
    const id = activeId || getId(connections[0]);
    if (!id) return;
    setChatId((cur) => (cur === id ? null : id));
  };

  return (
    <>
      <aside
        ref={asideRef}
        className="custom-scrollbar sticky top-0 hidden h-screen w-[248px] shrink-0 self-start overflow-y-auto border-l border-white/10 px-4 py-5 xl:block"
      >
        <div className="relative flex items-center gap-2">
          <button
            onClick={onOpenCode}
            className="lf-btn lf-cta flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 px-2.5 py-2.5 text-[11px] font-semibold text-slate-950 shadow-lg shadow-sky-500/20"
          >
            <FaKey className="shrink-0 text-[11px]" />
            <span className="truncate">Enter Connection Code</span>
          </button>
          <NotificationBell
            compact
            items={portal?.notifications || []}
            menuClassName="right-0 w-52"
          />
        </div>

        <button
          onClick={openMessages}
          disabled={connections.length === 0}
          className={`lf-btn mt-4 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
            chatId
              ? "border-sky-500/50 bg-sky-500/10 text-sky-300"
              : "border-white/5 bg-white/[0.02] text-slate-200 hover:bg-white/5"
          }`}
        >
          <FaCommentDots className="shrink-0 text-slate-400" /> Messages
        </button>

        <h3 className="mb-3 mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Creatives
        </h3>

        {connections.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-700 px-3 py-6 text-center text-xs text-slate-500">
            No creatives connected yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {connections.map((c, index) => {
              const { id, active, name, avatarPath, signedUrl } = describe(c);
              const chatting = id != null && id === chatId;
              return (
                <li key={id ?? index}>
                  <button
                    onClick={() => handleClick(id)}
                    title="Open messages"
                    className={`lf-row flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                      active || chatting
                        ? "border-sky-500/50 bg-sky-500/10"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                    }`}
                  >
                    <Avatar path={avatarPath} signedUrl={signedUrl} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">
                      {name}
                    </span>
                    {active && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {chat && (
        <ClientChatPopup
          key={chat.id}
          photographerId={chat.id}
          name={chat.name}
          avatarPath={chat.avatarPath}
          avatarSignedUrl={chat.signedUrl}
          right={chatRight}
          onClose={() => setChatId(null)}
        />
      )}
    </>
  );
}