import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./Login.css";

import ForgotPasswordModal from "./ForgotPasswordModal";

import {
  FaCameraRetro,
  FaEnvelope,
  FaLock,
  FaSignInAlt,
} from "react-icons/fa";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // State for Forgot Password Modal
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    if (data?.session) {
      navigate("/dashboard");
    }
  };

  const handleForgotPassword = async (email) => {
    setSendingReset(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setSendingReset(false);

    if (error) {
      console.error("Password reset failed:", error);

      return {
        success: false,
        error: "Unable to send password reset email. Please try again.",
      };
    }

    return {
      success: true,
    };
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

            {error && <div className="login-error">{error}</div>}

            <div className="input-group">
              <label>Email Address</label>
              <div className="input-box">
                <FaEnvelope />
                <input
                  type="email"
                  placeholder="admin@lensflow.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-box">
                <FaLock />
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-options">
              <label className="remember-label">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember Me
              </label>

              <button type="button"
                onClick={() => setShowForgotPassword(true)}
                className="forgot-btn bg-transparent hover:!bg-transparent focus:!bg-transparent active:!bg-transparent">
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              <FaSignInAlt />
              {loading ? "Signing in..." : "Sign In"}
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

      </div>

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