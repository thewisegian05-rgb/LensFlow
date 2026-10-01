import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
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
  FaArrowLeft,
  FaFolderPlus,
  FaSignOutAlt,
  FaTrash,
} from "react-icons/fa";
import { supabase } from "../lib/supabaseClient";
import ConfirmModal from "../components/Common/ConfirmModal";

//Test Culling
const handleRunCulling = async () => {
  try {
    const response = await fetch("http://127.0.0.1:8000/cull", {
      method: "POST",
    });

    const data = await response.json();

    console.log("Backend response:", data);
  } catch (error) {
    console.error("Failed to reach backend:", error);
  }
};

const FILTERS = [
  { key: "all", label: "All", group: "photographer" },
  { key: "star", label: "Starred", group: "photographer" },
  { key: "reject", label: "Rejected", group: "photographer" },
  { key: "unrated", label: "Unrated", group: "photographer" },
  { key: "ai_keep", label: "Keep", group: "ai" },
  { key: "ai_review", label: "Review", group: "ai" },
  { key: "ai_reject", label: "Reject", group: "ai" },
];

const ACCEPTED_ATTR = "image/*,.cr3,.nef,.arw,.dng,.raw,.rw2,.orf";

const PHOTOS_BUCKET = "photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

/* ============ Helpers ============ */
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

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }
  return `${Math.round(Number(value) * 100)}%`;
}

function formatMetric(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }
  return Number(value).toFixed(digits);
}

const PREVIEW_TRANSFORM = {
  width: 500,
  height: 500,
  resize: "contain",
  quality: 50,
};

async function getSignedUrl(path, transform = null) {
  if (!path) return null;

  const options = transform ? { transform } : undefined;

  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, options);

  if (error) {
    console.error("Signed URL error:", error);
    return null;
  }

  return data?.signedUrl || null;
}

async function getPreviewUrl(path) {
  if (!path) return null;

  // Preferred path: Supabase serves an optimized/resized preview.
  const transformed = await getSignedUrl(path, PREVIEW_TRANSFORM);
  if (transformed) return transformed;

  // Fallback: keep the gallery functional if Image Transformations
  // are disabled/unavailable in the Supabase project.
  console.warn("Preview transformation unavailable; falling back to original image.");
  return getSignedUrl(path);
}

// Walk the flat folder list and collect this folder's id plus every
// descendant's id, so a delete can clean up the whole subtree.
function collectDescendantIds(folders, rootId) {
  const ids = [rootId];
  let frontier = [rootId];

  while (frontier.length > 0) {
    const children = folders
      .filter((f) => frontier.includes(f.parentId))
      .map((f) => f.id);

    ids.push(...children);
    frontier = children;
  }

  return ids;
}

