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
  FaArrowLeft,
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

// Frontend email checks. This catches common disposable providers,
// but the list is not exhaustive or continuously updated.

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com", "dispostable.com", "emailondeck.com",
  "fakeinbox.com", "getnada.com", "guerrillamail.com",
  "maildrop.cc", "mailinator.com", "mohmal.com",
  "sharklasers.com", "temp-mail.org", "tempmail.com",
  "throwawaymail.com", "trashmail.com", "yopmail.com",
  "10minutemail.net", "burnermail.io", "discard.email",
  "emailfake.com", "getairmail.com", "inboxkitten.com",
  "mail.tm", "mail7.io", "mailcatch.com", "mailnesia.com",
  "mailsac.com", "mintemail.com", "moakt.com",
  "mytemp.email", "tempmailo.com", "tmpmail.org",
  "tmpmail.net", "tmailor.com",
]);

const validateEmailAddress = (value) => {
  const email = value.trim().toLowerCase();
  if (!email) return "Please enter your email address.";
  const parts = email.split("@");
  if (parts.length !== 2) return "Please enter a valid email address.";
  const [localPart, domain] = parts;
  if (localPart.length < 2) {
    return "Email address must have at least 2 characters before the @ symbol.";
  }
  if (
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart)
  ) return "Please enter a valid email address.";
  if (!domain || domain.length > 253 || domain.includes("..")) {
    return "Please enter a valid email domain.";
  }
  const labels = domain.split(".");
  if (labels.length < 2) {
    return "Email domain must include a valid root domain (for example, .com or .org).";
  }
  const tld = labels[labels.length - 1];
  if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i.test(tld)) {
    return "Please enter a valid root domain.";
  }
  const validDomain = labels.every((label) =>
    label.length >= 1 &&
    label.length <= 63 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
  );
  if (!validDomain) return "Please enter a valid email domain.";
  const isDisposableDomain = [...DISPOSABLE_EMAIL_DOMAINS].some(
    (blockedDomain) =>
      domain === blockedDomain || domain.endsWith(`.${blockedDomain}`)
  );
  if (isDisposableDomain) {
    return "Temporary email addresses are not allowed. Please use a personal or business email.";
  }
  return "";
};

// Reject three consecutive identical letters, regardless of capitalization.
const hasTripleRepeatedLetters = (value) => /([a-z])\1{2}/i.test(value);

// Validate fields individually.

