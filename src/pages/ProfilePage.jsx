import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import {
  FaEye,
  FaCamera,
  FaMapMarkerAlt,
  FaEnvelope,
  FaMobileAlt,
  FaBirthdayCake,
  FaVenusMars,
  FaUser,
  FaHeart,
  FaHome,
  FaPencilAlt,
  FaImages,
  FaPlus,
  FaMinus,
  FaKey,
  FaCopy,
  FaCheck,
  FaShareAlt,
  FaTrash,
  FaStar,
} from "react-icons/fa";

import { FiX } from "react-icons/fi"

import { supabase } from "../lib/supabaseClient";
import {
  fetchProfileBundle,
  migrateLocalProfile,
  saveProfileFields,
  setAvatar,
  deleteAvatar,
  createAlbum,
  renameAlbum,
  addAlbumPhotos,
  deleteAlbumPhoto,
  deleteAlbum,
  addFeatured,
  renameFeatured,
  deleteFeatured,
} from "../lib/profileApi";

const DEFAULT_PROFILE_INFO = {
  birthday: "",
  gender: "",
  pronouns: "They/Them",
  relationship: "",
  work: "",
  niches: [],
  customNiche: "",
  location: "",
  hometown: "",
  personalEmail: "",
  personalNumber: "",
  studioEmail: "",
  studioNumber: "",
};

// Failed saves are logged and shown, so a problem never goes unnoticed.
function reportError(message, err) {
  console.error(message, err);
  window.alert(`${message}\n\n${err?.message || ""}`.trim());
}

