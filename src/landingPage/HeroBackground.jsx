import { useEffect, useRef } from "react";

// Full-width, moving background for the hero section.
//
// WHAT MOVES
// - The photo slowly pans and zooms back and forth (the "camera drift").
// - It shifts with your mouse and trails behind when you scroll (parallax).
// - Soft blue and indigo glows float across the photo.
// All motion is switched off for people who have "reduce motion" turned on.
//
// HOW TO ADD YOUR PHOTO
// 1. Put your image in src/assets/landing/ (for example hero.jpg).
// 2. Uncomment the import line below and set HERO_PHOTO to heroPhoto.
//
// Tips: use a wide landscape photo (at least 2000px wide), keep the file under
// about 500 KB so the page loads fast, and only use a photo you have permission
// to show publicly. Photos with calm, darker areas work best behind text.

// import heroPhoto from "../assets/landing/hero.jpg";
const HERO_PHOTO = ""; // → heroPhoto

const reducedMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function HeroBackground({ src = HERO_PHOTO }) {
  const layerRef = useRef(null);

  // Mouse and scroll parallax. Moves the whole photo layer.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || reducedMotion()) return;

    const hasMouse = window.matchMedia("(pointer: fine)").matches;
    let targetX = 0, targetY = 0, x = 0, y = 0, scroll = 0, frame = 0;

    const apply = () => {
      layer.style.transform = `translate3d(${x}px, ${y + scroll * 0.25}px, 0)`;
    };
    const tick = () => {
      frame = 0;
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      apply();
      if (Math.abs(targetX - x) > 0.1 || Math.abs(targetY - y) > 0.1) request();
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onMove = (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * -36;
      targetY = (e.clientY / window.innerHeight - 0.5) * -24;
      request();
    };
    const onScroll = () => {
      scroll = Math.min(window.scrollY, 500);
      apply();
    };

    if (hasMouse) window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Photo layer. Oversized so the movement never shows an edge. */}
      <div
        ref={layerRef}
        className="absolute -bottom-[5%] -left-[6%] -right-[6%] -top-1/4 will-change-transform"
      >
        {src ? (
          <img
            src={src}
            alt=""
            fetchpriority="high"
            className="lf-hero-img absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          // Shown until you add a photo, so the hero still looks finished.
          <div
            className="lf-hero-img absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 80% at 80% 30%, rgba(14,165,233,.3), transparent 70%), radial-gradient(50% 70% at 15% 80%, rgba(99,102,241,.25), transparent 70%)",
            }}
          />
        )}
      </div>

      {/* Dark overlay keeps the text readable (darker on the left where the text sits) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(2,6,23,.9) 0%, rgba(2,6,23,.68) 45%, rgba(2,6,23,.32) 100%)",
        }}
      />

      {/* Floating glows */}
      <div className="lf-orb lf-orb-a" />
      <div className="lf-orb lf-orb-b" />
      <div className="lf-orb lf-orb-c" />

      {/* Fades the hero into the page background below */}
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{ background: "linear-gradient(to bottom, transparent, var(--bg))" }}
      />
    </div>
  );
}