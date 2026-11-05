
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./Login.css";

import ForgotPasswordModal from "./ForgotPasswordModal";

import {
  FaArrowLeft,
  FaCameraRetro,
  FaEnvelope,
  FaLock,
  FaSignInAlt,
  FaCamera,
  FaUser,
  FaTimes,
  FaArrowRight,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

function Login() {
  const navigate = useNavigate();
  const prepareAuthTransition = () => {
    try {
      sessionStorage.setItem(
        "lensflow_auth_transition",
        "true"
      );
    } catch {
      // Continue even if session storage is unavailable.
    }
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [cameraRevealed, setCameraRevealed] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  const triggerCameraShutter = () => {
    if (flashActive || cameraRevealed) return;
    setFlashActive(true);

    // Switch to the login screen while the flash is still bright.
    // The flash then fades over the login screen, hiding the camera change.
    window.setTimeout(() => setCameraRevealed(true), 110);
  };

  const handleFlashEnd = () => {
    setFlashActive(false);
  };

  // Validate the fields before opening the role-selection modal.
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setFieldErrors({});

    const normalizedEmail = email.trim();
    const errors = {};

    if (!normalizedEmail) {
      errors.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Please enter your password.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (signInError) {
        setError(
          signInError.message === "Invalid login credentials"
            ? "Incorrect email or password. Please try again."
            : signInError.message
        );
        return;
      }

      const accountType = data.user?.user_metadata?.account_type;

      // Single-role accounts go directly to their dashboard.
      if (accountType === "photographer") {
        prepareAuthTransition();
        navigate("/dashboard");
        return;
      }

      if (accountType === "customer") {
        navigate("/customer");
        return;
      }

      // Dual-role accounts choose which side to enter.
      if (accountType === "both") {
        setSelectedRole("");
        setShowRoleModal(true);
        return;
      }

      // Reject accounts with missing or unsupported account types.
      await supabase.auth.signOut();

      setError(
        "This account has an invalid account type. Please contact the administrator."
      );
    } catch (err) {
      console.error("Login failed:", err);
      setError("Something went wrong while signing in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Authenticate and verify that the selected role matches the account.
  const handleRoleLogin = () => {
    if (!selectedRole) {
      setError("Please choose Photographer or Customer to continue.");
      return;
    }

    if (selectedRole === "photographer") {
      setShowRoleModal(false);
      prepareAuthTransition();
      navigate("/dashboard");
      return;
    }

    if (selectedRole === "customer") {
      setShowRoleModal(false);
      navigate("/customer");
      return;
    }

    setError("Please select a valid account type.");
  };

  // Forgot-password flow.
  const handleForgotPassword = async (resetEmail) => {
    setSendingReset(true);

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          resetEmail,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );

      if (resetError) {
        console.error("Password reset failed:", resetError);

        return {
          success: false,
          error: "Unable to send password reset email. Please try again.",
        };
      }

      return { success: true };
    } catch (err) {
      console.error("Password reset failed:", err);

      return {
        success: false,
        error: "Something went wrong. Please try again.",
      };
    } finally {
      setSendingReset(false);
    }
  };

  const closeRoleModal = () => {
    if (!loading) {
      setShowRoleModal(false);
      setSelectedRole("");
      setError("");
    }
  };

  const clearFieldError = (field) => {
    setFieldErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  return (
    <div className="login-page">
      {/* Back to Landing Page */}
      <Link
        to="/"
        className="
          fixed left-5 top-5 z-[100]
          inline-flex items-center gap-2
          text-sm font-medium
          text-slate-500 dark:text-slate-400
          transition-all duration-200
          hover:-translate-x-1
          hover:!text-sky-500
          focus-visible:outline-none
          focus-visible:!text-sky-500
        "
      >
        <FaArrowLeft />
        Back to Home
      </Link>
      {!cameraRevealed && (
        <section className="login-camera-intro" aria-label="LensFlow camera intro">
          <div className="login-camera-copy">
            <span className="login-camera-eyebrow">LENSFLOW STUDIO</span>
            <h1>Every moment<br />starts with a click.</h1>
            <p>Step into your photography workspace.</p>
          </div>
          <div className="login-camera-visual">
            <div className="login-camera-glow" />
            <div className="login-camera-body">
              <div className="login-camera-top"><span /><i /></div>
              <div className="login-camera-viewfinder" />
              <div className="login-camera-lens">
                <div className="login-camera-lens-inner"><span /></div>
              </div>
              <div className="login-camera-grip" />
              <button
                type="button"
                className="login-camera-shutter"
                onClick={triggerCameraShutter}
                disabled={flashActive}
                aria-label="Press the camera shutter to reveal the login form"
              ><span /></button>
            </div>
            <span className="login-camera-hint">PRESS THE SHUTTER</span>
          </div>
        </section>
      )}
      {flashActive && <div className="login-camera-flash" onAnimationEnd={handleFlashEnd} />}
      {cameraRevealed && <div className="login-container login-form-reveal">

        {/* Login heading */}
        <div className="login-header">
          <div className="login-brand">
            <FaCameraRetro className="login-icon" />
            <h1>LensFlow Studio</h1>
          </div>

          <p>Sign in to manage your studio</p>
        </div>

        {/* Login form */}
        <div className="login-card">
          <form onSubmit={handleSubmit} noValidate>
            {error && !showRoleModal && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="input-group">
              <label htmlFor="login-email">
                Email Address
              </label>

              <div
                className={`input-box ${
                  fieldErrors.email ? "input-box-invalid" : ""
                }`}
              >
                <FaEnvelope aria-hidden="true" />

                <input
                  id="login-email"
                  type="email"
                  placeholder="admin@lensflow.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError("email");
                    setError("");
                  }}
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={
                    fieldErrors.email
                      ? "login-email-error"
                      : undefined
                  }
                />
              </div>

              {fieldErrors.email && (
                <p
                  className="field-error"
                  id="login-email-error"
                  role="alert"
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="input-group">
              <label htmlFor="login-password">
                Password
              </label>

              <div
                className={`input-box login-password-input-box ${
                  fieldErrors.password ? "input-box-invalid" : ""
                }`}
              >
                <FaLock aria-hidden="true" />

                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password");
                    setError("");
                  }}
                  autoComplete="current-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={
                    fieldErrors.password
                      ? "login-password-error"
                      : undefined
                  }
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  aria-pressed={showPassword}
                  title={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <FaEyeSlash aria-hidden="true" />
                  ) : (
                    <FaEye aria-hidden="true" />
                  )}
                </button>
              </div>

              {fieldErrors.password && (
                <p
                  className="field-error"
                  id="login-password-error"
                  role="alert"
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Remember me and forgot password */}
            <div className="login-options">
              <label className="remember-label">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember Me
              </label>

              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="forgot-btn bg-transparent hover:!bg-transparent focus:!bg-transparent active:!bg-transparent"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              <FaSignInAlt aria-hidden="true" />
              Sign In
            </button>
          </form>

          <p className="signup-prompt">
            Don't have an account?{" "}
            <Link to="/signup" className="signup-link">
              Create one
            </Link>
          </p>
        </div>

        <div className="login-footer">
          © 2026 LensFlow Studio Management
        </div>
      </div>}

      {/* Role selection modal */}
      {showRoleModal && (
        <div
          className="role-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeRoleModal();
            }
          }}
        >
          <section
            className="role-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-modal-title"
            aria-describedby="role-modal-description"
          >
            <button
              type="button"
              className="role-modal-close"
              onClick={closeRoleModal}
              disabled={loading}
              aria-label="Close role selection"
            >
              <FaTimes />
            </button>

            <div className="role-modal-heading-icon">
              <FaCameraRetro aria-hidden="true" />
            </div>

            <h2 id="role-modal-title">
              Welcome to LensFlow
            </h2>

            <p id="role-modal-description">
              How would you like to sign in?
            </p>

            <div className="role-options">
              {/* Photographer */}
              <button
                type="button"
                className={`role-option ${
                  selectedRole === "photographer" ? "selected" : ""
                }`}
                onClick={() => {
                  setSelectedRole("photographer");
                  setError("");
                }}
                aria-pressed={selectedRole === "photographer"}
                disabled={loading}
              >
                <span className="role-option-icon">
                  <FaCamera aria-hidden="true" />
                </span>

                <span className="role-option-copy">
                  <strong>Login as Photographer</strong>
                  <small>
                    Manage your studio, projects, and photo culling.
                  </small>
                </span>

                <span
                  className="role-option-radio"
                  aria-hidden="true"
                />
              </button>

              {/* Customer */}
              <button
                type="button"
                className={`role-option ${
                  selectedRole === "customer" ? "selected" : ""
                }`}
                onClick={() => {
                  setSelectedRole("customer");
                  setError("");
                }}
                aria-pressed={selectedRole === "customer"}
                disabled={loading}
              >
                <span className="role-option-icon">
                  <FaUser aria-hidden="true" />
                </span>

                <span className="role-option-copy">
                  <strong>Login as Customer</strong>
                  <small>
                    Access your customer page and shared information.
                  </small>
                </span>

                <span
                  className="role-option-radio"
                  aria-hidden="true"
                />
              </button>
            </div>

            {error && (
              <div className="role-modal-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="button"
              className="role-continue-btn"
              onClick={handleRoleLogin}
              disabled={loading || !selectedRole}
            >
              {loading ? "Signing in..." : "Continue"}

              {!loading && (
                <FaArrowRight aria-hidden="true" />
              )}
            </button>

            <p className="role-modal-footnote">
              Use the account associated with your LensFlow access.
            </p>
          </section>
        </div>
      )}

      {/* Forgot password modal */}
      {showForgotPassword && (
        <ForgotPasswordModal
          onClose={() => {
            if (!sendingReset) {
              setShowForgotPassword(false);
            }
          }}
          onSubmit={handleForgotPassword}
          loading={sendingReset}
        />
      )}
    </div>
  );
}

export default Login;
