import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { FaMoon, FaSun } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import LoginButton from "./LoginButton";

// Adjust the ThemeContext import path if NavBar.jsx lives elsewhere.
export default function Navbar({ loginHref, onLogin }) {
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [switching, setSwitching] = useState(false);
  const themeButtonRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleThemeToggle = () => {
    if (switching) return;

    const nextTheme = theme === "dark" ? "light" : "dark";
    const button = themeButtonRef.current;

    if (
      !button ||
      typeof document.startViewTransition !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setTheme(nextTheme);
      return;
    }

    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.ceil(
      Math.max(
        Math.hypot(x, y),
        Math.hypot(window.innerWidth - x, y),
        Math.hypot(x, window.innerHeight - y),
        Math.hypot(window.innerWidth - x, window.innerHeight - y)
      )
    );

    const root = document.documentElement;
    root.style.setProperty("--theme-reveal-x", `${x}px`);
    root.style.setProperty("--theme-reveal-y", `${y}px`);
    root.style.setProperty("--theme-reveal-radius", `${radius}px`);
    root.dataset.themeTransition = nextTheme === "dark" ? "to-dark" : "to-light";
    setSwitching(true);

    const cleanup = () => {
      delete root.dataset.themeTransition;
      root.style.removeProperty("--theme-reveal-x");
      root.style.removeProperty("--theme-reveal-y");
      root.style.removeProperty("--theme-reveal-radius");
      setSwitching(false);
    };

    try {
      const transition = document.startViewTransition(() => {
        flushSync(() => setTheme(nextTheme));
      });
      transition.finished.catch(() => {}).finally(cleanup);
    } catch (error) {
      console.error("Landing theme transition failed:", error);
      setTheme(nextTheme);
      cleanup();
    }
  };

  return (
    <header
      className={`lf-header lf-drop border-b ${scrolled ? "lf-scrolled" : ""}`}
      style={{ borderColor: "var(--line)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-4 sm:gap-3 sm:px-5">
        <a href="/" className="min-w-0 shrink-0 leading-tight">
          <span className="block text-base font-bold sm:text-xl">
            <span className="mr-2 text-sky-500">◉</span>LensFlow
          </span>
          <span className="lf-muted hidden text-[10px] min-[380px]:block sm:text-[11px]">Studio Management</span>
        </a>

        <nav className="flex shrink-0 items-center gap-1 text-sm sm:gap-4" aria-label="Landing page navigation">
          <a href="#features" className="lf-muted lf-link lf-header-link hidden sm:inline">Features</a>
          <a href="#categories" className="lf-muted lf-link lf-header-link hidden md:inline">Shoot types</a>

          {/* Same sliding pill and cosmic transition as the Admin/Client settings. */}
          <button
            ref={themeButtonRef}
            type="button"
            onClick={handleThemeToggle}
            disabled={switching}
            role="switch"
            aria-checked={theme === "dark"}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className={`theme-pill ${theme === "dark" ? "is-dark" : "is-light"}`}
          >
            <span className="theme-pill-label dark-label" aria-hidden="true">DARK</span>
            <span className="theme-pill-label light-label" aria-hidden="true">LIGHT</span>
            <span className="theme-pill-thumb" aria-hidden="true">
              <span key={theme} className="theme-pill-icon-wrap">
                {theme === "light" ? (
                  <FaSun className="theme-pill-icon" />
                ) : (
                  <FaMoon className="theme-pill-icon" />
                )}
              </span>
            </span>
          </button>

          <LoginButton
            href={loginHref}
            onLogin={onLogin}
            className="lf-btn px-2 py-2 sm:px-4"
          >
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Get started</span>
          </LoginButton>
        </nav>
      </div>
    </header>
  );
}