const validateSignUpForm = (form, passwordIsValid) => {
  const errors = {};
  if (!["photographer", "customer", "both"].includes(form.accountType)) {
    errors.accountType = "Please select a valid account type.";
  }
  const nameFields = [
    ["firstName", "First name", true],
    ["middleName", "Middle name", false],
    ["lastName", "Last name", true],
  ];
  nameFields.forEach(([field, label, required]) => {
    const value = form[field].trim();
    if (required && !value) {
      errors[field] = `${label} is required.`;
    } else if (value && (value.length < 2 || value.length > 50)) {
      errors[field] = `${label} must be between 2 and 50 characters.`;
    } else if (value && hasTripleRepeatedLetters(value)) {
      errors[field] = `${label} cannot contain three consecutive identical letters.`;
    }
  });
  const emailError = validateEmailAddress(form.email);
  if (emailError) errors.email = emailError;
  if (form.accountType !== "customer" && form.studioName.trim()) {
    const studioName = form.studioName.trim();
    if (studioName.length > 50) {
      errors.studioName = "Studio / Business Name must not exceed 50 characters.";
    } else if (hasTripleRepeatedLetters(studioName)) {
      errors.studioName = "Studio / Business Name cannot contain three consecutive identical letters.";
    }
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
    firstName: "",
    middleName: "",
    lastName: "",
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
  const hasConfirmPassword = form.confirmPassword.length > 0;
  const passwordsMatch =
    hasConfirmPassword && form.password === form.confirmPassword;
  const passwordsDoNotMatch =
    hasConfirmPassword && form.password !== form.confirmPassword;
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Name fields and studio name must not contain
    // three consecutive identical letters.
    const repeatedLetterFields = {
      firstName: "First name",
      middleName: "Middle name",
      lastName: "Last name",
      studioName: "Studio / Business Name",
    };

    if (repeatedLetterFields[name] && hasTripleRepeatedLetters(value)) {
      setErrors((prev) => ({
        ...prev,
        [name]: `${repeatedLetterFields[name]} cannot contain three consecutive identical letters.`,
      }));

      // Block the invalid input.
      return;
    }

    // Accept valid input.
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => {
      const updated = { ...prev };

      delete updated[name];
      delete updated.form;

      if (name === "email") {
        const emailError = validateEmailAddress(value);

        if (value.trim() && emailError) {
          updated.email = emailError;
        } else {
          delete updated.email;
        }
      }

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
          email: form.email.trim().toLowerCase(),
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/email-verified`,
            data: {
              account_type: form.accountType,
              full_name: [
                form.firstName.trim(),
                form.middleName.trim(),
                form.lastName.trim(),
              ].filter(Boolean).join(" "),
              first_name: form.firstName.trim(),
              middle_name: form.middleName.trim() || null,
              last_name: form.lastName.trim(),
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
        <FaArrowLeft aria-hidden="true" />
        Back to Home
      </Link>
      <div className="login-container !w-full !max-w-2xl px-4">
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
              <Link to="/login" className="signup-link">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                {errors.form && (
                  <div className="login-error sm:col-span-2" role="alert">
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
                <div className="input-group sm:col-span-2">
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

                {/* Full name - split into separate fields */}
                <div className="input-group sm:col-span-2">
                  <label>Full Name</label>
                  <p className="signup-field-help mb-2">
                    Enter your first, middle (optional), and last name.
                    Each field must contain 2–50 characters.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <div className="min-w-0">
                      <label htmlFor="firstName" className="mb-1 block text-sm">First Name</label>
                      <div className={`input-box ${errors.firstName ? "input-box-invalid" : ""}`}>
                        <FaUser aria-hidden="true" />
                        <input id="firstName" type="text" name="firstName" placeholder="Juan"
                          value={form.firstName} onChange={handleChange} autoComplete="given-name"
                          minLength={2} maxLength={50} required
                          aria-invalid={Boolean(errors.firstName)}
                          aria-describedby={errors.firstName ? "firstName-error" : undefined} />
                      </div>
                      {errors.firstName && <small id="firstName-error" className="field-error" role="alert">{errors.firstName}</small>}
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="middleName" className="mb-1 block text-sm">
                        Middle Name <span className="font-normal text-slate-400">(Optional)</span>
                      </label>
                      <div className={`input-box ${errors.middleName ? "input-box-invalid" : ""}`}>
                        <FaUser aria-hidden="true" />
                        <input id="middleName" type="text" name="middleName" placeholder="Santos"
                          value={form.middleName} onChange={handleChange} autoComplete="additional-name"
                          minLength={2} maxLength={50}
                          aria-invalid={Boolean(errors.middleName)}
                          aria-describedby={errors.middleName ? "middleName-error" : undefined} />
                      </div>
                      {errors.middleName && <small id="middleName-error" className="field-error" role="alert">{errors.middleName}</small>}
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="lastName" className="mb-1 block text-sm">Last Name</label>
                      <div className={`input-box ${errors.lastName ? "input-box-invalid" : ""}`}>
                        <FaUser aria-hidden="true" />
                        <input id="lastName" type="text" name="lastName" placeholder="Dela Cruz"
                          value={form.lastName} onChange={handleChange} autoComplete="family-name"
                          minLength={2} maxLength={50} required
                          aria-invalid={Boolean(errors.lastName)}
                          aria-describedby={errors.lastName ? "lastName-error" : undefined} />
                      </div>
                      {errors.lastName && <small id="lastName-error" className="field-error" role="alert">{errors.lastName}</small>}
                    </div>
                  </div>
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
                        maxLength={50}
                        aria-invalid={Boolean(errors.studioName)}
                        aria-describedby="studioName-counter"
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      {errors.studioName ? (
                        <small className="field-error" role="alert">
                          {errors.studioName}
                        </small>
                      ) : (
                        <small className="signup-field-help">
                          Maximum of 50 characters.
                        </small>
                      )}
                      <small id="studioName-counter" className="signup-field-help ml-auto whitespace-nowrap">
                        {form.studioName.length}/50
                      </small>
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
                      onBlur={() => {
                        const emailError = validateEmailAddress(form.email);
                        setErrors((prev) => {
                          const next = { ...prev };
                          if (emailError) next.email = emailError;
                          else delete next.email;
                          return next;
                        });
                      }}
                      autoComplete="email"
                      maxLength={254}
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
                  {hasConfirmPassword && (
                    <small
                      className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${
                        passwordsMatch
                          ? "text-emerald-500"
                          : "text-rose-500"
                      }`}
                      role="status"
                      aria-live="polite"
                    >
                      <span aria-hidden="true">
                        {passwordsMatch ? "✓" : "×"}
                      </span>
                      {passwordsMatch
                        ? "Passwords match."
                        : "Passwords do not match."}
                    </small>
                  )}
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
                  className="login-btn sm:col-span-2"
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
                <Link to="/login" className="signup-link">
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
