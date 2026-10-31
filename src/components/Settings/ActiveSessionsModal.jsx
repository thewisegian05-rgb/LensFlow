import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabaseClient";

import {
  FaTimes,
  FaDesktop,
  FaMobileAlt,
  FaMapMarkerAlt,
  FaClock,
} from "react-icons/fa";

// Reads the session id out of the access token, so we can tell which row
// in the list is this device.
function getCurrentSessionId(accessToken) {
  try {
    const payload = accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).session_id || null;
  } catch {
    return null;
  }
}

function parseUserAgent(ua = "") {
  const browser = ua.includes("Edg")
    ? "Edge"
    : ua.includes("OPR") || ua.includes("Opera")
    ? "Opera"
    : ua.includes("Firefox")
    ? "Firefox"
    : ua.includes("Chrome")
    ? "Chrome"
    : ua.includes("Safari")
    ? "Safari"
    : "Browser";

  const device = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPad/i.test(ua)
    ? "iOS"
    : /Windows/i.test(ua)
    ? "Windows"
    : /Macintosh/i.test(ua)
    ? "macOS"
    : /Linux/i.test(ua)
    ? "Linux"
    : "Unknown Device";

  return { browser, device };
}

const formatDateTime = (value) => {
  if (!value) return "Unknown";

  // refreshed_at has no timezone in the database; it is stored in UTC.
  const text = String(value);
  const date = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(text) ? text : `${text}Z`);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

function ActiveSessionsModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [sessions, setSessions] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Modal animation state.
  const [modalVisible, setModalVisible] = useState(false);
  const closingRef = useRef(false);
  const closeCallbackRef = useRef(onClose);

  // Location of THIS device only (other devices only have an IP address).
  const [location, setLocation] = useState("Location unavailable");
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    closeCallbackRef.current = onClose;
  }, [onClose]);

  // Trigger the entrance animation after the portal has rendered its hidden state.
  useEffect(() => {
    let firstFrame;
    let secondFrame;

    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setModalVisible(true));
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, []);

  function closeModal() {
    if (closingRef.current) return;
    closingRef.current = true;
    setModalVisible(false);
  }

  function handleOverlayTransitionEnd(e) {
    if (
      e.target === e.currentTarget &&
      e.propertyName === "opacity" &&
      !modalVisible &&
      closingRef.current
    ) {
      closeCallbackRef.current?.();
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const loadSessions = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const current = sessionData?.session;

      setEmail(current?.user?.email || "");
      setCurrentId(
        current?.access_token ? getCurrentSessionId(current.access_token) : null
      );

      const { data, error } = await supabase.rpc("get_my_sessions");

      if (error) {
        console.error("Failed to load sessions:", error);
        setLoadError(
          "Could not load all devices, so only this device is shown."
        );

        // Fall back to this device only.
        if (current) {
          setSessions([
            {
              id: "local",
              user_agent: navigator.userAgent,
              created_at: null,
              refreshed_at: null,
              ip: null,
            },
          ]);
          setCurrentId("local");
        }
      } else {
        setSessions(data || []);
      }

      setLoading(false);
    };

    loadSessions();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation("Location unavailable");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );

          const data = await response.json();
          const city =
            data.address.city ||
            data.address.town ||
            data.address.municipality ||
            data.address.village;

          const province = data.address.state || data.address.province;
          const country = data.address.country;
          const parts = [city, province, country].filter(Boolean);

          setLocation(parts.join(", ") || "Location unavailable");
        } catch (error) {
          console.error("Failed to retrieve location:", error);
          setLocation("Location unavailable");
        }

        setLocationLoading(false);
      },
      (error) => {
        console.error("Location permission denied:", error);
        setLocation("Location unavailable");
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  // Current device first, then the most recently active.
  const ordered = [...sessions].sort((a, b) => {
    if (a.id === currentId) return -1;
    if (b.id === currentId) return 1;
    return 0;
  });

  const modalContent = (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 ease-out motion-reduce:transition-none ${
        modalVisible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
      onTransitionEnd={handleOverlayTransitionEnd}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="active-sessions-title"
        className={`my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-300 bg-white p-6 shadow-2xl transition-all duration-300 ease-out dark:border-slate-700 dark:bg-slate-900 motion-reduce:transform-none motion-reduce:transition-none ${
          modalVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-[0.97] opacity-0"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3
              id="active-sessions-title"
              className="text-xl font-semibold text-slate-900 dark:text-white"
            >
              Active Sessions
            </h3>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Devices currently signed in to your LensFlow account.
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
            aria-label="Close active sessions"
            className="rounded-lg p-2 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <FaTimes />
          </button>
        </div>

        {loadError && (
          <p className="mb-3 text-xs text-amber-600 dark:text-amber-400">
            {loadError}
          </p>
        )}

        {/* Sessions */}
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Loading sessions...
            </p>
          ) : ordered.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No active session found.
            </p>
          ) : (
            ordered.map((s) => {
              const { browser, device } = parseUserAgent(s.user_agent || "");
              const isCurrent = s.id === currentId;
              const isMobile = device === "Android" || device === "iOS";

              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-lg text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                      {isMobile ? <FaMobileAlt /> : <FaDesktop />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {device} • {browser}
                        </p>

                        {isCurrent && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400">
                            Current
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {email}
                      </p>

                      {/* Location: real place for this device, IP for others */}
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                        <FaMapMarkerAlt className="text-xs" />
                        <span>
                          {isCurrent
                            ? locationLoading
                              ? "Detecting location..."
                              : location
                            : s.ip
                            ? `IP ${s.ip}`
                            : "Location unavailable"}
                        </span>
                      </div>

                      {/* Date and time */}
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <FaClock className="text-[10px]" />
                        <span>
                          {isCurrent
                            ? "Active now"
                            : `Last active ${formatDateTime(
                                s.refreshed_at || s.updated_at || s.created_at
                              )}`}
                          {s.created_at &&
                            ` • Signed in ${formatDateTime(s.created_at)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-300 active:translate-y-0 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default ActiveSessionsModal;
