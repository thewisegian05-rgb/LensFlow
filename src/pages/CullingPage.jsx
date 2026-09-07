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
  FaCrown,
  FaLayerGroup,
  FaCheckCircle,
  FaExclamationCircle,
  FaSearchPlus,
  FaThLarge,
  FaClone,
  FaFolder,
  FaFolderOpen,
  FaArrowLeft,
  FaFolderPlus,
} from "react-icons/fa";

/* ============ Demo data: culling grid, grouped into folders ============
   Same 8 demo photos as before, just organized into sets by index rather
   than shown as one flat grid. NOTE: these are random stock placeholders,
   so the grouping itself is illustrative, not a real same-angle match —
   that requires real similarity detection down the line. */
const FOLDER_GROUPS = [
  {
    id: "set-1",
    name: "Set 1",
    images: [
      { id: "IMG_0123.CR3", seed: "wedding1" },
      { id: "IMG_0124.CR3", seed: "wedding2" },
      { id: "IMG_0125.CR3", seed: "wedding3" },
    ],
  },
  {
    id: "set-2",
    name: "Set 2",
    images: [
      { id: "IMG_0126.CR3", seed: "wedding4" },
      { id: "IMG_0127.CR3", seed: "wedding5" },
    ],
  },
  {
    id: "set-3",
    name: "Set 3",
    images: [
      { id: "IMG_0128.CR3", seed: "wedding6" },
      { id: "IMG_0129.CR3", seed: "wedding7" },
    ],
  },
  {
    id: "set-4",
    name: "Set 4",
    images: [{ id: "IMG_0130.CR3", seed: "wedding8" }],
  },
].map((folder) => ({
  ...folder,
  images: folder.images.map((img) => ({
    id: img.id,
    fileName: img.id,
    thumbUrl: `https://picsum.photos/seed/${img.seed}/400/400`,
    fullUrl: `https://picsum.photos/seed/${img.seed}/1200/1200`,
    previewable: true,
    sizeLabel: null,
  })),
}));

const FILTERS = [
  { key: "all", label: "All" },
  { key: "star", label: "Starred" },
  { key: "reject", label: "Rejected" },
  { key: "unrated", label: "Unrated" },
];

const ACCEPTED_ATTR = "image/*,.cr3,.nef,.arw,.dng,.raw,.rw2,.orf";

/* ============ Demo data: duplicate review table (unchanged) ============ */
const DUPLICATE_SETS = [
  {
    id: "set-1",
    label: "Ceremony kiss — burst",
    images: [
      { id: "IMG_0410.CR3", seed: "kiss1" },
      { id: "IMG_0411.CR3", seed: "kiss2" },
      { id: "IMG_0412.CR3", seed: "kiss3" },
    ],
  },
  {
    id: "set-2",
    label: "Bouquet toss",
    images: [
      { id: "IMG_0455.CR3", seed: "toss1" },
      { id: "IMG_0456.CR3", seed: "toss2" },
    ],
  },
  {
    id: "set-3",
    label: "Venue exterior",
    images: [{ id: "IMG_0501.CR3", seed: "venue1" }],
  },
  {
    id: "set-4",
    label: "First dance",
    images: [
      { id: "IMG_0602.CR3", seed: "dance1" },
      { id: "IMG_0603.CR3", seed: "dance2" },
    ],
  },
  {
    id: "set-5",
    label: "Ring detail",
    images: [{ id: "IMG_0640.CR3", seed: "ring1" }],
  },
].map((set) => ({
  ...set,
  images: set.images.map((img) => ({
    id: img.id,
    fileName: img.id,
    thumbUrl: `https://picsum.photos/seed/${img.seed}/300/300`,
    fullUrl: `https://picsum.photos/seed/${img.seed}/1200/1200`,
  })),
}));

