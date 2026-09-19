import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "../components/Auth/Login.css";

import {
  FaCameraRetro,
  FaUser,
  FaBuilding,
  FaEnvelope,
  FaLock,
  FaUserPlus,
} from "react-icons/fa";

function SignUpPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    studioName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [checkEmailMessage, setCheckEmailMessage] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          studio_name: form.studioName,
        },
      },
    });

    if (signUpError) {
      console.error("Failed to sign up:", signUpError.message);
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    // If email confirmation is disabled in Supabase, signUp returns an
    // active session immediately and we can go straight to the app.
    // If it's enabled, there's no session yet — the user needs to
    // confirm via email first.
    if (data.session) {
      navigate("/dashboard");
      return;
    }

    setCheckEmailMessage(
      "Almost there! We've sent a confirmation link to " +
        form.email +
        ". Verify your email to activate your account."
    );
    setSubmitting(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">

        <div className="login-header">
          <div className="login-brand">
            <FaCameraRetro className="login-icon" />
            <h1>LensFlow Studio</h1>
          </div>

          <p>Create your account to get started</p>
        </div>

        <div className="login-card">
          {checkEmailMessage ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <p>{checkEmailMessage}</p>
              <Link to="/" className="signup-link">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit}>

                {error && <div className="login-error">{error}</div>}

                <div className="input-group">
                  <label>Full Name</label>
                  <div className="input-box">
                    <FaUser />
                    <input
                      type="text"
                      name="fullName"
                      placeholder="Juan Dela Cruz"
                      value={form.fullName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Studio / Business Name (optional)</label>
                  <div className="input-box">
                    <FaBuilding />
                    <input
                      type="text"
                      name="studioName"
                      placeholder="LensFlow Studios"
                      value={form.studioName}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Email Address</label>
                  <div className="input-box">
                    <FaEnvelope />
                    <input
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>
                    Password{" "}
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="forgot-btn bg-transparent hover:!bg-transparent focus:!bg-transparent active:!bg-transparent"
                      style={{ marginLeft: 8 }}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </label>
                  <div className="input-box">
                    <FaLock />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="At least 8 characters"
                      value={form.password}
                      onChange={handleChange}
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Confirm Password</label>
                  <div className="input-box">
                    <FaLock />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Re-enter your password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="login-btn" disabled={submitting}>
                  <FaUserPlus />
                  {submitting ? "Creating account..." : "Create Account"}
                </button>

              </form>

              <p className="signup-prompt">
                Already have an account?{" "}
                <Link to="/" className="signup-link">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>

        <div className="login-footer">
          © 2026 LensFlow Studio Management
        </div>

      </div>
    </div>
  );
}

export default SignUpPage;