
import { useEffect, useRef, useState } from "react";
import {
  FaUser,
  FaUserCircle,
  FaCamera,
  FaEye,
  FaTrash,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaEdit,
  FaTimes,
  FaSave,
  FaShieldAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
  FaIdCard,
} from "react-icons/fa";

import { supabase } from "../../../lib/supabaseClient";
import { useTheme } from "../../../context/ThemeContext";

// ==========================================
// STORAGE SETTINGS
// ==========================================

const AVATAR_BUCKET = "client-avatars";
const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

const IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const hasTripleRepeatedLetters = (value) =>
  /([a-z])\1{2}/i.test(value);

// ==========================================
// PROFILE HELPERS
// ==========================================

function getProfileForm(user) {
  const meta = user?.user_metadata || {};

  const parts = String(
    meta.full_name ||
      meta.name ||
      meta.display_name ||
      ""
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: String(meta.first_name ?? parts[0] ?? ""),
    middleName: String(
      meta.middle_name ??
        (parts.length > 2
          ? parts.slice(1, -1).join(" ")
          : "")
    ),
    lastName: String(
      meta.last_name ??
        (parts.length > 1
          ? parts[parts.length - 1]
          : "")
    ),
    phone: String(meta.phone || user?.phone || ""),
  };
}

function getDisplayName(user) {
  const meta = user?.user_metadata || {};

  return (
    String(meta.full_name || "").trim() ||
    [
      meta.first_name,
      meta.middle_name,
      meta.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    meta.name ||
    meta.display_name ||
    user?.email?.split("@")[0] ||
    "Client"
  );
}

function getInitials(user) {
  const parts = getDisplayName(user)
    .split(/\s+/)
    .filter(Boolean);

  return (
    parts.length > 1
      ? parts[0][0] + parts[parts.length - 1][0]
      : (parts[0] || "C").slice(0, 2)
  ).toUpperCase();
}

function formatDate(date) {
  if (!date || Number.isNaN(new Date(date).getTime())) {
    return "Not available";
  }

  return new Date(date).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ==========================================
// REUSABLE COMPONENTS
// ==========================================

function AboutItem({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full lf-profile-about-icon bg-slate-100 text-lg text-slate-500 dark:bg-slate-800/90 dark:text-slate-300">
        <Icon aria-hidden="true" />
      </div>

      <div className="min-w-0">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="lf-profile-about-value break-words text-sm font-medium text-slate-800 dark:text-slate-200">
          {value || "Not set"}
        </p>
      </div>
    </div>
  );
}

function EditField({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  phone = false,
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}

        {!required && (
          <span className="ml-1 font-normal text-slate-500">
            (Optional)
          </span>
        )}
      </label>

      <input
        id={id}
        type={phone ? "tel" : "text"}
        inputMode={phone ? "numeric" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={phone ? 11 : 50}
        required={required}
        aria-invalid={Boolean(error)}
        className={`
          lf-profile-field w-full rounded-xl border
          bg-white px-4 py-3 text-sm
          text-slate-900
          placeholder:text-slate-400
          outline-none transition-all

          dark:bg-[#111B2E]
          dark:text-white
          dark:placeholder:text-slate-500

          ${
            error
              ? "border-rose-500 ring-2 ring-rose-500/10"
              : "border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 dark:border-slate-700"
          }
        `}
      />

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400"
        >
          <FaExclamationCircle className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

const modalCard =
  "lf-profile-modal w-full rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-[#0D1528] dark:text-slate-100";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";


// ==========================================
// THEME SAFEGUARDS
// ==========================================
// The app's selected theme is authoritative here. This protects the
// profile from a Tailwind dark: variant that may still follow the OS
// preference, or from older ClientPortalStyles rules with higher
// specificity. It only overrides visual colors; all behavior is unchanged.
const profileThemeCSS = `
  .lf-client-profile[data-profile-theme="light"] .lf-profile-hero {
    background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 52%, #eef2ff 100%) !important;
    border-color: #e2e8f0 !important;
    box-shadow: 0 1px 3px rgba(15,23,42,0.06) !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-title,
  .lf-client-profile[data-profile-theme="light"] .lf-profile-stat,
  .lf-client-profile[data-profile-theme="light"] .lf-profile-about-title,
  .lf-client-profile[data-profile-theme="light"] .lf-profile-account-title,
  .lf-client-profile[data-profile-theme="light"] .lf-profile-small-value,
  .lf-client-profile[data-profile-theme="light"] .lf-profile-about-value {
    color: #0f172a !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-sub-label,
  .lf-client-profile[data-profile-theme="light"] .lf-profile-intro,
  .lf-client-profile[data-profile-theme="light"] .lf-profile-account-desc,
  .lf-client-profile[data-profile-theme="light"] .lf-profile-account-foot {
    color: #64748b !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-avatar {
    background: #e0f2fe !important;
    color: #0284c7 !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-edit-button,
  .lf-client-profile[data-profile-theme="light"] .lf-profile-more-button {
    background: #ffffff !important;
    color: #0369a1 !important;
    border-color: #cbd5e1 !important;
    box-shadow: 0 1px 2px rgba(15,23,42,0.04) !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-edit-button:hover,
  .lf-client-profile[data-profile-theme="light"] .lf-profile-more-button:hover {
    background: #f0f9ff !important;
    border-color: #38bdf8 !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-account {
    background: #ffffff !important;
    border-color: #e2e8f0 !important;
    box-shadow: 0 1px 3px rgba(15,23,42,0.06) !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-email-box,
  .lf-client-profile[data-profile-theme="light"] .lf-profile-small-card {
    background: #f8fafc !important;
    border-color: #e2e8f0 !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-email-label {
    color: #64748b !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-email-value {
    color: #0284c7 !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-about-icon {
    background: #f1f5f9 !important;
    color: #64748b !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-avatar-menu,
  .lf-client-profile[data-profile-theme="light"] .lf-profile-modal {
    background: #ffffff !important;
    color: #0f172a !important;
    border-color: #e2e8f0 !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-avatar-menu button {
    color: #334155 !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-avatar-menu button:hover {
    background: #f1f5f9 !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-avatar-menu .lf-profile-delete-option {
    color: #e11d48 !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-avatar-menu .lf-profile-delete-option:hover {
    background: #fff1f2 !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-modal-bar {
    background: #f8fafc !important;
    border-color: #e2e8f0 !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-modal h2,
  .lf-client-profile[data-profile-theme="light"] .lf-profile-modal h3,
  .lf-client-profile[data-profile-theme="light"] .lf-profile-modal label {
    color: #0f172a !important;
  }
  .lf-client-profile[data-profile-theme="light"] .lf-profile-field {
    background: #ffffff !important;
    color: #0f172a !important;
    border-color: #cbd5e1 !important;
  }
`;

// ==========================================
// MAIN PROFILE COMPONENT
// ==========================================

export default function Profiletab() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState("");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);

  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(null);

  const fileInputRef = useRef(null);
  const avatarMenuRef = useRef(null);
  const avatarButtonRef = useRef(null);

  // ==========================================
  // LOAD PROFILE
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const { data, error } =
          await supabase.auth.getUser();

        if (error) throw error;
        if (cancelled) return;

        setUser(data?.user || null);
        setForm(getProfileForm(data?.user));
      } catch (err) {
        console.error("Failed to load profile:", err);

        if (!cancelled) {
          setLoadError(
            "Unable to load your profile. Please refresh the page."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================
  // CLOSE AVATAR MENU
  // ==========================================

  useEffect(() => {
    if (!avatarMenuOpen) return;

    const handleOutsideClick = (event) => {
      if (!avatarMenuRef.current?.contains(event.target)) {
        setAvatarMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setAvatarMenuOpen(false);
        avatarButtonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [avatarMenuOpen]);

  // ==========================================
  // CLOSE MODALS WITH ESCAPE
  // ==========================================

  useEffect(() => {
    if (!editing && !avatarPreviewOpen && !confirmDeleteOpen) {
      return;
    }

    const handleEscape = (event) => {
      if (event.key !== "Escape") return;

      if (confirmDeleteOpen && !deletingAvatar) {
        setConfirmDeleteOpen(false);
      } else if (avatarPreviewOpen) {
        setAvatarPreviewOpen(false);
      } else if (editing && !saving) {
        setEditing(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () =>
      document.removeEventListener("keydown", handleEscape);
  }, [
    editing,
    saving,
    avatarPreviewOpen,
    confirmDeleteOpen,
    deletingAvatar,
  ]);

  // ==========================================
  // EDIT PROFILE
  // ==========================================

  const openEdit = () => {
    if (!user || uploadingAvatar || deletingAvatar) return;

    setForm(getProfileForm(user));
    setFieldErrors({});
    setEditorError("");
    setNotice(null);
    setEditing(true);
  };

  const closeEdit = () => {
    if (saving) return;

    setEditing(false);
    setEditorError("");
    setFieldErrors({});
    setForm(getProfileForm(user));
  };

  const handleFieldChange = (key, value) => {
    setEditorError("");

    if (key === "phone") {
      setForm((previous) => ({
        ...previous,
        phone: value.replace(/\D/g, "").slice(0, 11),
      }));

      setFieldErrors((previous) => ({
        ...previous,
        phone: "",
      }));

      return;
    }

    const labels = {
      firstName: "First name",
      middleName: "Middle name",
      lastName: "Last name",
    };

    if (hasTripleRepeatedLetters(value)) {
      setFieldErrors((previous) => ({
        ...previous,
        [key]: `${labels[key]} cannot contain three consecutive identical letters.`,
      }));
      return;
    }

    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [key]: "",
    }));
  };

  const validateProfile = () => {
    const errors = {};

    [
      ["firstName", "First name", true],
      ["middleName", "Middle name", false],
      ["lastName", "Last name", true],
    ].forEach(([key, label, required]) => {
      const value = form[key].trim();

      if (required && !value) {
        errors[key] = `${label} is required.`;
      } else if (value && (value.length < 2 || value.length > 50)) {
        errors[key] = `${label} must contain 2–50 characters.`;
      } else if (value && hasTripleRepeatedLetters(value)) {
        errors[key] =
          `${label} cannot contain three consecutive identical letters.`;
      }
    });

    if (form.phone && !/^09\d{9}$/.test(form.phone)) {
      errors.phone =
        "Enter a valid 11-digit mobile number starting with 09.";
    }

    return errors;
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!user || saving || uploadingAvatar || deletingAvatar) {
      return;
    }

    const errors = validateProfile();

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setEditorError("");

    const firstName = form.firstName.trim();
    const middleName = form.middleName.trim();
    const lastName = form.lastName.trim();

    try {
      const { data, error } =
        await supabase.auth.updateUser({
          data: {
            first_name: firstName,
            middle_name: middleName || null,
            last_name: lastName,
            full_name: [
              firstName,
              middleName,
              lastName,
            ]
              .filter(Boolean)
              .join(" "),
            phone: form.phone.trim(),
          },
        });

      if (error) throw error;

      if (!data?.user) {
        throw new Error("Profile update was not confirmed.");
      }

      setUser(data.user);
      setForm(getProfileForm(data.user));
      setEditing(false);

      setNotice({
        type: "success",
        message: "Your profile was updated successfully.",
      });
    } catch (err) {
      console.error("Profile update failed:", err);
      setEditorError(
        err.message || "Unable to update your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // UPLOAD PROFILE PICTURE
  // ==========================================

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];

    // Allows selecting the same file again.
    event.target.value = "";

    if (
      !file ||
      !user ||
      uploadingAvatar ||
      deletingAvatar ||
      saving ||
      editing
    ) {
      return;
    }

    const extension = IMAGE_EXTENSIONS[file.type];

    if (!extension) {
      setNotice({
        type: "error",
        message: "Choose a JPG, PNG, or WebP image.",
      });
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setNotice({
        type: "error",
        message: "Profile pictures must be 4 MB or smaller.",
      });
      return;
    }

    setUploadingAvatar(true);
    setAvatarMenuOpen(false);
    setNotice(null);

    const oldPath = user.user_metadata?.avatar_path;

    const uniqueId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const path = `${user.id}/${uniqueId}.${extension}`;
    const storage = supabase.storage.from(AVATAR_BUCKET);

    let uploaded = false;

    try {
      const { error: uploadError } =
        await storage.upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      uploaded = true;

      const { data: urlData } = storage.getPublicUrl(path);

      if (!urlData?.publicUrl) {
        throw new Error("Could not generate the photo URL.");
      }

      const { data, error: authError } =
        await supabase.auth.updateUser({
          data: {
            avatar_url: urlData.publicUrl,
            avatar_path: path,
          },
        });

      if (authError) throw authError;
      if (!data?.user) {
        throw new Error("Could not save your new profile picture.");
      }

      setUser(data.user);

      setNotice({
        type: "success",
        message: "Profile picture updated successfully.",
      });

      // Best-effort cleanup of the old image.
      if (
        oldPath &&
        oldPath !== path &&
        oldPath.startsWith(`${user.id}/`)
      ) {
        try {
          const { error } = await storage.remove([oldPath]);
          if (error) console.warn("Old avatar cleanup:", error);
        } catch (err) {
          console.warn("Old avatar cleanup:", err);
        }
      }
    } catch (err) {
      console.error("Avatar upload failed:", err);

      // Remove unused upload if saving its URL failed.
      if (uploaded) {
        try {
          await storage.remove([path]);
        } catch (cleanupError) {
          console.warn("Avatar cleanup failed:", cleanupError);
        }
      }

      setNotice({
        type: "error",
        message:
          err.message || "Unable to upload your profile picture.",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ==========================================
  // DELETE PROFILE PICTURE
  // ==========================================

  const handleDeleteAvatar = async () => {
    if (
      !user?.user_metadata?.avatar_url ||
      deletingAvatar ||
      uploadingAvatar ||
      saving
    ) {
      return;
    }

    setDeletingAvatar(true);
    setNotice(null);

    const oldPath = user.user_metadata?.avatar_path;

    try {
      const { data, error } =
        await supabase.auth.updateUser({
          data: {
            avatar_url: null,
            avatar_path: null,
          },
        });

      if (error) throw error;

      if (!data?.user) {
        throw new Error("Could not remove the profile picture.");
      }

      setUser(data.user);
      setAvatarMenuOpen(false);
      setAvatarPreviewOpen(false);
      setConfirmDeleteOpen(false);

      setNotice({
        type: "success",
        message: "Profile picture removed successfully.",
      });

      if (oldPath && oldPath.startsWith(`${user.id}/`)) {
        try {
          const { error: storageError } =
            await supabase.storage
              .from(AVATAR_BUCKET)
              .remove([oldPath]);

          if (storageError) {
            console.warn("Storage cleanup failed:", storageError);
          }
        } catch (storageError) {
          console.warn("Storage cleanup failed:", storageError);
        }
      }
    } catch (err) {
      console.error("Could not delete avatar:", err);

      setNotice({
        type: "error",
        message:
          err.message || "Unable to remove your profile picture.",
      });
    } finally {
      setDeletingAvatar(false);
    }
  };

  // ==========================================
  // DERIVED PROFILE VALUES
  // ==========================================

  const meta = user?.user_metadata || {};
  const profile = getProfileForm(user);
  const displayName = getDisplayName(user);
  const joined = formatDate(user?.created_at);
  const emailVerified = Boolean(user?.email_confirmed_at);
  const avatarUrl = meta.avatar_url;

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800/50" />
        <div className="h-40 rounded-xl bg-slate-200 dark:bg-slate-800/50" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-300 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
      >
        {loadError}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <FaUserCircle className="mx-auto mb-3 text-5xl text-slate-400" />
        <p className="text-sm text-slate-500">
          You're not signed in.
        </p>
      </div>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div
      data-profile-theme={isDark ? "dark" : "light"}
      className="lf-client-profile min-w-0 space-y-8 pb-12 text-slate-900 dark:text-slate-100"
    >
      <style>{profileThemeCSS}</style>
      {/* ======================================
          PROFILE HEADER
         ====================================== */}

      <section className="lf-profile-hero relative z-20 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-sky-50 to-indigo-50 px-5 py-8 shadow-sm sm:px-8 sm:py-10 dark:border-slate-800/70 dark:from-[#07314C] dark:via-[#050B1E] dark:to-[#12173B] dark:shadow-none">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
          aria-hidden="true"
        >
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-500/10" />
          <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/10" />
        </div>

        <div className="relative z-10">
          <h1 className="lf-profile-title break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {displayName}
          </h1>

          <div className="mt-7 flex flex-col gap-7 md:flex-row md:items-start md:gap-8">
            {/* AVATAR WITH FLOATING MENU */}
            <div
              ref={avatarMenuRef}
              className="relative w-36 shrink-0"
            >
              <button
                ref={avatarButtonRef}
                type="button"
                onClick={() =>
                  setAvatarMenuOpen((value) => !value)
                }
                disabled={uploadingAvatar || deletingAvatar}
                aria-label="Profile picture options"
                aria-expanded={avatarMenuOpen}
                aria-controls="client-avatar-menu"
                className="lf-profile-avatar group relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-[3px] border-sky-500 bg-sky-100 text-5xl font-bold text-sky-600 shadow-lg shadow-sky-500/10 transition-all duration-200 hover:border-sky-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/40 disabled:cursor-wait disabled:opacity-70 dark:bg-[#123650] dark:text-sky-300 dark:shadow-sky-950/30"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span aria-hidden="true">
                    {getInitials(user)}
                  </span>
                )}

                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/50 text-xl text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  {uploadingAvatar || deletingAvatar ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaCamera />
                  )}
                </span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="sr-only"
                tabIndex={-1}
                aria-label="Choose a new profile picture"
              />

              {/* FLOATING PHOTO MENU */}
              <div
                id="client-avatar-menu"
                aria-hidden={!avatarMenuOpen}
                className={`
                  absolute left-0 top-[calc(100%-6px)]
                  z-50 w-[280px] max-w-[calc(100vw-3rem)]
                  lf-profile-avatar-menu origin-top-left overflow-hidden rounded-2xl
                  border border-slate-200 bg-white py-1
                  shadow-[0_22px_55px_rgba(0,0,0,0.16)]
                  transition-all duration-200 ease-out
                  motion-reduce:transition-none

                  dark:border-slate-700
                  dark:bg-[#101A30]
                  dark:shadow-[0_22px_55px_rgba(0,0,0,0.55)]

                  ${
                    avatarMenuOpen
                      ? "visible translate-y-0 scale-100 opacity-100"
                      : "invisible pointer-events-none -translate-y-2 scale-95 opacity-0"
                  }
                `}
              >
                {avatarUrl && (
                  <button
                    type="button"
                    tabIndex={avatarMenuOpen ? 0 : -1}
                    onClick={() => {
                      setAvatarMenuOpen(false);
                      setAvatarPreviewOpen(true);
                    }}
                    className="flex w-full items-center gap-4 px-4 py-3.5 text-left text-sm text-slate-800 transition hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none dark:text-slate-100 dark:hover:bg-slate-700/50 dark:focus-visible:bg-slate-700/50"
                  >
                    <FaEye className="shrink-0 text-slate-500 dark:text-slate-400" />
                    View Profile Picture
                  </button>
                )}

                <button
                  type="button"
                  tabIndex={avatarMenuOpen ? 0 : -1}
                  onClick={() => {
                    setAvatarMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className={`flex w-full items-center gap-4 px-4 py-3.5 text-left text-sm text-slate-800 transition hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none dark:text-slate-100 dark:hover:bg-slate-700/50 ${
                    avatarUrl
                      ? "border-t border-slate-200 dark:border-slate-700/60"
                      : ""
                  }`}
                >
                  <FaCamera className="shrink-0 text-slate-500 dark:text-slate-400" />
                  Change Profile Picture
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    tabIndex={avatarMenuOpen ? 0 : -1}
                    onClick={() => {
                      setAvatarMenuOpen(false);
                      setConfirmDeleteOpen(true);
                    }}
                    className="lf-profile-delete-option flex w-full items-center gap-4 border-t border-slate-200 px-4 py-3.5 text-left text-sm text-rose-600 transition hover:bg-rose-50 focus-visible:bg-rose-50 focus-visible:outline-none dark:border-slate-700/60 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  >
                    <FaTrash className="shrink-0" />
                    Delete Profile Picture
                  </button>
                )}
              </div>
            </div>

            {/* ACCOUNT SUMMARY */}
            <div className="min-w-0 flex-1 md:pt-5">
              <div className="grid grid-cols-2 gap-5 sm:flex sm:flex-wrap sm:gap-10">
                <div>
                  <p className="lf-profile-account-title text-xl font-bold text-slate-900 dark:text-white">
                    Client
                  </p>
                  <p className="lf-profile-account-desc mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Account Type
                  </p>
                </div>

                <div>
                  <p className="lf-profile-account-title text-xl font-bold text-slate-900 dark:text-white">
                    {user.created_at
                      ? new Date(user.created_at).getFullYear()
                      : "—"}
                  </p>
                  <p className="lf-profile-account-desc mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Joined
                  </p>
                </div>

                <div>
                  <p className="lf-profile-stat flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                    {emailVerified ? (
                      <>
                        <FaCheckCircle className="text-emerald-500 dark:text-emerald-400" />
                        Verified
                      </>
                    ) : (
                      "Pending"
                    )}
                  </p>
                  <p className="lf-profile-account-desc mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Email Status
                  </p>
                </div>
              </div>

              <p className="lf-profile-intro mt-7 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Your LensFlow client profile. Keep your
                name, contact information, and profile
                picture up to date for your photography bookings.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openEdit}
            disabled={uploadingAvatar || deletingAvatar}
            className="lf-profile-edit-button mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-5 py-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-400 hover:bg-white disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/70 dark:text-white dark:shadow-none dark:hover:border-sky-500/50 dark:hover:bg-slate-800"
          >
            <FaEdit className="text-sky-600 dark:text-sky-400" />
            Edit Profile
          </button>
        </div>
      </section>

      {/* STATUS MESSAGE */}
      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
          }`}
        >
          {notice.type === "success" ? (
            <FaCheckCircle className="mt-0.5 shrink-0" />
          ) : (
            <FaExclamationCircle className="mt-0.5 shrink-0" />
          )}
          <p className="flex-1">{notice.message}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss message"
          >
            <FaTimes />
          </button>
        </div>
      )}

      {/* ======================================
          ABOUT
         ====================================== */}

      <section className="border-t border-slate-200 pt-8 dark:border-slate-800">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <h2 className="lf-profile-about-title text-2xl font-bold text-slate-900 dark:text-white">
              About
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Information about the account owner
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowMore((value) => !value)}
            aria-expanded={showMore}
            className="lf-profile-more-button shrink-0 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-sky-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-sky-400 dark:shadow-none dark:hover:bg-slate-800"
          >
            {showMore ? "See less" : "See more"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
          <AboutItem
            icon={FaUser}
            label="Full Name"
            value={displayName}
          />
          <AboutItem
            icon={FaCalendarAlt}
            label="Member Since"
            value={joined}
          />
          <AboutItem
            icon={FaEnvelope}
            label="Personal Email"
            value={user.email}
          />
          <AboutItem
            icon={FaPhone}
            label="Personal Number"
            value={profile.phone}
          />
        </div>

        {showMore && (
          <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-6 border-t border-slate-200 pt-7 md:grid-cols-2 dark:border-slate-800">
            <AboutItem
              icon={FaUser}
              label="First Name"
              value={profile.firstName}
            />
            <AboutItem
              icon={FaUser}
              label="Middle Name"
              value={profile.middleName}
            />
            <AboutItem
              icon={FaUser}
              label="Last Name"
              value={profile.lastName}
            />
            <AboutItem
              icon={FaCheckCircle}
              label="Email Verification"
              value={emailVerified ? "Verified" : "Not verified"}
            />
          </div>
        )}
      </section>

      {/* ======================================
          ACCOUNT INFORMATION
         ====================================== */}

      <section className="lf-profile-account rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-xl text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
              <FaIdCard />
            </div>
            <div>
              <h3 className="lf-profile-account-title text-xl font-bold text-slate-900 dark:text-white">
                Account Information
              </h3>
              <p className="lf-profile-account-desc mt-1 text-sm text-slate-500 dark:text-slate-400">
                Your registered LensFlow account details.
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <FaShieldAlt />
            Personal Account
          </span>
        </div>

        <div className="lf-profile-email-box mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[#060B1C]">
          <p className="lf-profile-email-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Registered Email
          </p>
          <p className="lf-profile-email-value mt-3 break-all text-base font-semibold text-sky-700 sm:text-xl dark:text-sky-400">
            {user.email}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="lf-profile-small-card rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/70 dark:bg-slate-900/70">
            <p className="text-xs text-slate-500">
              Account Type
            </p>
            <p className="lf-profile-small-value mt-1 font-semibold text-slate-900 dark:text-white">
              Customer
            </p>
          </div>

          <div className="lf-profile-small-card rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/70 dark:bg-slate-900/70">
            <p className="text-xs text-slate-500">
              Account Created
            </p>
            <p className="lf-profile-small-value mt-1 font-semibold text-slate-900 dark:text-white">
              {joined}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3">
          <FaShieldAlt className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
          <p className="lf-profile-account-foot text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Your email is used for sign-in and account
            notifications. Profile pictures are publicly
            viewable through their direct image URLs.
          </p>
        </div>
      </section>

      {/* ======================================
          VIEW PROFILE PICTURE MODAL
         ====================================== */}

      {avatarPreviewOpen && avatarUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setAvatarPreviewOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Profile picture preview"
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col items-center gap-4"
          >
            <button
              type="button"
              onClick={() => setAvatarPreviewOpen(false)}
              aria-label="Close picture preview"
              className="self-end rounded-full bg-slate-800 p-3 text-white transition hover:bg-slate-700"
            >
              <FaTimes />
            </button>

            <img
              src={avatarUrl}
              alt={`${displayName}'s profile picture`}
              className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* ======================================
          DELETE PICTURE MODAL
         ====================================== */}

      {confirmDeleteOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deletingAvatar
            ) {
              setConfirmDeleteOpen(false);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-avatar-title"
            aria-describedby="delete-avatar-description"
            className={`${modalCard} max-w-md p-6`}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-xl text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              <FaTrash />
            </div>

            <h2
              id="delete-avatar-title"
              className="lf-profile-account-title text-xl font-bold text-slate-900 dark:text-white"
            >
              Delete profile picture?
            </h2>

            <p
              id="delete-avatar-description"
              className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400"
            >
              Your profile will return to showing your
              initials. You can upload a new picture anytime.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deletingAvatar}
                onClick={() => setConfirmDeleteOpen(false)}
                className={secondaryButton}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deletingAvatar}
                onClick={handleDeleteAvatar}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-50"
              >
                {deletingAvatar && (
                  <FaSpinner className="animate-spin" />
                )}
                {deletingAvatar ? "Deleting..." : "Delete Picture"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================
          EDIT PROFILE MODAL
         ====================================== */}

      {editing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEdit();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-client-profile-title"
            className={`${modalCard} relative my-auto max-w-2xl overflow-hidden`}
          >
            <div className="lf-profile-modal-bar flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-7 dark:border-slate-800 dark:bg-[#0A1021]">
              <div>
                <h2
                  id="edit-client-profile-title"
                  className="lf-profile-account-title text-xl font-bold text-slate-900 dark:text-white"
                >
                  Edit Profile
                </h2>
                <p className="lf-profile-account-desc mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Update your personal information
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                aria-label="Close profile editor"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 transition hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="max-h-[65vh] space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
                {/* PERSONAL INFORMATION */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                    <FaUser />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      Personal Information
                    </h3>
                    <p className="text-xs text-slate-500">
                      Your registered name
                    </p>
                  </div>
                </div>

                {/* NAME FIELDS */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <EditField
                    id="client-first-name"
                    label="First Name"
                    value={form.firstName}
                    onChange={(value) =>
                      handleFieldChange("firstName", value)
                    }
                    placeholder="Enter first name"
                    error={fieldErrors.firstName}
                    required
                  />

                  <EditField
                    id="client-middle-name"
                    label="Middle Name"
                    value={form.middleName}
                    onChange={(value) =>
                      handleFieldChange("middleName", value)
                    }
                    placeholder="Enter middle name"
                    error={fieldErrors.middleName}
                  />

                  <EditField
                    id="client-last-name"
                    label="Last Name"
                    value={form.lastName}
                    onChange={(value) =>
                      handleFieldChange("lastName", value)
                    }
                    placeholder="Enter last name"
                    error={fieldErrors.lastName}
                    required
                  />
                </div>

                {/* CONTACT INFORMATION */}
                <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                      <FaPhone />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        Contact Information
                      </h3>
                      <p className="text-xs text-slate-500">
                        Your preferred contact number
                      </p>
                    </div>
                  </div>

                  <EditField
                    id="client-phone"
                    label="Personal Number"
                    value={form.phone}
                    onChange={(value) =>
                      handleFieldChange("phone", value)
                    }
                    placeholder="09XXXXXXXXX"
                    error={fieldErrors.phone}
                    phone
                  />

                  <div className="mt-4 space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Personal Email
                    </label>

                    <div className="flex min-h-[46px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-[#080E1E]">
                      <FaEnvelope className="shrink-0 text-slate-500" />
                      <span className="break-all text-sm text-slate-600 dark:text-slate-400">
                        {user.email}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Your login email cannot be changed here.
                    </p>
                  </div>
                </div>

                {editorError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                  >
                    <FaExclamationCircle className="mt-0.5 shrink-0" />
                    {editorError}
                  </div>
                )}
              </div>

              {/* MODAL ACTIONS */}
              <div className="lf-profile-modal-bar flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-5 sm:flex-row sm:justify-end sm:px-7 dark:border-slate-800 dark:bg-[#0A1021]">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={saving}
                  className={secondaryButton}
                >
                  <FaTimes />
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
