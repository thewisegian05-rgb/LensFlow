import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";

// ======================================================
// DEFAULT CAROUSEL ALBUMS
// ======================================================
const carouselStart = [
  {
    id: 1,
    title: "Classic White Tee",
    photos: [
      {
        id: 101,
        src: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800",
        title: "Front View",
      },
      {
        id: 102,
        src: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800",
        title: "Detail View",
      },
    ],
  },
  {
    id: 2,
    title: "Streetwear",
    photos: [
      {
        id: 201,
        src: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800",
        title: "Outfit 1",
      },
      {
        id: 202,
        src: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800",
        title: "Outfit 2",
      },
    ],
  },
  {
    id: 3,
    title: "Minimal Look",
    photos: [
      {
        id: 301,
        src: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800",
        title: "Look 1",
      },
    ],
  },
  {
    id: 4,
    title: "Modern Style",
    photos: [
      {
        id: 401,
        src: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800",
        title: "Studio Shot",
      },
      {
        id: 402,
        src: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800",
        title: "Studio Shot 2",
      },
      {
        id: 403,
        src: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800",
        title: "Studio Shot 3",
      },
    ],
  },
];

// ======================================================
// DEFAULT FEATURED PHOTOS
// ======================================================
const featuredStart = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1000",
    title: "Main Collection",
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800",
    title: "Street Style",
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800",
    title: "Minimal Look",
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1000",
    title: "New Collection",
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=800",
    title: "Lifestyle",
  },
];

