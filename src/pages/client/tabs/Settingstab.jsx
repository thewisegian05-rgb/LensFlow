
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import {
  FaSun,
  FaMoon,
  FaBug,
  FaChevronDown,
  FaKey,
  FaLaptop,
  FaSignOutAlt,
  FaShieldAlt,
  FaExclamationCircle,
} from "react-icons/fa";

import { supabase } from "../../../lib/supabaseClient";
import { useTheme } from "../../../context/ThemeContext";

import ReportProblemModal from "../../../components/Settings/ReportProblemModal";
import ActiveSessionsModal from "../../../components/Settings/ActiveSessionsModal";
import SignOutOthersModal from "../../../components/Settings/SignOutOthersModal";
import ChangePasswordModal from "../../../components/Settings/ChangePasswordModal";

// ==========================================
// ANIMATIONS
// ==========================================

const animationStyles = `
  @keyframes clientSettingsFadeUp {
    from {
      opacity: 0;
      transform: translateY(16px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes clientSettingsOverlayFade {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes clientSettingsModalPop {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.96);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .client-settings-reveal {
    opacity: 0;
    animation:
      clientSettingsFadeUp
      0.5s cubic-bezier(0.22, 1, 0.36, 1)
      forwards;
  }

  @media (prefers-reduced-motion: reduce) {
    .client-settings-reveal {
      animation: none !important;
      opacity: 1 !important;
    }
  }
`;

// ==========================================
// SHARED STYLES
// ==========================================

const cardClass = `
  rounded-xl
  border border-slate-300
  bg-white p-5 shadow-sm

  dark:border-slate-700
  dark:bg-slate-800/50
  dark:shadow-none
`;

const titleClass = `
  text-xl font-semibold
  text-slate-900
  dark:text-white
`;

const descriptionClass = `
  mt-1 text-sm
  text-slate-600
  dark:text-slate-400
`;

const rowTitleClass = `
  font-medium
  text-slate-800
  dark:text-slate-200
`;

const secondaryButtonClass = `
  shrink-0 rounded-lg
  border border-slate-300
  px-4 py-2
  text-sm font-semibold
  text-slate-700

  transition-colors duration-200

  hover:border-slate-400
  hover:bg-slate-100

  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-sky-500

  disabled:cursor-not-allowed
  disabled:opacity-50

  dark:border-slate-600
  dark:text-slate-200
  dark:hover:bg-slate-700
`;

// ==========================================
// LOADING SKELETON
// ==========================================

