import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./Login.css";

import ForgotPasswordModal from "./ForgotPasswordModal";
import {
  FaCameraRetro, FaEnvelope, FaLock, FaSignInAlt,
  FaCamera, FaUser, FaTimes, FaArrowRight, FaEye, FaEyeSlash,
} from "react-icons/fa";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  // Opens role selection first; credentials are submitted after a role is chosen.
  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSelectedRole("");
    setShowRoleModal(true);
  };

  
  const handleRoleLogin = async () => {
    if (!selectedRole) {
      setError("Please choose Photographer or Customer to continue.");
      return;
    }

    setError("");
    setLoading(true);

    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (signInError) {
      setLoading(false);
      setShowRoleModal(false);
      setError(signInError.message);
      return;
    }

    const accountType = data.user?.user_metadata?.account_type;

    // Reject accounts whose registered type doesn't match the selection.
    if (accountType !== selectedRole) {
      await supabase.auth.signOut();
      setLoading(false);
      setShowRoleModal(false);

      setError(
        !accountType
          ? "This account has no account type assigned. Please update the account or register again."
          : `This account is registered as a ${
              accountType === "customer" ? "Customer" : "Photographer"
            }. Please select the correct login type.`
      );
      return;
    }

    setLoading(false);
    setShowRoleModal(false);

    navigate(
      accountType === "photographer"
        ? "/dashboard"
        : "/customer"
    );
  };


  const handleForgotPassword = async (resetEmail) => {
    setSendingReset(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      resetEmail,
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    setSendingReset(false);

    if (resetError) {
      console.error("Password reset failed:", resetError);
      return {
        success: false,
        error: "Unable to send password reset email. Please try again.",
      };
    }
    return { success: true };
  };

  const closeRoleModal = () => {
    if (!loading) {
      setShowRoleModal(false);
      setSelectedRole("");
      setError("");
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-brand">
            <FaCameraRetro className="login-icon" />
            <h1>LensFlow Studio</h1>
          </div>
          <p>Sign in to manage your studio</p>
        </div>

        <div className="login-card">
          <form onSubmit={handleSubmit}>
            {error && !showRoleModal && <div className="login-error" role="alert">{error}</div>}

            <div className="input-group">
              <label htmlFor="login-email">Email Address</label>
              <div className="input-box">
                <FaEnvelope aria-hidden="true" />
                <input
                  id="login-email" type="email" placeholder="admin@lensflow.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email" required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="login-password">Password</label>
              <div className="input-box login-password-input-box">
                <FaLock aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword
                    ? <FaEyeSlash aria-hidden="true" />
                    : <FaEye aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-label">
                <input type="checkbox" checked={remember}
                  onChange={(e) => setRemember(e.target.checked)} />
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

            <button type="submit" className="login-btn" disabled={loading}>
              <FaSignInAlt aria-hidden="true" /> Sign In
            </button>
          </form>

          <p className="signup-prompt">
            Don't have an account? <Link to="/signup" className="signup-link">Create one</Link>
          </p>
        </div>

        <div className="login-footer">© 2026 LensFlow Studio Management</div>
      </div>

      {showRoleModal && (
        <div className="role-modal-backdrop" onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeRoleModal();
        }}>
          <section className="role-modal" role="dialog" aria-modal="true"
            aria-labelledby="role-modal-title" aria-describedby="role-modal-description">
            <button type="button" className="role-modal-close" onClick={closeRoleModal}
              disabled={loading} aria-label="Close role selection">
              <FaTimes />
            </button>

            <div className="role-modal-heading-icon"><FaCameraRetro aria-hidden="true" /></div>
            <h2 id="role-modal-title">Welcome to LensFlow</h2>
            <p id="role-modal-description">How would you like to sign in?</p>

            <div className="role-options">
              <button type="button"
                className={`role-option ${selectedRole === "photographer" ? "selected" : ""}`}
                onClick={() => { setSelectedRole("photographer"); setError(""); }}
                aria-pressed={selectedRole === "photographer"} disabled={loading}>
                <span className="role-option-icon"><FaCamera aria-hidden="true" /></span>
                <span className="role-option-copy">
                  <strong>Login as Photographer</strong>
                  <small>Manage your studio, projects, and photo culling.</small>
                </span>
                <span className="role-option-radio" aria-hidden="true" />
              </button>

              <button type="button"
                className={`role-option ${selectedRole === "customer" ? "selected" : ""}`}
                onClick={() => { setSelectedRole("customer"); setError(""); }}
                aria-pressed={selectedRole === "customer"} disabled={loading}>
                <span className="role-option-icon"><FaUser aria-hidden="true" /></span>
                <span className="role-option-copy">
                  <strong>Login as Customer</strong>
                  <small>Access your customer page and shared information.</small>
                </span>
                <span className="role-option-radio" aria-hidden="true" />
              </button>
            </div>

            {error && <div className="role-modal-error" role="alert">{error}</div>}

            <button type="button" className="role-continue-btn"
              onClick={handleRoleLogin} disabled={loading || !selectedRole}>
              {loading ? "Signing in..." : "Continue"}
              {!loading && <FaArrowRight aria-hidden="true" />}
            </button>
            <p className="role-modal-footnote">
              Use the account associated with your LensFlow access.
            </p>
          </section>
        </div>
      )}

      {showForgotPassword && (
        <ForgotPasswordModal
          onClose={() => { if (!sendingReset) setShowForgotPassword(false); }}
          onSubmit={handleForgotPassword}
          loading={sendingReset}
        />
      )}
    </div>
  );
}

export default Login;