/* ============ Folder card ============ */
function FolderCard({ folder, reviewed, total, onOpen, onContextMenu }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      onContextMenu={onContextMenu}
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

const PhotoTile = memo(function PhotoTile({
  img,
  state,
  aiResult,
  selected,
  onSelect,
  onRate,
}) {
  const stateClasses =
    selected
      ? "ring-2 ring-sky-500 border-sky-500"
      : state === "star"
      ? "ring-2 ring-sky-500 border-transparent"
      : state === "reject" || aiResult?.ai_decision === "REJECT"
      ? "ring-2 ring-rose-500 border-transparent opacity-55"
      : aiResult?.ai_decision === "KEEP"
      ? "border-emerald-500/70"
      : aiResult?.ai_decision === "REVIEW"
      ? "border-amber-500/70"
      : "border-slate-300 hover:border-sky-400 dark:border-slate-700";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(img.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(img.id);
        }
      }}
      className={`group relative aspect-square overflow-hidden rounded-xl border bg-slate-900 text-left transition-[border-color,box-shadow] duration-200 hover:shadow-lg hover:shadow-black/20 focus:outline-none focus:ring-2 focus:ring-sky-500 ${stateClasses}`}
    >
      {img.previewable && img.thumbUrl ? (
        <img
          src={img.thumbUrl}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className="h-full w-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.035]"
          alt={img.fileName}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-800 px-2 text-center">
          <FaFileImage className="text-2xl text-slate-600" />
          <span className="w-full truncate text-[10px] text-slate-500">No preview</span>
        </div>
      )}

      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
        <span className="max-w-[75%] truncate rounded-md bg-black/75 px-2 py-1 font-mono text-[9px] text-white">
          {img.fileName}
        </span>
        {state === "star" && (
          <span className="rounded-full bg-black/60 p-1 text-sky-400">
            <FaStar className="text-[10px]" />
          </span>
        )}
        {(state === "reject" || aiResult?.ai_decision === "REJECT") && state !== "star" && (
          <span className="rounded-full bg-black/60 p-1 text-rose-400">
            <FaBan className="text-[10px]" />
          </span>
        )}
      </div>

      <div className="absolute inset-x-2 bottom-2 z-10 flex translate-y-2 items-center justify-center gap-2 opacity-0 transition-[border-color,opacity,box-shadow] duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRate(img.id, "star");
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition ${
            state === "star"
              ? "border-sky-400 bg-sky-500 text-slate-950"
              : "border-white/20 bg-black/65 text-white hover:bg-sky-500 hover:text-slate-950"
          }`}
          aria-label="Star or keep photo"
          title="Star / Keep"
        >
          <FaStar className="text-[11px]" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRate(img.id, "reject");
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition ${
            state === "reject"
              ? "border-rose-400 bg-rose-500 text-white"
              : "border-white/20 bg-black/65 text-white hover:bg-rose-500"
          }`}
          aria-label="Reject photo"
          title="Reject"
        >
          <FaBan className="text-[11px]" />
        </button>
      </div>

      {aiResult && (
        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 transition-opacity duration-200 group-hover:opacity-0 group-focus-visible:opacity-0">
          <span
            className={`rounded-full px-2 py-1 text-[9px] font-bold shadow ${
              aiResult.ai_decision === "KEEP"
                ? "bg-emerald-500 text-white"
                : aiResult.ai_decision === "REJECT"
                ? "bg-rose-500 text-white"
                : "bg-amber-500 text-slate-950"
            }`}
          >
            {aiResult.ai_decision}
          </span>
          {aiResult.base_quality_score != null && (
            <span className="rounded-full bg-black/70 px-2 py-1 text-[9px] font-semibold text-white">
              {formatPercent(aiResult.base_quality_score)}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

function VirtualizedPhotoGrid({
  images,
  culls,
  aiResults,
  lightboxId,
  lightboxOpen,
  onSelect,
  onRate,
}) {
  const gridRef = useRef(null);
  const [range, setRange] = useState({ startRow: 0, endRow: 8, columns: 5, width: 0 });

  useEffect(() => {
    let frameId = null;
    const scrollElement = gridRef.current?.closest("main") || window;

    const updateRange = () => {
      frameId = null;
      const grid = gridRef.current;
      if (!grid) return;

      const width = grid.getBoundingClientRect().width;
      const isWindowScroller = scrollElement === window;
      const scrollTop = isWindowScroller ? window.scrollY : scrollElement.scrollTop;
      const viewportHeight = isWindowScroller
        ? window.innerHeight
        : scrollElement.clientHeight;
      const columns = lightboxOpen
        ? window.innerWidth >= 768 ? 3 : 2
        : window.innerWidth >= 1280 ? 5
        : window.innerWidth >= 1024 ? 4
        : window.innerWidth >= 768 ? 3
        : 2;
      const rowHeight = (width - (columns - 1) * 12) / columns + 12;
      const gridTop = isWindowScroller
        ? grid.getBoundingClientRect().top + window.scrollY
        : grid.getBoundingClientRect().top - scrollElement.getBoundingClientRect().top + scrollTop;
      const totalRows = Math.ceil(images.length / columns);
      const overscan = 2;
      const startRow = Math.max(
        0,
        Math.floor((scrollTop - gridTop) / rowHeight) - overscan
      );
      const endRow = Math.min(
        totalRows,
        Math.ceil((scrollTop + viewportHeight - gridTop) / rowHeight) + overscan
      );

      setRange((current) => {
        if (
          current.startRow === startRow &&
          current.endRow === endRow &&
          current.columns === columns &&
          current.width === width
        ) {
          return current;
        }
        return { startRow, endRow, columns, width };
      });
    };

    const scheduleUpdate = () => {
      if (frameId === null) frameId = window.requestAnimationFrame(updateRange);
    };

    scheduleUpdate();
    scrollElement.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    const observer = new ResizeObserver(scheduleUpdate);
    if (gridRef.current) observer.observe(gridRef.current);

    return () => {
      scrollElement.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      observer.disconnect();
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [images.length, lightboxOpen]);

  const totalRows = Math.ceil(images.length / range.columns);
  const firstIndex = Math.min(range.startRow * range.columns, images.length);
  const lastIndex = Math.min(range.endRow * range.columns, images.length);
  const rowHeight = (range.width - (range.columns - 1) * 12) / range.columns + 12;
  const topSpace = Math.max(0, range.startRow * rowHeight - 12);
  const bottomSpace = Math.max(0, (totalRows - range.endRow) * rowHeight - 12);

  return (
    <div
      ref={gridRef}
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${range.columns}, minmax(0, 1fr))` }}
    >
      {topSpace > 0 && <div aria-hidden="true" style={{ height: topSpace, gridColumn: "1 / -1" }} />}
      {images.slice(firstIndex, lastIndex).map((img) => {
        const state = culls[img.id];
        const aiResult = aiResults[img.id];
        const selected = lightboxId === img.id;

        return (
          <PhotoTile
            key={img.id}
            img={img}
            state={state}
            aiResult={aiResult}
            selected={selected}
            onSelect={onSelect}
            onRate={onRate}
          />
        );
      })}
      {bottomSpace > 0 && <div aria-hidden="true" style={{ height: bottomSpace, gridColumn: "1 / -1" }} />}
    </div>
  );
}

/* ============ Minimal auth gate ============ */
function AuthGate() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (mode === "signup") {
      setInfo("Check your email to confirm your account, then sign in.");
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-20 bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
      <h2 className="text-white font-semibold text-lg mb-1">
        {mode === "signin" ? "Sign in" : "Create an account"}
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Your folders and photos are private to your account.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {info && <p className="text-xs text-sky-400">{info}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-slate-900 font-semibold py-2 rounded-lg text-sm transition-colors"
        >
          {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError("");
          setInfo("");
        }}
        className="text-xs text-slate-400 hover:text-white mt-3 w-full text-center"
      >
        {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}

function CullingPage() {
  /* ============ AUTH ============ */
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const [mode, setMode] = useState("cull"); // 'cull' | 'duplicates'

  /* ============ CULLING GRID STATE (Supabase-backed, nested folders) ============ */
  // Folders are stored flat with a parentId; `path` is the stack of
  // folder ids you've navigated into (mirrors Media Storage's model).
  const [folders, setFolders] = useState([]); // [{ id, name, parentId }]
  const [photos, setPhotos] = useState([]); // [{ id, folderId, fileName, ... }]
  const [culls, setCulls] = useState({});

  // Latest LensFlow AI result per photo.
  // This stays separate from `culls`, which represents the photographer's manual rating.
  const [aiResults, setAiResults] = useState({});
  const [cullingLoading, setCullingLoading] = useState(false);
  const [cullingError, setCullingError] = useState("");

  const [path, setPath] = useState([]);
  const [filter, setFilter] = useState("all");
  const [lightboxId, setLightboxId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [originalLoadingId, setOriginalLoadingId] = useState(null);

  // UI-only switches for the redesigned Analysis Settings card.
  // These do not change the backend pipeline yet.
  const [analysisOptions, setAnalysisOptions] = useState({
    technical: true,
    subject: true,
    aesthetic: true,
    similarity: true,
  });

  const toggleAnalysisOption = (key) => {
    setAnalysisOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const [isDragging, setIsDragging] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderError, setNewFolderError] = useState("");
  const [folderContextMenu, setFolderContextMenu] = useState(null);
  const [folderToDelete, setFolderToDelete] = useState(null);

  const fileInputRef = useRef(null);

  const currentFolderId = path.length ? path[path.length - 1] : null;

  
  // Run the FastAPI culling pipeline for the currently opened folder.
  const handleRunCulling = async () => {
    try {
      if (!currentFolderId) {
        setCullingError("Open a folder first before running LensFlow.");
        return;
      }

      setCullingLoading(true);
      setCullingError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setCullingError("No active Supabase session.");
        return;
      }

      const response = await fetch("http://127.0.0.1:8000/cull", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "X-Refresh-Token": session.refresh_token,
        },
        body: JSON.stringify({
          folder_id: currentFolderId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || "LensFlow culling failed.");
      }

      const resultMap = {};

      (data.results || []).forEach((result) => {
        resultMap[result.photo_id] = {
          photo_id: result.photo_id,
          similarity_group: result.similarity_group,
          group_rank: result.group_rank,
          base_quality_score: result.base_quality_score,
          ai_decision: result.lensflow_decision,
          decision_reason: result.decision_reason,
          metrics: {
            sharpness: result.sharpness,
            brightness: result.brightness,
            dark_pixels_percent: result.dark_pixels_percent,
            bright_pixels_percent: result.bright_pixels_percent,
            contrast: result.contrast,
            face_count: result.face_count,
            average_face_sharpness: result.average_face_sharpness,
            minimum_face_sharpness: result.minimum_face_sharpness,
            maximum_blink_score: result.maximum_blink_score,
            blink_asymmetry: result.blink_asymmetry,
            aesthetic_score: result.aesthetic_score,
            technical_score: result.technical_score,
            face_quality_score: result.face_quality_score,
            eye_quality_score: result.eye_quality_score,
            aesthetic_quality_score: result.aesthetic_quality_score,
            defects: result.defects || [],
          },
        };
      });

      // Merge instead of replacing so results from other folders remain visible.
      setAiResults((prev) => ({
        ...prev,
        ...resultMap,
      }));

      console.log("LensFlow results:", data.results);
    } catch (error) {
      console.error("Failed to run LensFlow:", error);
      setCullingError(error.message || "Failed to run LensFlow.");
    } finally {
      setCullingLoading(false);
    }
  };

  /* ---- load folders + photos for the signed-in user ---- */
  const loadData = useCallback(async (userId) => {
    setDataLoading(true);

    const { data: folderRows, error: folderErr } = await supabase
      .from("folders")
      .select("id, name, parent_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (folderErr) {
      console.error(folderErr);
      setDataLoading(false);
      return;
    }

    const { data: photoRows, error: photoErr } = await supabase
      .from("photos")
      .select("id, folder_id, file_name, storage_path, previewable, size_bytes, rating")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (photoErr) {
      console.error(photoErr);
      setDataLoading(false);
      return;
    }

    // Load any previously saved LensFlow AI results for these photos.
    let cullingRows = [];

    if (photoRows.length > 0) {
      const photoIds = photoRows.map((photo) => photo.id);

      const { data: savedResults, error: cullingErr } = await supabase
        .from("culling_results")
        .select(
          "photo_id, similarity_group, group_rank, base_quality_score, ai_decision, decision_reason, metrics, analyzed_at"
        )
        .in("photo_id", photoIds);

      if (cullingErr) {
        console.error("Culling result load failed:", cullingErr);
      } else {
        cullingRows = savedResults || [];
      }
    }

    const previewableRows = photoRows.filter((p) => p.previewable);

    // Only sign optimized preview URLs during initial page load.
    // Full-resolution URLs are intentionally NOT created here.
    const previewResults = await Promise.all(
      previewableRows.map(async (p) => ({
        id: p.id,
        url: await getPreviewUrl(p.storage_path),
      }))
    );

    const previewUrlMap = Object.fromEntries(
      previewResults.map((item) => [item.id, item.url])
    );

    const photoState = photoRows.map((p) => ({
      id: p.id,
      folderId: p.folder_id,
      fileName: p.file_name,
      storagePath: p.storage_path,
      thumbUrl: previewUrlMap[p.id] || null,
      fullUrl: null,
      previewable: p.previewable,
      sizeLabel: p.size_bytes ? formatBytes(p.size_bytes) : null,
    }));

    const folderState = folderRows.map((f) => ({
      id: f.id,
      name: f.name,
      parentId: f.parent_id,
    }));

    const ratingsMap = {};
    photoRows.forEach((p) => {
      if (p.rating) ratingsMap[p.id] = p.rating;
    });

    const aiResultMap = {};
    cullingRows.forEach((result) => {
      aiResultMap[result.photo_id] = result;
    });

    setFolders(folderState);
    setPhotos(photoState);
    setCulls(ratingsMap);
    setAiResults(aiResultMap);
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      loadData(user.id);
    } else {
      setFolders([]);
      setPhotos([]);
      setCulls({});
      setAiResults({});
      setPath([]);
    }
  }, [user, loadData]);

  // Root-level "Unsorted" — used when dropping files with no folder open.
  async function findOrCreateUnsortedFolder() {
    const existing = folders.find((f) => f.name === "Unsorted" && f.parentId === null);
    if (existing) return existing.id;

    const { data, error } = await supabase
      .from("folders")
      .insert({ name: "Unsorted", user_id: user.id, parent_id: null })
      .select()
      .single();

    if (error) {
      console.error(error);
      return null;
    }

    setFolders((prev) => [...prev, { id: data.id, name: data.name, parentId: null }]);
    return data.id;
  }

  function openNewFolderModal() {
    setNewFolderName("");
    setNewFolderError("");
    setNewFolderModalOpen(true);
  }

  useEffect(() => {
    function closeFolderMenu() {
      setFolderContextMenu(null);
    }

    window.addEventListener("click", closeFolderMenu);
    window.addEventListener("contextmenu", closeFolderMenu);

    return () => {
      window.removeEventListener("click", closeFolderMenu);
      window.removeEventListener("contextmenu", closeFolderMenu);
    };
  }, []);

  function handleFolderContextMenu(e, folderId) {
    e.preventDefault();
    e.stopPropagation();
    setFolderContextMenu({ folderId, x: e.clientX, y: e.clientY });
  }

  // Recursively deletes a folder: every subfolder, every photo inside
  // any of them (storage files + DB rows), then the folder rows
  // themselves (subfolder rows cascade automatically via parent_id).
  async function deleteFolder(folderId) {
    if (!user) return;

    const idsToDelete = collectDescendantIds(folders, folderId);

    const { data: photoRows, error: photoListErr } = await supabase
      .from("photos")
      .select("id, storage_path")
      .in("folder_id", idsToDelete)
      .eq("user_id", user.id);

    if (photoListErr) {
      console.error("Folder photo lookup failed:", photoListErr);
      return;
    }

    const storagePaths = photoRows.map((photo) => photo.storage_path).filter(Boolean);
    if (storagePaths.length > 0) {
      const { error: storageErr } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .remove(storagePaths);

      if (storageErr) {
        console.error("Folder storage cleanup failed:", storageErr);
      }
    }

    const { error: photoDeleteErr } = await supabase
      .from("photos")
      .delete()
      .in("folder_id", idsToDelete)
      .eq("user_id", user.id);

    if (photoDeleteErr) {
      console.error("Folder photo delete failed:", photoDeleteErr);
      return;
    }

    const { error: folderDeleteErr } = await supabase
      .from("folders")
      .delete()
      .eq("id", folderId)
      .eq("user_id", user.id);

    if (folderDeleteErr) {
      console.error("Folder delete failed:", folderDeleteErr);
      return;
    }

    setFolders((prev) => prev.filter((f) => !idsToDelete.includes(f.id)));
    setPhotos((prev) => prev.filter((p) => !idsToDelete.includes(p.folderId)));
    setFolderContextMenu(null);
    setFolderToDelete(null);

    // If you were inside the deleted subtree, back out to the nearest
    // surviving ancestor (or the root grid).
    if (path.some((id) => idsToDelete.includes(id))) {
      const keepIndex = path.findIndex((id) => idsToDelete.includes(id));
      setPath(path.slice(0, keepIndex));
    }
  }

  async function createFolder(e) {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) {
      setNewFolderError("Give the folder a name first.");
      return;
    }

    const { data, error } = await supabase
      .from("folders")
      .insert({ name, user_id: user.id, parent_id: currentFolderId })
      .select()
      .single();

    if (error) {
      setNewFolderError(error.message);
      return;
    }

    setFolders((prev) => [...prev, { id: data.id, name: data.name, parentId: currentFolderId }]);
    setPath((prev) => [...prev, data.id]);
    setFilter("all");
    setNewFolderModalOpen(false);
  }

  const handleFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []);
      if (files.length === 0 || !user) return;

      let targetFolderId = currentFolderId;
      if (!targetFolderId) {
        targetFolderId = await findOrCreateUnsortedFolder();
        if (!targetFolderId) return;
        setPath([targetFolderId]);
      }

      // Upload a few files concurrently instead of waiting for every file
      // to finish before starting the next one.
      const CONCURRENCY = 3;
      let nextIndex = 0;

      const uploadOne = async (file) => {
        const isPreviewable = file.type.startsWith("image/");
        const uniqueId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const path = `${user.id}/${targetFolderId}/${uniqueId}-${file.name}`;

        const { error: uploadErr } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .upload(path, file);

        if (uploadErr) {
          console.error("Upload failed:", uploadErr);
          return;
        }

        const { data: row, error: insertErr } = await supabase
          .from("photos")
          .insert({
            folder_id: targetFolderId,
            user_id: user.id,
            file_name: file.name,
            storage_path: path,
            size_bytes: file.size,
            previewable: isPreviewable,
          })
          .select()
          .single();

        if (insertErr) {
          console.error("Insert failed:", insertErr);
          return;
        }

        // The gallery gets a transformed preview. The original is left in
        // Storage and is fetched only when the photographer asks to inspect it.
        const thumbUrl = isPreviewable
          ? await getPreviewUrl(path)
          : null;

        const newImage = {
          id: row.id,
          folderId: targetFolderId,
          fileName: file.name,
          storagePath: path,
          thumbUrl,
          fullUrl: null,
          previewable: isPreviewable,
          sizeLabel: formatBytes(file.size),
        };

        setPhotos((prev) => [newImage, ...prev]);
      };

      const worker = async () => {
        while (true) {
          const index = nextIndex++;
          if (index >= files.length) return;
          await uploadOne(files[index]);
        }
      };

      await Promise.all(
        Array.from(
          { length: Math.min(CONCURRENCY, files.length) },
          () => worker()
        )
      );
    },
    [currentFolderId, user]
  );

  const loadOriginalUrl = useCallback(async (image) => {
    if (!image?.storagePath) return null;

    if (image.fullUrl) return image.fullUrl;

    setOriginalLoadingId(image.id);

    try {
      const url = await getSignedUrl(image.storagePath);

      if (url) {
        setPhotos((prev) =>
          prev.map((photo) =>
            photo.id === image.id
              ? { ...photo, fullUrl: url }
              : photo
          )
        );
      }

      return url;
    } finally {
      setOriginalLoadingId(null);
    }
  }, []);

  const openFullPreview = useCallback(
    async (image) => {
      if (!image?.previewable) return;

      const url = await loadOriginalUrl(image);

      if (url) {
        setPreviewOpen(true);
      }
    },
    [loadOriginalUrl]
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

  async function setRating(id, action) {
    const nextRating = culls[id] === action ? null : action;

    setCulls((prev) => {
      const next = { ...prev };
      if (nextRating) next[id] = nextRating;
      else delete next[id];
      return next;
    });

    const { error } = await supabase.from("photos").update({ rating: nextRating }).eq("id", id);
    if (error) console.error("Rating update failed:", error);
  }

  async function clearRating(id) {
    setCulls((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    const { error } = await supabase.from("photos").update({ rating: null }).eq("id", id);
    if (error) console.error("Rating clear failed:", error);
  }

  /* ---- current level: subfolders + photos in the open folder ---- */
  const currentSubfolders = useMemo(
    () => folders.filter((f) => f.parentId === currentFolderId),
    [folders, currentFolderId]
  );

  const rootFolders = useMemo(
    () => folders.filter((f) => f.parentId === null),
    [folders]
  );

  const folderImages = useMemo(
    () => photos.filter((p) => p.folderId === currentFolderId),
    [photos, currentFolderId]
  );

  const openFolder = folders.find((f) => f.id === currentFolderId) || null;

  const visibleImages = folderImages.filter((img) => {
    const aiDecision = aiResults[img.id]?.ai_decision;

    if (filter === "all") return true;
    if (filter === "star") return culls[img.id] === "star";
    if (filter === "reject") return culls[img.id] === "reject";
    if (filter === "unrated") return !culls[img.id];
    if (filter === "ai_keep") return aiDecision === "KEEP";
    if (filter === "ai_review") return aiDecision === "REVIEW";
    if (filter === "ai_reject") return aiDecision === "REJECT";

    return true;
  });

  const folderTotal = folderImages.length;
  const folderStarred = folderImages.filter((img) => culls[img.id] === "star").length;
  const folderRejected = folderImages.filter((img) => culls[img.id] === "reject").length;
  const folderReviewed = folderStarred + folderRejected;
  const folderUnrated = folderTotal - folderReviewed;

  const folderAiKeep = folderImages.filter(
    (img) => aiResults[img.id]?.ai_decision === "KEEP"
  ).length;
  const folderAiReview = folderImages.filter(
    (img) => aiResults[img.id]?.ai_decision === "REVIEW"
  ).length;
  const folderAiReject = folderImages.filter(
    (img) => aiResults[img.id]?.ai_decision === "REJECT"
  ).length;
  const folderAiAnalyzed = folderAiKeep + folderAiReview + folderAiReject;
  const folderAiRemaining = Math.max(folderTotal - folderAiAnalyzed, 0);

  const lightboxIndex = visibleImages.findIndex((img) => img.id === lightboxId);
  const lightboxImage = lightboxIndex >= 0 ? visibleImages[lightboxIndex] : null;
  const lightboxAiResult = lightboxImage ? aiResults[lightboxImage.id] : null;

  useEffect(() => {
    if (!previewOpen || !lightboxImage?.previewable || lightboxImage.fullUrl) return;

    loadOriginalUrl(lightboxImage);
  }, [previewOpen, lightboxImage, loadOriginalUrl]);

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
      if (e.key === "Escape") {
        if (previewOpen) setPreviewOpen(false);
        else setLightboxId(null);
      }
      else if (e.key === "ArrowRight") goToOffset(1);
      else if (e.key === "ArrowLeft") goToOffset(-1);
      else if (e.key.toLowerCase() === "s") setRating(lightboxImage.id, "star");
      else if (e.key.toLowerCase() === "x") setRating(lightboxImage.id, "reject");
      else if (e.key.toLowerCase() === "u" || e.key === "Backspace")
        clearRating(lightboxImage.id);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxImage, goToOffset, mode, culls, previewOpen]);

  /* ---- breadcrumb ---- */
  const breadcrumb = useMemo(() => {
    const items = [{ id: null, name: "Folders" }];
    let lookup = folders;

    path.forEach((id) => {
      const found = lookup.find((f) => f.id === id);
      if (found) items.push({ id: found.id, name: found.name });
    });

    return items;
  }, [path, folders]);

  /* ============ DUPLICATE / SIMILAR PHOTO REVIEW ============ */

  // Build the Duplicates tab directly from LensFlow's saved DINOv2 groups.
  // Only photos in the currently opened folder are included.
  const duplicateSets = useMemo(() => {
    const groups = {};

    folderImages.forEach((image) => {
      const result = aiResults[image.id];
      const groupId = result?.similarity_group;

      if (!groupId) return;

      if (!groups[groupId]) {
        groups[groupId] = [];
      }

      groups[groupId].push({
        ...image,
        aiResult: result,
      });
    });

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupId, images]) => ({
        id: groupId,
        label: `Similar group ${groupId}`,
        images: images.sort(
          (a, b) =>
            (a.aiResult?.group_rank ?? Number.MAX_SAFE_INTEGER) -
            (b.aiResult?.group_rank ?? Number.MAX_SAFE_INTEGER)
        ),
      }));
  }, [folderImages, aiResults]);

  const [bestPicks, setBestPicks] = useState({});
  const [dupLightbox, setDupLightbox] = useState(null);

  function pickBest(setId, imageId) {
    setBestPicks((prev) => ({ ...prev, [setId]: imageId }));
  }

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
  if (authLoading) {
    return <p className="text-sm text-slate-500 text-center mt-20">Loading...</p>;
  }

  if (!user) {
    return <AuthGate />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-white">Culling Station</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {mode === "cull" && (
            <button className="bg-sky-500 hover:bg-sky-600 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 whitespace-nowrap transition-colors">
              <FaCheck /> Finish
            </button>
          )}
          <button
            onClick={() => supabase.auth.signOut()}
            title="Sign out"
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
          >
            <FaSignOutAlt />
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="mb-6 flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setMode("cull")}
          className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors
            ${
              mode === "cull"
                ? "border-sky-500 text-slate-900 dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
            }
            bg-transparent shadow-none outline-none
          `}
        >
          <FaThLarge className="text-xs" />
          Culling
        </button>

        <button
          type="button"
          onClick={() => setMode("duplicates")}
          className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors
            ${
              mode === "duplicates"
                ? "border-sky-500 text-slate-900 dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
            }
            bg-transparent shadow-none outline-none
          `}
        >
          <FaClone className="text-xs" />
          Duplicates
        </button>
      </div>

      {/* ============ CULL MODE ============ */}
      {mode === "cull" && (
        <div>
          {dataLoading ? (
            <p className="text-sm text-slate-500 text-center py-16">Loading your photos...</p>
          ) : (
            <div>
              {/* Breadcrumb + back */}
              {path.length > 0 && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <button
                      onClick={() => {
                        setPath(path.slice(0, -1));
                        setLightboxId(null);
                      }}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors mr-2"
                    >
                      <FaArrowLeft className="text-xs" /> Back
                    </button>

                    {breadcrumb.map((crumb, index) => {
                      const isLast = index === breadcrumb.length - 1;
                      return (
                        <span key={`${crumb.id}-${index}`} className="flex items-center gap-2">
                          {index > 0 && <span className="text-slate-600">/</span>}
                          <button
                            onClick={() => {
                              setPath(path.slice(0, index));
                              setPreviewOpen(false);
                              setLightboxId(null);
                            }}
                            disabled={isLast}
                            className={
                              isLast
                                ? "text-white font-medium cursor-default"
                                : "text-slate-400 hover:text-white transition-colors"
                            }
                          >
                            {crumb.name}
                          </button>
                        </span>
                      );
                    })}
                  </div>

                  <button
                    onClick={openNewFolderModal}
                    className="flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    <FaFolderPlus className="text-xs" /> New subfolder
                  </button>
                </div>
              )}

              {/* Subfolders (root or nested) */}
              {(path.length === 0 ? rootFolders : currentSubfolders).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                  {(path.length === 0 ? rootFolders : currentSubfolders).map((folder) => {
                    const folderPhotos = photos.filter((p) => p.folderId === folder.id);
                    const total = folderPhotos.length;
                    const reviewed = folderPhotos.filter((img) => culls[img.id]).length;
                    return (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        reviewed={reviewed}
                        total={total}
                        onOpen={() => {
                          setPath([...path, folder.id]);
                          setFilter("all");
                          setPreviewOpen(false);
                          setLightboxId(null);
                        }}
                        onContextMenu={(e) => handleFolderContextMenu(e, folder.id)}
                      />
                    );
                  })}

                  {path.length === 0 && (
                    <button
                      onClick={openNewFolderModal}
                      className="text-left bg-slate-50/80 hover:bg-slate-100 border border-dashed border-slate-300 hover:border-sky-400 hover:shadow-lg hover:shadow-sky-500/10 rounded-xl p-4 transition-all duration-200 ease-out flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 dark:bg-slate-800/30 dark:hover:bg-slate-800/70 dark:border-slate-700 dark:text-slate-500 dark:hover:text-sky-300"
                    >
                      <FaFolderPlus className="text-xl" />
                      <span className="text-xs font-medium">New folder</span>
                    </button>
                  )}
                </div>
              )}

              {path.length === 0 && rootFolders.length === 0 && (
                <button
                  onClick={openNewFolderModal}
                  className="w-full text-left bg-slate-50/80 hover:bg-slate-100 border border-dashed border-slate-300 hover:border-sky-400 rounded-xl p-6 transition-all flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-sky-600 dark:bg-slate-800/30 dark:hover:bg-slate-800/70 dark:border-slate-700 dark:text-slate-500 dark:hover:text-sky-300 mb-6"
                >
                  <FaFolderPlus className="text-2xl" />
                  <span className="text-sm font-medium">Create your first folder</span>
                </button>
              )}

              {/* Photos in the currently open folder */}
              {path.length > 0 && (
                <div className="space-y-5">
                  {/* Main culling workspace. The right details panel only exists after a photo is selected. */}
                  <div
                    className={`grid gap-5 items-start transition-all duration-300 ${
                      lightboxImage
                        ? "xl:grid-cols-[minmax(0,1fr)_360px]"
                        : "grid-cols-1"
                    }`}
                  >
                    <div className="min-w-0 space-y-5">
                      {/* Top controls: upload, analysis settings, culling summary */}
                      <div
                        className={`grid gap-3 transition-all duration-300 ${
                          lightboxImage
                            ? "md:grid-cols-3"
                            : "md:grid-cols-2 xl:grid-cols-[1.15fr_1fr_0.9fr]"
                        }`}
                      >
                        {/* Upload */}
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`group cursor-pointer rounded-2xl border border-dashed transition-all ${
                            lightboxImage ? "p-4" : "p-5"
                          } ${
                            isDragging
                              ? "border-sky-400 bg-sky-500/10"
                              : "border-slate-300 bg-white hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-sky-500/70"
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

                          <div className={`flex ${lightboxImage ? "items-center gap-3" : "flex-col items-center text-center"}`}>
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                              <FaCloudUploadAlt className="text-xl" />
                            </div>
                            <div className={lightboxImage ? "min-w-0" : "mt-3"}>
                              <p className="text-sm font-semibold text-slate-800 dark:text-white">
                                {isDragging ? "Drop photos here" : "Drag & drop photos here, or click to browse"}
                              </p>
                              <p className={`text-slate-500 ${lightboxImage ? "text-[10px] truncate" : "mt-1 text-sm"}`}>
                                JPG, PNG, WEBP and supported RAW files (CR3, NEF, ARW, DNG)
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Analysis settings / profile */}
                        <div className={`rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 ${lightboxImage ? "p-4" : "p-5"}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-m font-semibold text-slate-900 dark:text-white">
                                Analysis Settings
                              </p>
                              {!lightboxImage && (
                                <p className="mt-0.5 text-[11px] text-slate-500">
                                  Current LensFlow analysis profile
                                </p>
                              )}
                            </div>
                            <span className="rounded-full bg-sky-500/10 px-2 py-1 text-[10px] font-semibold text-sky-500 dark:text-sky-300">
                              Balanced
                            </span>
                          </div>

                          <div className={`grid gap-2 ${lightboxImage ? "mt-3 grid-cols-2" : "mt-4 grid-cols-1 sm:grid-cols-2"}`}>
                            {[
                              ["technical", "Technical quality"],
                              ["subject", "Subject quality"],
                              ["aesthetic", "Aesthetic quality"],
                              ["similarity", "Visual similarity"],
                            ].map(([key, label]) => {
                              const enabled = analysisOptions[key];

                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => toggleAnalysisOption(key)}
                                  className={`flex min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-[10px] font-medium transition ${
                                    enabled
                                      ? "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300"
                                      : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-500"
                                  }`}
                                  title="UI preview only — backend currently runs the complete pipeline"
                                >
                                  <span className="truncate">{label}</span>
                                  <span
                                    className={`relative h-4 w-7 flex-shrink-0 rounded-full transition ${
                                      enabled ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-700"
                                    }`}
                                  >
                                    <span
                                      className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-all ${
                                        enabled ? "left-3.5" : "left-0.5"
                                      }`}
                                    />
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {!lightboxImage && (
                            <p className="mt-2 text-[9px] text-slate-400">
                              Preview controls only — all analysis stages still run in the current backend.
                            </p>
                          )}

                          <button
                            type="button"
                            onClick={handleRunCulling}
                            disabled={cullingLoading || folderTotal === 0}
                            className={`mt-4 w-full rounded-xl bg-sky-600 font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50 ${
                              lightboxImage ? "px-3 py-2 text-[11px]" : "px-4 py-2.5 text-xs"
                            }`}
                          >
                            {cullingLoading ? "Analyzing photos..." : "Start Automated Culling"}
                          </button>

                          {cullingError && (
                            <p className="mt-2 text-[10px] text-red-400">{cullingError}</p>
                          )}
                        </div>

                        {/* Summary */}
                        <div className={`rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 ${lightboxImage ? "p-4" : "p-5"}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-m font-semibold text-slate-900 dark:text-white">
                                Culling Summary
                              </p>
                              {!lightboxImage && (
                                <p className="mt-0.5 text-[11px] text-slate-500">
                                  {folderAiAnalyzed} of {folderTotal} analyzed
                                </p>
                              )}
                            </div>
                            <span className="text-xl font-bold text-slate-900 dark:text-white">
                              {folderTotal}
                            </span>
                          </div>

                          <div className={`mt-4 ${lightboxImage ? "space-y-1.5" : "space-y-2.5"}`}>
                            {[
                              ["Keep", folderAiKeep, "bg-emerald-500", "text-emerald-500"],
                              ["Review", folderAiReview, "bg-amber-500", "text-amber-500"],
                              ["Reject", folderAiReject, "bg-rose-500", "text-rose-500"],
                            ].map(([label, count, dotClass, textClass]) => (
                              <div key={label} className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                  <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                                  {label}
                                </span>
                                <span className={`font-semibold ${textClass}`}>{count}</span>
                              </div>
                            ))}
                          </div>

                          {!lightboxImage && (
                            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                              <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: folderTotal ? `${(folderAiKeep / folderTotal) * 100}%` : "0%" }}
                              />
                              <div
                                className="h-full bg-amber-500 transition-all"
                                style={{ width: folderTotal ? `${(folderAiReview / folderTotal) * 100}%` : "0%" }}
                              />
                              <div
                                className="h-full bg-rose-500 transition-all"
                                style={{ width: folderTotal ? `${(folderAiReject / folderTotal) * 100}%` : "0%" }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Filter groups */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Photographer
                            </span>
                            {FILTERS.filter((f) => f.group === "photographer").map((f) => {
                              const count =
                                f.key === "all"
                                  ? folderTotal
                                  : f.key === "star"
                                  ? folderStarred
                                  : f.key === "reject"
                                  ? folderRejected
                                  : folderUnrated;
                              const active = filter === f.key;

                              return (
                                <button
                                  key={f.key}
                                  type="button"
                                  onClick={() => setFilter(f.key)}
                                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                                    active
                                      ? "bg-sky-500 text-slate-950"
                                      : "bg-slate-100 text-slate-500 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
                                  }`}
                                >
                                  {f.label} <span className="opacity-70">({count})</span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              LensFlow AI
                            </span>
                            {FILTERS.filter((f) => f.group === "ai").map((f) => {
                              const count =
                                f.key === "ai_keep"
                                  ? folderAiKeep
                                  : f.key === "ai_review"
                                  ? folderAiReview
                                  : folderAiReject;
                              const active = filter === f.key;

                              return (
                                <button
                                  key={f.key}
                                  type="button"
                                  onClick={() => setFilter(f.key)}
                                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                                    active
                                      ? f.key === "ai_keep"
                                        ? "bg-emerald-500 text-white"
                                        : f.key === "ai_review"
                                        ? "bg-amber-500 text-slate-950"
                                        : "bg-rose-500 text-white"
                                      : "bg-slate-100 text-slate-500 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
                                  }`}
                                >
                                  {f.label} <span className="opacity-70">({count})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Gallery */}
                      {visibleImages.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-500 dark:border-slate-700">
                          {folderTotal === 0
                            ? "This folder is empty — add some photos above."
                            : "No photos match this filter."}
                        </div>
                      ) : (
                        <>
                          <p className="mb-2 text-[10px] text-slate-500 dark:text-slate-400">
                            Gallery uses optimized previews (600px). Full-quality originals load only when requested.
                          </p>

                          <VirtualizedPhotoGrid
                            images={visibleImages}
                            culls={culls}
                            aiResults={aiResults}
                            lightboxId={lightboxId}
                            lightboxOpen={Boolean(lightboxImage)}
                            onSelect={(id) => {
                              setPreviewOpen(false);
                              setLightboxId((current) => current === id ? null : id);
                            }}
                            onRate={setRating}
                          />
                        </>
                      )}

                      <p className="text-center text-[11px] text-slate-500">
                        Select a photo to open its analysis details. Select it again or use the close button to collapse the panel.
                      </p>
                    </div>

                    {/* Detail panel */}
                    {lightboxImage && (
                      <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 xl:sticky xl:top-4 xl:h-[calc(100vh-7rem)] xl:max-h-[calc(100vh-7rem)] xl:flex xl:flex-col xl:overflow-hidden">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-mono text-xs font-semibold text-slate-900 dark:text-white">
                              {lightboxImage.fileName}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-500">
                              {lightboxImage.sizeLabel || "Photo"} · {lightboxIndex + 1} of {visibleImages.length}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setPreviewOpen(false);
                              setLightboxId(null);
                            }}
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:text-slate-900 dark:bg-slate-800 dark:hover:text-white"
                            aria-label="Close photo details"
                          >
                            <FaTimes />
                          </button>
                        </div>

                        {/* Scrollable analysis content.
                            The analysis content and final photographer decision stay in this scrollable area
                            so the buttons remain visible at the bottom of the card. */}
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] [scrollbar-color:rgb(71_85_105)_transparent]">
                          <div className="relative overflow-hidden rounded-xl bg-slate-950">
                          {lightboxImage.previewable && lightboxImage.thumbUrl ? (
                            <button
                              type="button"
                              onClick={() => openFullPreview(lightboxImage)}
                              className="block w-full cursor-zoom-in"
                              aria-label="View full quality photo"
                              title="View full quality"
                              disabled={originalLoadingId === lightboxImage.id}
                            >
                              <img
                                src={lightboxImage.thumbUrl}
                                alt={lightboxImage.fileName}
                                loading="eager"
                                decoding="async"
                                className="aspect-[4/3] w-full object-contain"
                              />
                            </button>
                          ) : (
                            <div className="flex aspect-[4/3] items-center justify-center text-slate-500">
                              <FaFileImage className="text-4xl" />
                            </div>
                          )}

                          {lightboxImage.previewable && lightboxImage.thumbUrl && (
                            <button
                              type="button"
                              onClick={() => openFullPreview(lightboxImage)}
                              disabled={originalLoadingId === lightboxImage.id}
                              className="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-black/65 px-2.5 py-1.5 text-[10px] font-semibold text-white backdrop-blur-md transition hover:bg-sky-500 hover:text-slate-950 disabled:cursor-wait disabled:opacity-70"
                              aria-label="View full quality photo"
                            >
                              <FaSearchPlus className="text-[10px]" />
                              {originalLoadingId === lightboxImage.id
                                ? "Loading original..."
                                : "View Full Quality"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setPreviewOpen(false);
                              goToOffset(-1);
                            }}
                            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 text-white/80 hover:text-white"
                            aria-label="Previous photo"
                          >
                            <FaChevronLeft className="text-xs" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewOpen(false);
                              goToOffset(1);
                            }}
                            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white/80 hover:text-white"
                            aria-label="Next photo"
                          >
                            <FaChevronRight className="text-xs" />
                          </button>
                        </div>

                        {/* Recommendation */}
                        <div className="mt-3">
                          {lightboxAiResult ? (
                            <>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span
                                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                                    lightboxAiResult.ai_decision === "KEEP"
                                      ? "bg-emerald-500/15 text-emerald-500"
                                      : lightboxAiResult.ai_decision === "REJECT"
                                      ? "bg-rose-500/15 text-rose-500"
                                      : "bg-amber-500/15 text-amber-500"
                                  }`}
                                >
                                  Recommended: {lightboxAiResult.ai_decision}
                                </span>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                  {formatPercent(lightboxAiResult.base_quality_score)}
                                </span>
                              </div>

                              <div className="mt-3 space-y-2">
                                {[
                                  ["Technical Quality", lightboxAiResult.metrics?.technical_score],
                                  ["Face Quality", lightboxAiResult.metrics?.face_quality_score],
                                  ["Eye Quality", lightboxAiResult.metrics?.eye_quality_score],
                                  ["Aesthetic Quality", lightboxAiResult.metrics?.aesthetic_quality_score],
                                ].map(([label, value]) => (
                                  <div key={label}>
                                    <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                                      <span className="text-slate-400">{label}</span>
                                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                                        {formatPercent(value)}
                                      </span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                      <div
                                        className="h-full rounded-full bg-sky-500 transition-all"
                                        style={{
                                          width:
                                            value === null || value === undefined
                                              ? "0%"
                                              : `${Math.max(0, Math.min(100, Number(value) * 100))}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
                                <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800/70">
                                  <p className="text-slate-400">Similarity group</p>
                                  <p className="mt-0.5 font-semibold text-slate-800 dark:text-white">
                                    {lightboxAiResult.similarity_group || "Independent"}
                                  </p>
                                </div>
                                <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800/70">
                                  <p className="text-slate-500">Group rank</p>
                                  <p className="mt-0.5 font-semibold text-slate-800 dark:text-white">
                                    {lightboxAiResult.group_rank || "—"}
                                  </p>
                                </div>
                                <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800/70">
                                  <p className="text-slate-500">Sharpness</p>
                                  <p className="mt-0.5 font-semibold text-slate-800 dark:text-white">
                                    {formatMetric(lightboxAiResult.metrics?.sharpness)}
                                  </p>
                                </div>
                                <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800/70">
                                  <p className="text-slate-500">Aesthetic score</p>
                                  <p className="mt-0.5 font-semibold text-slate-800 dark:text-white">
                                    {formatMetric(lightboxAiResult.metrics?.aesthetic_score)}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                                <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
                                  LensFlow reason
                                </p>
                                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                  {lightboxAiResult.decision_reason || "No decision reason available."}
                                </p>

                                {Array.isArray(lightboxAiResult.metrics?.defects) &&
                                  lightboxAiResult.metrics.defects.length > 0 && (
                                    <div className="mt-3">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                                        Detected issues
                                      </p>
                                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {lightboxAiResult.metrics.defects.map((defect, index) => (
                                          <span
                                            key={`${defect?.type || defect}-${index}`}
                                            className="rounded-full bg-rose-500/10 px-2 py-1 text-[9px] text-rose-400"
                                          >
                                            {defect?.message || defect?.type || String(defect)}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center dark:border-slate-700">
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                No AI analysis yet
                              </p>
                              <p className="mt-1 text-[10px] text-slate-500">
                                Run automated culling to generate quality scores and a recommendation.
                              </p>
                            </div>
                          )}
                        </div>

                          {/* Photographer controls — part of the scrollable details content */}
                          <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Photographer Decision
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setRating(lightboxImage.id, "star")}
                              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                culls[lightboxImage.id] === "star"
                                  ? "bg-sky-500 text-slate-950"
                                  : "bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white"
                              }`}
                            >
                              <FaStar /> Star / Keep
                            </button>

                            <button
                              type="button"
                              onClick={() => setRating(lightboxImage.id, "reject")}
                              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                culls[lightboxImage.id] === "reject"
                                  ? "bg-rose-500 text-white"
                                  : "bg-slate-100 text-slate-600 hover:text-rose-500 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              <FaBan /> Reject
                            </button>
                          </div>

                          {culls[lightboxImage.id] && (
                            <button
                              type="button"
                              onClick={() => clearRating(lightboxImage.id)}
                              className="mt-2 w-full rounded-lg px-3 py-2 text-[10px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                            >
                              Clear photographer decision
                            </button>
                          )}
                          </div>
                        </div>
                      </aside>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* ============ DUPLICATE REVIEW TAB ============ */}
      {mode === "duplicates" && (
        <div>
          <p className="text-xs text-slate-500 mb-5">
            Each row is a set of similar shots — pick the keeper. Single photos are kept automatically.
          </p>

          {duplicateSets.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl">
              No similar-photo groups yet. Open a folder and run LensFlow Culling first.
            </div>
          ) : (
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
                    const manualBestId = bestPicks[set.id];
                    const suggestedBestId =
                      set.images.find((img) => img.aiResult?.group_rank === 1)?.id || null;

                    const bestId = manualBestId || suggestedBestId;
                    const bestImage = set.images.find((img) => img.id === bestId);
                    const resolved = Boolean(manualBestId);

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

                                  {img.aiResult?.group_rank && (
                                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded">
                                      Rank {img.aiResult.group_rank}
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
                          {resolved ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
                              <FaCheckCircle /> Photographer selected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full">
                              <FaCrown /> LensFlow suggestion
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {folderContextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-lg border border-slate-700 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-sm"
          style={{ left: folderContextMenu.x, top: folderContextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setFolderToDelete(folderContextMenu.folderId);
              setFolderContextMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-colors"
          >
            <FaTrash className="text-xs" />
            Delete
          </button>
        </div>
      )}

      {folderToDelete && (
        <ConfirmModal
          open={Boolean(folderToDelete)}
          title="Delete folder"
          message="This will permanently delete the folder, every subfolder inside it, and all photos inside those. This action cannot be undone."
          onCancel={() => setFolderToDelete(null)}
          onConfirm={() => deleteFolder(folderToDelete)}
        />
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
              <h3 className="text-white font-semibold">
                {currentFolderId ? "Name this subfolder" : "Name this folder"}
              </h3>
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

      {/* ============ FULLSCREEN PHOTO PREVIEW ============ */}
      {mode === "cull" &&
        previewOpen &&
        lightboxImage &&
        lightboxImage.previewable &&
        lightboxImage.fullUrl && (
          <div
            className="fixed inset-0 z-[70] flex flex-col bg-black/95 backdrop-blur-sm"
            onClick={() => setPreviewOpen(false)}
          >
            <div
              className="flex items-center justify-between gap-3 px-4 py-3 text-white sm:px-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-semibold sm:text-sm">
                  {lightboxImage.fileName}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {lightboxIndex + 1} of {visibleImages.length}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-300 transition hover:bg-white/20 hover:text-white"
                aria-label="Close enlarged photo"
              >
                <FaTimes />
              </button>
            </div>

            <div
              className="relative flex min-h-0 flex-1 items-center justify-center p-4 sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => goToOffset(-1)}
                className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white/80 transition hover:bg-black/75 hover:text-white sm:left-6"
                aria-label="Previous photo"
              >
                <FaChevronLeft />
              </button>

              <img
                src={lightboxImage.fullUrl}
                alt={lightboxImage.fileName}
                className="max-h-full max-w-full select-none object-contain"
              />

              <button
                type="button"
                onClick={() => goToOffset(1)}
                className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white/80 transition hover:bg-black/75 hover:text-white sm:right-6"
                aria-label="Next photo"
              >
                <FaChevronRight />
              </button>
            </div>

            <div
              className="border-t border-white/10 bg-black/70 px-4 py-3 backdrop-blur-md sm:px-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* AI recommendation + reason */}
                <div className="min-w-0 flex-1">
                  {lightboxAiResult ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <span
                        className={`inline-flex w-fit flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                          lightboxAiResult.ai_decision === "KEEP"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : lightboxAiResult.ai_decision === "REJECT"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        Recommended: {lightboxAiResult.ai_decision}
                      </span>

                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          LensFlow reason
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-200">
                          {lightboxAiResult.decision_reason || "No decision reason available."}
                        </p>

                        {Array.isArray(lightboxAiResult.metrics?.defects) &&
                          lightboxAiResult.metrics.defects.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {lightboxAiResult.metrics.defects.map((defect, index) => (
                                <span
                                  key={`${defect?.type || defect}-${index}`}
                                  className="rounded-full bg-rose-500/15 px-2 py-1 text-[9px] text-rose-300"
                                >
                                  {defect?.message || defect?.type || String(defect)}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      No AI analysis is available for this photo yet.
                    </p>
                  )}
                </div>

                {/* Photographer decision controls */}
                <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRating(lightboxImage.id, "star")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                      culls[lightboxImage.id] === "star"
                        ? "bg-sky-500 text-slate-950"
                        : "bg-white/10 text-white hover:bg-sky-500 hover:text-slate-950"
                    }`}
                  >
                    <FaStar /> Star / Keep
                  </button>

                  <button
                    type="button"
                    onClick={() => setRating(lightboxImage.id, "reject")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                      culls[lightboxImage.id] === "reject"
                        ? "bg-rose-500 text-white"
                        : "bg-white/10 text-white hover:bg-rose-500"
                    }`}
                  >
                    <FaBan /> Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* ============ LIGHTBOX: duplicate review ============ */}
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

            <button
              type="button"
              onClick={() => openFullPreview(dupLightboxImage)}
              className="max-h-[70vh] max-w-full cursor-zoom-in rounded-lg"
              title="View full quality"
            >
              <img
                src={dupLightboxImage.thumbUrl}
                alt={dupLightboxImage.fileName}
                loading="eager"
                decoding="async"
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl"
              />
            </button>

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