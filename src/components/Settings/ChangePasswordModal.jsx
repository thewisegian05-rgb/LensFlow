import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  FaTimes,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaCheckCircle,
} from "react-icons/fa";


function PasswordRequirement({ met, text }) {
  return (
    <div
      className={`flex items-center gap-2 text-xs transition-colors ${
        met
          ? "text-green-600 dark:text-green-400"
          : "text-slate-500 dark:text-slate-400"
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


function ChangePasswordModal({
  onClose,
  onSubmit,
  loading = false,
}) {

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });


  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const firstFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsVisible(true));
    });
    return () => cancelAnimationFrame(firstFrame);
  }, []);

  const handleClose = () => {
    if (loading) return;
    setIsVisible(false);
  };

  const handleOverlayTransitionEnd = (e) => {
    if (
      e.target === e.currentTarget &&
      e.propertyName === "opacity" &&
      !isVisible
    ) {
      onClose?.();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !loading) handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading]);


  /* ==========================================
     PASSWORD REQUIREMENTS
  ========================================== */

  const passwordRequirements = {
    length: formData.newPassword.length >= 8,

    number: /\d/.test(formData.newPassword),

    upperLower:
      /[A-Z]/.test(formData.newPassword) &&
      /[a-z]/.test(formData.newPassword),

    special:
      /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(
        formData.newPassword
      ),
  };


  const isPasswordValid =
    Object.values(passwordRequirements).every(Boolean);


  const passwordsMatch =
    formData.confirmPassword.length > 0 &&
    formData.newPassword === formData.confirmPassword;


  /* ==========================================
     INPUT CHANGE
  ========================================== */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };


  /* ==========================================
     SUBMIT
  ========================================== */

  const handleSubmit = (e) => {
    e.preventDefault();


    if (!isPasswordValid) {
      setError(
        "Please meet all password requirements."
      );

      return;
    }


    if (
      formData.newPassword !==
      formData.confirmPassword
    ) {
      setError(
        "New passwords do not match."
      );

      return;
    }


    if (
      formData.currentPassword ===
      formData.newPassword
    ) {
      setError(
        "New password must be different from your current password."
      );

      return;
    }


    setError("");


    onSubmit({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });
  };


  return createPortal(
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 ease-out motion-reduce:transition-none ${
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      onTransitionEnd={handleOverlayTransitionEnd}
    >

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className={`custom-scrollbar my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-slate-300 bg-white p-6 shadow-2xl transition-all duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900 ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-[0.97] opacity-0"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >

        {/* ==========================================
            HEADER
        ========================================== */}

        <div className="mb-5 flex items-start justify-between gap-4">

          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
              <FaKey />
            </div>


            <div>

              <h3 id="change-password-title" className="text-xl font-semibold text-slate-900 dark:text-white">
                Change Password
              </h3>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Update the password associated with your LensFlow account.
              </p>

            </div>

          </div>


          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg border-none bg-transparent p-2 text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:text-white"
            title="Close"
          >
            <FaTimes />
          </button>

        </div>


        {/* ==========================================
            FORM
        ========================================== */}

        <form onSubmit={handleSubmit}>

          <div className="space-y-4">


            {/* CURRENT PASSWORD */}

            <div>

              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Current Password
              </label>


              <div className="relative">

                <input
                  type={
                    showCurrentPassword
                      ? "text"
                      : "password"
                  }
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />


                <button
                  type="button"
                  onClick={() =>
                    setShowCurrentPassword(
                      (prev) => !prev
                    )
                  }
                  className="login-password-toggle change-password-toggle"
                  title={
                    showCurrentPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showCurrentPassword
                    ? <FaEyeSlash />
                    : <FaEye />}
                </button>

              </div>

            </div>



            {/* NEW PASSWORD */}

            <div>

              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                New Password
              </label>


              <div className="relative">

                <input
                  type={
                    showNewPassword
                      ? "text"
                      : "password"
                  }
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />


                <button
                  type="button"
                  onClick={() =>
                    setShowNewPassword(
                      (prev) => !prev
                    )
                  }
                  className="login-password-toggle change-password-toggle"
                >
                  {showNewPassword
                    ? <FaEyeSlash />
                    : <FaEye />}
                </button>

              </div>


              {/* PASSWORD REQUIREMENTS */}

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



            {/* CONFIRM NEW PASSWORD */}

            <div>

              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Confirm New Password
              </label>


              <div className="relative">

                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />


                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (prev) => !prev
                    )
                  }
                  className="login-password-toggle change-password-toggle"
                >
                  {showConfirmPassword
                    ? <FaEyeSlash />
                    : <FaEye />}
                </button>

              </div>


              {/* MATCH FEEDBACK */}

              {formData.confirmPassword && (
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


            {/* GENERAL ERROR */}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-500/30 dark:bg-red-500/10">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

          </div>


          {/* ==========================================
              ACTIONS
          ========================================== */}

          <div className="mt-6 flex justify-end gap-3">

            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>


            <button
              type="submit"
              disabled={
                loading ||
                !isPasswordValid ||
                !passwordsMatch ||
                !formData.currentPassword
              }
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Updating..."
                : "Change Password"}
            </button>

          </div>

        </form>

      </div>

    </div>,
    document.body
  );
}


export default ChangePasswordModal;