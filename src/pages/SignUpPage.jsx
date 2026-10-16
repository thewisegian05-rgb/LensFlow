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
  FaCamera,
  FaUsers,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

function SignUpPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    accountType: "photographer",
    fullName: "",
    studioName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [checkEmailMessage, setCheckEmailMessage] = useState("");

  const passwordRequirements = [
    {
      label: "At least 8 characters",
      met: form.password.length >= 8,
    },
    {
      label: "At least 1 number",
      met: /[0-9]/.test(form.password),
    },
    {
      label: "At least 1 uppercase and lowercase letter",
      met: /[A-Z]/.test(form.password) && /[a-z]/.test(form.password),
    },
    {
      label: "At least 1 special character (!, @, #, %, &, etc.)",
      met: /[^A-Za-z0-9]/.test(form.password),
    },
  ];

  const passwordIsValid = passwordRequirements.every((requirement) => requirement.met);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!["photographer", "customer"].includes(form.accountType)) {
      setError("Please select an account type.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    if (!passwordIsValid) {
      setError("Please meet all password requirements before creating your account.");
      return;
    }

    setSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          account_type: form.accountType,
          full_name: form.fullName.trim(),
          // Only photographers need a studio/business name.
          studio_name:
            form.accountType === "photographer"
              ? form.studioName.trim()
              : "",
        },
      },
    });

    if (signUpError) {
      console.error("Failed to sign up:", signUpError.message);
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    if (data.session) {
      // Route according to the selected account type.
      // Ensure the customer route exists in your React Router configuration.
      navigate(
        form.accountType === "photographer"
          ? "/dashboard"
          : "/customer-dashboard"
      );
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

                {/* Account type appears first in the registration form. */}
                <div className="input-group">
                  <label htmlFor="accountType">Account Type</label>
                  <div className="input-box signup-account-type-box">
                    {form.accountType === "photographer" ? (
                      <FaCamera aria-hidden="true" />
                    ) : (
                      <FaUsers aria-hidden="true" />
                    )}
                    <select
                      id="accountType"
                      name="accountType"
                      value={form.accountType}
                      onChange={handleChange}
                      required
                      aria-describedby="account-type-help"
                      className="signup-account-type-select"
                    >
                      <option value="photographer">Photographer</option>
                      <option value="customer">Customer</option>
                    </select>
                  </div>
                  <small id="account-type-help" className="signup-field-help">
                    Choose the type of account you want to create.
                  </small>
                </div>

                <div className="input-group">
                  <label htmlFor="fullName">Full Name</label>
                  <div className="input-box">
                    <FaUser aria-hidden="true" />
                    <input
                      id="fullName"
                      type="text"
                      name="fullName"
                      placeholder="Juan Dela Cruz"
                      value={form.fullName}
                      onChange={handleChange}
                      autoComplete="name"
                      required
                    />
                  </div>
                </div>

                {form.accountType === "photographer" && (
                  <div className="input-group">
                    <label htmlFor="studioName">
                      Studio / Business Name (optional)
                    </label>
                    <div className="input-box">
                      <FaBuilding aria-hidden="true" />
                      <input
                        id="studioName"
                        type="text"
                        name="studioName"
                        placeholder="LensFlow Studios"
                        value={form.studioName}
                        onChange={handleChange}
                        autoComplete="organization"
                      />
                    </div>
                  </div>
                )}

                <div className="input-group">
                  <label htmlFor="email">Email Address</label>
                  <div className="input-box">
                    <FaEnvelope aria-hidden="true" />
                    <input
                      id="email"
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={handleChange}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="password">Password</label>
                  <div className="input-box">
                    <FaLock aria-hidden="true" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="At least 8 characters"
                      value={form.password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="signup-password-toggle"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                    </button>
                  </div>
                  <div className="signup-password-requirements" aria-live="polite">
                    <p className="signup-password-requirements-title">Password must contain:</p>
                    <ul>
                      {passwordRequirements.map((requirement) => (
                        <li
                          key={requirement.label}
                          className={requirement.met ? "requirement-met" : "requirement-unmet"}
                        >
                          <span className="signup-requirement-icon" aria-hidden="true">
                            {requirement.met ? "✓" : "×"}
                          </span>
                          <span>{requirement.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="input-box">
                    <FaLock aria-hidden="true" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Re-enter your password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="signup-password-toggle"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      aria-pressed={showConfirmPassword}
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="login-btn"
                  disabled={submitting}
                >
                  <FaUserPlus aria-hidden="true" />
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
