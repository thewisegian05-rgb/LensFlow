
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

// Convert Supabase errors into user-friendly messages.
const getSignUpErrorMessage = (error) => {
  const message = error?.message?.toLowerCase() || "";

  if (
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("user already registered")
  ) {
    return "Email is already registered";
  }

  if (message.includes("invalid email")) {
    return "Please enter a valid email address.";
  }

  if (
    message.includes("password") &&
    (message.includes("weak") ||
      message.includes("characters") ||
      message.includes("short"))
  ) {
    return "Your password doesn't meet the security requirements. Please choose a stronger password.";
  }

  if (
    message.includes("rate limit") ||
    message.includes("too many requests")
  ) {
    return "Too many attempts. Please wait a moment before trying again.";
  }

  if (message.includes("network") || message.includes("fetch")) {
    return "Unable to connect to LensFlow. Check your internet connection and try again.";
  }

  return "We couldn't create your account right now. Please check your details and try again.";
};

// Determine which field should display a Supabase error.
const getSignUpErrorField = (error) => {
  const message = error?.message?.toLowerCase() || "";

  if (
    message.includes("email") ||
    message.includes("registered")
  ) {
    return "email";
  }

  if (message.includes("password")) {
    return "password";
  }

  return "form";
};

// Validate fields individually.
const validateSignUpForm = (form, passwordIsValid) => {
  const errors = {};

  if (!["photographer", "customer", "both"].includes(form.accountType)) {
    errors.accountType = "Please select a valid account type.";
  }

  if (!form.fullName.trim()) {
    errors.fullName = "Please enter your full name.";
  }

  if (!form.email.trim()) {
    errors.email = "Please enter your email address.";
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  ) {
    errors.email = "Please enter a valid email address.";
  }

  if (!form.password) {
    errors.password = "Please enter a password.";
  } else if (!passwordIsValid) {
    errors.password =
      "Your password does not meet all the requirements below.";
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
};

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
  const [errors, setErrors] = useState({});
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
      met:
        /[A-Z]/.test(form.password) &&
        /[a-z]/.test(form.password),
    },
    {
      label: "At least 1 special character (!, @, #, %, &, etc.)",
      met: /[^A-Za-z0-9]/.test(form.password),
    },
  ];

  const passwordIsValid = passwordRequirements.every(
    (requirement) => requirement.met
  );

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => {
      const updated = { ...prev };

      delete updated[name];
      delete updated.form;

      // Changing either password can affect both password fields.
      if (name === "password" || name === "confirmPassword") {
        delete updated.password;
        delete updated.confirmPassword;
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setCheckEmailMessage("");

    const validationErrors = validateSignUpForm(
      form,
      passwordIsValid
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: signUpError } =
        await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: {
              account_type: form.accountType,
              full_name: form.fullName.trim(),
              // Studio name is optional for photographers.
              studio_name:
                form.accountType !== "customer"
                  ? form.studioName.trim()
                  : "",
            },
          },
        });

      if (signUpError) {
        console.error("Sign-up failed:", signUpError.message);

        const field = getSignUpErrorField(signUpError);
        const message = getSignUpErrorMessage(signUpError);

        setErrors({ [field]: message });
        return;
      }

      if (data.user?.identities?.length === 0) {
        setErrors({ email: "Email is already registered" });
        return;
      }

      if (data.session) {
        navigate(
          form.accountType === "photographer"
            ? "/dashboard"
            : "/customer-dashboard"
        );
        return;
      }

      setCheckEmailMessage(
        `Almost there! We've sent a confirmation link to ${form.email.trim()}. Verify your email to activate your account.`
      );
    } catch (err) {
      console.error("Unexpected sign-up error:", err);

      setErrors({
        form: "Something went wrong while creating your account. Please try again.",
      });
    } finally {
      setSubmitting(false);
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

          <p>Create your account to get started</p>
        </div>

        <div className="login-card">
          {checkEmailMessage ? (
            <div
              className="signup-confirmation"
              style={{ textAlign: "center", padding: "12px 0" }}
              role="status"
              aria-live="polite"
            >
              <p>{checkEmailMessage}</p>

              <p className="signup-confirmation-spam-note">
                Didn't receive the email? Please check your spam or junk folder.
                If you find it there, mark it as "Not Spam" so future LensFlow
                emails arrive in your inbox.
              </p>

              <Link to="/" className="signup-link">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} noValidate>
                {errors.form && (
                  <div className="login-error" role="alert">
                    <span
                      className="login-error-icon"
                      aria-hidden="true"
                    >
                      !
                    </span>
                    <span>{errors.form}</span>
                  </div>
                )}

                {/* Account type */}
                <div className="input-group">
                  <label htmlFor="accountType">Account Type</label>

                  <div
                    className={`input-box signup-account-type-box ${
                      errors.accountType ? "input-box-invalid" : ""
                    }`}
                  >
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
                      aria-invalid={Boolean(errors.accountType)}
                      aria-describedby={
                        errors.accountType
                          ? "account-type-error"
                          : "account-type-help"
                      }
                      className="signup-account-type-select"
                    >
                      <option value="photographer">
                        Photographer
                      </option>
                      <option value="customer">Customer</option>
                      <option value="both">Both (Photographer & Customer)</option>
                    </select>
                  </div>

                  {errors.accountType && (
                    <small
                      id="account-type-error"
                      className="field-error"
                      role="alert"
                    >
                      {errors.accountType}
                    </small>
                  )}

                  <small
                    id="account-type-help"
                    className="signup-field-help"
                  >
                    Choose the type of account you want to create.
                  </small>
                </div>

                {/* Full name */}
                <div className="input-group">
                  <label htmlFor="fullName">Full Name</label>

                  <div
                    className={`input-box ${
                      errors.fullName ? "input-box-invalid" : ""
                    }`}
                  >
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
                      aria-invalid={Boolean(errors.fullName)}
                      aria-describedby={
                        errors.fullName ? "fullName-error" : undefined
                      }
                    />
                  </div>

                  {errors.fullName && (
                    <small
                      id="fullName-error"
                      className="field-error"
                      role="alert"
                    >
                      {errors.fullName}
                    </small>
                  )}
                </div>

                {/* Studio name */}
                {form.accountType !== "customer" && (
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

                {/* Email */}
                <div className="input-group">
                  <label htmlFor="email">Email Address</label>

                  <div
                    className={`input-box ${
                      errors.email ? "input-box-invalid" : ""
                    }`}
                  >
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
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={
                        errors.email ? "email-error" : undefined
                      }
                    />
                  </div>

                  {errors.email && (
                    <small
                      id="email-error"
                      className="field-error"
                      role="alert"
                    >
                      {errors.email}
                    </small>
                  )}
                </div>

                {/* Password */}
                <div className="input-group">
                  <label htmlFor="password">Password</label>

                  <div
                    className={`input-box ${
                      errors.password ? "input-box-invalid" : ""
                    }`}
                  >
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
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={
                        errors.password ? "password-error" : undefined
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((prev) => !prev)
                      }
                      className="signup-password-toggle"
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

                  <div
                    className="signup-password-requirements"
                    aria-live="polite"
                  >
                    <p className="signup-password-requirements-title">
                      Password must contain:
                    </p>

                    <ul>
                      {passwordRequirements.map((requirement) => (
                        <li
                          key={requirement.label}
                          className={
                            requirement.met
                              ? "requirement-met"
                              : "requirement-unmet"
                          }
                        >
                          <span
                            className="signup-requirement-icon"
                            aria-hidden="true"
                          >
                            {requirement.met ? "✓" : "×"}
                          </span>

                          <span>{requirement.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {errors.password && (
                    <small
                      id="password-error"
                      className="field-error"
                      role="alert"
                    >
                      {errors.password}
                    </small>
                  )}
                </div>

                {/* Confirm password */}
                <div className="input-group">
                  <label htmlFor="confirmPassword">
                    Confirm Password
                  </label>

                  <div
                    className={`input-box ${
                      errors.confirmPassword
                        ? "input-box-invalid"
                        : ""
                    }`}
                  >
                    <FaLock aria-hidden="true" />

                    <input
                      id="confirmPassword"
                      type={
                        showConfirmPassword ? "text" : "password"
                      }
                      name="confirmPassword"
                      placeholder="Re-enter your password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      autoComplete="new-password"
                      minLength={8}
                      required
                      aria-invalid={Boolean(errors.confirmPassword)}
                      aria-describedby={
                        errors.confirmPassword
                          ? "confirmPassword-error"
                          : undefined
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((prev) => !prev)
                      }
                      className="signup-password-toggle"
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      aria-pressed={showConfirmPassword}
                      title={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <FaEyeSlash aria-hidden="true" />
                      ) : (
                        <FaEye aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  {errors.confirmPassword && (
                    <small
                      id="confirmPassword-error"
                      className="field-error"
                      role="alert"
                    >
                      {errors.confirmPassword}
                    </small>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="login-btn"
                  disabled={submitting}
                >
                  <FaUserPlus aria-hidden="true" />
                  {submitting
                    ? "Creating account..."
                    : "Create Account"}
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
