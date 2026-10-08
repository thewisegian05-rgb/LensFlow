import { useState, useEffect, useCallback, useRef } from "react";
import {
  FaTimes,
  FaStar,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaRegStar,
  FaBan,
  FaCloudUploadAlt,
  FaFileImage,
} from "react-icons/fa";

const DEMO_IMAGES = [
  { id: "IMG_0123.CR3", seed: "wedding1" },
  { id: "IMG_0124.CR3", seed: "wedding2" },
  { id: "IMG_0125.CR3", seed: "wedding3" },
  { id: "IMG_0126.CR3", seed: "wedding4" },
  { id: "IMG_0127.CR3", seed: "wedding5" },
  { id: "IMG_0128.CR3", seed: "wedding6" },
  { id: "IMG_0129.CR3", seed: "wedding7" },
  { id: "IMG_0130.CR3", seed: "wedding8" },
].map((img) => ({
  id: img.id,
  fileName: img.id,
  thumbUrl: `https://picsum.photos/seed/${img.seed}/400/400`,
  fullUrl: `https://picsum.photos/seed/${img.seed}/1200/1200`,
  previewable: true,
  sizeLabel: null,
}));

const FILTERS = [
  { key: "all", label: "All" },
  { key: "star", label: "Starred" },
  { key: "reject", label: "Rejected" },
  { key: "unrated", label: "Unrated" },
];

const ACCEPTED_ATTR = "image/*,.cr3,.nef,.arw,.dng,.raw,.rw2,.orf";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}

