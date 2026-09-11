import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaTimes,
  FaKey,
} from "react-icons/fa";

import { supabase } from "../lib/supabaseClient";

function PasswordRequirement({ met, text }) {
  return (
    <div
      className={`flex items-center gap-2 text-xs ${
        met
          ? "text-green-600 dark:text-green-400"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      {met ? (
        <FaCheckCircle className="shrink-0" />
      ) : (
        <FaTimes className="shrink-0" />
      )}

      <span>{text}</span>
    </div>
  );
}

function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  const passwordRequirements = {
    length: newPassword.length >= 8,
    number: /\d/.test(newPassword),
    upperLower:
      /[A-Z]/.test(newPassword) &&
      /[a-z]/.test(newPassword),
    special:
      /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(newPassword),
  };

  const isPasswordValid =
    Object.values(passwordRequirements).every(Boolean);

  const passwordsMatch =
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!isPasswordValid) {
      setError("Please meet all password requirements.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (error) {
      console.error("Password reset failed:", error);
      setError("Unable to update password. Please request a new reset link.");
      return;
    }

    setSuccess(
    "Password updated successfully! Redirecting you to login..."
    );

    // Sign out the temporary recovery session
    await supabase.auth.signOut();

    // Redirect after a short delay
    setTimeout(() => {
      navigate("/", { replace: true });
    }, 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-xl border border-slate-300 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
            <FaKey />
          </div>

          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Reset Password
          </h1>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Create a new password for your LensFlow account.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">

            {/* NEW PASSWORD */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                New Password
              </label>

              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError("");
                  }}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />

                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 border-none !bg-transparent text-slate-500 dark:text-slate-400"
                >
                  {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <div className="mt-3 space-y-1.5">
                <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password must contain:
                </p>

                <PasswordRequirement
                  met={passwordRequirements.length}
                  text="At least 8 characters"
                />

                <PasswordRequirement
                  met={passwordRequirements.number}
                  text="At least 1 number"
                />

                <PasswordRequirement
                  met={passwordRequirements.upperLower}
                  text="At least 1 uppercase and lowercase letter"
                />

                <PasswordRequirement
                  met={passwordRequirements.special}
                  text="At least 1 special character (!, @, #, %, &, etc.)"
                />
              </div>
            </div>

            {/* CONFIRM */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Confirm New Password
              </label>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((prev) => !prev)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 border-none !bg-transparent text-slate-500 dark:text-slate-400"
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {confirmPassword && (
                <p
                  className={`mt-1.5 text-xs ${
                    passwordsMatch
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {passwordsMatch
                    ? "✓ Passwords match"
                    : "✕ Passwords do not match"}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-500/30 dark:bg-red-500/10">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-500/30 dark:bg-green-500/10">
                <p className="text-sm text-green-700 dark:text-green-400">
                  {success}
                </p>
              </div>
            )}

          </div>

          <button
            type="submit"
            disabled={
              loading ||
              !isPasswordValid ||
              !passwordsMatch
            }
            className="mt-6 w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

      </div>
    </div>
  );
}

export default ResetPasswordPage;