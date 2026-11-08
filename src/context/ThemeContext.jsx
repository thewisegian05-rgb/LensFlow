
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

import { useLocation } from "react-router-dom";

const ThemeContext = createContext(null);

// Separate saved preferences.
const CLIENT_THEME_KEY = "lensflow-client-theme";
const ADMIN_THEME_KEY = "lensflow-admin-theme";

// ==========================================
// READ SAVED THEME
// ==========================================

function getSavedTheme(key) {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    const saved = localStorage.getItem(key);

    return saved === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

// ==========================================
// DETECT CURRENT PAGE TYPE
// ==========================================

function getPortalType(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";

  // Login and Sign Up always start in Dark Mode.
  if (
    path === "/login" ||
    path === "/signup"
  ) {
    return "auth";
  }

  // Customer Portal
  if (
    path === "/customer" ||
    path.startsWith("/customer/")
  ) {
    return "client";
  }

  // Photographer / Admin Portal
  if (
    path === "/dashboard" ||
    path.startsWith("/dashboard/")
  ) {
    return "admin";
  }

  // Other pages, including landing page.
  return "public";
}

// ==========================================
// THEME PROVIDER
// ==========================================

export function ThemeProvider({ children }) {
  const { pathname } = useLocation();

  const portalType = getPortalType(pathname);

  const [clientTheme, setClientTheme] = useState(
    () => getSavedTheme(CLIENT_THEME_KEY)
  );

  const [adminTheme, setAdminTheme] = useState(
    () => getSavedTheme(ADMIN_THEME_KEY)
  );

  // Choose the theme based on the current page.
  const theme =
    portalType === "client"
      ? clientTheme
      : portalType === "admin"
        ? adminTheme
        : portalType === "auth"
          ? "dark"
          : "light";

  // ========================================
  // UPDATE CURRENT PORTAL THEME
  // ========================================

  const setTheme = (nextTheme) => {
    const update = (previous) => {
      const next =
        typeof nextTheme === "function"
          ? nextTheme(previous)
          : nextTheme;

      return next === "dark" ? "dark" : "light";
    };

    if (portalType === "client") {
      setClientTheme(update);
    } else if (portalType === "admin") {
      setAdminTheme(update);
    }

    // Login, Sign Up, and public pages do not
    // modify the saved portal preferences.
  };

  // ========================================
  // APPLY THE CURRENT PAGE THEME
  // ========================================

  useLayoutEffect(() => {
    const root = document.documentElement;

    root.classList.toggle(
      "dark",
      theme === "dark"
    );

    root.style.colorScheme = theme;
  }, [theme]);

  // ========================================
  // SAVE CUSTOMER PREFERENCE
  // ========================================

  useEffect(() => {
    try {
      localStorage.setItem(
        CLIENT_THEME_KEY,
        clientTheme
      );
    } catch {
      // Storage unavailable.
    }
  }, [clientTheme]);

  // ========================================
  // SAVE ADMIN PREFERENCE
  // ========================================

  useEffect(() => {
    try {
      localStorage.setItem(
        ADMIN_THEME_KEY,
        adminTheme
      );
    } catch {
      // Storage unavailable.
    }
  }, [adminTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// ==========================================
// THEME HOOK
// ==========================================

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return context;
}