// ======================================================
// MAIN PROFILE COMPONENT
// ======================================================
export default function Profile() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const savedProfile = localStorage.getItem("lensflow_profile");

    if (savedProfile) {
      const data = JSON.parse(savedProfile);

      setUsername(data.username);
      setBio(data.bio);
      setProfileInfo(data.profileInfo);
    }
  }, []);

  // ====================================================
  // BASIC PROFILE
  // ====================================================
  const [username, setUsername] = useState("LENSFLOW");
  const [bio, setBio] = useState("Gian and Friends");
  // ====================================================
  // PROFILE INFORMATION
  // ====================================================
  const [profileInfo, setProfileInfo] = useState({
    birthday: "July 19, 2005",
    gender: "Male",
    pronouns: "They/Them",
    relationship: "Single",
    work: "Photographer",
    interests: ["Portrait Photography", "Event Photography"],
    customInterest: "",
    location: "Pagsanjan, Laguna",
    hometown: "",
    personalEmail: "juan@email.com",
    personalNumber: "09XX-XXX-XXXX",
    studioEmail: "",
    studioNumber: "",
  });

  // ====================================================
  // PROFILE PICTURE
  // ====================================================
  const [profilePicture, setProfilePicture] = useState(
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400"
  );

  // ====================================================
  // PHOTO DATA
  // ====================================================
  const [carouselAlbums, setCarouselAlbums] = useState(carouselStart);
  const [featuredPhotos, setFeaturedPhotos] = useState(featuredStart);

  // ====================================================
  // MODALS
  // ====================================================
  const [editProfile, setEditProfile] = useState(false);
  const [viewDetails, setViewDetails] = useState(false);

  const [carouselManager, setCarouselManager] = useState(false);
  const [featuredManager, setFeaturedManager] = useState(false);

  const [activeAlbum, setActiveAlbum] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const [profileMenu, setProfileMenu] = useState(false);
  const [profilePreview, setProfilePreview] = useState(false);

  const [featuredPreview, setFeaturedPreview] = useState(null);

  // ====================================================
  // DETAIL EDITOR
  // personal / work / interests / location / contact
  // ====================================================
  const [detailEditor, setDetailEditor] = useState(null);

  // ====================================================
  // TEMP EDIT PROFILE DATA
  // Main Edit Profile ONLY edits these 3
  // ====================================================
  const [tempUsername, setTempUsername] = useState(username);
  const [tempBio, setTempBio] = useState(bio);

  // ====================================================
  // TEMP DETAIL DATA
  // Used by the individual About edit buttons
  // ====================================================
  const [tempDetails, setTempDetails] = useState(profileInfo);

  // ====================================================
  // UPLOAD SETUP
  // ====================================================
  const [carouselSetup, setCarouselSetup] = useState(null);
  const [featuredSetup, setFeaturedSetup] = useState([]);

  // ====================================================
  // DELETE CONFIRMATION
  // ====================================================
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "Delete Item?",
    message:
      "Are you sure you want to delete this item? This action cannot be undone.",
    onConfirm: () => {},
  });

  // ====================================================
  // REFS
  // ====================================================
  const scrollContainerRef = useRef(null);
  const profileContainerRef = useRef(null);

  // ====================================================
  // CLOSE PROFILE MENU WHEN CLICKING OUTSIDE
  // ====================================================
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

  // ====================================================
  // MAIN EDIT PROFILE
  // ONLY USERNAME, DISPLAY NAME, BIO
  // ====================================================
  const openEditProfile = () => {
    setTempUsername(username);
    setTempBio(bio);
    setEditProfile(true);
  };

  const saveProfile = () => {
  const updatedProfile = {
    username: tempUsername,
    bio: tempBio,
    profileInfo,
  };

  localStorage.setItem(
    "lensflow_profile",
    JSON.stringify(updatedProfile)
  );

  setUsername(tempUsername);
  setBio(tempBio);
  setEditProfile(false);
};

  // ====================================================
  // OPEN INDIVIDUAL ABOUT EDITOR
  // ====================================================
  const openDetailEditor = (type) => {
    setTempDetails({ ...profileInfo });
    setDetailEditor(type);
  };

  // ====================================================
  // SAVE INDIVIDUAL ABOUT SECTION
  // ====================================================
  const saveDetailEditor = () => {
    setProfileInfo({ ...tempDetails });
    setDetailEditor(null);
  };

  // ====================================================
  // PROFILE PICTURE
  // ====================================================
  const changeProfilePictureDirect = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setProfilePicture(URL.createObjectURL(file));
    setProfileMenu(false);
    e.target.value = "";
  };

  // ====================================================
  // CAROUSEL UPLOAD
  // ====================================================
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
      })),
    });

    e.target.value = "";
  };

  // ====================================================
  // CONFIRM NEW CAROUSEL
  // ====================================================
  const confirmCarouselSetup = () => {
    if (!carouselSetup) return;

    const title =
      carouselSetup.title.trim() ||
      `Carousel Slot ${carouselAlbums.length + 1}`;

    setCarouselAlbums((albums) => [
      ...albums,
      {
        ...carouselSetup,
        title,
      },
    ]);

    setCarouselSetup(null);
  };

  // ====================================================
  // UPDATE ALBUM TITLE
  // ====================================================
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
  };

  // ====================================================
  // ADD PHOTOS TO EXISTING ALBUM
  // ====================================================
  const addPhotosToAlbum = (albumId, e) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    setCarouselAlbums((albums) =>
      albums.map((album) => {
        if (album.id === albumId) {
          const newPhotos = files.map((file, i) => ({
            id: Date.now() + i,
            src: URL.createObjectURL(file),
            title: file.name,
          }));

          return {
            ...album,
            photos: [...album.photos, ...newPhotos],
          };
        }

        return album;
      })
    );

    e.target.value = "";
  };

  // ====================================================
  // DELETE PHOTO FROM ALBUM
  // ====================================================
  const deletePhotoFromAlbum = (albumId, photoName) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Photo?",
      message: `Are you sure you want to delete "${photoName}"? This action cannot be undone.`,
      onConfirm: () => {
        setCarouselAlbums((albums) =>
          albums.map((album) => {
            if (album.id === albumId) {
              return {
                ...album,
                photos: album.photos.filter(
                  (photo) => photo.title !== photoName
                ),
              };
            }

            return album;
          })
        );

        setConfirmModal((prev) => ({
          ...prev,
          isOpen: false,
        }));
      },
    });
  };

  // ====================================================
  // DELETE CAROUSEL ALBUM
  // ====================================================
  const deleteCarouselCard = (albumId, albumTitle) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Album?",
      message: `Are you sure you want to delete album "${albumTitle}"? This action cannot be undone.`,
      onConfirm: () => {
        setCarouselAlbums((albums) =>
          albums.filter((album) => album.id !== albumId)
        );

        setConfirmModal((prev) => ({
          ...prev,
          isOpen: false,
        }));
      },
    });
  };

  // ====================================================
  // FEATURED PHOTO UPLOAD
  // ====================================================
  const addFeaturedPhotos = (e) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    setFeaturedSetup(
      files.map((file, i) => ({
        id: Date.now() + i,
        src: URL.createObjectURL(file),
        title: file.name,
      }))
    );

    e.target.value = "";
  };

  // ====================================================
  // UPDATE PENDING FEATURED NAME
  // ====================================================
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

  // ====================================================
  // REMOVE PENDING FEATURED PHOTO
  // ====================================================
  const removePendingFeatured = (photoId) => {
    setFeaturedSetup((photos) =>
      photos.filter((photo) => photo.id !== photoId)
    );
  };

  // ====================================================
  // POST FEATURED PHOTOS
  // ====================================================
  const postFeaturedPhotos = () => {
    if (featuredSetup.length === 0) return;

    setFeaturedPhotos((photos) => [
      ...photos,
      ...featuredSetup,
    ]);

    setFeaturedSetup([]);
  };

  // ====================================================
  // UPDATE FEATURED PHOTO NAME
  // ====================================================
  const updateFeaturedTitle = (photoId, newTitle) => {
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
  };

  // ====================================================
  // DELETE FEATURED PHOTO
  // ====================================================
  const deleteFeaturedPhoto = (photoId, photoTitle) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Featured Photo?",
      message: `Are you sure you want to delete "${photoTitle}"? This action cannot be undone.`,
      onConfirm: () => {
        setFeaturedPhotos((photos) =>
          photos.filter((photo) => photo.id !== photoId)
        );

        setConfirmModal((prev) => ({
          ...prev,
          isOpen: false,
        }));
      },
    });
  };

  // ====================================================
  // CAROUSEL VIEWER
  // ====================================================
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

  const scrollToPhoto = (index) => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;

    container.scrollTo({
      left: index * container.clientWidth,
      behavior: "smooth",
    });

    setCurrentPhotoIndex(index);
  };

  // ====================================================
  // INFINITE CAROUSEL
  // ====================================================
  const infiniteCarousel = [
    ...carouselAlbums,
    ...carouselAlbums,
    ...carouselAlbums,
  ];

  return (
    <div className={`${isDark ? "profile-page-dark" : "profile-page-light"} min-h-screen bg-slate-950 px-4 py-8 text-white md:px-8`}>

      <style>{`
        .profile-page-light {
          background-color: #f8fafc !important;
          color: #0f172a !important;
        }

        .profile-page-light .bg-slate-950 { background-color: #ffffff !important; }
        .profile-page-light .bg-slate-900 { background-color: #ffffff !important; }
        .profile-page-light .bg-slate-900\\/70 { background-color: rgba(255, 255, 255, 0.9) !important; }
        .profile-page-light .bg-slate-950\\/40 { background-color: rgba(241, 245, 249, 0.7) !important; }
        .profile-page-light .bg-slate-800 { background-color: #e2e8f0 !important; }
        .profile-page-light .bg-slate-700 { background-color: #cbd5e1 !important; }
        .profile-page-light .text-white { color: #0f172a !important; }
        .profile-page-light .text-slate-200 { color: #334155 !important; }
        .profile-page-light .text-slate-300 { color: #475569 !important; }
        .profile-page-light .text-slate-400 { color: #64748b !important; }
        .profile-page-light .text-slate-500 { color: #64748b !important; }
        .profile-page-light .text-slate-600 { color: #475569 !important; }
        .profile-page-light .border-slate-800 { border-color: #e2e8f0 !important; }
        .profile-page-light .border-slate-700 { border-color: #cbd5e1 !important; }
        .profile-page-light .border-slate-600 { border-color: #94a3b8 !important; }
        .profile-page-light .hover\\:bg-slate-800:hover { background-color: #f1f5f9 !important; }
        .profile-page-light .hover\\:bg-slate-700:hover { background-color: #e2e8f0 !important; }
        .profile-page-light .hover\\:text-white:hover { color: #0f172a !important; }
        .profile-page-light .from-slate-900 { --tw-gradient-from: #ffffff var(--tw-gradient-from-position) !important; }
        .profile-page-light .to-transparent { --tw-gradient-to: transparent var(--tw-gradient-to-position) !important; }
      `}</style>

      {/* ==================================================
          CAROUSEL ANIMATION
      ================================================== */}
      <style>{`
        @keyframes parade {
          0% {
            transform: translateX(0);
          }

          100% {
            transform: translateX(-33.333%);
          }
        }

        .animate-parade {
          display: flex;
          width: max-content;
          animation: parade 30s linear infinite;
        }

        .animate-parade:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="mx-auto max-w-6xl">

        {/* ==================================================
            PROFILE HEADER
        ================================================== */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            {username}
          </h1>
        </div>

        <div className="flex flex-col gap-7 md:flex-row md:items-center">

          {/* PROFILE PICTURE */}
          <div
            ref={profileContainerRef}
            className="relative shrink-0"
          >
            <button
              type="button"
              onClick={() => setProfileMenu(!profileMenu)}
              className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-slate-700 bg-slate-800 shadow-lg transition hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <img
                src={profilePicture}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            </button>

            {/* PROFILE PICTURE MENU */}
            {profileMenu && (
              <div className="absolute left-1/2 top-full z-50 mt-3 w-56 -translate-x-1/2 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">

                <button
                  type="button"
                  onClick={() => {
                    setProfileMenu(false);
                    setProfilePreview(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-slate-800 hover:text-sky-400"
                >
                  👁️
                  <span>View Profile Picture</span>
                </button>

                <label
                  htmlFor="profile-picture-upload-menu"
                  className="flex cursor-pointer items-center gap-3 border-t border-slate-800 px-4 py-3 text-sm transition hover:bg-slate-800 hover:text-sky-400"
                >
                  📷
                  <span>Change Profile Picture</span>
                </label>
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

          {/* PROFILE INFORMATION */}
          <div className="flex-1">

            <div className="mb-5 flex gap-8">
              {[
                ["12", "Posts"],
                ["102", "Followers"],
                ["0", "Following"],
              ].map(([number, label]) => (
                <div key={label}>
                  <p className="text-xl font-bold">
                    {number}
                  </p>

                  <p className="text-sm text-slate-400">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-1 max-w-md whitespace-pre-line text-sm leading-6 text-slate-400">
              {bio}
            </p>
          </div>
        </div>

        {/* ==================================================
            MAIN EDIT PROFILE BUTTON
        ================================================== */}
        <button
          onClick={openEditProfile}
          className="mt-7 w-full rounded-xl border border-slate-700 bg-slate-900 py-3 text-sm font-semibold transition hover:border-sky-500 hover:bg-slate-800"
        >
          Edit Profile
        </button>

        {/* ==================================================
            FACEBOOK STYLE ABOUT
        ================================================== */}
        <section className="mt-8 border-t border-slate-800 pt-6">

          {/* ABOUT HEADER */}
          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-xl font-bold">
                About
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Information about the account owner
              </p>
            </div>

            {/* SEE MORE */}
            <button
              type="button"
              onClick={() => setViewDetails(true)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-sky-400 transition hover:border-sky-500 hover:bg-slate-800 hover:text-white"
            >
              See more
            </button>
          </div>

          {/* ABOUT PREVIEW */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">

            {/* WORK */}
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-lg">
                📷
              </span>

              <div>
                <p className="text-xs text-slate-500">
                  Work
                </p>

                <p className="text-sm text-slate-200">
                  {profileInfo.work || "Not set"}
                </p>
              </div>
            </div>

            {/* LOCATION */}
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-lg">
                📍
              </span>

              <div>
                <p className="text-xs text-slate-500">
                  Location
                </p>

                <p className="text-sm text-slate-200">
                  {profileInfo.location || "Not set"}
                </p>
              </div>
            </div>

            {/* PERSONAL EMAIL */}
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-lg">
                ✉️
              </span>

              <div>
                <p className="text-xs text-slate-500">
                  Personal Email
                </p>

                <p className="text-sm text-slate-200">
                  {profileInfo.personalEmail || "Not set"}
                </p>
              </div>
            </div>

            {/* PERSONAL NUMBER */}
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-lg">
                📱
              </span>

              <div>
                <p className="text-xs text-slate-500">
                  Personal Number
                </p>

                <p className="text-sm text-slate-200">
                  {profileInfo.personalNumber || "Not set"}
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ==================================================
            CAROUSEL
        ================================================== */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">

          <div className="mb-5">
            <h2 className="text-lg font-bold">
              Carousel
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Featured carousel items on your profile
            </p>
          </div>

          <div className="relative overflow-hidden rounded-xl py-4">

            <div className="pointer-events-none absolute left-0 top-0 z-20 h-full w-16 bg-gradient-to-r from-slate-900 to-transparent" />

            <div className="pointer-events-none absolute right-0 top-0 z-20 h-full w-16 bg-gradient-to-l from-slate-900 to-transparent" />

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
                    className="group relative h-32 w-44 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-700 bg-slate-800 text-left transition-all duration-300 hover:z-50 hover:scale-125 hover:border-sky-400 hover:shadow-2xl"
                  >
                    <img
                      src={coverPhoto}
                      alt={album.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* ALBUM ICON */}
                    {album.photos.length > 1 && (
                      <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm shadow">
                        🎞️
                      </div>
                    )}

                    <p className="absolute bottom-2 left-3 right-3 truncate text-xs font-semibold">
                      {album.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setCarouselManager(true)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 py-3 text-sm font-semibold text-slate-300 transition hover:border-sky-500 hover:text-white"
          >
            Update Carousel
          </button>
        </section>

        {/* ==================================================
            FEATURED PHOTOS
        ================================================== */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">

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

              {/* ADD FEATURES */}
              <label
                htmlFor="featured-upload"
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-sky-400 transition hover:border-sky-500 hover:bg-slate-800"
              >
                <span>+ Add Features</span>
              </label>

              {/* MANAGE */}
              <button
                onClick={() => setFeaturedManager(true)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-sky-500 hover:text-white"
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

          {/* FEATURED GRID */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">

            {featuredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative"
              >

                {/* IMAGE */}
                <button
                  type="button"
                  onClick={() => setFeaturedPreview(photo)}
                  className="relative block aspect-square w-full overflow-visible rounded-2xl border border-slate-800 bg-slate-900 text-left transition-all duration-300 hover:z-[35] hover:-translate-y-1 hover:scale-[1.08] hover:border-sky-400 hover:shadow-2xl focus:outline-none"
                >
                  <img
                    src={photo.src}
                    alt={photo.title}
                    className="h-full w-full rounded-2xl object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </button>

                {/* PHOTO NAME IS ALWAYS VISIBLE */}
                <div className="mt-2 px-1">
                  <p className="truncate text-sm font-semibold text-white">
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
      </div>

      {/* ==================================================
          VIEW DETAILS / SEE MORE
      ================================================== */}
      {viewDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">

          <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">

              <div>
                <h2 className="text-xl font-bold">
                  About
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Personal information and account details
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewDetails(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 space-y-8 overflow-y-auto p-6">

              {/* ==================================================
                  PERSONAL DETAILS
              ================================================== */}
              <section>

                <div className="mb-4 flex items-center justify-between">

                  <h3 className="text-lg font-bold text-white">
                    Personal Details
                  </h3>

                  <button
                    type="button"
                    onClick={() =>
                      openDetailEditor("personal")
                    }
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-sky-400"
                    title="Edit Personal Details"
                  >
                    ✏️
                  </button>
                </div>

                <div className="space-y-4">

                  {/* BIRTHDAY */}
                  <DetailRow
                    icon="🎂"
                    label="Birthday"
                    value={
                      profileInfo.birthday || "Not set"
                    }
                  />

                  {/* GENDER */}
                  <DetailRow
                    icon="⚧"
                    label="Gender"
                    value={
                      profileInfo.gender || "Not set"
                    }
                  />

                  {/* PRONOUNS */}
                  <DetailRow
                    icon="👤"
                    label="Pronouns"
                    value={
                      profileInfo.pronouns || "Not set"
                    }
                  />

                  {/* RELATIONSHIP */}
                  <DetailRow
                    icon="❤️"
                    label="Relationship"
                    value={
                      profileInfo.relationship || "Not set"
                    }
                  />
                </div>
              </section>

              {/* ==================================================
                  WORK
              ================================================== */}
              <section className="border-t border-slate-800 pt-6">

                <div className="mb-4 flex items-center justify-between">

                  <h3 className="text-lg font-bold text-white">
                    Work
                  </h3>

                  <button
                    type="button"
                    onClick={() =>
                      openDetailEditor("work")
                    }
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-sky-400"
                    title="Edit Work"
                  >
                    ✏️
                  </button>
                </div>

                <DetailRow
                  icon="📷"
                  label="Profession"
                  value={
                    profileInfo.work || "Not set"
                  }
                />
              </section>

              {/* ==================================================
                  INTERESTS
              ================================================== */}
              <section className="border-t border-slate-800 pt-6">

                <div className="mb-4 flex items-center justify-between">

                  <h3 className="text-lg font-bold text-white">
                    Interests
                  </h3>

                  <button
                    type="button"
                    onClick={() =>
                      openDetailEditor("interests")
                    }
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-sky-400"
                    title="Edit Interests"
                  >
                    ✏️
                  </button>
                </div>

                {profileInfo.interests?.length > 0 ||
                profileInfo.customInterest ? (
                  <div className="flex flex-wrap gap-2">

                    {(profileInfo.interests || []).map(
                      (interest, index) => (
                        <span
                          key={`${interest}-${index}`}
                          className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200"
                        >
                          {interest}
                        </span>
                      )
                    )}

                    {profileInfo.customInterest && (
                      <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200">
                        {profileInfo.customInterest}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No interests added yet.
                  </p>
                )}
              </section>

              {/* ==================================================
                  LOCATION
              ================================================== */}
              <section className="border-t border-slate-800 pt-6">

                <div className="mb-4 flex items-center justify-between">

                  <h3 className="text-lg font-bold text-white">
                    Location
                  </h3>

                  <button
                    type="button"
                    onClick={() =>
                      openDetailEditor("location")
                    }
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-sky-400"
                    title="Edit Location"
                  >
                    ✏️
                  </button>
                </div>

                <div className="space-y-4">

                  <DetailRow
                    icon="📍"
                    label="Location"
                    value={
                      profileInfo.location || "Not set"
                    }
                  />

                  <DetailRow
                    icon="🏠"
                    label="Hometown"
                    value={
                      profileInfo.hometown || "Not set"
                    }
                  />
                </div>
              </section>

              {/* ==================================================
                  CONTACT INFO
              ================================================== */}
              <section className="border-t border-slate-800 pt-6">

                <div className="mb-4 flex items-center justify-between">

                  <h3 className="text-lg font-bold text-white">
                    Contact Info
                  </h3>

                  <button
                    type="button"
                    onClick={() =>
                      openDetailEditor("contact")
                    }
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-sky-400"
                    title="Edit Contact Info"
                  >
                    ✏️
                  </button>
                </div>

                <div className="space-y-4">

                  <DetailRow
                    icon="✉️"
                    label="Personal Email"
                    value={
                      profileInfo.personalEmail ||
                      "Not set"
                    }
                  />

                  <DetailRow
                    icon="📱"
                    label="Personal Number"
                    value={
                      profileInfo.personalNumber ||
                      "Not set"
                    }
                  />

                  <DetailRow
                    icon="✉️"
                    label="Studio Email"
                    value={
                      profileInfo.studioEmail ||
                      "Not set"
                    }
                  />

                  <DetailRow
                    icon="📱"
                    label="Studio Number"
                    value={
                      profileInfo.studioNumber ||
                      "Not set"
                    }
                  />
                </div>
              </section>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end border-t border-slate-800 bg-slate-950 px-6 py-4">

              <button
                type="button"
                onClick={() => setViewDetails(false)}
                className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
              >
                Close
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          INDIVIDUAL ABOUT EDITOR
      ================================================== */}
      {detailEditor && (
        <DetailEditor
          type={detailEditor}
          details={tempDetails}
          setDetails={setTempDetails}
          onClose={() => setDetailEditor(null)}
          onSave={saveDetailEditor}
        />
      )}

      {/* ==================================================
          PROFILE PICTURE PREVIEW
      ================================================== */}
      {profilePreview && (
        <div
          onClick={() => setProfilePreview(false)}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
          >

            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">

              <p className="text-sm font-bold">
                Profile Picture
              </p>

              <button
                onClick={() => setProfilePreview(false)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 hover:text-white"
              >
                ✕
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

      {/* ==================================================
          FEATURED PHOTO VIEWER
      ================================================== */}
      {featuredPreview && (
        <div
          onClick={() => setFeaturedPreview(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
          >

            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-3">

              <p className="max-w-[75%] truncate text-sm font-bold text-white">
                {featuredPreview.title}
              </p>

              <button
                onClick={() => setFeaturedPreview(null)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-sky-500 hover:text-white"
              >
                − Minimize
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

      {/* ==================================================
          EDIT PROFILE
          ONLY USERNAME / DISPLAY NAME / BIO
      ================================================== */}
      {editProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">

          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">

              <div>
                <h2 className="text-xl font-bold">
                  Edit Profile
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Update your account information.
                </p>
              </div>

              <button
                onClick={() => setEditProfile(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 space-y-4 overflow-y-auto p-6">

              {/* USERNAME */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Username
                </label>

                <input
                  type="text"
                  value={tempUsername}
                  onChange={(e) =>
                    setTempUsername(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              {/* BIO */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Bio
                </label>

                <textarea
                  rows={4}
                  value={tempBio}
                  onChange={(e) =>
                    setTempBio(e.target.value)
                  }
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-3 border-t border-slate-800 bg-slate-950 px-6 py-4">

              <button
                onClick={() => setEditProfile(false)}
                className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
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

      {/* ==================================================
          CAROUSEL SETUP
      ================================================== */}
      {carouselSetup && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">

          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">

              <div>
                <h2 className="text-xl font-bold">
                  Carousel Setup
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Edit the album name before adding it.
                </p>
              </div>

              <button
                onClick={() => setCarouselSetup(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
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
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none"
                  placeholder="Album Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                {carouselSetup.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
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

            <div className="flex justify-end gap-3 border-t border-slate-800 bg-slate-950 px-6 py-4">

              <button
                onClick={() => setCarouselSetup(null)}
                className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"
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

      {/* ==================================================
          FEATURED SETUP
      ================================================== */}
      {featuredSetup.length > 0 && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">

          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">

              <div>
                <h2 className="text-xl font-bold">
                  Featured Setup
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Edit the name of each featured photo before posting.
                </p>
              </div>

              <button
                onClick={() => setFeaturedSetup([])}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">

              {featuredSetup.map((photo) => (
                <div
                  key={photo.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:flex-row"
                >

                  <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                    <img
                      src={photo.src}
                      alt={photo.title}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex flex-1 flex-col justify-center gap-3">

                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
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
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none"
                      placeholder="Featured Name"
                    />

                    <button
                      onClick={() =>
                        removePendingFeatured(photo.id)
                      }
                      className="self-start rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-900/40"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 bg-slate-950 px-6 py-4">

              <button
                onClick={() => setFeaturedSetup([])}
                className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"
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

      {/* ==================================================
          CAROUSEL VIEWER
      ================================================== */}
      {activeAlbum && (
        <div
          onClick={() => setActiveAlbum(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-2 backdrop-blur-md sm:p-4"
        >

          <div
            className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">

              <p className="max-w-[80%] truncate text-xs font-bold text-white">
                {activeAlbum.title}
              </p>

              <button
                onClick={() => setActiveAlbum(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-black sm:aspect-[16/10]">

              <div className="absolute right-3 top-3 z-30 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {currentPhotoIndex + 1}/
                {activeAlbum.photos.length}
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

              {currentPhotoIndex > 0 && (
                <button
                  onClick={() =>
                    scrollToPhoto(
                      currentPhotoIndex - 1
                    )
                  }
                  className="absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur transition hover:bg-black/80"
                >
                  ‹
                </button>
              )}

              {currentPhotoIndex <
                activeAlbum.photos.length - 1 && (
                <button
                  onClick={() =>
                    scrollToPhoto(
                      currentPhotoIndex + 1
                    )
                  }
                  className="absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur transition hover:bg-black/80"
                >
                  ›
                </button>
              )}
            </div>

            <div className="flex justify-center border-t border-slate-800 bg-slate-950 py-3">

              <div className="flex gap-1.5">

                {activeAlbum.photos.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() =>
                      scrollToPhoto(idx)
                    }
                    className={`h-1.5 rounded-full transition-all ${
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

      {/* ==================================================
          CAROUSEL MANAGER
      ================================================== */}
      {carouselManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">

          <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">

              <div>
                <h2 className="text-xl font-bold text-white">
                  Carousel Manager
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Rename albums, manage photos, and update your carousel.
                </p>
              </div>

              <button
                onClick={() => setCarouselManager(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">

              {carouselAlbums.map((album, idx) => (
                <div
                  key={album.id}
                  className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-4"
                >

                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

                    <div className="flex flex-1 items-center gap-3">

                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
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
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white focus:border-sky-500 focus:outline-none sm:max-w-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2">

                      <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:bg-slate-800">

                        <span>
                          + Add Photos
                        </span>

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

                      <button
                        onClick={() =>
                          deleteCarouselCard(
                            album.id,
                            album.title
                          )
                        }
                        className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900/40"
                      >
                        Delete Album
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">

                    {album.photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
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
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* CREATE NEW ALBUM */}
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/40 py-6 text-center transition hover:border-sky-500 hover:bg-slate-950">

                <span className="mb-1 flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 text-base text-slate-300">
                  +
                </span>

                <span className="text-sm font-semibold text-slate-200">
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

            <div className="flex justify-end border-t border-slate-800 bg-slate-950 px-6 py-4">

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

      {/* ==================================================
          FEATURED MANAGER
      ================================================== */}
      {featuredManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">

          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">

              <div>
                <h2 className="text-xl font-bold text-white">
                  Featured Photos Manager
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Rename or delete your featured photos.
                </p>
              </div>

              <button
                onClick={() =>
                  setFeaturedManager(false)
                }
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">

              {featuredPhotos.map((photo) => (
                <FeaturedManagerItem
                  key={photo.id}
                  photo={photo}
                  onUpdate={updateFeaturedTitle}
                  onDelete={deleteFeaturedPhoto}
                />
              ))}
            </div>

            <div className="flex justify-end border-t border-slate-800 bg-slate-950 px-6 py-4">

              <button
                onClick={() =>
                  setFeaturedManager(false)
                }
                className="rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          DELETE CONFIRMATION
      ================================================== */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">

          <div className="relative flex w-full max-w-sm flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl">

            <h3 className="mb-2 text-lg font-bold text-white">
              {confirmModal.title}
            </h3>

            <p className="mb-6 text-xs leading-relaxed text-slate-400">
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
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
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
    </div>
  );
}

// ======================================================
// DETAIL ROW
// ======================================================
function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-4">

      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-lg">
        {icon}
      </span>

      <div className="min-w-0">
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p className="break-words text-sm text-slate-200">
          {value}
        </p>
      </div>
    </div>
  );
}

// ======================================================
// INDIVIDUAL ABOUT EDITOR
// ======================================================
function DetailEditor({
  type,
  details,
  setDetails,
  onClose,
  onSave,
}) {
  const titleMap = {
    personal: "Edit Personal Details",
    work: "Edit Work",
    interests: "Edit Interests",
    location: "Edit Location",
    contact: "Edit Contact Info",
  };

  // ====================================================
  // INTEREST OPTIONS
  // ====================================================
  const interestOptions = [
    "Portrait Photography",
    "Event Photography",
    "Wedding Photography",
    "Fashion Photography",
    "Product Photography",
    "Travel Photography",
    "Videography",
  ];

  // ====================================================
  // WORK OPTIONS
  // ====================================================
  const workOptions = [
    "Photographer",
    "Videographer",
    "Photographer and Videographer",
  ];

  // ====================================================
  // GENDER OPTIONS
  // ====================================================
  const genderOptions = [
    "Male",
    "Female",
    "Prefer not to say",
  ];

  // ====================================================
  // RELATIONSHIP OPTIONS
  // ====================================================
  const relationshipOptions = [
    "Single",
    "In a relationship",
    "Married",
    "Prefer not to say",
  ];

  // ====================================================
  // TOGGLE INTEREST
  // ====================================================
  const toggleInterest = (interest) => {
    const current = details.interests || [];

    if (current.includes(interest)) {
      setDetails({
        ...details,
        interests: current.filter(
          (item) => item !== interest
        ),
      });
    } else {
      setDetails({
        ...details,
        interests: [...current, interest],
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">

      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">

          <div>
            <h2 className="text-xl font-bold">
              {titleMap[type]}
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Update this section of your profile.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">

          {/* ==================================================
              PERSONAL DETAILS
          ================================================== */}
          {type === "personal" && (
            <>
              {/* BIRTHDAY */}
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

              {/* GENDER */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
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
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none"
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

              {/* PRONOUNS */}
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

              {/* RELATIONSHIP */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
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
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none"
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

          {/* ==================================================
              WORK
          ================================================== */}
          {type === "work" && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
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
                    className={`flex w-full items-center rounded-xl border px-4 py-3 text-left text-sm transition ${
                      details.work === option
                        ? "border-sky-500 bg-sky-500/10 text-sky-400"
                        : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600"
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

          {/* ==================================================
              INTERESTS
          ================================================== */}
          {type === "interests" && (
            <>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Select Interests
                </label>

                <div className="grid gap-2 sm:grid-cols-2">

                  {interestOptions.map(
                    (interest) => {
                      const selected =
                        (
                          details.interests || []
                        ).includes(interest);

                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() =>
                            toggleInterest(
                              interest
                            )
                          }
                          className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                            selected
                              ? "border-sky-500 bg-sky-500/10 text-sky-400"
                              : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600"
                          }`}
                        >
                          {selected
                            ? "✓ "
                            : ""}
                          {interest}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* CUSTOM INTEREST */}
              <EditField
                label="Custom Interest"
                value={
                  details.customInterest || ""
                }
                onChange={(value) =>
                  setDetails({
                    ...details,
                    customInterest: value,
                  })
                }
                placeholder="Enter another interest"
              />
            </>
          )}

          {/* ==================================================
              LOCATION
          ================================================== */}
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

          {/* ==================================================
              CONTACT INFO
          ================================================== */}
          {type === "contact" && (
            <>
              <EditField
                label="Personal Email"
                value={
                  details.personalEmail
                }
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
                value={
                  details.personalNumber
                }
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
                value={
                  details.studioEmail || ""
                }
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
                value={
                  details.studioNumber || ""
                }
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

        {/* FOOTER */}
        <div className="flex justify-end gap-3 border-t border-slate-800 bg-slate-950 px-6 py-4">

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"
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

// ======================================================
// EDIT FIELD
// ======================================================
function EditField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>

      <input
        type={type}
        value={value || ""}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none"
      />
    </div>
  );
}

// ======================================================
// FEATURED MANAGER ITEM
// ======================================================
function FeaturedManagerItem({
  photo,
  onUpdate,
  onDelete,
}) {
  const [titleInput, setTitleInput] = useState(
    photo.title
  );

  const isChanged =
    titleInput !== photo.title;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-3 sm:flex-row sm:items-center">

      <div className="flex flex-1 items-center gap-3">

        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <img
            src={photo.src}
            alt={photo.title}
            className="h-full w-full object-cover"
          />
        </div>

        <input
          type="text"
          value={titleInput}
          onChange={(e) =>
            setTitleInput(e.target.value)
          }
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-white focus:border-sky-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-end gap-2">

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

        <button
          onClick={() =>
            onDelete(
              photo.id,
              photo.title
            )
          }
          className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-900/40"
        >
          Delete
        </button>
      </div>
    </div>
  );
}