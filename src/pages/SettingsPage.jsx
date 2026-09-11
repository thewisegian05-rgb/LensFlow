import { supabase } from "../lib/supabaseClient";

import { 
  FaSun,
  FaMoon,
  FaBug,
  FaChevronDown,
  FaKey,
  FaLaptop,
  FaSignOutAlt,
} from "react-icons/fa";

import { useTheme } from "../context/ThemeContext";
import { useState } from "react";

import ReportProblemModal from "../components/Settings/ReportProblemModal";
import ActiveSessionsModal from "../components/Settings/ActiveSessionsModal";
import SignOutOthersModal from "../components/Settings/SignOutOthersModal";

function SettingsPage() {
  const { theme, setTheme } = useTheme();

  // State for modals and settings
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSignOutOthersModal, setShowSignOutOthersModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);

  // State for sign out other devices action
  const [signingOutOthers, setSigningOutOthers] = useState(false);
  const [showExperimental, setShowExperimental] = useState(false);
  const [authenticatorEnabled, setAuthenticatorEnabled] = useState(false);

  const handleSignOutOtherDevices = async () => {
  setSigningOutOthers(true);

  const { error } = await supabase.auth.signOut({
    scope: "others",
  });

  if (error) {
    console.error(
      "Failed to sign out other devices:",
      error
    );

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

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
        Settings
      </h2>
      
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 mb-6">
        Manage your LensFlow preferences, account security, and application settings.
      </p>

      {/* Appearance */}
      <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-5 shadow-sm dark:shadow-none">
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

          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                theme === "light"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <FaSun />
              Light
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                theme === "dark"
                  ? "bg-sky-600 text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <FaMoon />
              Dark
            </button>
          </div>
        </div>
      </div>

      {/* Account & Security */}
      <div className="mt-6 rounded-xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
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
              className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:border-slate-400 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
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
      {/* Experimental Features */}
        <div className="mt-6 rounded-xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
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
              className={`shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${
                showExperimental ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Hidden Experimental Settings */}
          {showExperimental && (
            <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-700">
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
                  className={`relative h-7 w-12 shrink-0 rounded-full border transition-all duration-200 ${
                    authenticatorEnabled
                      ? "border-sky-600 bg-sky-600 shadow-sm"
                      : "border-slate-400 bg-slate-300 shadow-inner dark:border-slate-600 dark:bg-slate-600"
                  }`}
                  aria-pressed={authenticatorEnabled}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md ring-1 ring-black/10 transition-transform duration-200 ${
                      authenticatorEnabled
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Support */}
          <div className="mt-6 rounded-xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
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
                    Let us know if you encounter a bug or issue while using LensFlow.
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
                ">
                Report
              </button>
            </div>
          </div>

      {showReportModal && (
        <ReportProblemModal
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showSessionsModal && (
        <ActiveSessionsModal
          onClose={() => setShowSessionsModal(false)}
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