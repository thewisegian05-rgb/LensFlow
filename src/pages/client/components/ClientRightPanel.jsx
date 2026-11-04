import { useEffect, useState } from "react";
import { FaKey, FaCamera } from "react-icons/fa";
import { getFeaturedPhotoSignedUrl } from "../utils/portalUrls";

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

/* Looks for the photographer's account name on a row (or on the portal object). */
function findName(obj) {
  if (!obj || typeof obj !== "object") return null;
  const sources = [obj];
  for (const key of NESTED_KEYS) {
    let v = obj[key];
    if (Array.isArray(v)) v = v[0];
    if (v && typeof v === "object") sources.push(v);
  }
  for (const src of sources) {
    const hit = firstString(src, PREFERRED_NAME_KEYS);
    if (hit) return hit;
  }
  // last resort: any text field whose key contains "name"
  for (const src of sources) {
    for (const [key, value] of Object.entries(src)) {
      if (/name/i.test(key) && typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}

/* The avatar lives in a private bucket, so a path must be signed first. */
function findAvatarPath(obj) {
  if (!obj || typeof obj !== "object") return null;
  const sources = [obj];
  for (const key of NESTED_KEYS) {
    let v = obj[key];
    if (Array.isArray(v)) v = v[0];
    if (v && typeof v === "object") sources.push(v);
  }
  for (const src of sources) {
    for (const [key, value] of Object.entries(src)) {
      if (/avatar/i.test(key) && typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}

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
  /* TEMPORARY: remove after the names show correctly */
  console.log("PORTAL KEYS:", portal ? Object.keys(portal) : null);
  console.log("PORTAL:", JSON.stringify(portal, null, 2));
  console.log("CONNECTIONS:", JSON.stringify(connections, null, 2));

  return (
    <aside className="custom-scrollbar sticky top-0 hidden h-screen w-[248px] shrink-0 self-start overflow-y-auto border-l border-white/10 px-4 py-5 xl:block">
      <button
        onClick={onOpenCode}
        className="lf-btn lf-cta flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20"
      >
        <FaKey className="text-xs" /> Enter Connection Code
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
            const id = getId(c);
            const active = id != null && id === activeId;

            // the active photographer's portal always has the right name (e.g. "GCaptures")
            const name =
              (typeof c.display_name === "string" && c.display_name.trim()) ||
              findName(c) ||
              (active ? findName(portal) : null) ||
              "Photographer";
            const avatarPath = findAvatarPath(c) || (active ? findAvatarPath(portal) : null);
            const signedUrl = active ? portal?.avatar_signed_url : null;

            return (
              <li key={id ?? index}>
                <button
                  onClick={() => onSelect(id)}
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