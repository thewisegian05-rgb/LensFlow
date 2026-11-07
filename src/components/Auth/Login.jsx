
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
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

  // ==============================
  // PAGE TRANSITION ANIMATION
  // ==============================
  const [isLeaving, setIsLeaving] = useState(false);
  const exitTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (exitTimer.current !== null) {
        clearTimeout(exitTimer.current);
      }
    };
  }, []);

  const navigateWithExit = (to, options = {}) => {
    if (exitTimer.current !== null) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
      navigate(to, options);
      return;
    }

    setIsLeaving(true);

    exitTimer.current = setTimeout(() => {
      exitTimer.current = null;
      navigate(to, options);
    }, 280);
  };

  const handleAnimatedLink = (e, destination) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }

    e.preventDefault();
    navigateWithExit(destination);
  };

  // ==============================
  // LOGIN STATES
  // ==============================
  const isSigningIn = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");

  const [showForgotPassword, setShowForgotPassword] =
    useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  // ==============================
  // AUTHENTICATION TRANSITION
  // ==============================
  const prepareAuthTransition = () => {
    try {
      sessionStorage.setItem(
        "lensflow_auth_transition",
        "true"
      );
    } catch {
      // Continue if storage is unavailable.
    }
  };

  const routeAuthenticatedUser = (session) => {
    const accountType =
      session?.user?.user_metadata?.account_type;

    if (accountType === "photographer") {
      localStorage.setItem(
        "lensflow_active_role",
        "photographer"
      );

      prepareAuthTransition();
      navigateWithExit("/dashboard", { replace: true });
      return;
    }

    if (accountType === "customer") {
      localStorage.setItem(
        "lensflow_active_role",
        "customer"
      );

      navigateWithExit("/customer", { replace: true });
      return;
    }

    if (accountType === "both") {
      const activeRole = localStorage.getItem(
        "lensflow_active_role"
      );

      if (activeRole === "photographer") {
        prepareAuthTransition();
        navigateWithExit("/dashboard", { replace: true });
      } else if (activeRole === "customer") {
        navigateWithExit("/customer", { replace: true });
      } else {
        setShowRoleModal(true);
      }

      return;
    }

    setError(
      "This account has an invalid account type. Please contact the administrator."
    );
  };

  // ==============================
  // EXISTING SESSION
  // ==============================
  useEffect(() => {
    let cancelled = false;

    const checkExistingSession = async () => {
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "Session check failed:",
          sessionError
        );
        return;
      }

      if (!cancelled && data.session) {
        routeAuthenticatedUser(data.session);
      }
    };

    checkExistingSession();

    const { data: authListener } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          if (
            !cancelled &&
            !isSigningIn.current &&
            session &&
            event === "SIGNED_IN"
          ) {
            routeAuthenticatedUser(session);
          }
        }
      );

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };

    // Runs on mount to check the current session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==============================
  // LOGIN SUBMISSION
  // ==============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setFieldErrors({});

    const normalizedEmail = email.trim();
    const errors = {};

    if (!normalizedEmail) {
      errors.email = "Please enter your email address.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
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
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (sessionData.session) {
        routeAuthenticatedUser(sessionData.session);
        return;
      }

      isSigningIn.current = true;

      const {
        data,
        error: signInError,
      } = await supabase.auth.signInWithPassword({
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

      const accountType =
        data.user?.user_metadata?.account_type;

      if (accountType === "photographer") {
        localStorage.setItem(
          "lensflow_active_role",
          "photographer"
        );

        prepareAuthTransition();
        navigateWithExit("/dashboard");
        return;
      }

      if (accountType === "customer") {
        localStorage.setItem(
          "lensflow_active_role",
          "customer"
        );

        navigateWithExit("/customer");
        return;
      }

      if (accountType === "both") {
        setSelectedRole("");
        setShowRoleModal(true);
        return;
      }

      await supabase.auth.signOut();

      setError(
        "This account has an invalid account type. Please contact the administrator."
      );
    } catch (err) {
      console.error("Login failed:", err);
      setError(
        "Something went wrong while signing in. Please try again."
      );
    } finally {
      isSigningIn.current = false;
      setLoading(false);
    }
  };

  // ==============================
  // ROLE SELECTION
  // ==============================
  const handleRoleLogin = () => {
    if (!selectedRole) {
      setError(
        "Please choose Photographer or Customer to continue."
      );
      return;
    }

    if (selectedRole === "photographer") {
      localStorage.setItem(
        "lensflow_active_role",
        "photographer"
      );

      setShowRoleModal(false);
      prepareAuthTransition();
      navigateWithExit("/dashboard");
      return;
    }

    if (selectedRole === "customer") {
      localStorage.setItem(
        "lensflow_active_role",
        "customer"
      );

      setShowRoleModal(false);
      navigateWithExit("/customer");
      return;
    }

    setError("Please select a valid account type.");
  };

  const closeRoleModal = () => {
    if (!loading) {
      setShowRoleModal(false);
      setSelectedRole("");
      setError("");
    }
  };

  // ==============================
  // FORGOT PASSWORD
  // ==============================
  const handleForgotPassword = async (resetEmail) => {
    setSendingReset(true);

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          resetEmail,
          {
            redirectTo:
              `${window.location.origin}/reset-password`,
          }
        );

      if (resetError) {
        return {
          success: false,
          error:
            "Unable to send password reset email. Please try again.",
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

  const clearFieldError = (field) => {
    setFieldErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  // ==============================
  // ANIMATION CLASSES
  // ==============================
  const pageAnimation = isLeaving
    ? "animate-[lf-auth-exit_280ms_ease-in_both]"
    : "animate-[lf-auth-enter_520ms_ease-out_both]";

  const staggerAnimation =
    "animate-[lf-auth-rise_480ms_ease-out_both]";

  // ==============================
  // LOGIN INTERFACE
  // ==============================
  return (
    <div className="login-page">

      {/* Back to Home */}
      <Link
        to="/"
        onClick={(e) => handleAnimatedLink(e, "/")}
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

      {/* Animated Login Container */}
      <div
        className={`login-container ${pageAnimation} motion-reduce:animate-none`}
      >
        {/* Header */}
        <div
          className={`login-header ${staggerAnimation}
            [animation-delay:40ms] motion-reduce:animate-none`}
        >
          <div className="login-brand">
            <FaCameraRetro className="login-icon" />
            <h1>LensFlow Studio</h1>
          </div>

          <p>Sign in to manage your studio</p>
        </div>

        {/* Login Form */}
        <div
          className={`login-card ${staggerAnimation}
            [animation-delay:95ms] motion-reduce:animate-none`}
        >
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
                  fieldErrors.email
                    ? "input-box-invalid"
                    : ""
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
                />
              </div>

              {fieldErrors.email && (
                <p className="field-error" role="alert">
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
                  fieldErrors.password
                    ? "input-box-invalid"
                    : ""
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
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {fieldErrors.password && (
                <p className="field-error" role="alert">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Remember and Forgot */}
            <div className="login-options">
              <label className="remember-label">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) =>
                    setRemember(e.target.checked)
                  }
                />
                Remember Me
              </label>

              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="forgot-btn bg-transparent hover:!bg-transparent"
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="login-btn"
              disabled={loading || isLeaving}
            >
              <FaSignInAlt aria-hidden="true" />
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="signup-prompt">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="signup-link"
              onClick={(e) =>
                handleAnimatedLink(e, "/signup")
              }
            >
              Create one
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div
          className={`login-footer ${staggerAnimation}
            [animation-delay:160ms] motion-reduce:animate-none`}
        >
          © 2026 LensFlow Studio Management
        </div>
      </div>

      {/* Role Selection Modal */}
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
              <FaCameraRetro />
            </div>

            <h2 id="role-modal-title">
              Welcome to LensFlow
            </h2>

            <p>How would you like to sign in?</p>

            <div className="role-options">

              <button
                type="button"
                className={`role-option ${
                  selectedRole === "photographer"
                    ? "selected"
                    : ""
                }`}
                onClick={() => {
                  setSelectedRole("photographer");
                  setError("");
                }}
                aria-pressed={
                  selectedRole === "photographer"
                }
              >
                <span className="role-option-icon">
                  <FaCamera />
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

              <button
                type="button"
                className={`role-option ${
                  selectedRole === "customer"
                    ? "selected"
                    : ""
                }`}
                onClick={() => {
                  setSelectedRole("customer");
                  setError("");
                }}
                aria-pressed={
                  selectedRole === "customer"
                }
              >
                <span className="role-option-icon">
                  <FaUser />
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

              {!loading && <FaArrowRight />}
            </button>

            <p className="role-modal-footnote">
              Use the account associated with your LensFlow access.
            </p>
          </section>
        </div>
      )}

      {/* Forgot Password Modal */}
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