/* ============ Helpers ============ */
function slugify(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

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

/* ============ Folder card ============ */
function FolderCard({ folder, reviewed, total, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="text-left bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-sky-500/50 rounded-xl p-4 transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:bg-sky-500/20 transition-colors">
          <FaFolder />
        </div>
        <span className="text-xs text-slate-500">
          {total} photo{total !== 1 ? "s" : ""}
        </span>
      </div>
      <h4 className="text-white font-medium text-sm">{folder.name}</h4>
      <p className="text-xs text-slate-500 mt-0.5">
        Culling {reviewed}/{total}
      </p>
    </button>
  );
}

function CullingPage() {
  /* ---- top-level tab: culling grid vs duplicate review ---- */
  const [mode, setMode] = useState("cull"); // 'cull' | 'duplicates'

  /* ============ CULLING GRID STATE (now folder-based) ============ */
  const [folders, setFolders] = useState(FOLDER_GROUPS);
  const [culls, setCulls] = useState({}); // { [imageId]: 'star' | 'reject' }, shared across folders
  const [openFolderId, setOpenFolderId] = useState(null); // null = folder grid view
  const [filter, setFilter] = useState("all");
  const [lightboxId, setLightboxId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderError, setNewFolderError] = useState("");

  const fileInputRef = useRef(null);
  const objectUrlsRef = useRef([]); // track blob: urls so we can revoke them on unmount

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function ensureUnsortedFolder(prevFolders) {
    if (prevFolders.some((f) => f.id === "unsorted")) return prevFolders;
    return [...prevFolders, { id: "unsorted", name: "Unsorted", images: [] }];
  }

  function openNewFolderModal() {
    setNewFolderName("");
    setNewFolderError("");
    setNewFolderModalOpen(true);
  }

  function createFolder(e) {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) {
      setNewFolderError("Give the folder a name first.");
      return;
    }

    let id = slugify(name);
    if (folders.some((f) => f.id === id)) {
      // Name already taken — make the id unique without silently renaming
      // the folder the person typed.
      id = `${id}-${Date.now().toString(36)}`;
    }

    setFolders((prev) => [...prev, { id, name, images: [] }]);
    setOpenFolderId(id);
    setFilter("all");
    setNewFolderModalOpen(false);
  }

  const handleFiles = useCallback(
    (fileList) => {
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

      setFolders((prev) => {
        // Dropping while a folder is open files photos into that folder.
        // Otherwise they land in an auto-created "Unsorted" folder.
        const targetId = openFolderId || "unsorted";
        const withUnsorted = openFolderId ? prev : ensureUnsortedFolder(prev);
        return withUnsorted.map((f) =>
          f.id === targetId ? { ...f, images: [...newImages, ...f.images] } : f
        );
      });

      if (!openFolderId) setOpenFolderId("unsorted");
    },
    [openFolderId]
  );

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

  const openFolder = folders.find((f) => f.id === openFolderId);
  const folderImages = openFolder ? openFolder.images : [];

  const visibleImages = folderImages.filter((img) => {
    if (filter === "all") return true;
    if (filter === "unrated") return !culls[img.id];
    return culls[img.id] === filter;
  });

  const folderTotal = folderImages.length;
  const folderStarred = folderImages.filter((img) => culls[img.id] === "star").length;
  const folderRejected = folderImages.filter((img) => culls[img.id] === "reject").length;
  const folderReviewed = folderStarred + folderRejected;
  const folderUnrated = folderTotal - folderReviewed;

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
    if (!lightboxImage || mode !== "cull") return;

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
  }, [lightboxImage, goToOffset, mode]);

  /* ============ DUPLICATE REVIEW STATE (unchanged) ============ */
  const [duplicateSets] = useState(DUPLICATE_SETS);

  const [bestPicks, setBestPicks] = useState(() => {
    const initial = {};
    DUPLICATE_SETS.forEach((set) => {
      if (set.images.length === 1) initial[set.id] = set.images[0].id;
    });
    return initial;
  });

  const [dupLightbox, setDupLightbox] = useState(null); // { setId, imageId } | null

  function pickBest(setId, imageId) {
    setBestPicks((prev) => ({ ...prev, [setId]: imageId }));
  }

  const resolvedCount = duplicateSets.filter((s) => bestPicks[s.id]).length;

  const dupLightboxSet = dupLightbox
    ? duplicateSets.find((s) => s.id === dupLightbox.setId)
    : null;
  const dupLightboxIndex = dupLightboxSet
    ? dupLightboxSet.images.findIndex((img) => img.id === dupLightbox.imageId)
    : -1;
  const dupLightboxImage =
    dupLightboxSet && dupLightboxIndex >= 0 ? dupLightboxSet.images[dupLightboxIndex] : null;

  function goToDupOffset(offset) {
    if (!dupLightboxSet) return;
    const nextIndex =
      (dupLightboxIndex + offset + dupLightboxSet.images.length) % dupLightboxSet.images.length;
    setDupLightbox({ setId: dupLightboxSet.id, imageId: dupLightboxSet.images[nextIndex].id });
  }

  useEffect(() => {
    if (!dupLightboxImage || mode !== "duplicates") return;

    function handleKeyDown(e) {
      if (e.key === "Escape") setDupLightbox(null);
      else if (e.key === "ArrowRight") goToDupOffset(1);
      else if (e.key === "ArrowLeft") goToDupOffset(-1);
      else if (e.key.toLowerCase() === "s") pickBest(dupLightboxSet.id, dupLightboxImage.id);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dupLightboxImage, mode]);

  /* ============ RENDER ============ */
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-white">Culling Station</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select className="bg-slate-800 text-sm rounded-lg px-3 py-2 text-slate-300 border border-slate-700 focus:outline-none focus:border-sky-500 flex-1 sm:flex-none">
            <option>Smith Wedding (450 RAWs)</option>
            <option>Corp Headshots (120 RAWs)</option>
            <option>Prenup - Jane &amp; John (200 RAWs)</option>
          </select>
          {mode === "cull" && (
            <button className="bg-sky-500 hover:bg-sky-600 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 whitespace-nowrap transition-colors">
              <FaCheck /> Finish
            </button>
          )}
        </div>
      </div>

      {mode === "cull" && (
        <div>
      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-6 border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-sky-500 bg-sky-500/10"
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
          className={`mx-auto text-3xl mb-2 ${
            isDragging ? "text-sky-400" : "text-slate-500"
          }`}
        />
        <p className="text-md text-slate-300 font-medium">
          {isDragging ? "Drop to add these files" : "Drag & drop photos here, or click to browse"}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          JPG, PNG, WEBP get thumbnails right away &middot; RAW formats (CR3, NEF, ARW, DNG) are added but can't be previewed in-browser
        </p>
      </div>

              {/* Progress + stat pills */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 sm:p-6 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1.5 bg-sky-500/10 text-sky-400 px-2.5 py-1 rounded-full font-medium">
                      <FaStar className="text-[10px]" /> {folderStarred} Starred
                    </span>
                    <span className="flex items-center gap-1.5 bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full font-medium">
                      <FaBan className="text-[10px]" /> {folderRejected} Rejected
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-700/50 text-slate-400 px-2.5 py-1 rounded-full font-medium">
                      {folderUnrated} Remaining
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {folderReviewed} / {folderTotal} reviewed
                  </span>
                </div>

                <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden flex">
                  <div
                    className="bg-sky-500 h-full transition-all duration-300"
                    style={{ width: folderTotal ? `${(folderStarred / folderTotal) * 100}%` : "0%" }}
                  />
                  <div
                    className="bg-red-500 h-full transition-all duration-300"
                    style={{ width: folderTotal ? `${(folderRejected / folderTotal) * 100}%` : "0%" }}
                  />
                </div>
              </div>

              {/* Filter chips */}
              <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                {FILTERS.map((f) => {
                  const count =
                    f.key === "all"
                      ? folderTotal
                      : f.key === "unrated"
                      ? folderUnrated
                      : f.key === "star"
                      ? folderStarred
                      : folderRejected;
                  const active = filter === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
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
                <div className="text-center py-16 text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl">
                  {folderTotal === 0 ? "This folder is empty — drop some photos above." : "Nothing here yet."}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {visibleImages.map((img) => {
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
                        className={`relative aspect-square bg-slate-900 rounded-lg overflow-hidden border group transition-all cursor-pointer ${stateClasses}`}
                      >
                        {img.previewable ? (
                          <img
                            src={img.thumbUrl}
                            className="w-full h-full object-cover"
                            alt={img.fileName}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-2 text-center bg-slate-800">
                            <FaFileImage className="text-2xl text-slate-600" />
                            <span className="text-[10px] text-slate-500 truncate w-full">No preview</span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRating(img.id, "reject");
                            }}
                            className="bg-red-500/80 hover:bg-red-500 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                            title="Reject (X)"
                          >
                            <FaTimes className="text-sm" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRating(img.id, "star");
                            }}
                            className="bg-sky-500/80 hover:bg-sky-500 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                            title="Star (S)"
                          >
                            <FaStar className="text-sm" />
                          </button>
                        </div>

                        <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-mono max-w-[85%] truncate">
                          {img.fileName}
                        </span>

                        {state === "star" && (
                          <span className="absolute top-2 right-2 text-sky-400 drop-shadow">
                            <FaStar />
                          </span>
                        )}
                        {state === "reject" && (
                          <span className="absolute top-2 right-2 text-red-400 drop-shadow">
                            <FaBan />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-xs text-slate-600 mt-4 text-center">
                Click a photo to inspect it full-screen &middot; S star &middot; X reject &middot; ← →
                navigate
              </p>
            </div>
      )}

      {/* ============ DUPLICATE REVIEW TAB (unchanged) ============ */}
      {mode === "duplicates" && (
        <div>
          <p className="text-xs text-slate-500 mb-5">
            Each row is a set of similar shots — pick the keeper. Single photos are kept automatically.
          </p>

          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wide">
                  <th className="p-4 font-medium w-48">Set</th>
                  <th className="p-4 font-medium">Photos — click to mark best</th>
                  <th className="p-4 font-medium w-52">Best pick</th>
                  <th className="p-4 font-medium w-40">Status</th>
                </tr>
              </thead>
              <tbody>
                {duplicateSets.map((set) => {
                  const bestId = bestPicks[set.id];
                  const bestImage = set.images.find((img) => img.id === bestId);
                  const isSingle = set.images.length === 1;
                  const resolved = Boolean(bestId);

                  return (
                    <tr key={set.id} className="border-b border-slate-800 last:border-b-0 align-top">
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-white text-sm font-medium">
                          <FaLayerGroup className="text-sky-500 text-xs flex-shrink-0" />
                          {set.label}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {set.images.length} photo{set.images.length !== 1 ? "s" : ""}
                        </p>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {set.images.map((img) => {
                            const isBest = img.id === bestId;
                            return (
                              <div
                                key={img.id}
                                onClick={() => pickBest(set.id, img.id)}
                                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 cursor-pointer group flex-shrink-0 transition-all ${
                                  isBest
                                    ? "border-sky-500 ring-2 ring-sky-500/40"
                                    : "border-slate-700 hover:border-slate-500 opacity-80 hover:opacity-100"
                                }`}
                              >
                                <img
                                  src={img.thumbUrl}
                                  alt={img.fileName}
                                  className="w-full h-full object-cover"
                                />
                                {isBest && (
                                  <span className="absolute top-1 left-1 bg-sky-500 text-slate-900 rounded-full p-1 shadow">
                                    <FaCrown className="text-[9px]" />
                                  </span>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDupLightbox({ setId: set.id, imageId: img.id });
                                  }}
                                  className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                  title="Inspect full-size"
                                >
                                  <FaSearchPlus className="text-white text-xs" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="p-4">
                        {bestImage ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={bestImage.thumbUrl}
                              alt={bestImage.fileName}
                              className="w-10 h-10 rounded-md object-cover border border-sky-500/50 flex-shrink-0"
                            />
                            <span className="text-xs text-slate-300 font-mono truncate">
                              {bestImage.fileName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600 italic">Not chosen yet</span>
                        )}
                      </td>

                      <td className="p-4">
                        {isSingle ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-700/40 px-2.5 py-1 rounded-full">
                            <FaCheckCircle className="text-slate-500" /> Auto-kept
                          </span>
                        ) : resolved ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
                            <FaCheckCircle /> Best selected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                            <FaExclamationCircle /> Needs review
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ NEW FOLDER MODAL ============ */}
      {newFolderModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setNewFolderModalOpen(false)}
        >
          <form
            onSubmit={createFolder}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-1">
              <FaFolderPlus className="text-sky-400" />
              <h3 className="text-white font-semibold">Name this folder</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              You'll drop straight into it once it's created — empty and ready to fill.
            </p>

            <input
              autoFocus
              type="text"
              value={newFolderName}
              onChange={(e) => {
                setNewFolderName(e.target.value);
                if (newFolderError) setNewFolderError("");
              }}
              placeholder="e.g. Reception Speeches"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
            {newFolderError && (
              <p className="text-xs text-red-400 mt-2">{newFolderError}</p>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setNewFolderModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-sky-500 hover:bg-sky-600 text-slate-900 transition-colors"
              >
                Create &amp; Open
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============ LIGHTBOX: culling grid ============ */}
      {mode === "cull" && lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
          onClick={() => setLightboxId(null)}
        >
          <div
            className="flex items-center justify-between px-4 sm:px-6 py-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-sm truncate">{lightboxImage.fileName}</span>
              {lightboxImage.sizeLabel && (
                <span className="text-xs text-slate-500 flex-shrink-0">{lightboxImage.sizeLabel}</span>
              )}
              {culls[lightboxImage.id] === "star" && (
                <span className="flex items-center gap-1 text-sky-400 text-xs bg-sky-500/10 px-2 py-1 rounded-full flex-shrink-0">
                  <FaStar /> Starred
                </span>
              )}
              {culls[lightboxImage.id] === "reject" && (
                <span className="flex items-center gap-1 text-red-400 text-xs bg-red-500/10 px-2 py-1 rounded-full flex-shrink-0">
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
                className="text-slate-400 hover:text-white transition-colors"
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
              className="absolute left-2 sm:left-6 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            >
              <FaChevronLeft />
            </button>

            {lightboxImage.previewable ? (
              <img
                src={lightboxImage.fullUrl}
                alt={lightboxImage.fileName}
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-400 px-8 text-center">
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
              className="absolute right-2 sm:right-6 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                culls[lightboxImage.id] === "reject"
                  ? "bg-red-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <FaTimes /> Reject
            </button>
            <button
              onClick={() => clearRating(lightboxImage.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors"
            >
              <FaRegStar /> Clear
            </button>
            <button
              onClick={() => setRating(lightboxImage.id, "star")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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

      {/* ============ LIGHTBOX: duplicate review (unchanged) ============ */}
      {mode === "duplicates" && dupLightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
          onClick={() => setDupLightbox(null)}
        >
          <div
            className="flex items-center justify-between px-4 sm:px-6 py-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-sm truncate">{dupLightboxImage.fileName}</span>
              {bestPicks[dupLightboxSet.id] === dupLightboxImage.id && (
                <span className="flex items-center gap-1 text-sky-400 text-xs bg-sky-500/10 px-2 py-1 rounded-full flex-shrink-0">
                  <FaCrown /> Best pick
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-xs text-slate-400">
                {dupLightboxIndex + 1} / {dupLightboxSet.images.length}
              </span>
              <button
                onClick={() => setDupLightbox(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 flex items-center justify-center relative px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {dupLightboxSet.images.length > 1 && (
              <button
                onClick={() => goToDupOffset(-1)}
                className="absolute left-2 sm:left-6 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              >
                <FaChevronLeft />
              </button>
            )}

            <img
              src={dupLightboxImage.fullUrl}
              alt={dupLightboxImage.fileName}
              className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl"
            />

            {dupLightboxSet.images.length > 1 && (
              <button
                onClick={() => goToDupOffset(1)}
                className="absolute right-2 sm:right-6 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              >
                <FaChevronRight />
              </button>
            )}
          </div>

          <div
            className="flex items-center justify-center py-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => pickBest(dupLightboxSet.id, dupLightboxImage.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                bestPicks[dupLightboxSet.id] === dupLightboxImage.id
                  ? "bg-sky-500 text-slate-900"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600"
              }`}
            >
              <FaCrown />
              {bestPicks[dupLightboxSet.id] === dupLightboxImage.id
                ? "This is the best pick"
                : "Mark as best (S)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CullingPage;