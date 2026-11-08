
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaCamera,
  FaCommentDots,
} from "react-icons/fa";

import { supabase } from "../../../lib/supabaseClient";

import {
  getFeaturedPhotoSignedUrl,
  getProfile,
} from "../utils/portalUrls";

import { useClientNav } from "../utils/clientRoutes";

import NotificationBell from "./NotificationBell";

// ==========================================
// CONNECTION UTILITIES
// ==========================================

// my_connections() rows use photographer_id.
const getId = (connection) =>
  connection?.photographer_id ??
  connection?.id ??
  null;

const PREFERRED_NAME_KEYS = [
  "photographer_name",
  "display_name",
  "business_name",
  "studio_name",
  "full_name",
  "name",
  "username",
];

const NESTED_KEYS = [
  "photographer",
  "profile",
  "profiles",
  "photographers",
];

function firstString(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return null;
}

function nestedSources(obj) {
  const sources = [obj];

  for (const key of NESTED_KEYS) {
    let value = obj?.[key];

    if (Array.isArray(value)) {
      value = value[0];
    }

    if (
      value &&
      typeof value === "object"
    ) {
      sources.push(value);
    }
  }

  return sources;
}

function findName(obj) {
  if (!obj || typeof obj !== "object") {
    return null;
  }

  for (const source of nestedSources(obj)) {
    const found = firstString(
      source,
      PREFERRED_NAME_KEYS
    );

    if (found) {
      return found;
    }
  }

  return null;
}

function findAvatarPath(obj) {
  if (!obj || typeof obj !== "object") {
    return null;
  }

  for (const source of nestedSources(obj)) {
    for (const [key, value] of Object.entries(source)) {
      if (
        /avatar/i.test(key) &&
        typeof value === "string" &&
        value.trim()
      ) {
        return value.trim();
      }
    }
  }

  return null;
}

// ==========================================
// PORTAL PROFILE UTILITIES
// ==========================================

function profileOf(portal) {
  if (!portal) {
    return {};
  }

  try {
    return getProfile(portal) || {};
  } catch (error) {
    console.error(
      "Unable to read photographer profile:",
      error
    );

    return {};
  }
}

const profileName = (profile) =>
  profile?.display_name ||
  profile?.username ||
  profile?.name ||
  null;

// ==========================================
// PHOTOGRAPHER AVATAR
// ==========================================

function Avatar({ path, signedUrl }) {
  const [url, setUrl] = useState(
    signedUrl || null
  );

  useEffect(() => {
    let cancelled = false;

    // Prefer an existing signed URL.
    if (signedUrl) {
      setUrl(signedUrl);

      return () => {
        cancelled = true;
      };
    }

    // Show placeholder when no image exists.
    if (!path) {
      setUrl(null);

      return () => {
        cancelled = true;
      };
    }

    // Already a complete image URL.
    if (/^https?:\/\//i.test(path)) {
      setUrl(path);

      return () => {
        cancelled = true;
      };
    }

    // Private Storage image:
    // generate a signed URL before displaying it.
    setUrl(null);

    const loadAvatar = async () => {
      try {
        const signed =
          await getFeaturedPhotoSignedUrl(path);

        if (!cancelled) {
          setUrl(signed || null);
        }
      } catch (error) {
        console.error(
          "Unable to load photographer avatar:",
          error
        );

        if (!cancelled) {
          setUrl(null);
        }
      }
    };

    loadAvatar();

    return () => {
      cancelled = true;
    };
  }, [path, signedUrl]);

  // ========================================
  // IMAGE
  // ========================================

  if (url) {
    return (
      <img
        src={url}
        alt=""
        onError={() => setUrl(null)}
        className="
          h-10 w-10 shrink-0
          rounded-full
          border border-slate-200
          bg-slate-100
          object-cover

          dark:border-slate-700
          dark:bg-slate-800
        "
      />
    );
  }

  // ========================================
  // PLACEHOLDER AVATAR
  // ========================================

  return (
    <span
      className="
        flex h-10 w-10
        shrink-0 items-center
        justify-center

        rounded-full
        border border-slate-200
        bg-slate-100

        text-slate-500

        dark:border-slate-700
        dark:bg-slate-800
        dark:text-slate-400
      "
      aria-hidden="true"
    >
      <FaCamera className="text-sm" />
    </span>
  );
}

