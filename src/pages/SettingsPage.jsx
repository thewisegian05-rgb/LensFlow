import { supabase } from "../lib/supabaseClient";

import {
  FaSun,
  FaMoon,
  FaBug,
  FaChevronDown,
  FaKey,
  FaLaptop,
  FaSignOutAlt,
  FaWallet,
} from "react-icons/fa";

import { flushSync } from "react-dom";
import { useOutletContext } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useRef, useState, useEffect } from "react";

import ReportProblemModal from "../components/Settings/ReportProblemModal";
import ActiveSessionsModal from "../components/Settings/ActiveSessionsModal";
import SignOutOthersModal from "../components/Settings/SignOutOthersModal";
import ChangePasswordModal from "../components/Settings/ChangePasswordModal";
import PaymentSettings from "../components/Settings/PaymentSettings";

/* ------------------------------------------------------------------ */
/*                    This is the Animations                       */
/* ------------------------------------------------------------------ */
const animationStyles = `
  @keyframes settingsFadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes overlayFade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes modalPop {
    from { opacity: 0; transform: translateY(12px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .settings-reveal {
    opacity: 0;
    animation: settingsFadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  .modal-overlay-anim { animation: overlayFade 0.2s ease-out; }
  .modal-card-pop     { animation: modalPop 0.3s cubic-bezier(0.22, 1, 0.36, 1); }

  @media (prefers-reduced-motion: reduce) {
    .settings-reveal, .modal-overlay-anim, .modal-card-pop {
      animation: none;
      opacity: 1;
    }
  }
`;

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                    */
/* ------------------------------------------------------------------ */
function SettingsSkeleton() {
  const bar = "rounded bg-slate-200 dark:bg-slate-700";

  return (
    <div
      className="animate-pulse"
      aria-busy="true"
      aria-label="Loading settings"
    >
      <div className={`${bar} mb-3 h-7 w-40`} />
      <div className={`${bar} mb-6 h-4 w-80 max-w-full`} />

      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="mb-6 rounded-xl border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/50"
        >
          <div className={`${bar} mb-3 h-5 w-44`} />
          <div className={`${bar} mb-6 h-4 w-64 max-w-full`} />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`${bar} h-10 w-10 rounded-lg`} />
              <div>
                <div className={`${bar} mb-2 h-4 w-32`} />
                <div className={`${bar} h-3 w-52`} />
              </div>
            </div>
            <div className={`${bar} h-9 w-28 rounded-lg`} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
function SettingsPage() {
  const { reportPageReady, routeKey } = useOutletContext();
  const { theme, setTheme } = useTheme();
  const [showPaymentSettings, setShowPaymentSettings] = useState(false);

  const themeButtonRef = useRef(null);
  const [iconRolling, setIconRolling] = useState(false);

  const handleThemeToggle = () => {
    if (iconRolling) return;

    const nextTheme = theme === "light" ? "dark" : "light";
    const button = themeButtonRef.current;

    if (!button) {
      setTheme(nextTheme);
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // No animation if the user prefers reduced motion.
    if (
      prefersReducedMotion ||
      !document.startViewTransition
    ) {
      setTheme(nextTheme);
      return;
    }

    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const radius = Math.ceil(
      Math.max(
        Math.hypot(x, y),
        Math.hypot(width - x, y),
        Math.hypot(x, height - y),
        Math.hypot(width - x, height - y)
      )
    );

    const root = document.documentElement;

    // Position the cosmic transition at the center of the theme toggle.
    root.style.setProperty("--theme-reveal-x", `${x}px`);
    root.style.setProperty("--theme-reveal-y", `${y}px`);
    root.style.setProperty("--theme-reveal-radius", `${radius}px`);

    // Select the animation direction.
    root.dataset.themeTransition =
      nextTheme === "dark" ? "to-dark" : "to-light";

    setIconRolling(true);

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setTheme(nextTheme);
      });
    });

    transition.finished.finally(() => {
      setIconRolling(false);

      root.style.removeProperty("--theme-reveal-x");
      root.style.removeProperty("--theme-reveal-y");
      root.style.removeProperty("--theme-reveal-radius");
      delete root.dataset.themeTransition;
    });
  };


  // Fixed 2s loading, kahit ready na ang content
  const [isLoading, setIsLoading] = useState(true);

  // State for modals and settings
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSignOutOthersModal, setShowSignOutOthersModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);

  // State for sign out other devices action
  const [signingOutOthers, setSigningOutOthers] = useState(false);
  const [showExperimental, setShowExperimental] = useState(false);
  const [authenticatorEnabled, setAuthenticatorEnabled] = useState(false);

  // State for change password modal
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      reportPageReady(routeKey);
    }
  }, [isLoading, reportPageReady, routeKey]);

  const handleChangePassword = async ({ currentPassword, newPassword }) => {
    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        current_password: currentPassword,
      });

      if (error) {
        throw error;
      }

      setShowChangePasswordModal(false);

      alert("Password changed successfully.");
    } catch (error) {
      console.error("Password change failed:", error);

      alert(error.message || "Unable to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOutOtherDevices = async () => {
    setSigningOutOthers(true);

    const { error } = await supabase.auth.signOut({
      scope: "others",
    });

    if (error) {
      console.error("Failed to sign out other devices:", error);

      setSigningOutOthers(false);

      // TODO: Replace with LensFlow error toast
      alert("Unable to sign out other devices.");

      return;
    }

    setSigningOutOthers(false);
    setShowSignOutOthersModal(false);

    // TODO: Replace with LensFlow success toast
    alert("All other devices have been signed out.");
  };

  // Loading gate (hooks are all above, so this is safe)
  if (isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <div>
      <style>{animationStyles}</style>

      {/* Header */}
      <div className="settings-reveal" style={{ animationDelay: "0ms" }}>
        <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">
          Settings
        </h2>

        <p className="mb-6 mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage your LensFlow preferences, account security, and application
          settings.
        </p>
      </div>

      {/* Appearance */}
      <div
        className="settings-reveal rounded-xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none"
        style={{ animationDelay: "80ms" }}
      >
        <div className="mb-5">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            Appearance
          </h3>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Customize how LensFlow looks on your device.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              Theme
            </p>

            <p className="text-sm text-slate-600 dark:text-slate-400">
              Choose between light and dark mode.
            </p>
          </div>

          <button
            ref={themeButtonRef}
            type="button"
            onClick={handleThemeToggle}
            disabled={iconRolling}
            role="switch"
            aria-checked={theme === "dark"}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            className={`theme-pill ${
              theme === "dark" ? "is-dark" : "is-light"
            }`}
          >
            <span className="theme-pill-label light-label">LIGHT</span>
            <span className="theme-pill-label dark-label">DARK</span>

            <span className="theme-pill-thumb">
              <span
                key={theme}
                className="theme-pill-icon-wrap"
              >
                {theme === "light" ? <FaSun /> : <FaMoon />}
              </span>
            </span>
          </button>
        </div>


      </div>

      {/* Account & Security */}
      <div
        className="settings-reveal mt-6 rounded-xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none"
        style={{ animationDelay: "160ms" }}
      >
        <div className="mb-5">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            Account & Security
          </h3>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage your password and active login sessions.
          </p>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {/* Change Password */}
          <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                <FaKey />
              </div>

              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  Change Password
                </p>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Update the password associated with your account.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowChangePasswordModal(true)}
              className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Change Password
            </button>
          </div>

          {/* Active Sessions */}
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                <FaLaptop />
              </div>

              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  Active Sessions
                </p>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  View devices currently signed in to your account.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSessionsModal(true)}
              className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              View Sessions
            </button>
          </div>

          {/* Sign Out All Devices */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                <FaSignOutAlt />
              </div>

              <div>
                <p className="font-medium text-red-600 dark:text-red-400">
                  Sign Out Other Devices
                </p>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Sign out of LensFlow on all devices except this one.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSignOutOthersModal(true)}
              className="shrink-0 rounded-lg border !border-red-500 px-4 py-2 text-sm font-semibold !text-red-600 transition hover:!bg-red-50 hover:!text-red-700 dark:!border-red-500/70 dark:!text-red-400 dark:hover:!bg-red-500/10"
            >
              Sign Out Others
            </button>
          </div>
        </div>
      </div>

      {/* Payment Settings */}
      <div
        className="settings-reveal mt-6 rounded-xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none"
        style={{ animationDelay: "200ms" }}
      >
        {/* Collapsible Header */}
        <button
          type="button"
          onClick={() => setShowPaymentSettings((prev) => !prev)}
          className="flex w-full items-center justify-between gap-4 bg-transparent text-left outline-none focus:bg-transparent focus:outline-none focus:ring-0"
          aria-expanded={showPaymentSettings}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
              <FaWallet />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                Payment Settings
              </h3>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                	Manage your preferred payment account and QR code.
              </p>
            </div>
          </div>

          <FaChevronDown
            className={`shrink-0 text-slate-500 transition-transform duration-300 ease-out dark:text-slate-400 ${
              showPaymentSettings ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Smooth Expand / Collapse */}
        <div
          className={`grid transition-all duration-300 ease-out ${
            showPaymentSettings
              ? "mt-5 grid-rows-[1fr] opacity-100"
              : "mt-0 grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-slate-200 pt-5 dark:border-slate-700">
              <PaymentSettings />
            </div>
          </div>
        </div>
      </div>

      {/* Experimental Features */}
      <div
        className="settings-reveal mt-6 rounded-xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none"
        style={{ animationDelay: "240ms" }}
      >
        {/* Header */}
        <button
          type="button"
          onClick={() => setShowExperimental((prev) => !prev)}
          className="flex w-full items-center justify-between gap-4 bg-transparent text-left outline-none focus:bg-transparent focus:outline-none focus:ring-0"
        >
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              Experimental Features
            </h3>

            <p className="mt-1 text-sm font-normal text-slate-600 dark:text-slate-400">
              Preview features that are still being developed and tested.
            </p>
          </div>

          <FaChevronDown
            className={`shrink-0 text-slate-500 transition-transform duration-300 ease-out dark:text-slate-400 ${
              showExperimental ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Smooth expand/collapse (laging naka-render para may transition) */}
        <div
          className={`grid transition-all duration-300 ease-out ${
            showExperimental
              ? "mt-5 grid-rows-[1fr] opacity-100"
              : "mt-0 grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-slate-200 pt-5 dark:border-slate-700">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    Google Authenticator App (2FA)
                  </p>

                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Add an extra layer of security to your LensFlow account.
                  </p>
                </div>

                {/* UI-only toggle */}
                <button
                  type="button"
                  onClick={() => setAuthenticatorEnabled((prev) => !prev)}
                  className={`relative h-7 w-12 shrink-0 rounded-full border transition-all duration-300 ease-out ${
                    authenticatorEnabled
                      ? "border-sky-600 bg-sky-600 shadow-sm"
                      : "border-slate-400 bg-slate-300 shadow-inner dark:border-slate-600 dark:bg-slate-600"
                  }`}
                  aria-pressed={authenticatorEnabled}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md ring-1 ring-black/10 transition-transform duration-300 ease-out ${
                      authenticatorEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Support */}
      <div
        className="settings-reveal mt-6 rounded-xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none"
        style={{ animationDelay: "320ms" }}
      >
        <div className="mb-5">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            Support
          </h3>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Get help and report issues while using LensFlow.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
              <FaBug />
            </div>

            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                Report a Problem
              </p>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Let us know if you encounter a bug or issue while using
                LensFlow.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="
              shrink-0 rounded-lg
              border border-sky-500
              bg-transparent
              px-5 py-2
              text-sm font-semibold text-sky-500
              transition
              hover:bg-sky-500/10
              hover:text-sky-600
              dark:border-sky-500
              dark:text-sky-400
              dark:hover:bg-sky-500/10
              dark:hover:text-sky-300
            "
          >
            Report
          </button>
        </div>
      </div>

      {/* Modals */}
      {showReportModal && (
        <ReportProblemModal onClose={() => setShowReportModal(false)} />
      )}

      {showSessionsModal && (
        <ActiveSessionsModal onClose={() => setShowSessionsModal(false)} />
      )}

      {showChangePasswordModal && (
        <ChangePasswordModal
          onClose={() => {
            if (!changingPassword) {
              setShowChangePasswordModal(false);
            }
          }}
          onSubmit={handleChangePassword}
          loading={changingPassword}
        />
      )}

      {showSignOutOthersModal && (
        <SignOutOthersModal
          onClose={() => {
            if (!signingOutOthers) {
              setShowSignOutOthersModal(false);
            }
          }}
          onConfirm={handleSignOutOtherDevices}
          loading={signingOutOthers}
        />
      )}
    </div>
  );
}

export default SettingsPage;