import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { useLocation } from "react-router-dom";

const ThemeContext = createContext(null);

const CLIENT_THEME_KEY = "lensflow-client-theme";
const ADMIN_THEME_KEY = "lensflow-admin-theme";
// Shared by Landing Page, Login, and Registration only.
const LANDING_THEME_KEY = "lensflow-landing-theme";

function getSavedTheme(key, fallback = "light") {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored === "dark" || stored === "light" ? stored : fallback;
  } catch {
    return fallback;
  }
}

function getPageType(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/") return "landing";
  if (["/login", "/signup", "/register", "/registration"].includes(path)) return "auth";
  if (path === "/customer" || path.startsWith("/customer/")) return "client";
  if (path === "/dashboard" || path.startsWith("/dashboard/")) return "admin";
  return "public";
}

export function ThemeProvider({ children }) {
  const { pathname } = useLocation();
  const pageType = getPageType(pathname);

  const [clientTheme, setClientTheme] = useState(() => getSavedTheme(CLIENT_THEME_KEY));
  const [adminTheme, setAdminTheme] = useState(() => getSavedTheme(ADMIN_THEME_KEY));
  const [landingTheme, setLandingTheme] = useState(() => getSavedTheme(LANDING_THEME_KEY, "dark"));

  const theme =
    pageType === "client" ? clientTheme :
    pageType === "admin" ? adminTheme :
    (pageType === "landing" || pageType === "auth") ? landingTheme :
    "light";

  const setTheme = (nextTheme) => {
    const update = (previous) => {
      const next = typeof nextTheme === "function" ? nextTheme(previous) : nextTheme;
      return next === "dark" ? "dark" : "light";
    };

    if (pageType === "client") setClientTheme(update);
    else if (pageType === "admin") setAdminTheme(update);
    else if (pageType === "landing" || pageType === "auth") setLandingTheme(update);
    // Landing and authentication pages share one saved theme.
    // Admin and Client preferences remain separate.
  };

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem(CLIENT_THEME_KEY, clientTheme); } catch {}
  }, [clientTheme]);

  useEffect(() => {
    try { localStorage.setItem(ADMIN_THEME_KEY, adminTheme); } catch {}
  }, [adminTheme]);

  useEffect(() => {
    try { localStorage.setItem(LANDING_THEME_KEY, landingTheme); } catch {}
  }, [landingTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
