import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const handleSubmit = (e) => {
    e.preventDefault();

    // Temporary login
    // Later we'll replace this with backend authentication
    console.log({
      email,
      password,
      remember,
    });

    navigate("/dashboard");
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

              <button
                type="button"
                className="forgot-btn"
              >
                Forgot Password?
              </button>

            </div>

            <button
              type="submit"
              className="login-btn"
            >
              <FaSignInAlt />

              Sign In

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