function CullingPage() {
  const [images, setImages] = useState(DEMO_IMAGES);
  const [culls, setCulls] = useState({}); // { [imageId]: 'star' | 'reject' }
  const [filter, setFilter] = useState("all");
  const [lightboxId, setLightboxId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const objectUrlsRef = useRef([]); // track blob: urls so we can revoke them on unmount

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleFiles = useCallback((fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const newImages = files.map((file) => {
      const isPreviewable = file.type.startsWith("image/");
      const url = isPreviewable ? URL.createObjectURL(file) : null;
      if (url) objectUrlsRef.current.push(url);

      return {
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 6)}`,
        fileName: file.name,
        thumbUrl: url,
        fullUrl: url,
        previewable: isPreviewable,
        sizeLabel: formatBytes(file.size),
      };
    });

    setImages((prev) => [...newImages, ...prev]);
  }, []);

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  const total = images.length;
  const starredCount = Object.values(culls).filter((v) => v === "star").length;
  const rejectedCount = Object.values(culls).filter((v) => v === "reject").length;
  const reviewedCount = starredCount + rejectedCount;
  const unratedCount = total - reviewedCount;

  const visibleImages = images.filter((img) => {
    if (filter === "all") return true;
    if (filter === "unrated") return !culls[img.id];
    return culls[img.id] === filter;
  });

  function setRating(id, action) {
    setCulls((prev) => ({
      ...prev,
      [id]: prev[id] === action ? undefined : action,
    }));
  }

  function clearRating(id) {
    setCulls((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  const lightboxIndex = visibleImages.findIndex((img) => img.id === lightboxId);
  const lightboxImage = lightboxIndex >= 0 ? visibleImages[lightboxIndex] : null;

  const goToOffset = useCallback(
    (offset) => {
      if (visibleImages.length === 0) return;
      const nextIndex =
        (lightboxIndex + offset + visibleImages.length) % visibleImages.length;
      setLightboxId(visibleImages[nextIndex].id);
    },
    [lightboxIndex, visibleImages]
  );

  useEffect(() => {
    if (!lightboxImage) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") setLightboxId(null);
      else if (e.key === "ArrowRight") goToOffset(1);
      else if (e.key === "ArrowLeft") goToOffset(-1);
      else if (e.key.toLowerCase() === "s") setRating(lightboxImage.id, "star");
      else if (e.key.toLowerCase() === "x") setRating(lightboxImage.id, "reject");
      else if (e.key.toLowerCase() === "u" || e.key === "Backspace")
        clearRating(lightboxImage.id);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxImage, goToOffset]);

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-white">
          Culling Station
        </h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select className="bg-slate-800 text-sm rounded-lg px-3 py-2 text-slate-300 border border-slate-700 focus:outline-none focus:border-sky-500 flex-1 sm:flex-none">
            <option>Smith Wedding (450 RAWs)</option>
            <option>Corp Headshots (120 RAWs)</option>
            <option>Prenup - Jane &amp; John (200 RAWs)</option>
          </select>
          <button className="bg-sky-500 hover:bg-sky-600 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 whitespace-nowrap transition-all duration-200 hover:scale-105 active:scale-95">
            <FaCheck /> Finish
          </button>
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-6 border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? "border-sky-500 bg-sky-500/10 scale-[1.01] animate-pulse-border"
            : "border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_ATTR}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <FaCloudUploadAlt
          className={`mx-auto text-3xl mb-2 transition-transform duration-200 ${
            isDragging ? "text-sky-400 -translate-y-1 scale-125" : "text-slate-500"
          }`}
        />
        <p className="text-sm text-slate-300 font-medium">
          {isDragging ? "Drop to add these files" : "Drag & drop photos here, or click to browse"}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          JPG, PNG, WEBP get thumbnails right away &middot; RAW formats (CR3, NEF, ARW, DNG) are added but can't be previewed in-browser
        </p>
      </div>

      {/* Progress + stat pills */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 sm:p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-xs">
            <span
              style={{ animationDelay: "0ms" }}
              className="animate-fade-in-up flex items-center gap-1.5 bg-sky-500/10 text-sky-400 px-2.5 py-1 rounded-full font-medium"
            >
              <FaStar className="text-[10px]" /> {starredCount} Starred
            </span>
            <span
              style={{ animationDelay: "80ms" }}
              className="animate-fade-in-up flex items-center gap-1.5 bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full font-medium"
            >
              <FaBan className="text-[10px]" /> {rejectedCount} Rejected
            </span>
            <span
              style={{ animationDelay: "160ms" }}
              className="animate-fade-in-up flex items-center gap-1.5 bg-slate-700/50 text-slate-400 px-2.5 py-1 rounded-full font-medium"
            >
              {unratedCount} Remaining
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {reviewedCount} / {total} reviewed
          </span>
        </div>

        <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden flex">
          <div
            className="bg-sky-500 h-full transition-all duration-500 ease-out"
            style={{ width: total ? `${(starredCount / total) * 100}%` : "0%" }}
          />
          <div
            className="bg-red-500 h-full transition-all duration-500 ease-out"
            style={{ width: total ? `${(rejectedCount / total) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const count =
            f.key === "all"
              ? total
              : f.key === "unrated"
              ? unratedCount
              : f.key === "star"
              ? starredCount
              : rejectedCount;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 active:scale-95 ${
                active
                  ? "bg-sky-500 text-slate-900"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {f.label} <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {visibleImages.length === 0 ? (
        <div className="animate-fade-in text-center py-16 text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl">
          {total === 0 ? "Drop some photos above to get started." : "Nothing here yet."}
        </div>
      ) : (
        <div
          key={filter}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          {visibleImages.map((img, index) => {
            const state = culls[img.id];
            const stateClasses =
              state === "star"
                ? "outline outline-[3px] outline-sky-500 -outline-offset-[3px] border-transparent"
                : state === "reject"
                ? "outline outline-[3px] outline-red-500 -outline-offset-[3px] border-transparent opacity-50"
                : "border-slate-700 hover:border-slate-500";

            return (
              <div
                key={img.id}
                onClick={() => setLightboxId(img.id)}
                style={{ animationDelay: `${Math.min(index, 15) * 40}ms` }}
                className={`animate-fade-in-up relative aspect-square bg-slate-900 rounded-lg overflow-hidden border group transition-all duration-200 cursor-pointer hover:scale-[1.03] hover:z-10 hover:shadow-xl hover:shadow-black/40 ${stateClasses}`}
              >
                {img.previewable ? (
                  <img
                    src={img.thumbUrl}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    alt={img.fileName}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-2 text-center bg-slate-800">
                    <FaFileImage className="text-2xl text-slate-600" />
                    <span className="text-[10px] text-slate-500 truncate w-full">
                      No preview
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRating(img.id, "reject");
                    }}
                    className="bg-red-500/80 hover:bg-red-500 text-white w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-90"
                    title="Reject (X)"
                  >
                    <FaTimes className="text-sm" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRating(img.id, "star");
                    }}
                    className="bg-sky-500/80 hover:bg-sky-500 text-white w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-90"
                    title="Star (S)"
                  >
                    <FaStar className="text-sm" />
                  </button>
                </div>

                <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-mono max-w-[85%] truncate">
                  {img.fileName}
                </span>

                {state === "star" && (
                  <span
                    key="star"
                    className="animate-pop absolute top-2 right-2 text-sky-400 drop-shadow"
                  >
                    <FaStar />
                  </span>
                )}
                {state === "reject" && (
                  <span
                    key="reject"
                    className="animate-pop absolute top-2 right-2 text-red-400 drop-shadow"
                  >
                    <FaBan />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-600 mt-4 text-center">
        Click a photo to inspect it full-screen &middot; S star &middot; X reject &middot; ← → navigate
      </p>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="animate-fade-in fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
          onClick={() => setLightboxId(null)}
        >
          <div
            className="flex items-center justify-between px-4 sm:px-6 py-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-sm truncate">{lightboxImage.fileName}</span>
              {lightboxImage.sizeLabel && (
                <span className="text-xs text-slate-500 flex-shrink-0">
                  {lightboxImage.sizeLabel}
                </span>
              )}
              {culls[lightboxImage.id] === "star" && (
                <span
                  key="s"
                  className="animate-pop flex items-center gap-1 text-sky-400 text-xs bg-sky-500/10 px-2 py-1 rounded-full flex-shrink-0"
                >
                  <FaStar /> Starred
                </span>
              )}
              {culls[lightboxImage.id] === "reject" && (
                <span
                  key="r"
                  className="animate-pop flex items-center gap-1 text-red-400 text-xs bg-red-500/10 px-2 py-1 rounded-full flex-shrink-0"
                >
                  <FaBan /> Rejected
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-xs text-slate-400">
                {lightboxIndex + 1} / {visibleImages.length}
              </span>
              <button
                onClick={() => setLightboxId(null)}
                className="text-slate-400 hover:text-white transition-all duration-150 hover:rotate-90 active:scale-90"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 flex items-center justify-center relative px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => goToOffset(-1)}
              className="absolute left-2 sm:left-6 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95"
            >
              <FaChevronLeft />
            </button>

            {lightboxImage.previewable ? (
              <img
                key={lightboxImage.id}
                src={lightboxImage.fullUrl}
                alt={lightboxImage.fileName}
                className="animate-scale-in max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <div
                key={lightboxImage.id}
                className="animate-scale-in flex flex-col items-center gap-3 text-slate-400 px-8 text-center"
              >
                <FaFileImage className="text-5xl text-slate-600" />
                <p className="text-sm">
                  No in-browser preview for this file type.
                  <br />
                  Open it in your RAW editor to inspect it.
                </p>
              </div>
            )}

            <button
              onClick={() => goToOffset(1)}
              className="absolute right-2 sm:right-6 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95"
            >
              <FaChevronRight />
            </button>
          </div>

          <div
            className="flex items-center justify-center gap-4 py-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setRating(lightboxImage.id, "reject")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 ${
                culls[lightboxImage.id] === "reject"
                  ? "bg-red-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <FaTimes /> Reject
            </button>
            <button
              onClick={() => clearRating(lightboxImage.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-400 hover:bg-slate-700 transition-all duration-150 active:scale-95"
            >
              <FaRegStar /> Clear
            </button>
            <button
              onClick={() => setRating(lightboxImage.id, "star")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 ${
                culls[lightboxImage.id] === "star"
                  ? "bg-sky-500 text-slate-900"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <FaStar /> Star
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CullingPage;