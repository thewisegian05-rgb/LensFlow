import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaStar,
  FaRegStar,
  FaMapMarkerAlt,
  FaKey,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaCamera,
  FaPlus,
  FaRegImages,
} from "react-icons/fa";

import Calendar from "../components/Schedule/Calendar";
import { supabase } from "../lib/supabaseClient";

const PORTFOLIO_BUCKET = "portfolio";


async function getFeaturedPhotoSignedUrl(storagePath) {
  if (!storagePath) return null;

  const { data, error } = await supabase.storage
    .from("photos")
    .createSignedUrl(storagePath, 60 * 60);

  if (error) {
    console.error("Failed to load featured photo:", error.message);
    return null;
  }

  return data.signedUrl;
}


const publicUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path).data.publicUrl;
};

/* ============ Small pieces ============ */

function Stars({ value = 0, size = "text-sm" }) {
  const filled = Math.round(Number(value) || 0);
  return (
    <span className={`inline-flex items-center gap-0.5 text-amber-400 ${size}`}>
      {[1, 2, 3, 4, 5].map((n) =>
        n <= filled ? <FaStar key={n} /> : <FaRegStar key={n} className="text-slate-600" />
      )}
    </span>
  );
}

function Avatar({ path, name, className = "h-20 w-20" }) {
  const url = publicUrl(path);
  const initials = (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return url ? (
    <img src={url} alt={name} className={`${className} rounded-2xl object-cover`} />
  ) : (
    <div
      className={`${className} flex items-center justify-center rounded-2xl bg-sky-500/10 text-xl font-bold text-sky-400`}
    >
      {initials}
    </div>
  );
}

function Section({ title, dot, right, children }) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-3 sm:p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          {title}
        </h3>
        {right}
      </header>
      {children}
    </section>
  );
}

/* ============ Sign in (clients use their own account) ============ */
function ClientAuth() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (mode === "signup") {
      setInfo("Check your email to confirm your account, then sign in.");
    }
  }

  return (
    <main className="flex min-h-[100dvh] w-full items-center justify-center overflow-x-hidden bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <section className="my-auto w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-5 shadow-2xl shadow-black/30 sm:p-7">
      <h2 className="mb-1 text-lg font-semibold text-white sm:text-xl">
        {mode === "signin" ? "Client sign in" : "Create a client account"}
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        Sign in, then enter the code your photographer gave you.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="min-h-11 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 sm:text-sm"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="min-h-11 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 sm:text-sm"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {info && <p className="text-xs text-sky-400">{info}</p>}
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 w-full rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError("");
          setInfo("");
        }}
        className="mt-3 w-full text-center text-xs text-slate-400 hover:text-white"
      >
        {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
      </section>
    </main>
  );
}

/* ============ Enter-a-code card ============ */
function CodeForm({ onConnect, connecting, error, onCancel }) {
  const [code, setCode] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onConnect(code, () => setCode(""));
      }}
      className="mx-auto w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-xl sm:p-6"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
          <FaKey />
        </span>
        <h3 className="font-semibold text-white">Connect to your photographer</h3>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Enter the unique code your photographer shared with you.
      </p>

      <input
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="e.g. A3F9C21B"
        maxLength={16}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-center font-mono text-lg tracking-[0.25em] text-white placeholder:tracking-normal placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
      />
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={connecting || code.trim().length < 4}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {connecting ? "Connecting..." : "Connect"}
        </button>
      </div>
    </form>
  );
}

/* ============ Review form ============ */
function ReviewForm({ existing, onSubmit, saving, error }) {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [comment, setComment] = useState(existing?.comment || "");
  const [hover, setHover] = useState(0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (rating) onSubmit(rating, comment);
      }}
      className="min-w-0 rounded-lg border border-slate-700 bg-slate-950/50 p-3 sm:p-4"
    >
      <p className="mb-2 text-xs font-semibold text-slate-300">
        {existing ? "Update your rating" : "Rate this photographer"}
      </p>

      <div className="mb-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="text-xl text-amber-400"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            {n <= (hover || rating) ? <FaStar /> : <FaRegStar className="text-slate-600" />}
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Share your experience (optional)"
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={!rating || saving}
          className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : existing ? "Update rating" : "Submit rating"}
        </button>
      </div>
    </form>
  );
}

