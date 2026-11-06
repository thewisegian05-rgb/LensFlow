import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCamera, FaCommentDots } from "react-icons/fa";
import { supabase } from "../../../lib/supabaseClient";
import { getFeaturedPhotoSignedUrl, getProfile } from "../utils/portalUrls";
import { useClientNav } from "../utils/clientRoutes";
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
  const navigate = useNavigate();
  const { tabUrl, current } = useClientNav();
  const requested = useRef(new Set());
  const [profiles, setProfiles] = useState({}); // photographer_id -> { name, avatarPath }

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

  /* clicking a photographer only switches to them and shows their portfolio */
  const handleClick = (id) => {
    onSelect(id);
    navigate(tabUrl("portfolio"));
  };

  /* Messages: the inbox with all your conversations */
  const openMessages = () => navigate(tabUrl("messages"));
  const onMessages = current === "messages";

  return (
    <aside className="custom-scrollbar sticky top-0 hidden h-screen w-[248px] shrink-0 self-start overflow-y-auto border-l border-white/10 px-4 py-5 xl:block">
      {/* One line: messages, bell, then Enter Connection Code */}
      <div className="relative flex items-center gap-1.5">
        <button
          type="button"
          onClick={openMessages}
          title="Messages"
          aria-label="Messages"
          className={`lf-btn relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${
            onMessages
              ? "border-sky-500/60 bg-sky-500/15 text-sky-300"
              : "border-slate-700 bg-[#0B1628] text-slate-300 hover:text-white"
          }`}
        >
          <FaCommentDots />
        </button>

        <NotificationBell
          compact
          items={portal?.notifications || []}
          menuClassName="-left-[38px] w-[215px]"
        />

        <button
          onClick={onOpenCode}
          className="lf-btn lf-cta flex h-8 min-w-0 flex-1 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 px-2 text-[10px] font-semibold text-slate-950 shadow-lg shadow-sky-500/20"
        >
          <span className="truncate">Enter Connection Code</span>
        </button>
      </div>

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
            return (
              <li key={id ?? index}>
                <button
                  onClick={() => handleClick(id)}
                  title="View portfolio"
                  className={`lf-row flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                    active
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
  );
}