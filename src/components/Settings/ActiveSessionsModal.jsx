import { supabase } from "../../lib/supabaseClient";

import { useEffect, useState } from "react";

import {
  FaTimes,
  FaDesktop,
  FaMapMarkerAlt,
} from "react-icons/fa";

function ActiveSessionsModal({ onClose }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Location state to store the user's location
  const [location, setLocation] = useState("Location unavailable");
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Failed to load session:", error);
      } else {
        setSession(data.session);
      }

      setLoading(false);
    };

    loadSession();
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

          const province =
            data.address.state ||
            data.address.province;

          const country = data.address.country;

          const parts = [city, province, country].filter(Boolean);

          setLocation(parts.join(", "));
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

  const user = session?.user;

  const browser =
    navigator.userAgent.includes("Edg")
      ? "Edge"
      : navigator.userAgent.includes("Chrome")
      ? "Chrome"
      : navigator.userAgent.includes("Firefox")
      ? "Firefox"
      : "Browser";

  const device =
    /Android/i.test(navigator.userAgent)
      ? "Android"
      : /iPhone|iPad/i.test(navigator.userAgent)
      ? "iOS"
      : /Windows/i.test(navigator.userAgent)
      ? "Windows"
      : /Macintosh/i.test(navigator.userAgent)
      ? "macOS"
      : "Unknown Device";
      
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              Active Sessions
            </h3>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Devices currently signed in to your LensFlow account.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <FaTimes />
          </button>
        </div>

        {/* Sessions */}
        <div className="space-y-3">

          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Loading sessions...
            </p>
          ) : session ? (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">

              <div className="flex min-w-0 items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-lg text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                  <FaDesktop />
                </div>

                <div className="min-w-0">

                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {device} • {browser}
                    </p>

                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400">
                      Current
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {user?.email}
                  </p>

                  {/* Location */}
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                    <FaMapMarkerAlt className="text-xs" />
                    <span>
                      {locationLoading ? "Detecting location..." : location}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Active now
                  </p>

                </div>

              </div>

            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No active session found.
            </p>
          )}

        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ActiveSessionsModal;