// Read-only row of 5 stars for a rating value.
function StarRating({ value = 0, size = "text-sm" }) {
  const filled = Math.round(value);

  return (
    <div className={`flex items-center gap-0.5 ${size}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <FaStar
          key={n}
          className={n <= filled ? "text-amber-400" : "text-slate-300 dark:text-slate-700"}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

// Fixed loading time (ms) para sa skeleton, kahit ready na ang data
const LOADING_DELAY = 2000;

// Keeps modal content mounted briefly so its exit animation can finish.
function useAnimatedModalState(initialValue, isOpenValue) {
  const [value, setValueState] = useState(initialValue);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimer = useRef(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const setValue = (nextValue) => {
    const current = valueRef.current;
    const resolved = typeof nextValue === "function" ? nextValue(current) : nextValue;
    const wasOpen = isOpenValue(current);
    const willBeOpen = isOpenValue(resolved);

    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }

    if (wasOpen && !willBeOpen) {
      setIsClosing(true);
      closeTimer.current = setTimeout(() => {
        valueRef.current = resolved;
        setValueState(resolved);
        setIsClosing(false);
        closeTimer.current = null;
      }, 280);
      return;
    }

    setIsClosing(false);
    valueRef.current = resolved;
    setValueState(resolved);
  };

  return [value, setValue, isClosing];
}

// ========================================
// ANIMATIONS 
// ========================================
const animationStyles = `
  @keyframes parade {
    0% { transform: translateX(0); }
    100% { transform: translateX(-33.333%); }
  }

  .animate-parade {
    display: flex;
    width: max-content;
    animation: parade 30s linear infinite;
  }

  .animate-parade:hover {
    animation-play-state: paused;
  }

  @keyframes profileFadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes overlayFade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes modalPop {
    from { opacity: 0; transform: translateY(12px) scale(0.96); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes menuFade {
    from { opacity: 0; transform: translateY(-6px) scale(0.97); }
    to   { opacity: 1; transform: none; }
  }

  .profile-reveal {
    opacity: 0;
    animation: profileFadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  .modal-overlay-anim { animation: overlayFade 0.22s ease-out both; will-change: opacity; }
  .modal-card-pop     { animation: modalPop 0.32s cubic-bezier(0.22, 1, 0.36, 1) both; will-change: opacity, transform; }
  .menu-pop           { animation: menuFade 0.2s cubic-bezier(0.22, 1, 0.36, 1) both; transform-origin: top center; }

  /* Exit animations: keep the overlay and card visible while fading out. */
  @keyframes overlayFadeOut {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
  @keyframes modalPopOut {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to   { opacity: 0; transform: translateY(10px) scale(0.97); }
  }
  .modal-overlay-anim.modal-exit {
    animation: overlayFadeOut 0.28s ease-in both;
    pointer-events: none;
  }
  .modal-card-pop.modal-exit {
    animation: modalPopOut 0.28s cubic-bezier(0.4, 0, 1, 1) both;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-reveal, .modal-overlay-anim, .modal-card-pop, .menu-pop, .modal-exit {
      animation: none;
      opacity: 1;
      transform: none;
      will-change: auto;
    }
  }
`;

// ========================================
// LOADING SKELETON
// ========================================
function ProfileSkeleton() {
  const bar = "rounded bg-slate-200 dark:bg-slate-700";

  return (
    <div
      className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950 md:px-8"
      aria-busy="true"
      aria-label="Loading profile"
    >
      <div className="mx-auto max-w-6xl animate-pulse">

        {/* Name */}
        <div className={`${bar} mb-6 h-7 w-40`} />

        {/* Avatar + stats */}
        <div className="flex flex-col gap-7 md:flex-row md:items-center">
          <div className={`${bar} h-28 w-28 shrink-0 rounded-full`} />

          <div className="flex-1">
            <div className="mb-5 flex gap-8">
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <div className={`${bar} mb-2 h-5 w-10`} />
                  <div className={`${bar} h-3 w-16`} />
                </div>
              ))}
            </div>

            <div className={`${bar} mb-2 h-3 w-64 max-w-full`} />
            <div className={`${bar} h-3 w-48 max-w-full`} />
          </div>
        </div>

        {/* Edit profile button */}
        <div className={`${bar} mt-7 h-11 w-full rounded-xl`} />

        {/* About */}
        <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <div className={`${bar} mb-2 h-5 w-24`} />
              <div className={`${bar} h-3 w-56`} />
            </div>
            <div className={`${bar} h-9 w-24 rounded-xl`} />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`${bar} h-10 w-10 shrink-0 rounded-full`} />
                <div>
                  <div className={`${bar} mb-2 h-3 w-20`} />
                  <div className={`${bar} h-4 w-36`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carousel */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
          <div className={`${bar} mb-2 h-5 w-28`} />
          <div className={`${bar} mb-5 h-3 w-52`} />

          <div className="flex gap-4 overflow-hidden">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={`${bar} h-32 w-44 shrink-0 rounded-xl`} />
            ))}
          </div>

          <div className={`${bar} mt-5 h-11 w-full rounded-xl`} />
        </div>

        {/* Featured photos */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className={`${bar} mb-2 h-5 w-36`} />
              <div className={`${bar} h-3 w-52`} />
            </div>
            <div className={`${bar} h-9 w-32 rounded-xl`} />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className={`${bar} aspect-square w-full rounded-2xl`} />
                <div className={`${bar} mt-2 h-4 w-32`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { reportPageReady, routeKey } = useOutletContext();

  // PROFILE INFORMATION STATES
  const [username, setUsername] = useState("LENSFLOW");
  const [bio, setBio] = useState("Gian and Friends");

  const [profileInfo, setProfileInfo] = useState(DEFAULT_PROFILE_INFO);

  // PROFILE PICTURE & PHOTO STATES
  const [profilePicture, setProfilePicture] = useState("");
  const [carouselAlbums, setCarouselAlbums] = useState([]);
  const [featuredPhotos, setFeaturedPhotos] = useState([]);

  // MODAL & EDITING STATES
  const [editProfile, setEditProfile, editProfileClosing] = useAnimatedModalState(false, (v) => v === true);
  const [viewDetails, setViewDetails, viewDetailsClosing] = useAnimatedModalState(false, (v) => v === true);
  const [carouselManager, setCarouselManager, carouselManagerClosing] = useAnimatedModalState(false, (v) => v === true);
  const [featuredManager, setFeaturedManager, featuredManagerClosing] = useAnimatedModalState(false, (v) => v === true);
  const [activeAlbum, setActiveAlbum, activeAlbumClosing] = useAnimatedModalState(null, (v) => v !== null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [profileMenu, setProfileMenu] = useState(false);
  const [profilePreview, setProfilePreview, profilePreviewClosing] = useAnimatedModalState(false, (v) => v === true);
  const [featuredPreview, setFeaturedPreview, featuredPreviewClosing] = useAnimatedModalState(null, (v) => v !== null);
  const [detailEditor, setDetailEditor, detailEditorClosing] = useAnimatedModalState(null, (v) => v !== null);

  // SUPABASE LOADING STATES
  const [userId, setUserId] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [authMissing, setAuthMissing] = useState(false);
  const [loadError, setLoadError] = useState("");

  // PHOTOGRAPHER CLIENT CONNECTION CODE
  const [connectionCode, setConnectionCode] = useState("");
  const [connectionCodeLoading, setConnectionCodeLoading] = useState(true);
  const [connectionCodeError, setConnectionCodeError] = useState("");
  const [connectionCodeCopied, setConnectionCodeCopied] = useState(false);

  // PROFILE STATS
  const [followerCount, setFollowerCount] = useState(0);

  // CLIENT REVIEWS
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter(
      (review) => Math.round(Number(review.rating)) === rating
    ).length;

    return {
      rating,
      count,
      percentage: reviews.length
        ? (count / reviews.length) * 100
        : 0,
    };
  });

  // FIXED 2s LOADING (kahit ready na ang data)
  const [minLoadDone, setMinLoadDone] = useState(false);

  // TEMPORARY EDITING STATES
  const [tempUsername, setTempUsername] = useState(username);
  const [tempBio, setTempBio] = useState(bio);
  const [tempDetails, setTempDetails] = useState(profileInfo);
  const [carouselSetup, setCarouselSetup, carouselSetupClosing] = useAnimatedModalState(null, (v) => v !== null);
  const [featuredSetup, setFeaturedSetup, featuredSetupClosing] = useAnimatedModalState([], (v) => Array.isArray(v) && v.length > 0);

  // DELETE CONFIRMATION MODAL STATE
  const [confirmModal, setConfirmModal, confirmModalClosing] = useAnimatedModalState({
    isOpen: false,
    title: "Delete Item?",
    message:
      "Are you sure you want to delete this item? This action cannot be undone.",
    onConfirm: () => {},
  }, (v) => Boolean(v?.isOpen));

  // REFS
  const scrollContainerRef = useRef(null);
  const profileContainerRef = useRef(null);
  const avatarPathRef = useRef(null); // storage path of the current profile picture
  const lastSavedInfo = useRef(""); // last profile_info JSON written to Supabase
  const titleTimers = useRef({}); // debounce timers for album renames
  const busyRef = useRef(false); // blocks double-clicks while uploading

  // ========================================
  // FIXED 2s LOADING TIMER
  // ========================================
  useEffect(() => {
    const timer = setTimeout(() => setMinLoadDone(true), LOADING_DELAY);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (minLoadDone && profileLoaded) {
      reportPageReady(routeKey);
    }
  }, [minLoadDone, profileLoaded, reportPageReady, routeKey]);

  // ========================================
  // LOAD PROFILE FROM SUPABASE
  // ========================================
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (!user) {
          setAuthMissing(true);
          return;
        }

        setUserId(user.id);

        let bundle = await fetchProfileBundle(user.id);

        // First visit after the move to Supabase: bring over the old
        // name, bio, details and picture saved in this browser.
        if (!bundle.profile) {
          const migrated = await migrateLocalProfile(user.id);
          if (migrated) bundle = await fetchProfileBundle(user.id);
        }

        if (cancelled) return;

        // Use the photographer's sign-up email as the initial Personal Email.
        // Keep a previously saved Personal Email if the photographer set one.
        const savedInfo = {
          ...DEFAULT_PROFILE_INFO,
          ...(bundle.profile?.profileInfo || {}),
        };
        const info = {
          ...savedInfo,
          personalEmail:
            String(savedInfo.personalEmail || "").trim() ||
            user.email?.trim() ||
            "",
        };

        // Remember what was actually stored, not the autofilled value.
        // This allows the existing autosave effect to persist the email.
        lastSavedInfo.current = JSON.stringify(savedInfo);
        setProfileInfo(info);

        if (bundle.profile) {
          if (bundle.profile.username != null) setUsername(bundle.profile.username);
          if (bundle.profile.bio != null) setBio(bundle.profile.bio);

          avatarPathRef.current = bundle.profile.avatarPath;
          setProfilePicture(bundle.profile.avatarUrl);
        }

        setCarouselAlbums(bundle.albums);
        setFeaturedPhotos(bundle.featured);
      } catch (err) {
        console.error("Failed to load profile:", err);
        if (!cancelled) setLoadError(err?.message || "Could not load your profile.");
      } finally {
        if (!cancelled) setProfileLoaded(true);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  // ========================================
  // LOAD OR CREATE PHOTOGRAPHER CONNECTION CODE
  // ========================================
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const loadOrCreateConnectionCode = async () => {
      setConnectionCodeLoading(true);
      setConnectionCodeError("");

      try {
        // Reuse the photographer's existing code if one is already saved.
        const { data: existing, error: selectError } = await supabase
          .from("photographer_connection_codes")
          .select("code")
          .eq("photographer_id", userId)
          .maybeSingle();

        if (selectError) throw selectError;

        if (existing?.code) {
          if (!cancelled) setConnectionCode(existing.code);
          return;
        }

        // Generate a code and let the database unique constraint prevent collisions.
        // Retry only if another account happened to generate the same code.
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const bytes = new Uint8Array(6);
          window.crypto.getRandomValues(bytes);
          const token = Array.from(bytes, (byte) => (byte % 36).toString(36))
            .join("")
            .toUpperCase();
          const code = `LENS-${token}`;

          const { data: created, error: insertError } = await supabase
            .from("photographer_connection_codes")
            .insert({ photographer_id: userId, code })
            .select("code")
            .single();

          if (!insertError && created?.code) {
            if (!cancelled) setConnectionCode(created.code);
            return;
          }

          // A concurrent load or a code collision may have won the insert.
          const { data: raced, error: rereadError } = await supabase
            .from("photographer_connection_codes")
            .select("code")
            .eq("photographer_id", userId)
            .maybeSingle();

          if (!rereadError && raced?.code) {
            if (!cancelled) setConnectionCode(raced.code);
            return;
          }

          if (insertError?.code !== "23505") throw insertError;
        }

        throw new Error("Could not generate a unique code. Please reload and try again.");
      } catch (err) {
        console.error("Could not load or create photographer connection code:", err);
        if (!cancelled) {
          setConnectionCodeError(
            err?.message || "Could not load your connection code. Check the Supabase table and policies."
          );
        }
      } finally {
        if (!cancelled) setConnectionCodeLoading(false);
      }
    };

    loadOrCreateConnectionCode();
    return () => { cancelled = true; };
  }, [userId]);

  // ========================================
  // LOAD FOLLOWER COUNT (clients who connected with this photographer's code)
  // ========================================
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const loadFollowerCount = async () => {
      const { data, error } = await supabase.rpc("my_follow_counts");

      if (error) {
        console.error("Failed to load follower count:", error);
        return;
      }

      if (!cancelled) setFollowerCount(Number(data?.followers) || 0);
    };

    loadFollowerCount();

    // Refresh when the photographer comes back to this tab.
    const onVisible = () => {
      if (document.visibilityState === "visible") loadFollowerCount();
    };
    window.addEventListener("focus", loadFollowerCount);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", loadFollowerCount);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);

  // ========================================
  // LOAD CLIENT REVIEWS
  // ========================================
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const loadReviews = async () => {
      const { data, error } = await supabase
        .from("photographer_reviews")
        .select("id, rating, comment, reviewer_name, shoot_type, created_at")
        .eq("photographer_id", userId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Failed to load reviews:", error);
      } else {
        setReviews(data || []);
      }
      setReviewsLoading(false);
    };

    loadReviews();

    // Refresh when the photographer comes back to this tab.
    const onVisible = () => {
      if (document.visibilityState === "visible") loadReviews();
    };
    window.addEventListener("focus", loadReviews);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", loadReviews);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);

  const copyConnectionCode = async () => {
    if (!connectionCode) return;

    try {
      await navigator.clipboard.writeText(connectionCode);
      setConnectionCodeCopied(true);
      window.setTimeout(() => setConnectionCodeCopied(false), 1800);
    } catch (err) {
      reportError("Could not copy the connection code. Please select and copy it manually.", err);
    }
  };

  const shareConnectionCode = async () => {
    if (!connectionCode) return;
    const shareData = {
      title: "Connect with my photography portal",
      text: `Use my LensFlow photographer code to connect with me: ${connectionCode}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.text);
        setConnectionCodeCopied(true);
        window.setTimeout(() => setConnectionCodeCopied(false), 1800);
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        reportError("Could not share the connection code.", err);
      }
    }
  };

  // CLOSE PROFILE MENU WHEN CLICKING OUTSIDE
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        profileContainerRef.current &&
        !profileContainerRef.current.contains(e.target)
      ) {
        setProfileMenu(false);
      }
    };

    if (profileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenu]);

  // ========================================
  // AUTO-SAVE PROFILE DETAILS
  // ========================================
  useEffect(() => {
    if (!profileLoaded || !userId) return;

    const serialized = JSON.stringify(profileInfo);
    if (serialized === lastSavedInfo.current) return;

    const timer = setTimeout(async () => {
      try {
        await saveProfileFields(userId, { profile_info: profileInfo });
        lastSavedInfo.current = serialized;
      } catch (err) {
        console.error("Failed to save profile details:", err);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [profileInfo, profileLoaded, userId]);

  // OPEN EDIT PROFILE
  const openEditProfile = () => {
    setTempUsername(username);
    setTempBio(bio);
    setEditProfile(true);
  };

  // SAVE EDIT PROFILE
  const saveProfile = async () => {
    if (!userId) return;

    try {
      await saveProfileFields(userId, {
        username: tempUsername,
        bio: tempBio,
      });

      setUsername(tempUsername);
      setBio(tempBio);
      setEditProfile(false);
    } catch (err) {
      reportError("Could not save your profile.", err);
    }
  };

  // OPEN DETAIL EDITOR
  const openDetailEditor = (type) => {
    setTempDetails({ ...profileInfo });
    setDetailEditor(type);
  };

  // SAVE DETAIL CHANGES
  const saveDetailEditor = async () => {
    if (!userId) return;

    const updated = { ...tempDetails };

    try {
      await saveProfileFields(userId, { profile_info: updated });

      lastSavedInfo.current = JSON.stringify(updated);
      setProfileInfo(updated);
      setDetailEditor(null);
    } catch (err) {
      reportError("Could not save your details.", err);
    }
  };

  // CHANGE PROFILE PICTURE
  const changeProfilePictureDirect = async (e) => {
    const file = e.target.files?.[0];

    e.target.value = "";
    setProfileMenu(false);

    if (!file || !userId) return;

    try {
      const { path, url } = await setAvatar(userId, file, avatarPathRef.current);

      avatarPathRef.current = path;
      setProfilePicture(url);
    } catch (err) {
      reportError("Could not update your profile picture.", err);
    }
  };

  // DELETE PROFILE PICTURE
  const removeProfilePicture = () => {
    if (!userId || !avatarPathRef.current) return;

    setProfileMenu(false);
    setConfirmModal({
      isOpen: true,
      title: "Delete Profile Picture?",
      message: "Are you sure you want to remove your profile picture? Your username initial will be displayed instead.",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));

        try {
          await deleteAvatar(userId, avatarPathRef.current);
          avatarPathRef.current = null;
          setProfilePicture("");
          setProfilePreview(false);
        } catch (err) {
          reportError("Could not delete your profile picture.", err);
        }
      },
    });
  };

  // ADD NEW CAROUSEL ALBUM (opens the setup modal; nothing is saved yet)
  const addNewAlbumCard = (e) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    setCarouselSetup({
      id: Date.now(),
      title: `Carousel Slot ${carouselAlbums.length + 1}`,
      photos: files.map((file, i) => ({
        id: Date.now() + i,
        src: URL.createObjectURL(file),
        title: file.name,
        file,
      })),
    });

    e.target.value = "";
  };

  // CONFIRM NEW CAROUSEL ALBUM (uploads and saves)
  const confirmCarouselSetup = async () => {
    if (!carouselSetup || !userId || busyRef.current) return;

    busyRef.current = true;

    try {
      const title =
        carouselSetup.title.trim() ||
        `Carousel Slot ${carouselAlbums.length + 1}`;

      const album = await createAlbum(userId, title, carouselSetup.photos);

      carouselSetup.photos.forEach((photo) => URL.revokeObjectURL(photo.src));

      setCarouselAlbums((albums) => [...albums, album]);
      setCarouselSetup(null);
    } catch (err) {
      reportError("Could not add the album.", err);
    } finally {
      busyRef.current = false;
    }
  };

  // UPDATE CAROUSEL ALBUM TITLE (saved shortly after you stop typing)
  const updateAlbumTitle = (albumId, newTitle) => {
    setCarouselAlbums((albums) =>
      albums.map((album) =>
        album.id === albumId
          ? {
              ...album,
              title: newTitle,
            }
          : album
      )
    );

    clearTimeout(titleTimers.current[albumId]);
    titleTimers.current[albumId] = setTimeout(async () => {
      try {
        await renameAlbum(albumId, newTitle);
      } catch (err) {
        console.error("Failed to rename album:", err);
      }
    }, 600);
  };

  // ADD PHOTOS TO CAROUSEL ALBUM
  const addPhotosToAlbum = async (albumId, e) => {
    const files = Array.from(e.target.files || []);

    e.target.value = "";

    if (files.length === 0 || !userId) return;

    try {
      const photos = await addAlbumPhotos(
        userId,
        albumId,
        files.map((file) => ({ file, title: file.name }))
      );

      setCarouselAlbums((albums) =>
        albums.map((album) =>
          album.id === albumId
            ? { ...album, photos: [...album.photos, ...photos] }
            : album
        )
      );
    } catch (err) {
      reportError("Could not add those photos.", err);
    }
  };

  // ========================================
  // DELETE PHOTO FROM CAROUSEL ALBUM
  // ========================================
  const deletePhotoFromAlbum = (albumId, photoName, photoId) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Photo?",
      message: `Are you sure you want to delete "${photoName}"? This action cannot be undone.`,

      onConfirm: async () => {
        setConfirmModal((prev) => ({
          ...prev,
          isOpen: false,
        }));

        const album = carouselAlbums.find((a) => a.id === albumId);
        const target = album?.photos.find((photo) =>
          photoId ? photo.id === photoId : photo.title === photoName
        );

        if (!target) return;

        try {
          await deleteAlbumPhoto(target);

          setCarouselAlbums((albums) =>
            albums.map((a) =>
              a.id === albumId
                ? { ...a, photos: a.photos.filter((p) => p.id !== target.id) }
                : a
            )
          );
        } catch (err) {
          reportError("Could not delete that photo.", err);
        }
      },
    });
  };

  // ========================================
  // DELETE CAROUSEL ALBUM
  // ========================================
  const deleteCarouselCard = (albumId, albumTitle) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Album?",
      message: `Are you sure you want to delete album "${albumTitle}"? This action cannot be undone.`,

      onConfirm: async () => {
        setConfirmModal((prev) => ({
          ...prev,
          isOpen: false,
        }));

        const album = carouselAlbums.find((a) => a.id === albumId);
        if (!album) return;

        try {
          await deleteAlbum(album);

          setCarouselAlbums((albums) =>
            albums.filter((a) => a.id !== albumId)
          );
        } catch (err) {
          reportError("Could not delete that album.", err);
        }
      },
    });
  };

  // ========================================
  // ADD FEATURED PHOTOS 
  // ========================================
  const addFeaturedPhotos = (e) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    setFeaturedSetup(
      files.map((file, i) => ({
        id: Date.now() + i,
        src: URL.createObjectURL(file),
        title: file.name,
        file,
      }))
    );

    e.target.value = "";
  };

  // ========================================
  // UPDATE PENDING FEATURED PHOTO TITLE
  // ========================================
  const updatePendingFeaturedTitle = (photoId, newTitle) => {
    setFeaturedSetup((photos) =>
      photos.map((photo) =>
        photo.id === photoId
          ? {
              ...photo,
              title: newTitle,
            }
          : photo
      )
    );
  };

  // ========================================
  // REMOVE PENDING FEATURED PHOTO
  // ========================================
  const removePendingFeatured = (photoId) => {
    setFeaturedSetup((photos) =>
      photos.filter((photo) => photo.id !== photoId)
    );
  };

  // ========================================
  // POST FEATURED PHOTOS (uploads and saves)
  // ========================================
  const postFeaturedPhotos = async () => {
    if (featuredSetup.length === 0 || !userId || busyRef.current) return;

    busyRef.current = true;

    try {
      const photos = await addFeatured(
        userId,
        featuredSetup.map((photo) => ({ file: photo.file, title: photo.title }))
      );

      featuredSetup.forEach((photo) => URL.revokeObjectURL(photo.src));

      setFeaturedPhotos((existing) => [...existing, ...photos]);
      setFeaturedSetup([]);
    } catch (err) {
      reportError("Could not post those photos.", err);
    } finally {
      busyRef.current = false;
    }
  };

  // ========================================
  // UPDATE FEATURED PHOTO TITLE
  // ========================================
  const updateFeaturedTitle = async (photoId, newTitle) => {
    setFeaturedPhotos((photos) =>
      photos.map((photo) =>
        photo.id === photoId
          ? {
              ...photo,
              title: newTitle,
            }
          : photo
      )
    );

    try {
      await renameFeatured(photoId, newTitle);
    } catch (err) {
      reportError("Could not rename that photo.", err);
    }
  };

  // ========================================
  // DELETE FEATURED PHOTO
  // ========================================
  const deleteFeaturedPhoto = (photoId, photoTitle) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Featured Photo?",
      message: `Are you sure you want to delete "${photoTitle}"? This action cannot be undone.`,

      onConfirm: async () => {
        setConfirmModal((prev) => ({
          ...prev,
          isOpen: false,
        }));

        const target = featuredPhotos.find((photo) => photo.id === photoId);
        if (!target) return;

        try {
          await deleteFeatured(target);

          setFeaturedPhotos((photos) =>
            photos.filter((photo) => photo.id !== photoId)
          );
        } catch (err) {
          reportError("Could not delete that photo.", err);
        }
      },
    });
  };

  // ========================================
  // CAROUSEL PHOTO SCROLL
  // ========================================
  const handleScroll = (e) => {
    if (!activeAlbum) return;

    const container = e.target;
    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth;
    const index = Math.round(scrollLeft / width);

    if (
      index >= 0 &&
      index < activeAlbum.photos.length
    ) {
      setCurrentPhotoIndex(index);
    }
  };

  // ========================================
  // SCROLL TO SELECTED PHOTO
  // ========================================
  const scrollToPhoto = (index) => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;

    container.scrollTo({
      left: index * container.clientWidth,
      behavior: "smooth",
    });

    setCurrentPhotoIndex(index);
  };

  // ========================================
  // INFINITE CAROUSEL DATA
  // ========================================
  const infiniteCarousel = [
    ...carouselAlbums,
    ...carouselAlbums,
    ...carouselAlbums,
  ];

  // ========================================
  // AVERAGE RATING
  // ========================================
  const averageRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // ========================================
  // LOADING / SIGNED-OUT / ERROR STATES
  // ========================================
  if (!minLoadDone || !profileLoaded) {
    return <ProfileSkeleton />;
  }

  if (authMissing) {
    return (
      <p className="mt-20 text-center text-sm text-slate-500">
        Sign in to see your profile.
      </p>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <p className="text-sm text-red-400">Couldn't load your profile.</p>
        <p className="mt-2 text-xs text-slate-500">{loadError}</p>
        <p className="mt-2 text-xs text-slate-500">
          If this mentions a missing table, run the profile SQL in Supabase first.
        </p>
      </div>
    );
  }

  // ========================================
  // PROFILE PAGE UI
  // ========================================
  return (
    <div className="profile-page min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-white md:px-8">

      {/* ========================================
          CAROUSEL + REVEAL + MODAL ANIMATIONS
          ======================================== */}
      <style>{animationStyles}</style>

      <div className="mx-auto max-w-6xl">

        {/* ========================================
            PROFILE NAME
            ======================================== */}
        <div
          className="profile-reveal mb-6"
          style={{ animationDelay: "0ms" }}
        >
          <h1 className="text-2xl font-bold tracking-tight">
            {username}
          </h1>
        </div>

        {/* ========================================
            PROFILE HEADER & PROFILE PICTURE
            ======================================== */}
        <div
          className={`profile-reveal relative flex flex-col gap-7 md:flex-row md:items-center ${profileMenu ? "z-[60]" : "z-0"}`}
          style={{ animationDelay: "80ms" }}
        >
          <div
            ref={profileContainerRef}
            className="relative shrink-0"
          >
            <button
              type="button"
              onClick={() => setProfileMenu(!profileMenu)}
              className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-slate-300 bg-slate-100 shadow-lg transition-all duration-300 ease-out hover:scale-105 hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800"
            >
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center rounded-full bg-sky-100 text-4xl font-bold uppercase text-sky-600 dark:bg-sky-900/50 dark:text-sky-300">
                  {(username?.trim()?.[0] || "U").toUpperCase()}
                </span>
              )}
            </button>

            {/* ========================================
                PROFILE PICTURE MENU
                ======================================== */}
            {profileMenu && (
              <div className="absolute left-1/2 top-full z-[70] mt-3 w-56 -translate-x-1/2">
                <div className="menu-pop overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                  {profilePicture && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenu(false);
                        setProfilePreview(true);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-slate-100 hover:text-sky-500 dark:hover:bg-slate-800 dark:hover:text-sky-400"
                    >
                      <FaEye className="text-slate-500 dark:text-slate-400" />
                      <span>View Profile Picture</span>
                    </button>
                  )}

                  <label
                    htmlFor="profile-picture-upload-menu"
                    className={`flex cursor-pointer items-center gap-3 px-4 py-3 text-sm transition hover:bg-slate-100 hover:text-sky-500 dark:hover:bg-slate-800 dark:hover:text-sky-400 ${profilePicture ? "border-t border-slate-200 dark:border-slate-800" : ""}`}
                  >
                    <FaCamera className="text-slate-500 dark:text-slate-400" />
                    <span>Change Profile Picture</span>
                  </label>

                  {profilePicture && (
                    <button
                      type="button"
                      onClick={removeProfilePicture}
                      className="flex w-full items-center gap-3 border-t border-slate-200 px-4 py-3 text-left text-sm text-red-600 transition hover:bg-red-50 dark:border-slate-800 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <FaTrash />
                      <span>Delete Profile Picture</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <input
              id="profile-picture-upload-menu"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={changeProfilePictureDirect}
            />
          </div>

          {/* ========================================
              PROFILE STATS & BIO
              ======================================== */}
          <div className="flex-1">
            <div className="mb-5 flex gap-8">
              {[
                [featuredPhotos.length, "Posts"],
                [followerCount, "Followers"],
                [reviews.length ? `${averageRating.toFixed(1)} ★` : "–", "Rating"],
              ].map(([number, label]) => (
                <div key={label}>
                  <p className="text-xl font-bold">{number}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-1 max-w-md whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-400">
              {bio}
            </p>
          </div>
        </div>

        {/* ========================================
            EDIT PROFILE BUTTON
            ======================================== */}
        <button
          onClick={openEditProfile}
          className="profile-reveal relative z-0 mt-7 w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold transition-colors duration-300 hover:border-sky-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          style={{ animationDelay: "140ms" }}
        >
          Edit Profile
        </button>

        {/* ========================================
            CLIENT CONNECTION CODE
            ======================================== */}
        <section
          className="profile-reveal mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 sm:p-6"
          style={{ animationDelay: "170ms" }}
          aria-labelledby="connection-code-heading"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
                <FaKey aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 id="connection-code-heading" className="text-lg font-bold">
                  Client Connection Code
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Share this code with a client so they can find your photographer portal.
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              Unique to your account
            </span>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/70">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Your code
            </p>
            {connectionCodeLoading ? (
              <div className="mt-2 h-8 w-44 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" aria-label="Loading connection code" />
            ) : connectionCode ? (
              <p className="mt-2 break-all font-mono text-2xl font-extrabold tracking-wider text-sky-600 dark:text-sky-400 sm:text-3xl">
                {connectionCode}
              </p>
            ) : (
              <p className="mt-2 text-sm text-rose-500">Your code could not be loaded.</p>
            )}
            {connectionCodeError && (
              <p role="alert" className="mt-3 break-words text-sm text-rose-500">
                {connectionCodeError}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={copyConnectionCode}
              disabled={!connectionCode || connectionCodeLoading}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {connectionCodeCopied ? <FaCheck aria-hidden="true" /> : <FaCopy aria-hidden="true" />}
              {connectionCodeCopied ? "Copied!" : "Copy Code"}
            </button>
            <button
              type="button"
              onClick={shareConnectionCode}
              disabled={!connectionCode || connectionCodeLoading}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold transition hover:border-sky-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <FaShareAlt aria-hidden="true" />
              Share Code
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
            This code identifies your photographer profile. It does not give clients access to your account.
          </p>
        </section>

        {/* ========================================
            ABOUT SECTION
            ======================================== */}
        <section
          className="profile-reveal mt-8 border-t border-slate-200 pt-6 dark:border-slate-800"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                About
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Information about the account owner
              </p>
            </div>

            <button
              type="button"
              onClick={() => setViewDetails(true)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-sky-500 transition-colors duration-300 hover:border-sky-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              See more
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailRow
              icon={<FaCamera />}
              label="Work"
              value={profileInfo.work || "Not set"}
            />

            <DetailRow
              icon={<FaMapMarkerAlt />}
              label="Location"
              value={profileInfo.location || "Not set"}
            />

            <DetailRow
              icon={<FaEnvelope />}
              label="Personal Email"
              value={profileInfo.personalEmail || "Not set"}
            />

            <DetailRow
              icon={<FaMobileAlt />}
              label="Personal Number"
              value={profileInfo.personalNumber || "Not set"}
            />
          </div>
        </section>

        {/* ========================================
            CAROUSEL SECTION
            ======================================== */}
        <section
          className="profile-reveal mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900/70"
          style={{ animationDelay: "260ms" }}
        >
          <div className="mb-5">
            <h2 className="text-lg font-bold">
              Carousel
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Featured carousel items on your profile
            </p>
          </div>

          <div className="relative overflow-hidden rounded-xl py-4">
            <div className="pointer-events-none absolute left-0 top-0 z-20 h-full w-16 bg-gradient-to-r from-white to-transparent dark:from-slate-900" />

            <div className="pointer-events-none absolute right-0 top-0 z-20 h-full w-16 bg-gradient-to-l from-white to-transparent dark:from-slate-900" />

            <div className="animate-parade gap-4">
              {infiniteCarousel.map((album, i) => {
                const coverPhoto =
                  album.photos?.[0]?.src ||
                  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800";

                return (
                  <div
                    key={`${album.id}-${i}`}
                    onClick={() => {
                      setActiveAlbum(album);
                      setCurrentPhotoIndex(0);
                    }}
                    className="group relative h-32 w-44 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-left transition-all duration-300 ease-out hover:z-50 hover:scale-125 hover:border-sky-400 hover:shadow-2xl dark:border-slate-700 dark:bg-slate-800"
                  >
                    <img
                      src={coverPhoto}
                      alt={album.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {album.photos.length > 1 && (
                      <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white text-xs backdrop-blur-sm shadow">
                        <FaImages />
                      </div>
                    )}

                    <p className="absolute bottom-2 left-3 right-3 truncate text-xs font-semibold text-white">
                      {album.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================
              UPDATE CAROUSEL BUTTON
              ======================================== */}
          <button
            onClick={() => setCarouselManager(true)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-600 transition-colors duration-300 hover:border-sky-500 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            Update Carousel
          </button>
        </section>

        {/* ========================================
            FEATURED PHOTOS SECTION
            ======================================== */}
        <section
          className="profile-reveal mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900/70"
          style={{ animationDelay: "320ms" }}
        >
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">
                Featured Photos
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                A collection of selected moments and work.
              </p>
            </div>

            <div className="flex items-center gap-2">

              {/* ========================================
                  ADD FEATURES BUTTON
                  ======================================== */}
              <label
                htmlFor="featured-upload"
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-sky-500 transition-colors duration-300 hover:border-sky-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 dark:hover:bg-slate-800"
              >
                <FaPlus className="text-[10px]" />
                <span>Add Features</span>
              </label>

              {/* ========================================
                  FEATURED PHOTO MANAGE BUTTON
                  ======================================== */}
              <button
                onClick={() => setFeaturedManager(true)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors duration-300 hover:border-sky-500 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                Manage
              </button>
            </div>

            <input
              id="featured-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={addFeaturedPhotos}
            />
          </div>

          {/* ========================================
              FEATURED PHOTO GRID
              ======================================== */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {featuredPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className="profile-reveal group relative"
                style={{ animationDelay: `${400 + Math.min(index, 8) * 70}ms` }}
              >
                <button
                  type="button"
                  onClick={() => setFeaturedPreview(photo)}
                  className="relative block aspect-square w-full overflow-visible rounded-2xl border border-slate-200 bg-white text-left transition-all duration-300 ease-out hover:z-[35] hover:-translate-y-1 hover:scale-[1.08] hover:border-sky-400 hover:shadow-2xl focus:outline-none dark:border-slate-800 dark:bg-slate-900"
                >
                  <img
                    src={photo.src}
                    alt={photo.title}
                    className="h-full w-full rounded-2xl object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </button>

                {/* ========================================
                    FEATURED PHOTO NAME
                    ======================================== */}
                <div className="mt-2 px-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {photo.title}
                  </p>

                  <p className="text-xs text-slate-500">
                    Featured photo
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================
            CLIENT REVIEWS SECTION
            ======================================== */}
        <section
          className="profile-reveal mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900/70"
          style={{ animationDelay: "380ms" }}
          aria-labelledby="reviews-heading"
        >
          {/* Section heading */}
          <div className="mb-5">
            <h2
              id="reviews-heading"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              Client Reviews
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Feedback from clients who connected with you.
            </p>
          </div>

          {reviewsLoading ? (
            <div
              className="space-y-3"
              aria-label="Loading reviews"
            >
              <div className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
          ) : reviews.length === 0 ? (
            /* Empty state */
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.8l-5.25 2.8 1-5.8L3.5 9.7l5.9-.9L12 3.5z"
                  />
                </svg>
              </div>

              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                No reviews yet
              </p>

              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Client feedback will appear here once someone leaves a review
                through your photographer profile.
              </p>
            </div>
          ) : (
            <>
              {/* Rating overview */}
              <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60 sm:p-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-[130px_1fr] sm:items-center sm:gap-6">

                  {/* Average rating */}
                  <div className="flex flex-col items-center justify-center border-b border-slate-200 pb-4 dark:border-slate-800 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
                    <div className="flex items-center gap-1">
                      <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
                        {averageRating.toFixed(1)}
                      </span>
                      <span className="text-2xl text-amber-400">★</span>
                    </div>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {reviews.length}{" "}
                      {reviews.length === 1 ? "review" : "reviews"}
                    </p>
                  </div>

                  {/* Rating distribution */}
                  <div className="space-y-2">
                    {ratingDistribution.map(({ rating, count, percentage }) => (
                      <div
                        key={rating}
                        className="flex items-center gap-2"
                      >
                        <div className="flex w-[72px] shrink-0 items-center gap-1">
                          <div className="flex items-center text-[12px] leading-none">
                            {Array.from({ length: 5 }, (_, i) => (
                              <span
                                key={i}
                                className={
                                  i < rating
                                    ? "text-amber-400"
                                    : "text-slate-300 dark:text-slate-600"
                                }
                              >
                                {i < rating ? "★" : "☆"}
                              </span>
                            ))}
                          </div>

                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            ({count})
                          </span>
                        </div>

                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-sky-500 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>

                        <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                          {Math.round(percentage)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reviews heading */}
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  All Reviews ({reviews.length})
                </h3>

                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Latest first
                </span>
              </div>

              {/* Individual review cards */}
              <div className="space-y-3">
                {reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-slate-700"
                  >
                    <div className="flex items-start gap-3">

                      {/* Reviewer avatar */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-slate-800 dark:text-sky-300">
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-5 w-5"
                          aria-hidden="true"
                        >
                          <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.42 0-8 2.24-8 5v2h16v-2c0-2.76-3.58-5-8-5Z" />
                        </svg>
                      </div>

                      {/* Review details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {review.reviewer_name || "Client"}
                          </p>

                          <p className="shrink-0 text-[10px] text-slate-500 dark:text-slate-500">
                            {new Date(review.created_at).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>

                        {/* Rating and shoot type */}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <StarRating
                            value={review.rating}
                            size="text-sm"
                          />

                          {review.shoot_type && (
                            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                              {review.shoot_type}
                            </span>
                          )}
                        </div>

                        {/* Client comment */}
                        {review.comment && (
                          <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {createPortal(
        <>
      {/* ========================================
          ABOUT DETAILS MODAL
          ======================================== */}
      {viewDetails && (
        <div className={`modal-overlay-anim fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md ${viewDetailsClosing ? "modal-exit" : ""}`}>
          <div className={`modal-card-pop relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white ${viewDetailsClosing ? "modal-exit" : ""}`}>

            {/* ========================================
                ABOUT MODAL HEADER
                ======================================== */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  About
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Personal information and account details
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewDetails(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <FiX />
              </button>
            </div>

            {/* ========================================
                ABOUT MODAL CONTENT
                ======================================== */}
            <div className="flex-1 space-y-8 overflow-y-auto custom-scrollbar bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-white">

              {/* ========================================
                  PERSONAL DETAILS
                  ======================================== */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Personal Details
                  </h3>

                  <button
                    type="button"
                    onClick={() => openDetailEditor("personal")}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-sky-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-sky-400"
                    title="Edit Personal Details"
                  >
                    <FaPencilAlt className="text-xs" />
                  </button>
                </div>

                <div className="space-y-4">
                  <DetailRow
                    icon={<FaBirthdayCake />}
                    label="Birthday"
                    value={profileInfo.birthday || "Not set"}
                  />

                  <DetailRow
                    icon={<FaVenusMars />}
                    label="Gender"
                    value={profileInfo.gender || "Not set"}
                  />

                  <DetailRow
                    icon={<FaUser />}
                    label="Pronouns"
                    value={profileInfo.pronouns || "Not set"}
                  />

                  <DetailRow
                    icon={<FaHeart />}
                    label="Relationship"
                    value={profileInfo.relationship || "Not set"}
                  />
                </div>
              </section>

              {/* ========================================
                  WORK DETAILS
                  ======================================== */}
              <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Work
                  </h3>

                  <button
                    type="button"
                    onClick={() => openDetailEditor("work")}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-sky-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-sky-400"
                    title="Edit Work"
                  >
                    <FaPencilAlt className="text-xs" />
                  </button>
                </div>

                <DetailRow
                  icon={<FaCamera />}
                  label="Profession"
                  value={profileInfo.work || "Not set"}
                />
              </section>

              {/* ========================================
                  NICHES
                  ======================================== */}
              <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Niches
                  </h3>

                  <button
                    type="button"
                    onClick={() => openDetailEditor("niches")}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-sky-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-sky-400"
                    title="Edit Niches"
                  >
                    <FaPencilAlt className="text-xs" />
                  </button>
                </div>

                {profileInfo.niches?.length > 0 || profileInfo.customNiche ? (
                  <div className="flex flex-wrap gap-2">
                    {(profileInfo.niches || []).map((niche, index) => (
                      <span
                        key={`${niche}-${index}`}
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <span>{niche}</span>

                        <button
                          type="button"
                          onClick={() => {
                            setProfileInfo((prev) => ({
                              ...prev,
                              niches: (prev.niches || []).filter(
                                (_, i) => i !== index
                              ),
                            }));
                          }}
                          className="text-slate-500 transition hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"
                          title={`Remove ${niche}`}
                        >
                          <FiX className="text-[10px]" />
                        </button>
                      </span>
                    ))}

                    {profileInfo.customNiche && (
                      <span className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <span>{profileInfo.customNiche}</span>

                        <button
                          type="button"
                          onClick={() => {
                            setProfileInfo((prev) => ({
                              ...prev,
                              customNiche: "",
                            }));
                          }}
                          className="text-slate-500 transition hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"
                          title={`Remove ${profileInfo.customNiche}`}
                        >
                          <FiX className="text-[10px]" />
                        </button>
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No niches added yet.
                  </p>
                )}
              </section>

              {/* ========================================
                  LOCATION
                  ======================================== */}
              <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Location
                  </h3>

                  <button
                    type="button"
                    onClick={() => openDetailEditor("location")}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-sky-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-sky-400"
                    title="Edit Location"
                  >
                    <FaPencilAlt className="text-xs" />
                  </button>
                </div>

                <div className="space-y-4">
                  <DetailRow
                    icon={<FaMapMarkerAlt />}
                    label="Location"
                    value={profileInfo.location || "Not set"}
                  />

                  <DetailRow
                    icon={<FaHome />}
                    label="Hometown"
                    value={profileInfo.hometown || "Not set"}
                  />
                </div>
              </section>

              {/* ========================================
                  CONTACT INFORMATION
                  ======================================== */}
              <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Contact Info
                  </h3>

                  <button
                    type="button"
                    onClick={() => openDetailEditor("contact")}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-sky-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-sky-400"
                    title="Edit Contact Info"
                  >
                    <FaPencilAlt className="text-xs" />
                  </button>
                </div>

                <div className="space-y-4">
                  <DetailRow
                    icon={<FaEnvelope />}
                    label="Personal Email"
                    value={profileInfo.personalEmail || "Not set"}
                  />

                  <DetailRow
                    icon={<FaMobileAlt />}
                    label="Personal Number"
                    value={profileInfo.personalNumber || "Not set"}
                  />

                  <DetailRow
                    icon={<FaEnvelope />}
                    label="Studio Email"
                    value={profileInfo.studioEmail || "Not set"}
                  />

                  <DetailRow
                    icon={<FaMobileAlt />}
                    label="Studio Number"
                    value={profileInfo.studioNumber || "Not set"}
                  />
                </div>
              </section>
            </div>

            {/* ========================================
                ABOUT MODAL SAVE BUTTON
                ======================================== */}
            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setViewDetails(false)}
                className="rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-400"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          DETAIL EDITOR MODAL
          ======================================== */}
      {detailEditor && (
        <DetailEditor
          type={detailEditor}
          details={tempDetails}
          setDetails={setTempDetails}
          onClose={() => setDetailEditor(null)}
          onSave={saveDetailEditor}
          isClosing={detailEditorClosing}
        />
      )}

      {/* ========================================
          PROFILE PICTURE PREVIEW MODAL
          ======================================== */}
      {profilePreview && (
        <div
          onClick={() => setProfilePreview(false)}
          className={`modal-overlay-anim fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md ${profilePreviewClosing ? "modal-exit" : ""}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`modal-card-pop relative max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl ${profilePreviewClosing ? "modal-exit" : ""}`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
              <p className="text-sm font-bold text-white">
                Profile Picture
              </p>

              <button
                onClick={() => setProfilePreview(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <FiX />
              </button>
            </div>

            <div className="bg-black p-5">
              <img
                src={profilePicture}
                alt="Profile Preview"
                className="max-h-[75vh] max-w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          FEATURED PHOTO PREVIEW MODAL
          ======================================== */}
      {featuredPreview && (
        <div
          onClick={() => setFeaturedPreview(null)}
          className={`modal-overlay-anim fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md ${featuredPreviewClosing ? "modal-exit" : ""}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`modal-card-pop relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl ${featuredPreviewClosing ? "modal-exit" : ""}`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-3">
              <p className="max-w-[75%] truncate text-sm font-bold text-white">
                {featuredPreview.title}
              </p>

              <button
                onClick={() => setFeaturedPreview(null)}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-sky-500 hover:text-white"
              >
                <FaMinus className="text-[10px]" />
                Minimize
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-3 sm:p-5">
              <img
                src={featuredPreview.src}
                alt={featuredPreview.title}
                className="max-h-[82vh] max-w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          EDIT PROFILE MODAL
          ======================================== */}
      {editProfile && (
        <div className={`modal-overlay-anim fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md ${editProfileClosing ? "modal-exit" : ""}`}>
          <div className={`modal-card-pop relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 ${editProfileClosing ? "modal-exit" : ""}`}>

            {/* EDIT PROFILE MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Edit Profile
                </h2>

                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Update your account information.
                </p>
              </div>

              <button
                onClick={() => setEditProfile(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <FiX />
              </button>
            </div>

            {/* EDIT PROFILE FORM */}
            <div className="flex-1 space-y-4 overflow-y-auto bg-white p-6 dark:bg-slate-900">

              {/* Username */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Username
                </label>

                <input
                  type="text"
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Bio
                </label>

                <textarea
                  rows={4}
                  value={tempBio}
                  onChange={(e) => setTempBio(e.target.value)}
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* EDIT PROFILE ACTION BUTTONS */}
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <button
                onClick={() => setEditProfile(false)}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={saveProfile}
                className="rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          CAROUSEL SETUP MODAL
          ======================================== */}
      {carouselSetup && (
        <div className={`modal-overlay-anim fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md ${carouselSetupClosing ? "modal-exit" : ""}`}>
          <div className={`modal-card-pop relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl ${carouselSetupClosing ? "modal-exit" : ""}`}>

            {/* Carousel Setup Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
              <div>
                <h2 className="text-xl font-bold">
                  Carousel Setup
                </h2>

                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Edit the album name before adding it.
                </p>
              </div>

              <button
                onClick={() => setCarouselSetup(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
              >
                <FiX />
              </button>
            </div>

            {/* Carousel Setup Content */}
            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Album Name
                </label>

                <input
                  type="text"
                  value={carouselSetup.title}
                  onChange={(e) =>
                    setCarouselSetup({
                      ...carouselSetup,
                      title: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  placeholder="Album Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {carouselSetup.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <img
                      src={photo.src}
                      alt={photo.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Carousel Setup Buttons */}
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
              <button
                onClick={() => setCarouselSetup(null)}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={confirmCarouselSetup}
                className="rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          FEATURED PHOTO SETUP MODAL
          ======================================== */}
      {featuredSetup.length > 0 && (
        <div className={`modal-overlay-anim fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md ${featuredSetupClosing ? "modal-exit" : ""}`}>
          <div className={`modal-card-pop relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl ${featuredSetupClosing ? "modal-exit" : ""}`}>

            {/* Featured Setup Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
              <div>
                <h2 className="text-xl font-bold">
                  Featured Setup
                </h2>

                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Edit the name of each featured photo before posting.
                </p>
              </div>

              <button
                onClick={() => setFeaturedSetup([])}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <FiX />
              </button>
            </div>

            {/* Featured Setup Content */}
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {featuredSetup.map((photo) => (
                <div
                  key={photo.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row"
                >
                  <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <img
                      src={photo.src}
                      alt={photo.title}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex flex-1 flex-col justify-center gap-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Featured Name
                    </label>

                    <input
                      type="text"
                      value={photo.title}
                      onChange={(e) =>
                        updatePendingFeaturedTitle(
                          photo.id,
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      placeholder="Featured Name"
                    />

                    <button
                      onClick={() =>
                        removePendingFeatured(photo.id)
                      }
                      className="self-start rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Featured Setup Buttons */}
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
              <button
                onClick={() => setFeaturedSetup([])}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={postFeaturedPhotos}
                className="rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          ACTIVE ALBUM / CAROUSEL PHOTO VIEWER
          ======================================== */}
      {activeAlbum && (
        <div
          onClick={() => setActiveAlbum(null)}
          className={`modal-overlay-anim fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-2 backdrop-blur-md sm:p-4 ${activeAlbumClosing ? "modal-exit" : ""}`}
        >
          <div
            className={`modal-card-pop relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl ${activeAlbumClosing ? "modal-exit" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >

            {/* Album Viewer Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
              <p className="max-w-[80%] truncate text-xs font-bold text-white">
                {activeAlbum.title}
              </p>

              <button
                onClick={() => setActiveAlbum(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <FiX />
              </button>
            </div>

            {/* Album Photos */}
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-black sm:aspect-[16/10]">
              <div className="absolute right-3 top-3 z-30 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {currentPhotoIndex + 1}/{activeAlbum.photos.length}
              </div>

              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex h-full w-full snap-x snap-mandatory overflow-x-auto"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {activeAlbum.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="flex h-full w-full shrink-0 snap-center items-center justify-center bg-black"
                  >
                    <img
                      src={photo.src}
                      alt={photo.title}
                      className="max-h-full max-w-full select-none object-contain"
                    />
                  </div>
                ))}
              </div>

              {/* Previous Photo Button */}
              {currentPhotoIndex > 0 && (
                <button
                  onClick={() =>
                    scrollToPhoto(currentPhotoIndex - 1)
                  }
                  className="absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur transition hover:bg-black/80"
                >
                  ‹
                </button>
              )}

              {/* Next Photo Button */}
              {currentPhotoIndex <
                activeAlbum.photos.length - 1 && (
                <button
                  onClick={() =>
                    scrollToPhoto(currentPhotoIndex + 1)
                  }
                  className="absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur transition hover:bg-black/80"
                >
                  ›
                </button>
              )}
            </div>

            {/* Album Photo Indicators */}
            <div className="flex justify-center border-t border-slate-800 bg-slate-950 py-3">
              <div className="flex gap-1.5">
                {activeAlbum.photos.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => scrollToPhoto(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
                      idx === currentPhotoIndex
                        ? "w-4 bg-sky-500"
                        : "w-1.5 bg-slate-700"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          CAROUSEL MANAGER MODAL
          ======================================== */}
      {carouselManager && (
        <div className={`modal-overlay-anim fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md ${carouselManagerClosing ? "modal-exit" : ""}`}>
          <div className={`modal-card-pop relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 ${carouselManagerClosing ? "modal-exit" : ""}`}>

            {/* Carousel Manager Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Carousel Manager
                </h2>

                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Rename albums, manage photos, and update your carousel.
                </p>
              </div>

              <button
                onClick={() => setCarouselManager(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <FiX />
              </button>
            </div>

            {/* Carousel Manager Content */}
            <div className="flex-1 space-y-6 overflow-y-auto bg-white p-6 dark:bg-slate-900">
              {carouselAlbums.map((album, idx) => (
                <div
                  key={album.id}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {idx + 1}
                      </span>

                      <input
                        type="text"
                        value={album.title}
                        onChange={(e) =>
                          updateAlbumTitle(
                            album.id,
                            e.target.value
                          )
                        }
                        placeholder="Album Name"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:max-w-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2">

                      {/* Add Photos */}
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 dark:hover:bg-slate-800">
                        <FaPlus className="text-[10px]" />
                        <span>Add Photos</span>

                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) =>
                            addPhotosToAlbum(
                              album.id,
                              e
                            )
                          }
                        />
                      </label>

                      {/* Delete Album */}
                      <button
                        onClick={() =>
                          deleteCarouselCard(
                            album.id,
                            album.title
                          )
                        }
                        className="rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
                      >
                        Delete Album
                      </button>
                    </div>
                  </div>

                  {/* Album Photos Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                    {album.photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                      >
                        <img
                          src={photo.src}
                          alt={photo.title}
                          className="h-full w-full object-cover"
                        />

                        <button
                          onClick={() =>
                            deletePhotoFromAlbum(
                              album.id,
                              photo.title
                            )
                          }
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white opacity-0 shadow transition group-hover:opacity-100"
                        >
                          <FiX className="text-[10px]" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* ========================================
                  CREATE NEW ALBUM SLOT
                  ======================================== */}
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-6 text-center transition hover:border-sky-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800">
                <span className="mb-1 flex h-8 w-8 items-center justify-center rounded-full border border-slate-400 text-slate-600 dark:border-slate-600 dark:text-slate-300">
                  <FaPlus className="text-xs" />
                </span>

                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Create New Album Slot
                </span>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={addNewAlbumCard}
                />
              </label>
            </div>

            {/* Carousel Manager Done Button */}
            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <button
                onClick={() => setCarouselManager(false)}
                className="rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          FEATURED PHOTOS MANAGER MODAL
          ======================================== */}
      {featuredManager && (
        <div className={`modal-overlay-anim fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md ${featuredManagerClosing ? "modal-exit" : ""}`}>
          <div className={`modal-card-pop relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 ${featuredManagerClosing ? "modal-exit" : ""}`}>

            {/* Featured Manager Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Featured Photos Manager
                </h2>

                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Rename or delete your featured photos.
                </p>
              </div>

              <button
                onClick={() => setFeaturedManager(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <FiX />
              </button>
            </div>

            {/* Featured Manager Content */}
            <div className="flex-1 space-y-4 overflow-y-auto bg-white p-6 dark:bg-slate-900">
              {featuredPhotos.map((photo) => (
                <FeaturedManagerItem
                  key={photo.id}
                  photo={photo}
                  onUpdate={updateFeaturedTitle}
                  onDelete={deleteFeaturedPhoto}
                />
              ))}
            </div>

            {/* Featured Manager Done Button */}
            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <button
                onClick={() => setFeaturedManager(false)}
                className="rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          DELETE CONFIRMATION MODAL
          ======================================== */}
      {confirmModal.isOpen && (
        <div className={`modal-overlay-anim fixed inset-0 z-[150] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md ${confirmModalClosing ? "modal-exit" : ""}`}>
          <div className={`modal-card-pop relative flex w-full max-w-sm flex-col rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl ${confirmModalClosing ? "modal-exit" : ""}`}>
            <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">
              {confirmModal.title}
            </h3>

            <p className="mb-6 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() =>
                  setConfirmModal((prev) => ({
                    ...prev,
                    isOpen: false,
                  }))
                }
                className="flex-1 rounded-xl border border-slate-300 bg-slate-100 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:bg-red-500"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
        </>,
        document.body
      )}
    </div>
  );
}

// ========================================
// DETAIL ROW COMPONENT
// ========================================
function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {icon}
      </span>

      <div className="min-w-0">
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p className="break-words text-sm text-slate-700 dark:text-slate-200">
          {value}
        </p>
      </div>
    </div>
  );
}

// ========================================
// DETAIL EDITOR COMPONENT
// ========================================
function DetailEditor({
  type,
  details,
  setDetails,
  onClose,
  onSave,
  isClosing = false,
}) {
  // ========================================
  // DETAIL EDITOR TITLES
  // ========================================
  const titleMap = {
    personal: "Edit Personal Details",
    work: "Edit Work",
    niches: "Edit Niche",
    location: "Edit Location",
    contact: "Edit Contact Info",
  };

  // ========================================
  // DETAIL EDITOR OPTIONS
  // ========================================
  const nicheOptions = [
    "Wedding",
    "Prenup",
    "Portrait",
    "Corporate",
    "Birthday",
  ];

  const workOptions = [
    "Photographer",
    "Videographer",
    "Photographer and Videographer",
  ];

  const genderOptions = [
    "Male",
    "Female",
    "Prefer not to say",
  ];

  const relationshipOptions = [
    "Single",
    "In a relationship",
    "Married",
    "Prefer not to say",
  ];

  // ========================================
  // TOGGLE NICHE
  // ========================================
  const toggleNiche = (niche) => {
    const current = details.niches || [];

    if (current.includes(niche)) {
      setDetails({
        ...details,
        niches: current.filter(
          (item) => item !== niche
        ),
      });
    } else {
      setDetails({
        ...details,
        niches: [...current, niche],
      });
    }
  };

  // ========================================
  // DETAIL EDITOR UI
  // ========================================
  return (
    <div className={`modal-overlay-anim fixed inset-0 z-[130] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md ${isClosing ? "modal-exit" : ""}`}>
      <div className={`modal-card-pop relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white ${isClosing ? "modal-exit" : ""}`}>

        {/* ========================================
            DETAIL EDITOR HEADER
            ======================================== */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-xl font-bold">
              {titleMap[type]}
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Update this section of your profile.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <FiX />
          </button>
        </div>

        {/* ========================================
            DETAIL EDITOR CONTENT
            ======================================== */}
        <div className="flex-1 space-y-5 overflow-y-auto bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-white">

          {/* ========================================
              PERSONAL DETAILS EDITOR
              ======================================== */}
          {type === "personal" && (
            <>
              <EditField
                label="Birthday"
                value={details.birthday}
                onChange={(value) =>
                  setDetails({
                    ...details,
                    birthday: value,
                  })
                }
                placeholder="July 19, 2005"
              />

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Gender
                </label>

                <select
                  value={details.gender}
                  onChange={(e) =>
                    setDetails({
                      ...details,
                      gender: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {genderOptions.map((option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <EditField
                label="Pronouns"
                value={details.pronouns}
                onChange={(value) =>
                  setDetails({
                    ...details,
                    pronouns: value,
                  })
                }
                placeholder="They/Them"
              />

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Relationship
                </label>

                <select
                  value={details.relationship}
                  onChange={(e) =>
                    setDetails({
                      ...details,
                      relationship: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {relationshipOptions.map(
                    (option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option}
                      </option>
                    )
                  )}
                </select>
              </div>
            </>
          )}

          {/* ========================================
              WORK EDITOR
              ======================================== */}
          {type === "work" && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Work
              </label>

              <div className="space-y-2">
                {workOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setDetails({
                        ...details,
                        work: option,
                      })
                    }
                    className={`flex w-full items-center rounded-xl border px-4 py-3 text-left text-sm transition-all duration-300 ease-out ${
                      details.work === option
                        ? "border-sky-500 bg-sky-500/10 text-sky-500 dark:text-sky-400"
                        : "border-slate-300 bg-slate-50 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <span className="mr-3">
                      {details.work === option
                        ? "●"
                        : "○"}
                    </span>

                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ========================================
              NICHES EDITOR
              ======================================== */}
          {type === "niches" && (
            <>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Select Niche
                </label>

                <div className="grid gap-2 sm:grid-cols-2">
                  {nicheOptions.map((niche) => {
                    const selected =
                      (details.niches || []).includes(
                        niche
                      );

                    return (
                      <button
                        key={niche}
                        type="button"
                        onClick={() =>
                          toggleNiche(niche)
                        }
                        className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-300 ease-out ${
                          selected
                            ? "border-sky-500 bg-sky-500/10 text-sky-500 dark:text-sky-400"
                            : "border-slate-300 bg-slate-50 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        {selected ? "✓ " : ""}
                        {niche}
                      </button>
                    );
                  })}
                </div>
              </div>

              <EditField
                label="Custom Niche"
                value={details.customNiche || ""}
                onChange={(value) =>
                  setDetails({
                    ...details,
                    customNiche: value,
                  })
                }
                placeholder="Enter another niche"
              />
            </>
          )}

          {/* ========================================
              LOCATION EDITOR
              ======================================== */}
          {type === "location" && (
            <>
              <EditField
                label="Location"
                value={details.location}
                onChange={(value) =>
                  setDetails({
                    ...details,
                    location: value,
                  })
                }
                placeholder="Pagsanjan, Laguna"
              />

              <EditField
                label="Hometown"
                value={details.hometown || ""}
                onChange={(value) =>
                  setDetails({
                    ...details,
                    hometown: value,
                  })
                }
                placeholder="Enter your hometown"
              />
            </>
          )}

          {/* ========================================
              CONTACT INFORMATION EDITOR
              ======================================== */}
          {type === "contact" && (
            <>
              <EditField
                label="Personal Email"
                value={details.personalEmail}
                onChange={(value) =>
                  setDetails({
                    ...details,
                    personalEmail: value,
                  })
                }
                placeholder="juan@email.com"
                type="email"
              />

              <EditField
                label="Personal Number"
                value={details.personalNumber}
                onChange={(value) =>
                  setDetails({
                    ...details,
                    personalNumber: value,
                  })
                }
                placeholder="09XX-XXX-XXXX"
              />

              <EditField
                label="Studio Email"
                value={details.studioEmail || ""}
                onChange={(value) =>
                  setDetails({
                    ...details,
                    studioEmail: value,
                  })
                }
                placeholder="Optional"
                type="email"
              />

              <EditField
                label="Studio Number"
                value={details.studioNumber || ""}
                onChange={(value) =>
                  setDetails({
                    ...details,
                    studioNumber: value,
                  })
                }
                placeholder="Optional"
              />
            </>
          )}
        </div>

        {/* ========================================
            DETAIL EDITOR BUTTONS
            ======================================== */}
        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            onClick={onSave}
            className="rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// EDIT FIELD COMPONENT
// ========================================
function EditField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </label>

      <input
        type={type}
        value={value || ""}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </div>
  );
}

// ========================================
// FEATURED MANAGER ITEM COMPONENT
// ========================================
function FeaturedManagerItem({
  photo,
  onUpdate,
  onDelete,
}) {
  // ========================================
  // FEATURED TITLE EDIT STATE
  // ========================================
  const [titleInput, setTitleInput] = useState(
    photo.title
  );

  const isChanged =
    titleInput !== photo.title;

  // ========================================
  // FEATURED MANAGER ITEM UI
  // ========================================
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-3">

        {/* Featured Photo Preview */}
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <img
            src={photo.src}
            alt={photo.title}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Featured Photo Title */}
        <input
          type="text"
          value={titleInput}
          onChange={(e) =>
            setTitleInput(e.target.value)
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {/* ========================================
          FEATURED PHOTO ACTION BUTTONS
          ======================================== */}
      <div className="flex items-center justify-end gap-2">

        {/* Confirm Title */}
        {isChanged && (
          <button
            onClick={() =>
              onUpdate(
                photo.id,
                titleInput.trim() ||
                  "Untitled Featured Photo"
              )
            }
            className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-400"
          >
            Confirm
          </button>
        )}

        {/* Delete Photo */}
        <button
          onClick={() =>
            onDelete(photo.id, photo.title)
          }
          className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
        >
          Delete
        </button>
      </div>
    </div>
  );
}