import { useEffect, useState } from "react";
import LoginButton from "./LoginButton";

// Sticky top bar. Its styles (.lf-header, .lf-drop, .lf-btn, ...) live in the
// CSS block at the top of LandingPage.jsx, so render it inside <LandingPage />.
export default function Navbar({ loginHref, onLogin }) {
  // Adds a soft shadow under the bar once the page has scrolled.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`lf-header lf-drop border-b ${scrolled ? "lf-scrolled" : ""}`}
      style={{ borderColor: "var(--line)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <a href="/" className="leading-tight">
          <span className="block text-xl font-bold">
            <span className="mr-2 text-sky-500">◉</span>LensFlow
          </span>
          <span className="lf-muted block text-[11px]">Studio Management</span>
        </a>
        <nav className="flex items-center gap-5 text-sm">
          <a href="#features" className="lf-muted lf-link hidden hover:text-white sm:inline">Features</a>
          <a href="#categories" className="lf-muted lf-link hidden hover:text-white sm:inline">Shoot types</a>
          <LoginButton href={loginHref} onLogin={onLogin} className="lf-btn px-4 py-2">Get started</LoginButton>
        </nav>
      </div>
    </header>
  );
}