// ==========================================
// CLIENT RIGHT PANEL
// ==========================================

export default function ClientRightPanel({
  connections = [],
  activeId,
  portal,
  onSelect,
  onOpenCode,
}) {
  const navigate = useNavigate();

  const { tabUrl, current } = useClientNav();

  const requested = useRef(new Set());

  const [profiles, setProfiles] = useState({});

  // ========================================
  // LOAD PHOTOGRAPHER PROFILE DETAILS
  // ========================================

  useEffect(() => {
    connections.forEach((connection) => {
      const id = getId(connection);

      if (!id || requested.current.has(id)) {
        return;
      }

      // Fetch the profile when the connection
      // doesn't contain a name or avatar.
      const needsProfile =
        !findName(connection) ||
        !findAvatarPath(connection);

      if (!needsProfile) {
        return;
      }

      requested.current.add(id);

      supabase
        .rpc("get_portal", {
          p_photographer_id: id,
        })
        .then(({ data, error }) => {
          if (error) {
            console.error(
              "Unable to load photographer details:",
              error
            );

            requested.current.delete(id);
            return;
          }

          if (!data) {
            return;
          }

          const profile = profileOf(data);

          setProfiles((previous) => ({
            ...previous,

            [id]: {
              name: profileName(profile),

              avatarPath:
                profile.avatar_path ||
                data.avatar_path ||
                null,
            },
          }));
        })
        .catch((error) => {
          console.error(
            "Unable to load photographer profile:",
            error
          );

          requested.current.delete(id);
        });
    });
  }, [connections]);

  // ========================================
  // DESCRIBE PHOTOGRAPHER
  // ========================================

  const describe = (connection) => {
    const id = getId(connection);

    const active =
      id != null &&
      String(id) === String(activeId);

    const profile = active
      ? profileOf(portal)
      : {};

    const name =
      findName(connection) ||
      (active ? profileName(profile) : null) ||
      profiles[id]?.name ||
      "Photographer";

    const avatarPath =
      findAvatarPath(connection) ||
      (active ? profile.avatar_path : null) ||
      profiles[id]?.avatarPath ||
      null;

    const signedUrl = active
      ? portal?.avatar_signed_url || null
      : null;

    return {
      id,
      active,
      name,
      avatarPath,
      signedUrl,
    };
  };

  // ========================================
  // NAVIGATION
  // ========================================

  const handlePhotographerClick = (id) => {
    if (!id) return;

    // Select photographer.
    onSelect?.(id);

    // Open their portfolio.
    navigate(tabUrl("portfolio"));
  };

  const openMessages = () => {
    navigate(tabUrl("messages"));
  };

  const onMessages = current === "messages";

  // ========================================
  // RIGHT PANEL
  // ========================================

  return (
    <aside
      className="
        custom-scrollbar
        sticky top-0
        hidden h-screen
        w-[248px] shrink-0
        self-start overflow-y-auto

        border-l border-slate-200

        bg-white/90
        px-4 py-5
        text-slate-900

        backdrop-blur-lg

        transition-colors duration-300

        xl:block

        dark:border-slate-800
        dark:bg-[#0B1120]/95
        dark:text-slate-100
      "
      aria-label="Connected creatives and account tools"
    >

      {/* ======================================
          TOP ACTION BUTTONS
         ====================================== */}

      <div
        className="
          relative flex
          items-center gap-1.5
        "
      >

        {/* ==================================
            MESSAGES
           ================================== */}

        <button
          type="button"
          onClick={openMessages}
          title="Messages"
          aria-label="Messages"
          aria-current={
            onMessages ? "page" : undefined
          }
          className={`
            lf-btn
            relative flex
            h-9 w-9 shrink-0
            items-center justify-center

            rounded-full border
            text-xs

            shadow-sm
            transition-all duration-200

            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-sky-400

            dark:shadow-none

            ${
              onMessages
                ? `
                  border-sky-400
                  bg-sky-50
                  text-sky-600

                  dark:border-sky-500/60
                  dark:bg-sky-500/15
                  dark:text-sky-300
                `
                : `
                  border-slate-200
                  bg-white
                  text-slate-600

                  hover:border-sky-300
                  hover:bg-slate-100
                  hover:text-sky-600

                  dark:border-slate-700
                  dark:bg-[#0B1628]
                  dark:text-slate-300

                  dark:hover:border-slate-600
                  dark:hover:bg-slate-800
                  dark:hover:text-white
                `
            }
          `}
        >
          <FaCommentDots aria-hidden="true" />
        </button>

        {/* ==================================
            NOTIFICATIONS
           ================================== */}

        <NotificationBell
          compact
          items={portal?.notifications || []}
          menuClassName="-left-[38px] w-[215px]"
        />

        {/* ==================================
            ENTER CONNECTION CODE
           ================================== */}

        <button
          type="button"
          onClick={onOpenCode}
          className="
            lf-btn lf-cta

            flex h-9 min-w-0
            flex-1 items-center
            justify-center

            rounded-full

            bg-gradient-to-r
            from-sky-500 to-cyan-400

            px-2

            text-[10px]
            font-semibold text-slate-950

            shadow-lg
            shadow-sky-500/20

            transition-all duration-200

            hover:from-sky-400
            hover:to-cyan-300

            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-sky-500
          "
        >
          <span className="truncate">
            Enter Connection Code
          </span>
        </button>
      </div>

      {/* ======================================
          CREATIVES SECTION HEADING
         ====================================== */}

      <h3
        className="
          mb-3 mt-7

          text-[11px]
          font-semibold uppercase
          tracking-[0.2em]

          text-slate-500
          dark:text-slate-400
        "
      >
        Creatives
      </h3>

      {/* ======================================
          NO CONNECTIONS
         ====================================== */}

      {connections.length === 0 ? (
        <div
          className="
            rounded-xl

            border border-dashed
            border-slate-300

            bg-slate-50/70
            px-3 py-6

            text-center
            text-xs text-slate-500

            dark:border-slate-700
            dark:bg-slate-800/30
            dark:text-slate-400
          "
        >
          No creatives connected yet.
        </div>
      ) : (

        /* ==================================
            CONNECTED PHOTOGRAPHERS
           ================================== */

        <ul className="space-y-2">
          {connections.map((connection, index) => {
            const {
              id,
              active,
              name,
              avatarPath,
              signedUrl,
            } = describe(connection);

            return (
              <li key={id ?? index}>
                <button
                  type="button"
                  onClick={() =>
                    handlePhotographerClick(id)
                  }
                  disabled={!id}
                  title={`View ${name}'s portfolio`}
                  aria-label={`View ${name}'s portfolio`}
                  aria-pressed={active}
                  className={`
                    lf-row

                    group flex w-full
                    min-w-0 items-center
                    gap-3

                    rounded-xl border
                    p-2.5

                    text-left

                    transition-all duration-200
                    ease-out

                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-sky-400

                    disabled:cursor-not-allowed
                    disabled:opacity-50

                    ${
                      active
                        ? `
                          border-sky-400
                          bg-sky-50

                          shadow-sm
                          shadow-sky-100

                          dark:border-sky-500/50
                          dark:bg-sky-500/10
                          dark:shadow-none
                        `
                        : `
                          border-slate-200
                          bg-white

                          hover:border-sky-200
                          hover:bg-slate-50

                          dark:border-slate-700/60
                          dark:bg-white/[0.02]

                          dark:hover:border-slate-600
                          dark:hover:bg-white/[0.05]
                        `
                    }
                  `}
                >
                  {/* PHOTOGRAPHER AVATAR */}
                  <Avatar
                    path={avatarPath}
                    signedUrl={signedUrl}
                  />

                  {/* PHOTOGRAPHER NAME */}
                  <span
                    className={`
                      min-w-0 flex-1 truncate

                      text-sm font-semibold

                      transition-colors duration-200

                      ${
                        active
                          ? `
                            text-slate-900

                            dark:text-white
                          `
                          : `
                            text-slate-700
                            group-hover:text-slate-900

                            dark:text-slate-200
                            dark:group-hover:text-white
                          `
                      }
                    `}
                  >
                    {name}
                  </span>

                  {/* ACTIVE INDICATOR */}
                  {active && (
                    <span
                      className="
                        h-2 w-2 shrink-0
                        rounded-full

                        bg-sky-500

                        shadow-sm
                        shadow-sky-500/30
                      "
                      title="Selected photographer"
                      aria-label="Selected photographer"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
