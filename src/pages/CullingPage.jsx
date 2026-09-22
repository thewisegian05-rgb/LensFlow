import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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

const FILTERS = [
  { key: "all", label: "All" },
  { key: "star", label: "Starred" },
  { key: "reject", label: "Rejected" },
  { key: "unrated", label: "Unrated" },
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

async function getSignedUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.error("Signed URL error:", error);
    return null;
  }
  return data.signedUrl;
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
  const [path, setPath] = useState([]);
  const [filter, setFilter] = useState("all");
  const [lightboxId, setLightboxId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderError, setNewFolderError] = useState("");
  const [folderContextMenu, setFolderContextMenu] = useState(null);
  const [folderToDelete, setFolderToDelete] = useState(null);

  const fileInputRef = useRef(null);

  const currentFolderId = path.length ? path[path.length - 1] : null;

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

    const signedUrls = await Promise.all(
      photoRows.map((p) => (p.previewable ? getSignedUrl(p.storage_path) : Promise.resolve(null)))
    );

    const photoState = photoRows.map((p, i) => ({
      id: p.id,
      folderId: p.folder_id,
      fileName: p.file_name,
      storagePath: p.storage_path,
      thumbUrl: signedUrls[i],
      fullUrl: signedUrls[i],
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

    setFolders(folderState);
    setPhotos(photoState);
    setCulls(ratingsMap);
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      loadData(user.id);
    } else {
      setFolders([]);
      setPhotos([]);
      setCulls({});
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

      for (const file of files) {
        const isPreviewable = file.type.startsWith("image/");
        const path = `${user.id}/${targetFolderId}/${Date.now()}-${file.name}`;

        const { error: uploadErr } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .upload(path, file);
        if (uploadErr) {
          console.error("Upload failed:", uploadErr);
          continue;
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
          continue;
        }

        const thumbUrl = isPreviewable ? await getSignedUrl(path) : null;

        const newImage = {
          id: row.id,
          folderId: targetFolderId,
          fileName: file.name,
          storagePath: path,
          thumbUrl,
          fullUrl: thumbUrl,
          previewable: isPreviewable,
          sizeLabel: formatBytes(file.size),
        };

        setPhotos((prev) => [newImage, ...prev]);
      }
    },
    [currentFolderId, user]
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxImage, goToOffset, mode, culls]);

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

  /* ============ DUPLICATE REVIEW ============ */
  const [duplicateSets] = useState([]);
  const [bestPicks, setBestPicks] = useState({});
  const [dupLightbox, setDupLightbox] = useState(null);

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

      {/* Dropzone */}
      {mode === "cull" && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mb-6 border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ease-out hover:scale-[1.01] hover:shadow-lg hover:shadow-sky-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
            isDragging
              ? "border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/10"
              : "border-slate-300 bg-slate-50/80 hover:border-sky-400 hover:bg-slate-100/90 dark:border-slate-700 dark:bg-slate-800/30 dark:hover:bg-slate-800/60"
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
          <p className="text-md text-slate-700 font-medium dark:text-slate-300">
            {isDragging ? "Drop to add these files" : "Drag & drop photos here, or click to browse"}
          </p>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-500">
            JPG, PNG, WEBP get thumbnails right away &middot; RAW formats (CR3, NEF, ARW, DNG) are added but can't be previewed in-browser
            {currentFolderId
              ? " · Uploads go into the folder you have open."
              : " · Uploading here drops files into \"Unsorted\"."}
          </p>
        </div>
      )}

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
                      onClick={() => setPath(path.slice(0, -1))}
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
                            onClick={() => setPath(path.slice(0, index))}
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
                <div>
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
                            {img.previewable && img.thumbUrl ? (
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
              No duplicate sets yet — this needs a similarity-detection pass over your photos, which isn't wired up yet.
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

            {lightboxImage.previewable && lightboxImage.fullUrl ? (
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