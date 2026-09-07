import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./Login.css";

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

  return (
    <div className="login-page">
      <div className="login-container">

        <div className="login-header">
          <FaCameraRetro className="login-icon" />
          <h1>LensFlow Studio</h1>
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

              <button type="button" className="forgot-btn">
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              <FaSignInAlt />
              {loading ? "Signing in..." : "Sign In"}
            </button>

          </form>
        </div>

        <div className="login-footer">
          © 2026 LensEase Studio Management
        </div>

      </div>
    </div>
  );
}

export default Login;