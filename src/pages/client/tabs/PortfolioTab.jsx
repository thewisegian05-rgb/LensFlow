import { useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import {
  FaRegImages,
  FaMapMarkerAlt,
  FaCalendarCheck,
  FaUsers,
  FaCheckCircle,
  FaCommentDots,
  FaFacebook,
  FaInstagram,
  FaCamera,
  FaEnvelope,
  FaMobileAlt,
  FaHome,
  FaImages,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
} from "react-icons/fa";
import Section from "../components/ui/Section";
import TabHeader from "../components/ui/TabHeader";
import Stars from "../components/ui/Stars";
import Avatar from "../components/ui/Avatar";
import Lightbox from "../components/Lightbox";
import { getFeatured, getProfile, getReviews, publicUrl } from "../utils/portalUrls";

function StatusTile({ icon: Icon, label, tone, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-800 bg-[#0B1628] p-4">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${tone}`}>
          <Icon />
        </span>
        <p className="text-xs font-medium text-slate-400">{label}</p>
      </div>
      {children}
    </div>
  );
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon className="mt-0.5 shrink-0 text-sm text-slate-500" />
      <div className="min-w-0">
        <dt className="text-[11px] text-slate-500">{label}</dt>
        <dd className="truncate text-sm font-medium text-slate-200">{value}</dd>
      </div>
    </div>
  );
}

const carouselStyles = `
  @keyframes lfParade {
    0% { transform: translateX(0); }
    100% { transform: translateX(-33.333%); }
  }
  .lf-parade { display: flex; width: max-content; animation: lfParade 30s linear infinite; }
  .lf-parade:hover { animation-play-state: paused; }
  @media (prefers-reduced-motion: reduce) { .lf-parade { animation: none; } }
`;

const photoSrc = (p) => p?.src || (p?.image_path ? publicUrl(p.image_path) : "");

function AlbumViewer({ album, onClose }) {
  const [index, setIndex] = useState(0);
  const photos = album.photos || [];
  const go = (i) => setIndex(Math.max(0, Math.min(photos.length - 1, i)));

  return createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={album.title}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 backdrop-blur-md"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
          <p className="max-w-[80%] truncate text-sm font-bold text-white">{album.title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <FaTimes />
          </button>
        </div>

        <div className="relative flex aspect-[4/3] items-center justify-center bg-black sm:aspect-[16/10]">
          <span className="absolute right-3 top-3 z-10 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
            {photos.length ? index + 1 : 0}/{photos.length}
          </span>
          {photos[index] && photoSrc(photos[index]) ? (
            <img
              src={photoSrc(photos[index])}
              alt={photos[index].title || album.title}
              className="max-h-full max-w-full select-none object-contain"
            />
          ) : (
            <p className="text-sm text-slate-500">This photo isn't available.</p>
          )}
          {index > 0 && (
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <FaChevronLeft />
            </button>
          )}
          {index < photos.length - 1 && (
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <FaChevronRight />
            </button>
          )}
        </div>

        <div className="flex justify-center gap-1.5 border-t border-slate-800 bg-slate-950 py-3">
          {photos.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Photo ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-sky-500" : "w-1.5 bg-slate-700"}`}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

function CarouselSection({ albums }) {
  const [active, setActive] = useState(null);
  if (!albums.length) return null;
  const looped = [...albums, ...albums, ...albums];

  return (
    <Section
      title="Carousel"
      dot="bg-sky-400"
      right={
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-300">
          {albums.length}
        </span>
      }
    >
      <style>{carouselStyles}</style>
      <div className="relative overflow-hidden rounded-xl py-2">
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-[#0B1628] to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-[#0B1628] to-transparent" />
        <div className="lf-parade gap-4">
          {looped.map((album, i) => {
            const cover = photoSrc(album.photos?.[0]);
            return (
              <button
                key={`${album.id}-${i}`}
                type="button"
                onClick={() => setActive(album)}
                className="group relative h-32 w-44 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 text-left transition hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {cover ? (
                  <img
                    src={cover}
                    alt={album.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  // No photo in this album yet (or it couldn't load): show an icon, not a blank tile.
                  <span className="flex h-full w-full items-center justify-center text-2xl text-slate-600">
                    <FaRegImages />
                  </span>
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {album.photos?.length > 1 && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white">
                    <FaImages />
                  </span>
                )}
                <span className="absolute inset-x-3 bottom-2 truncate text-xs font-semibold text-white">
                  {album.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {active && <AlbumViewer album={active} onClose={() => setActive(null)} />}
    </Section>
  );
}

export default function PortfolioTab() {
  const { portal } = /** @type {any} */ (useOutletContext());
  const featured = getFeatured(portal);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  // The photographer's contact details stay tucked away until asked for.
  const [showDetails, setShowDetails] = useState(false);

  const profile = getProfile(portal);
  const name = profile.display_name || profile.username || profile.name || "Photographer";

  // Real numbers and profile info come from get_portal_extras (see usePortal).
  const overview = portal.overview || {};
  const pStats = overview.stats || portal.photographer_stats || portal.stats || {};
  const eventsCompleted = Number(pStats.events_completed ?? portal.events_completed) || 0;
  const eventsUpcoming = Number(pStats.events_upcoming ?? portal.events_upcoming) || 0;
  const eventsTotal =
    Number(pStats.events_total ?? portal.events_total ?? portal.event_count) ||
    eventsCompleted + eventsUpcoming;
  const ongoingClients =
    Number(pStats.clients_ongoing ?? portal.ongoing_clients ?? portal.active_clients) || 0;

  // Rating: use the value from get_portal_extras first, then get_portal, and
  // as a last resort work it out from the reviews the portal already loaded.
  const reviewRatings = getReviews(portal)
    .map((r) => Number(r.rating ?? r.stars ?? r.score))
    .filter((n) => Number.isFinite(n) && n > 0);
  const ratingCount =
    Number(overview.rating_count) || Number(portal.rating_count) || reviewRatings.length;
  const ratingAvg =
    Number(overview.rating_avg) ||
    Number(portal.rating_avg) ||
    (reviewRatings.length
      ? reviewRatings.reduce((sum, n) => sum + n, 0) / reviewRatings.length
      : 0);

  // Facebook / Instagram: the Profile page has no fields for these yet, so they
  // only show up once those fields exist.
  const socials = [
    { href: profile.facebook || profile.facebook_url, icon: FaFacebook, label: "Facebook" },
    { href: profile.instagram || profile.instagram_url, icon: FaInstagram, label: "Instagram" },
  ].filter((x) => x.href);

  const info = overview.info || profile.profile_info || profile.profileInfo || {};
  const albums = portal.albums || portal.carousel_albums || portal.carouselAlbums || [];
  const niches = [...(info.niches || []), info.customNiche].filter(Boolean);
  const chips = niches.length ? niches : profile.specialties || [];
  const details = [
    { icon: FaCamera, label: "Work", value: info.work || profile.work },
    { icon: FaMapMarkerAlt, label: "Location", value: info.location || profile.location },
    { icon: FaHome, label: "Hometown", value: info.hometown },
    { icon: FaEnvelope, label: "Email", value: info.personalEmail },
    { icon: FaMobileAlt, label: "Phone", value: info.personalNumber },
    { icon: FaEnvelope, label: "Studio email", value: info.studioEmail },
    { icon: FaMobileAlt, label: "Studio phone", value: info.studioNumber },
  ].filter((d) => d.value);

  // Contact button: studio email first, then personal email, then phone.
  const contactEmail = info.studioEmail || info.personalEmail;
  const contactPhone = info.studioNumber || info.personalNumber;
  const contactHref = contactEmail
    ? `mailto:${contactEmail}`
    : contactPhone
    ? `tel:${String(contactPhone).replace(/[^\d+]/g, "")}`
    : null;

  const bio =
    profile.bio ||
    profile.tagline ||
    "Discover the photographer's style, specialties, and approach to capturing your moments.";

  return (
    <div className="min-w-0 space-y-4">
      {/* Profile card */}
      <section className="lf-reveal min-w-0 rounded-2xl border border-slate-700/80 bg-gradient-to-r from-[#102338] to-[#0B1628] p-4 shadow-sm shadow-black/10 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="lf-ring h-[88px] w-[88px] shrink-0">
            {/* The avatar is in the private photos bucket, so use the signed link when we have one */}
            <Avatar
              path={portal.avatar_signed_url || profile.avatar_path}
              name={name}
              className="h-full w-full rounded-full"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <h3 className="text-xl font-bold text-white">{name}</h3>
                <span className="flex items-center gap-2 text-sm">
                  <Stars value={ratingAvg} />
                  <span className="font-semibold tabular-nums text-white">
                    {ratingCount > 0 ? ratingAvg.toFixed(1) : "No ratings"}
                  </span>
                  {ratingCount > 0 && (
                    <span className="text-xs text-slate-500">
                      ({ratingCount} review{ratingCount !== 1 ? "s" : ""})
                    </span>
                  )}
                </span>
              </div>
              {contactHref && (
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={contactHref}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-sky-500 px-4 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-[#0B1628]"
                  >
                    <FaCommentDots />
                    <span className="hidden sm:inline">Contact</span>
                  </a>
                </div>
              )}
            </div>

            {(profile.tagline || profile.bio_title) && (
              <p className="mt-1 text-sm text-sky-300">{profile.tagline || profile.bio_title}</p>
            )}

            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">{bio}</p>

            {chips.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {chips.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Photographer stats */}
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <StatusTile icon={FaCalendarCheck} label="Events handled" tone="bg-sky-500/10 text-sky-400">
                <p className="text-2xl font-bold tabular-nums text-white">{eventsTotal}</p>
                <p className="text-xs text-slate-400">
                  {eventsTotal > 0 ? `${eventsUpcoming} upcoming` : "No events yet"}
                </p>
              </StatusTile>

              <StatusTile icon={FaUsers} label="Ongoing clients" tone="bg-amber-400/10 text-amber-300">
                <p className="text-2xl font-bold tabular-nums text-white">{ongoingClients}</p>
                <p className="text-xs text-slate-400">
                  {ongoingClients > 0 ? "Currently being served" : "No active clients"}
                </p>
              </StatusTile>

              <StatusTile icon={FaCheckCircle} label="Completed events" tone="bg-emerald-400/10 text-emerald-300">
                <p className="text-2xl font-bold tabular-nums text-white">{eventsCompleted}</p>
                <p className="text-xs text-slate-400">
                  {eventsCompleted > 0 ? "Delivered to happy clients" : "None completed yet"}
                </p>
              </StatusTile>
            </div>

            {/* Photographer details + socials (hidden until "Show more details") */}
            {(details.length > 0 || socials.length > 0) && (
              <div className="mt-4 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDetails((prev) => !prev)}
                  aria-expanded={showDetails}
                  aria-controls="photographer-details"
                  className="flex items-center gap-2 rounded text-xs font-semibold text-sky-300 transition hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  {showDetails ? "Hide details" : "Show more details"}
                  <FaChevronDown
                    className={`text-[10px] transition-transform duration-200 ${
                      showDetails ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showDetails && (
                  <div
                    id="photographer-details"
                    className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {details.length > 0 && (
                      <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
                        {details.map((d) => (
                          <Detail key={d.label} {...d} />
                        ))}
                      </dl>
                    )}
                    {socials.length > 0 && (
                      <div className="flex items-center gap-2">
                        {socials.map(({ href, icon: Icon, label }) => (
                          <a
                            key={label}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={label}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition hover:border-sky-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                          >
                            <Icon />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <CarouselSection albums={albums} />

      <TabHeader
        eyebrow="Portfolio"
        title="Featured Works"
        text="A selection of the photographer's best work. Tap a photo to view it full size."
      />

      <Section
        title="Featured Works"
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
                style={{ "--d": `${index * 80}ms` }}
                className="lf-photo lf-sheen group relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-700 bg-slate-800 transition hover:border-sky-400"
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

      <Lightbox
        photos={featured}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onChange={setLightboxIndex}
      />
    </div>
  );
}