function SettingsSkeleton() {
  const bar =
    "rounded bg-slate-200 dark:bg-slate-700";

  return (
    <div
      className="animate-pulse"
      aria-busy="true"
      aria-label="Loading client settings"
    >
      <div className={`${bar} mb-3 h-7 w-40`} />

      <div
        className={`
          ${bar}
          mb-6 h-4 w-80 max-w-full
        `}
      />

      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className={`${cardClass} mb-6`}
        >
          <div
            className={`${bar} mb-3 h-5 w-44`}
          />

          <div
            className={`
              ${bar}
              mb-6 h-4 w-64 max-w-full
            `}
          />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`${bar} h-10 w-10 rounded-lg`}
              />

              <div>
                <div
                  className={`${bar} mb-2 h-4 w-32`}
                />

                <div
                  className={`${bar} h-3 w-40`}
                />
              </div>
            </div>

            <div
              className={`${bar} h-9 w-24 rounded-lg`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// SETTINGS SECTION HEADER
// ==========================================

function SectionHeader({
  title,
  description,
}) {
  return (
    <div className="mb-5">
      <h3 className={titleClass}>
        {title}
      </h3>

      <p className={descriptionClass}>
        {description}
      </p>
    </div>
  );
}

// ==========================================
// SETTINGS ACTION ROW
// ==========================================

function SettingsActionRow({
  icon: Icon,
  title,
  description,
  buttonLabel,
  onClick,
  danger = false,
  last = false,
}) {
  return (
    <div
      className={`
        flex flex-col gap-4 py-4
        sm:flex-row sm:items-center
        sm:justify-between

        ${last ? "pb-0" : ""}
      `}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={`
            flex h-10 w-10 shrink-0
            items-center justify-center
            rounded-lg

            ${
              danger
                ? "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                : "bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
            }
          `}
        >
          <Icon aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <p
            className={
              danger
                ? "font-medium text-red-600 dark:text-red-400"
                : rowTitleClass
            }
          >
            {title}
          </p>

          <p className={descriptionClass}>
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClick}
        className={
          danger
            ? `
              shrink-0 self-start
              rounded-lg border border-red-500
              px-4 py-2
              text-sm font-semibold
              text-red-600

              transition-colors duration-200

              hover:bg-red-50
              hover:text-red-700

              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-red-500

              dark:border-red-500/70
              dark:text-red-400
              dark:hover:bg-red-500/10

              sm:self-auto
            `
            : `${secondaryButtonClass} self-start sm:self-auto`
        }
      >
        {buttonLabel}
      </button>
    </div>
  );
}

// ==========================================
// CLIENT SETTINGS TAB
// ==========================================

export default function Settingstab() {
  // ==========================================
  // THEME
  // ==========================================

  const { theme, setTheme } = useTheme();

  const themeButtonRef = useRef(null);
  const [iconRolling, setIconRolling] =
    useState(false);

  // ==========================================
  // LOADING
  // ==========================================

  const [isLoading, setIsLoading] =
    useState(true);

  // ==========================================
  // MODAL STATES
  // ==========================================

  const [showReportModal, setShowReportModal] =
    useState(false);

  const [showSessionsModal, setShowSessionsModal] =
    useState(false);

  const [
    showSignOutOthersModal,
    setShowSignOutOthersModal,
  ] = useState(false);

  const [
    showChangePasswordModal,
    setShowChangePasswordModal,
  ] = useState(false);

  // ==========================================
  // ACTION STATES
  // ==========================================

  const [
    signingOutOthers,
    setSigningOutOthers,
  ] = useState(false);

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false);

  // ==========================================
  // EXPERIMENTAL FEATURES
  // ==========================================

  const [
    showExperimental,
    setShowExperimental,
  ] = useState(false);

  const [
    authenticatorEnabled,
    setAuthenticatorEnabled,
  ] = useState(false);

  // ==========================================
  // LOADING TIMER
  // ==========================================

  useEffect(() => {
    // Matches the admin Settings page loading.
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // ==========================================
  // THEME TOGGLE
  // ==========================================

  const handleThemeToggle = () => {
    if (iconRolling) return;

    const nextTheme =
      theme === "light" ? "dark" : "light";

    const button = themeButtonRef.current;

    if (!button) {
      setTheme(nextTheme);
      return;
    }

    const prefersReducedMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

    // Fallback when the View Transitions API
    // is unavailable.
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

    root.style.setProperty(
      "--theme-reveal-x",
      `${x}px`
    );

    root.style.setProperty(
      "--theme-reveal-y",
      `${y}px`
    );

    root.style.setProperty(
      "--theme-reveal-radius",
      `${radius}px`
    );

    root.dataset.themeTransition =
      nextTheme === "dark"
        ? "to-dark"
        : "to-light";

    setIconRolling(true);

    let transition;

    try {
      transition = document.startViewTransition(
        () => {
          flushSync(() => {
            setTheme(nextTheme);
          });
        }
      );
    } catch (error) {
      console.error(
        "Theme transition failed:",
        error
      );

      setTheme(nextTheme);
      setIconRolling(false);

      root.style.removeProperty(
        "--theme-reveal-x"
      );

      root.style.removeProperty(
        "--theme-reveal-y"
      );

      root.style.removeProperty(
        "--theme-reveal-radius"
      );

      delete root.dataset.themeTransition;

      return;
    }

    transition.finished
      .catch(() => {})
      .finally(() => {
        setIconRolling(false);

        root.style.removeProperty(
          "--theme-reveal-x"
        );

        root.style.removeProperty(
          "--theme-reveal-y"
        );

        root.style.removeProperty(
          "--theme-reveal-radius"
        );

        delete root.dataset.themeTransition;
      });
  };

  // ==========================================
  // CHANGE PASSWORD
  // ==========================================

  const handleChangePassword = async ({
    currentPassword,
    newPassword,
  }) => {
    if (changingPassword) return;

    setChangingPassword(true);

    try {
      const { error } =
        await supabase.auth.updateUser({
          password: newPassword,
          current_password: currentPassword,
        });

      if (error) throw error;

      setShowChangePasswordModal(false);

      alert("Password changed successfully.");
    } catch (error) {
      console.error(
        "Password change failed:",
        error
      );

      alert(
        error.message ||
          "Unable to change password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  // ==========================================
  // SIGN OUT OTHER DEVICES
  // ==========================================

  const handleSignOutOtherDevices = async () => {
    if (signingOutOthers) return;

    setSigningOutOthers(true);

    try {
      const { error } =
        await supabase.auth.signOut({
          scope: "others",
        });

      if (error) throw error;

      setShowSignOutOthersModal(false);

      alert(
        "All other devices have been signed out."
      );
    } catch (error) {
      console.error(
        "Failed to sign out other devices:",
        error
      );

      alert(
        error.message ||
          "Unable to sign out other devices."
      );
    } finally {
      setSigningOutOthers(false);
    }
  };

  // ==========================================
  // LOADING SKELETON
  // ==========================================

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  // ==========================================
  // SETTINGS PAGE
  // ==========================================

  return (
    <div className="min-w-0 pb-10">
      <style>{animationStyles}</style>

      {/* ======================================
          PAGE HEADER
         ====================================== */}

      <div
        className="client-settings-reveal"
        style={{ animationDelay: "0ms" }}
      >
        <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">
          Settings
        </h2>

        <p className="mb-6 mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage your LensFlow preferences,
          account security, and application settings.
        </p>
      </div>

      {/* ======================================
          APPEARANCE
         ====================================== */}

      <section
        className={`
          client-settings-reveal
          ${cardClass}
        `}
        style={{ animationDelay: "80ms" }}
      >
        <SectionHeader
          title="Appearance"
          description="Customize how LensFlow looks on your device."
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className={rowTitleClass}>
              Theme
            </p>

            <p className={descriptionClass}>
              Choose between light and dark mode.
            </p>
          </div>

          {/* LIGHT / DARK TOGGLE */}
          <button
            ref={themeButtonRef}
            type="button"
            onClick={handleThemeToggle}
            disabled={iconRolling}
            role="switch"
            aria-checked={theme === "dark"}
            aria-label={
              `Switch to ${
                theme === "light"
                  ? "dark"
                  : "light"
              } mode`
            }
            className={`
              relative h-10 w-28 shrink-0
              rounded-full border
              outline-none

              transition-all duration-300

              focus-visible:ring-2
              focus-visible:ring-sky-500
              focus-visible:ring-offset-2
              focus-visible:ring-offset-white

              disabled:cursor-wait
              disabled:opacity-70

              dark:focus-visible:ring-offset-slate-900

              ${
                theme === "dark"
                  ? "border-sky-500/40 bg-[#0A1D35]"
                  : "border-amber-300 bg-amber-100"
              }
            `}
          >
            {/* Opposite mode label */}
            <span
              className={`
                absolute left-3 top-1/2
                -translate-y-1/2
                text-[10px] font-bold
                tracking-wider

                transition-opacity duration-200

                ${
                  theme === "dark"
                    ? "text-sky-200 opacity-100"
                    : "opacity-0"
                }
              `}
            >
              LIGHT
            </span>

            <span
              className={`
                absolute right-3 top-1/2
                -translate-y-1/2
                text-[10px] font-bold
                tracking-wider

                transition-opacity duration-200

                ${
                  theme === "light"
                    ? "text-amber-800 opacity-100"
                    : "opacity-0"
                }
              `}
            >
              DARK
            </span>

            {/* Sliding icon */}
            <span
              className={`
                absolute left-1 top-1
                flex h-8 w-8
                items-center justify-center
                rounded-full bg-white

                text-sm
                shadow-md ring-1 ring-black/5

                transition-transform duration-300
                ease-out

                motion-reduce:transition-none

                ${
                  theme === "dark"
                    ? "translate-x-[72px] text-indigo-600"
                    : "translate-x-0 text-amber-500"
                }
              `}
            >
              {theme === "light" ? (
                <FaSun aria-hidden="true" />
              ) : (
                <FaMoon aria-hidden="true" />
              )}
            </span>
          </button>
        </div>
      </section>

      {/* ======================================
          ACCOUNT & SECURITY
         ====================================== */}

      <section
        className={`
          client-settings-reveal
          mt-6
          ${cardClass}
        `}
        style={{ animationDelay: "160ms" }}
      >
        <SectionHeader
          title="Account & Security"
          description="Manage your password and active login sessions."
        />

        <div className="divide-y divide-slate-200 dark:divide-slate-700">

          {/* CHANGE PASSWORD */}
          <SettingsActionRow
            icon={FaKey}
            title="Change Password"
            description="Update the password associated with your account."
            buttonLabel="Change Password"
            onClick={() =>
              setShowChangePasswordModal(true)
            }
          />

          {/* ACTIVE SESSIONS */}
          <SettingsActionRow
            icon={FaLaptop}
            title="Active Sessions"
            description="View devices currently signed in to your account."
            buttonLabel="View Sessions"
            onClick={() =>
              setShowSessionsModal(true)
            }
          />

          {/* SIGN OUT OTHER DEVICES */}
          <SettingsActionRow
            icon={FaSignOutAlt}
            title="Sign Out Other Devices"
            description="Sign out of LensFlow on all devices except this one."
            buttonLabel="Sign Out Others"
            onClick={() =>
              setShowSignOutOthersModal(true)
            }
            danger
            last
          />
        </div>
      </section>

      {/* ======================================
          EXPERIMENTAL FEATURES
         ====================================== */}

      <section
        className={`
          client-settings-reveal
          mt-6
          ${cardClass}
        `}
        style={{ animationDelay: "240ms" }}
      >
        {/* COLLAPSIBLE HEADER */}
        <button
          type="button"
          onClick={() =>
            setShowExperimental((prev) => !prev)
          }
          aria-expanded={showExperimental}
          aria-controls="client-experimental-settings"
          className="
            flex w-full items-center
            justify-between gap-4
            bg-transparent text-left

            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-sky-500
            focus-visible:ring-offset-2
            dark:focus-visible:ring-offset-slate-900
          "
        >
          <div>
            <h3 className={titleClass}>
              Experimental Features
            </h3>

            <p className={descriptionClass}>
              Preview features that are still being
              developed and tested.
            </p>
          </div>

          <FaChevronDown
            className={`
              shrink-0 text-slate-500
              transition-transform duration-300
              dark:text-slate-400

              ${
                showExperimental
                  ? "rotate-180"
                  : ""
              }
            `}
            aria-hidden="true"
          />
        </button>

        {/* SMOOTH COLLAPSE */}
        <div
          id="client-experimental-settings"
          className={`
            grid transition-all duration-300
            ease-out

            ${
              showExperimental
                ? "mt-5 grid-rows-[1fr] opacity-100"
                : "mt-0 grid-rows-[0fr] opacity-0"
            }
          `}
          aria-hidden={!showExperimental}
        >
          <div className="overflow-hidden">
            <div className="border-t border-slate-200 pt-5 dark:border-slate-700">

              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <div
                    className="
                      flex h-10 w-10 shrink-0
                      items-center justify-center
                      rounded-lg

                      bg-sky-100 text-sky-600
                      dark:bg-sky-500/10
                      dark:text-sky-400
                    "
                  >
                    <FaShieldAlt />
                  </div>

                  <div className="min-w-0">
                    <p className={rowTitleClass}>
                      Google Authenticator App (2FA)
                    </p>

                    <p className={descriptionClass}>
                      Add an extra layer of security
                      to your LensFlow account.
                    </p>

                    <p className="mt-2 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                      <FaExclamationCircle
                        className="mt-0.5 shrink-0"
                      />

                      Preview only. This toggle does
                      not enable real two-factor
                      authentication yet.
                    </p>
                  </div>
                </div>

                {/* UI-ONLY TOGGLE */}
                <button
                  type="button"
                  tabIndex={
                    showExperimental ? 0 : -1
                  }
                  onClick={() =>
                    setAuthenticatorEnabled(
                      (prev) => !prev
                    )
                  }
                  role="switch"
                  aria-checked={authenticatorEnabled}
                  aria-label="Preview Google Authenticator toggle"
                  className={`
                    relative h-7 w-12
                    shrink-0 rounded-full
                    border

                    transition-all duration-300
                    ease-out

                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-sky-500

                    ${
                      authenticatorEnabled
                        ? "border-sky-600 bg-sky-600 shadow-sm"
                        : "border-slate-400 bg-slate-300 shadow-inner dark:border-slate-600 dark:bg-slate-600"
                    }
                  `}
                >
                  <span
                    className={`
                      absolute left-0.5 top-0.5
                      h-5 w-5 rounded-full
                      bg-white shadow-md
                      ring-1 ring-black/10

                      transition-transform duration-300
                      ease-out

                      ${
                        authenticatorEnabled
                          ? "translate-x-5"
                          : "translate-x-0"
                      }
                    `}
                  />
                </button>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ======================================
          SUPPORT
         ====================================== */}

      <section
        className={`
          client-settings-reveal
          mt-6
          ${cardClass}
        `}
        style={{ animationDelay: "320ms" }}
      >
        <SectionHeader
          title="Support"
          description="Get help and report issues while using LensFlow."
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="
                flex h-10 w-10 shrink-0
                items-center justify-center
                rounded-lg

                bg-sky-100 text-sky-600
                dark:bg-sky-500/10
                dark:text-sky-400
              "
            >
              <FaBug />
            </div>

            <div className="min-w-0">
              <p className={rowTitleClass}>
                Report a Problem
              </p>

              <p className={descriptionClass}>
                Let us know if you encounter a bug
                or issue while using LensFlow.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowReportModal(true)
            }
            className="
              shrink-0 self-start
              rounded-lg border
              border-sky-500
              bg-transparent
              px-5 py-2

              text-sm font-semibold
              text-sky-500

              transition-colors duration-200

              hover:bg-sky-500/10
              hover:text-sky-600

              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-sky-500

              dark:text-sky-400
              dark:hover:text-sky-300

              sm:self-auto
            "
          >
            Report
          </button>
        </div>
      </section>

      {/* ======================================
          MODALS
         ====================================== */}

      {/* REPORT A PROBLEM */}
      {showReportModal && (
        <ReportProblemModal
          onClose={() =>
            setShowReportModal(false)
          }
        />
      )}

      {/* ACTIVE SESSIONS */}
      {showSessionsModal && (
        <ActiveSessionsModal
          onClose={() =>
            setShowSessionsModal(false)
          }
        />
      )}

      {/* CHANGE PASSWORD */}
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

      {/* SIGN OUT OTHER DEVICES */}
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
