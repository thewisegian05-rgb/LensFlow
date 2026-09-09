import { FaSun, FaMoon, FaBug } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import { useState } from "react";

import ReportProblemModal from "../components/Settings/ReportProblemModal";

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [showReportModal, setShowReportModal] = useState(false);

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
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
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
                  ? "bg-sky-600 text-white shadow-sm"
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
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
          >
            Report
          </button>
        </div>
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