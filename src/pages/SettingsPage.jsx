import { FaSun, FaMoon, FaBug, FaChevronDown } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import { useState } from "react";

import ReportProblemModal from "../components/Settings/ReportProblemModal";

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [showReportModal, setShowReportModal] = useState(false);
  const [showExperimental, setShowExperimental] = useState(false);
  const [authenticatorEnabled, setAuthenticatorEnabled] = useState(false);

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">
        Settings
      </h2>

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

      {/* Report a Problem */}
      <div className="mt-6 rounded-xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FaBug className="text-sky-500" />

              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                Report a Problem
              </h3>
            </div>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Let us know if you encounter a bug or issue while using LensFlow.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-sky-600"
          >
            Report
          </button>
        </div>
      </div>

      {/* Experimental Features */}
        <div className="mt-6 rounded-xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
          {/* Header */}
          <button
            type="button"
            onClick={() => setShowExperimental((prev) => !prev)}
            className="flex w-full items-center justify-between gap-4 text-left"
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
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
                    authenticatorEnabled
                      ? "bg-sky-600"
                      : "bg-slate-400 dark:bg-slate-600"
                  }`}
                  aria-pressed={authenticatorEnabled}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
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

      {showReportModal && (
        <ReportProblemModal
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

export default SettingsPage;