/* ============ Page ============ */
function ClientPortalPage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [connections, setConnections] = useState([]);
  const [connLoading, setConnLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const [portal, setPortal] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");

  const [showCodeForm, setShowCodeForm] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [codeError, setCodeError] = useState("");

  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const [lightboxIndex, setLightboxIndex] = useState(null);

  /* ---- auth ---- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  /* ---- connections ---- */
  const loadConnections = useCallback(async (preferredId = null) => {
    setConnLoading(true);

    try {
      const { data, error } = await supabase.rpc("my_connections");

      if (error) {
        console.error("Failed to load connections:", error.message);
        setPortalError(error.message);
        return [];
      }

      const rows = Array.isArray(data) ? data : [];
      setConnections(rows);

      const selectedId =
        preferredId && rows.some((row) => row.photographer_id === preferredId)
          ? preferredId
          : rows.some((row) => row.photographer_id === activeId)
          ? activeId
          : rows[0]?.photographer_id || null;

      setActiveId(selectedId);
      if (rows.length > 0) setShowCodeForm(false);
      return rows;
    } catch (err) {
      console.error("Unexpected connection loading error:", err);
      setPortalError(err.message || "Could not load your photographer connections.");
      return [];
    } finally {
      setConnLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    if (authLoading) return;

    if (user) {
      loadConnections();
    } else {
      setConnections([]);
      setActiveId(null);
      setPortal(null);
      setPortalError("");
      setCodeError("");
      setShowCodeForm(false);
    }
  }, [user, authLoading, loadConnections]);

  /* ---- the active photographer's portal ---- */
  const loadPortal = useCallback(async (photographerId) => {
    if (!photographerId || typeof photographerId !== "string") {
      setPortal(null);
      setPortalError("No photographer selected. Please reconnect using the photographer code.");
      return;
    }

    setPortalLoading(true);
    setPortalError("");

    try {
      const { data, error } = await supabase.rpc("get_portal", {
        p_photographer_id: photographerId,
      });

      if (error) throw error;
      if (!data) throw new Error("The photographer portal returned no data.");
      
      const featuredPhotos = await Promise.all(
        (data?.featured_photos || []).map(async (photo) => ({
          ...photo,
          photo_url: await getFeaturedPhotoSignedUrl(photo.storage_path),
        }))
      );

      setPortal({
        ...data,
        featured_photos: featuredPhotos,
      });


      console.log("Photographer portal loaded:", data);
      setPortal(data);
    } catch (err) {
      console.error("Failed to load portal:", err.message || err);
      setPortalError(err.message || "Failed to load photographer portal.");
      setPortal(null);
    } finally {
      setPortalLoading(false);
    }
  }, []);

  useEffect(() => {
    setLightboxIndex(null);
    if (activeId) loadPortal(activeId);
    else setPortal(null);
  }, [activeId, loadPortal]);

  /* ---- connect with a code ---- */
  const handleConnect = async (code, reset) => {
    setConnecting(true);
    setCodeError("");
    setPortalError("");

    try {
      const { data, error } = await supabase.rpc("connect_with_code", {
        p_code: code.trim().toUpperCase(),
      });

      if (error) throw error;

      // connect_with_code returns an object such as
      // { success: true, photographer_id: "..." }, not a UUID directly.
      const photographerId = data?.photographer_id;
      if (!photographerId || typeof photographerId !== "string") {
        throw new Error("The connection response did not include a valid photographer ID.");
      }

      const rows = await loadConnections(photographerId);
      const connected = rows.some((row) => row.photographer_id === photographerId);

      if (!connected) {
        throw new Error("The code was accepted, but the saved connection could not be found. Refresh and try again.");
      }

      reset?.();
      setShowCodeForm(false);
      setActiveId(photographerId);
      await loadPortal(photographerId);
    } catch (err) {
      console.error("Failed to connect to photographer:", err);
      setCodeError(err.message || "Could not connect to the photographer.");
    } finally {
      setConnecting(false);
    }
  };

  /* ---- rating ---- */
  const handleReview = async (rating, comment) => {
    setReviewSaving(true);
    setReviewError("");

    const { error } = await supabase.rpc("submit_review", {
      p_photographer_id: activeId,
      p_rating: rating,
      p_comment: comment,
    });

    setReviewSaving(false);

    if (error) {
      setReviewError(error.message);
      return;
    }

    await loadPortal(activeId);
  };

  /* ---- shape the data for the existing Calendar component ---- */
  const calendarEvents = useMemo(
    () =>
      (portal?.events || []).map((row) => {
        const start = new Date(row.start_time);
        const end = new Date(row.end_time);
        return {
          id: row.id,
          title: "Booked",
          client: "",
          photographer: "",
          category: row.category,
          location: "",
          gears: [],
          notes: "",
          start,
          end,
          date: start.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          time: start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      }),
    [portal]
  );

  // get_portal currently returns the photographer fields at the top level
  // (username, bio, avatar_path, featured_photos), rather than nested under
  // portal.profile / portal.featured. Support both shapes during transition.
  const profile = portal?.profile || portal?.photographer || portal || null;

  const rawFeatured = portal?.featured || portal?.featured_photos || [];
  const featured = Array.isArray(rawFeatured)
    ? rawFeatured.map((photo, index) => ({
        ...photo,
        id: photo.id ?? photo.photo_id ?? `${index}-${photo.storage_path || photo.image_path || photo.photo_url || "photo"}`,
        image_path:
          photo.image_path || photo.storage_path || photo.photo_url || photo.photo_path || null,
        caption: photo.caption || photo.title || photo.photo_name || "",
      })).filter((photo) => Boolean(photo.image_path))
    : [];

  const reviews = Array.isArray(portal?.reviews) ? portal.reviews : [];
  const myReview = reviews.find((r) => r.mine) || null;

  /* ---- lightbox keys ---- */
  useEffect(() => {
    if (lightboxIndex === null) return;

    function onKey(e) {
      if (e.key === "Escape") setLightboxIndex(null);
      else if (e.key === "ArrowRight")
        setLightboxIndex((i) => (i + 1) % featured.length);
      else if (e.key === "ArrowLeft")
        setLightboxIndex((i) => (i - 1 + featured.length) % featured.length);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, featured.length]);

  /* ============ RENDER ============ */
  if (authLoading) {
    return <div className="min-h-[50vh] px-4 py-16 text-center text-sm text-slate-500">Loading...</div>;
  }

  if (!user) {
    return <ClientAuth />;
  }

  const noConnections = !connLoading && connections.length === 0;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-950 px-3 py-4 text-slate-100 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
      {/* Header */}
      <div className="mb-5 flex min-w-0 flex-col items-start justify-between gap-4 sm:mb-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-white sm:text-2xl">Client Portal</h2>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-slate-400">
            View your photographer's availability, work and ratings.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {connections.length > 1 &&
            connections.map((c) => (
              <button
                key={c.photographer_id}
                type="button"
                onClick={() => setActiveId(c.photographer_id)}
                className={`max-w-full truncate rounded-lg px-3 py-2 text-xs font-medium transition ${
                  activeId === c.photographer_id
                    ? "bg-sky-500 text-slate-950"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {c.display_name}
              </button>
            ))}

          {!noConnections && (
            <button
              type="button"
              onClick={() => {
                setCodeError("");
                setShowCodeForm(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-sky-400 transition hover:bg-slate-800"
            >
              <FaPlus className="text-[10px]" /> Add code
            </button>
          )}

          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition hover:text-white"
          >
            Sign out
          </button>
        </div>
      </div>

      {connLoading && connections.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">Loading...</p>
      ) : noConnections || showCodeForm ? (
        <div className="py-3 sm:py-6">
          <CodeForm
            onConnect={handleConnect}
            connecting={connecting}
            error={codeError}
            onCancel={showCodeForm && !noConnections ? () => setShowCodeForm(false) : null}
          />
        </div>
      ) : portalLoading && !portal ? (
        <p className="py-16 text-center text-sm text-slate-500">Loading photographer...</p>
      ) : portalError ? (
        <p className="rounded-xl border border-dashed border-rose-500/40 py-10 text-center text-sm text-rose-300">
          {portalError}
        </p>
      ) : portal && profile ? (
          <div className="min-w-0 space-y-4 sm:space-y-5">
            {/* Profile + rating */}
            <section className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <Avatar
                  path={profile.avatar_path}
                  name={profile.display_name || profile.username || profile.name || "Photographer"}
                  className="h-24 w-24 flex-shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <h3 className="text-xl font-bold text-white">{profile.display_name || profile.username || profile.name || "Photographer"}</h3>
                    <span className="flex items-center gap-2 text-sm">
                      <Stars value={portal.rating_avg} />
                      <span className="font-semibold tabular-nums text-white">
                        {portal.rating_count > 0 ? Number(portal.rating_avg).toFixed(1) : "No ratings"}
                      </span>
                      {portal.rating_count > 0 && (
                        <span className="text-xs text-slate-500">
                          ({portal.rating_count} review{portal.rating_count !== 1 ? "s" : ""})
                        </span>
                      )}
                    </span>
                  </div>

                  {(profile.tagline || profile.bio_title) && (
                    <p className="mt-1 text-sm text-sky-300">{profile.tagline || profile.bio_title}</p>
                  )}

                  {profile.location && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                      <FaMapMarkerAlt className="text-slate-500" /> {profile.location}
                    </p>
                  )}

                  {profile.bio && (
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">
                      {profile.bio}
                    </p>
                  )}

                  {profile.specialties?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {profile.specialties.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-300"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Featured photos */}
            <Section
              title="Featured Photos"
              dot="bg-amber-400"
              right={
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-300">
                  {featured.length}
                </span>
              }
            >
              {featured.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-700 py-10 text-center text-sm text-slate-500">
                  <FaRegImages className="text-2xl text-slate-600" />
                  No featured photos yet.
                </div>
              ) : (
                <div className="grid min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {featured.map((photo, index) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setLightboxIndex(index)}
                      className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-700 bg-slate-800 transition hover:-translate-y-0.5 hover:border-sky-400"
                    >
                      <img
                        src={publicUrl(photo.image_path)}
                        alt={photo.caption || "Featured photo"}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                      {photo.caption && (
                        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 text-left text-[11px] text-white">
                          {photo.caption}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </Section>

            {/* Calendar */}
            <Section title="Availability" dot="bg-sky-400">
              <p className="mb-3 text-xs text-slate-500">
                Days with a booking are already taken. Details of other clients' events are kept private.
              </p>
              <div className="min-w-0 max-w-full overflow-x-auto rounded-lg">
                <Calendar
                  events={calendarEvents}
                  onSelectSlot={() => {}}
                  onEventClick={() => {}}
                />
              </div>
            </Section>

            {/* Ratings */}
            <Section
              title="Ratings & Reviews"
              dot="bg-emerald-400"
              right={
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-300">
                  {portal.rating_count}
                </span>
              }
            >
              <div className="space-y-3">
                <ReviewForm
                  key={`${activeId}-${myReview?.id || "new"}`}
                  existing={myReview}
                  onSubmit={handleReview}
                  saving={reviewSaving}
                  error={reviewError}
                />

                {reviews.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-700 py-6 text-center text-sm text-slate-500">
                    No reviews yet.
                  </p>
                ) : (
                  reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-lg border border-slate-700 bg-slate-950/40 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Stars value={review.rating} size="text-xs" />
                          {review.mine && (
                            <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {new Date(review.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">
                          {review.comment}
                        </p>
                      )}
                    </article>
                  ))
                )}
              </div>
            </Section>
          </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700 px-4 py-10 text-center">
          <p className="text-sm font-medium text-slate-200">Photographer portal is empty</p>
          <p className="mt-1 text-xs text-slate-500">The connection is active, but the portal did not return a profile to display.</p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && featured[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black/95 px-1 backdrop-blur-sm sm:px-2"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="flex items-center justify-between px-4 py-4 text-white sm:px-6"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex items-center gap-2 text-sm text-slate-300">
              <FaCamera className="text-sky-400" />
              {lightboxIndex + 1} / {featured.length}
            </span>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="text-slate-400 transition-colors hover:text-white"
              aria-label="Close"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {featured.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((i) => (i - 1 + featured.length) % featured.length)
                }
                className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/70 hover:text-white sm:left-6"
                aria-label="Previous photo"
              >
                <FaChevronLeft />
              </button>
            )}

            <img
              src={publicUrl(featured[lightboxIndex].image_path)}
              alt={featured[lightboxIndex].caption || "Featured photo"}
              className="max-h-[72vh] max-h-[min(78vh,900px)] max-w-full rounded-lg object-contain shadow-2xl"
            />

            {featured.length > 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex((i) => (i + 1) % featured.length)}
                className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/70 hover:text-white sm:right-6"
                aria-label="Next photo"
              >
                <FaChevronRight />
              </button>
            )}
          </div>

          <p className="py-5 text-center text-sm text-slate-300">
            {featured[lightboxIndex].caption || ""}
          </p>
        </div>
      )}
      </div>
    </div>
  );
}

export default ClientPortalPage;