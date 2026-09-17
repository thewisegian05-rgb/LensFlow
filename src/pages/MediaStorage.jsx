import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { FaFolder, FaPlus, FaEdit, FaTrash, FaFile, FaTimes } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabaseClient";

const PHOTOS_BUCKET = "photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

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

// Same subtree-walk used in Culling — needed here too since either page
// can trigger a folder delete.
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

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".avi", ".mkv"];
function looksLikeVideo(fileName) {
  const lower = fileName.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function MediaStorage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

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

  // Folders flat list {id, name, parentId}; photos flat list {id, folderId, name, storagePath}
  const [folders, setFolders] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [path, setPath] = useState([]); // array of folder ids

  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editIsFolder, setEditIsFolder] = useState(true);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name, isFile }
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [viewingFile, setViewingFile] = useState(null); // { id, name, url, isVideo }

  const fileInputRef = useRef(null);

  const shellClasses = isDark ? "text-white" : "text-slate-900";
  const topButtonClasses = isDark ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-200 hover:bg-slate-300 text-slate-900";
  const menuClasses = isDark
    ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900";
  const formClasses = isDark
    ? "border-slate-800 bg-slate-900"
    : "border-slate-200 bg-white";
  const inputClasses = isDark
    ? "bg-slate-800 text-white placeholder-slate-400 focus:ring-sky-500"
    : "bg-white text-slate-900 placeholder-slate-400 border border-slate-300 focus:ring-sky-500";
  const itemClasses = isDark
    ? "border-slate-800 bg-slate-900/60 hover:bg-slate-800/80"
    : "border-slate-200 bg-white hover:bg-slate-100";
  const emptyTextClasses = isDark ? "text-slate-500" : "text-slate-500";
  const modalContentClasses = isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900";
  const modalHeaderClasses = isDark ? "border-slate-800" : "border-slate-200";
  const modalButtonClasses = isDark ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-900";

  const currentFolderId = path.length ? path[path.length - 1] : null;

  /* ---- load folders + photos, same tables Culling uses ---- */
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
      .select("id, folder_id, file_name, storage_path")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (photoErr) {
      console.error(photoErr);
      setDataLoading(false);
      return;
    }

    setFolders(
      folderRows.map((f) => ({ id: f.id, name: f.name, parentId: f.parent_id }))
    );
    setPhotos(
      photoRows.map((p) => ({
        id: p.id,
        folderId: p.folder_id,
        name: p.file_name,
        storagePath: p.storage_path,
      }))
    );

    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      loadData(user.id);
    } else {
      setFolders([]);
      setPhotos([]);
      setPath([]);
    }
  }, [user, loadData]);

  /* ---- current level ---- */
  const currentFolders = useMemo(
    () => folders.filter((f) => f.parentId === currentFolderId),
    [folders, currentFolderId]
  );
  const currentPhotos = useMemo(
    () => photos.filter((p) => p.folderId === currentFolderId),
    [photos, currentFolderId]
  );

  const currentItems = useMemo(
    () => [
      ...currentFolders.map((f) => ({ id: f.id, name: f.name, isFile: false })),
      ...currentPhotos.map((p) => ({ id: p.id, name: p.name, isFile: true })),
    ],
    [currentFolders, currentPhotos]
  );

  const sortedCurrentItems = [...currentItems].sort((a, b) => {
    if (a.isFile === b.isFile) return a.name.localeCompare(b.name);
    return a.isFile ? 1 : -1;
  });

  const breadcrumbItems = useMemo(() => {
    const items = [{ label: "Client Media Storage", id: null }];
    path.forEach((id) => {
      const found = folders.find((f) => f.id === id);
      if (found) items.push({ label: found.name, id: found.id });
    });
    return items;
  }, [path, folders]);

  const currentTitle =
    breadcrumbItems.length > 0
      ? breadcrumbItems[breadcrumbItems.length - 1].label
      : "Client Media Storage";

  /* ---- create folder (subfolder of currentFolderId) ---- */
  const handleAddFolderSubmit = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || !user) return;

    const { data, error } = await supabase
      .from("folders")
      .insert({ name, user_id: user.id, parent_id: currentFolderId })
      .select()
      .single();

    if (error) {
      console.error("Folder create failed:", error);
      return;
    }

    setFolders((prev) => [...prev, { id: data.id, name: data.name, parentId: currentFolderId }]);
    setNewName("");
    setIsAddingFolder(false);
  };

  /* ---- upload a file into the current folder (or an auto "Uploads" root folder) ---- */
  async function findOrCreateUploadsFolder() {
    const existing = folders.find((f) => f.name === "Uploads" && f.parentId === null);
    if (existing) return existing.id;

    const { data, error } = await supabase
      .from("folders")
      .insert({ name: "Uploads", user_id: user.id, parent_id: null })
      .select()
      .single();

    if (error) {
      console.error(error);
      return null;
    }

    setFolders((prev) => [...prev, { id: data.id, name: data.name, parentId: null }]);
    return data.id;
  }

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    const file = files[0];

    let targetFolderId = currentFolderId;
    if (!targetFolderId) {
      targetFolderId = await findOrCreateUploadsFolder();
      if (!targetFolderId) return;
      setPath([targetFolderId]);
    }

    const isPreviewable =
      file.type.startsWith("image/") || file.type.startsWith("video/");
    const storagePath = `${user.id}/${targetFolderId}/${Date.now()}-${file.name}`;

    const { error: uploadErr } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(storagePath, file);

    if (uploadErr) {
      console.error("Upload failed:", uploadErr);
      e.target.value = "";
      return;
    }

    const { data: row, error: insertErr } = await supabase
      .from("photos")
      .insert({
        folder_id: targetFolderId,
        user_id: user.id,
        file_name: file.name,
        storage_path: storagePath,
        size_bytes: file.size,
        previewable: isPreviewable,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert failed:", insertErr);
      e.target.value = "";
      return;
    }

    setPhotos((prev) => [
      ...prev,
      { id: row.id, folderId: targetFolderId, name: file.name, storagePath },
    ]);

    e.target.value = "";
  };

  /* ---- rename (folder or file) ---- */
  const handleSaveEdit = async (id, isFile) => {
    const name = editName.trim();
    if (!name) return;

    const table = isFile ? "photos" : "folders";
    const column = isFile ? "file_name" : "name";

    const { error } = await supabase.from(table).update({ [column]: name }).eq("id", id);

    if (error) {
      console.error("Rename failed:", error);
      return;
    }

    if (isFile) {
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
    } else {
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
    }

    setEditId(null);
  };

  /* ---- delete (file, or folder + its whole subtree) ---- */
  const confirmDelete = async () => {
    if (!deleteTarget || !user) return;

    if (deleteTarget.isFile) {
      const photo = photos.find((p) => p.id === deleteTarget.id);

      if (photo?.storagePath) {
        const { error: storageErr } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .remove([photo.storagePath]);

        if (storageErr) console.error("Storage cleanup failed:", storageErr);
      }

      const { error } = await supabase
        .from("photos")
        .delete()
        .eq("id", deleteTarget.id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Photo delete failed:", error);
        return;
      }

      setPhotos((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    } else {
      const idsToDelete = collectDescendantIds(folders, deleteTarget.id);

      const { data: photoRows, error: photoListErr } = await supabase
        .from("photos")
        .select("id, storage_path")
        .in("folder_id", idsToDelete)
        .eq("user_id", user.id);

      if (photoListErr) {
        console.error("Folder photo lookup failed:", photoListErr);
        return;
      }

      const storagePaths = photoRows.map((p) => p.storage_path).filter(Boolean);
      if (storagePaths.length > 0) {
        const { error: storageErr } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .remove(storagePaths);
        if (storageErr) console.error("Storage cleanup failed:", storageErr);
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
        .eq("id", deleteTarget.id)
        .eq("user_id", user.id);

      if (folderDeleteErr) {
        console.error("Folder delete failed:", folderDeleteErr);
        return;
      }

      setFolders((prev) => prev.filter((f) => !idsToDelete.includes(f.id)));
      setPhotos((prev) => prev.filter((p) => !idsToDelete.includes(p.folderId)));

      if (path.some((id) => idsToDelete.includes(id))) {
        const keepIndex = path.findIndex((id) => idsToDelete.includes(id));
        setPath(path.slice(0, keepIndex));
      }
    }

    setDeleteTarget(null);
  };

  const handleBack = () => setPath(path.slice(0, -1));

  const openFile = async (item) => {
    const photo = photos.find((p) => p.id === item.id);
    if (!photo) return;

    const url = await getSignedUrl(photo.storagePath);
    if (!url) {
      alert("Couldn't load a preview for this file.");
      return;
    }

    setViewingFile({
      id: photo.id,
      name: photo.name,
      url,
      isVideo: looksLikeVideo(photo.name),
    });
  };

  if (authLoading) {
    return <p className="text-sm text-slate-500 text-center mt-20">Loading...</p>;
  }

  if (!user) {
    return (
      <p className="text-sm text-slate-500 text-center mt-20">
        Please sign in to view your media storage.
      </p>
    );
  }

  return (
    <div className={`p-4 relative ${shellClasses}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*"
      />

      {/* Top action bar */}
      <div className="mb-4 flex items-center justify-between">
        {path.length > 0 ? (
          <button
            onClick={handleBack}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${topButtonClasses}`}
          >
            ← Back
          </button>
        ) : <div />}

        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            <FaPlus /> Add
          </button>

          {showAddMenu && (
            <div className={`absolute right-0 mt-2 w-36 rounded-lg border shadow-xl z-20 py-1 ${menuClasses}`}>
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  setIsAddingFolder(true);
                }}
                className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${menuClasses}`}
              >
                <FaFolder className="text-yellow-400" /> Folder
              </button>
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  fileInputRef.current.click();
                }}
                className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${menuClasses}`}
              >
                <FaFile className="text-sky-400" /> File
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="mb-1 flex flex-wrap items-center gap-2 text-2xl font-semibold">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const isRoot = index === 0;

          return (
            <div key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 && <span className={isDark ? "text-slate-500" : "text-slate-400"}>›</span>}
              <button
                type="button"
                onClick={() => {
                  if (!isLast) setPath(path.slice(0, index));
                }}
                disabled={isLast}
                className={`transition ${
                  isLast
                    ? isDark ? "cursor-pointer text-white" : "cursor-pointer text-slate-900"
                    : isDark ? "cursor-pointer text-slate-300 hover:text-white" : "cursor-pointer text-slate-700 hover:text-slate-900"
                }`}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  boxShadow: "none",
                  padding: 0,
                  appearance: "none",
                  WebkitAppearance: "none",
                }}
              >
                {item.label}
              </button>
              {isRoot && path.length > 0 && (
                <span className={isDark ? "text-slate-500" : "text-slate-400"}>›</span>
              )}
            </div>
          );
        })}
      </div>
      <p className={`mb-4 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        Manage and organize media files for each client and project. Folders here are shared with the Culling tab.
      </p>

      {isAddingFolder && (
        <form onSubmit={handleAddFolderSubmit} className={`mb-4 flex gap-2 rounded-lg border p-3 ${formClasses}`}>
          <input
            type="text"
            placeholder="Folder name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={`flex-1 rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-sky-500 ${inputClasses}`}
            autoFocus
          />
          <button type="submit" className="rounded bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-sky-500">Save</button>
          <button type="button" onClick={() => setIsAddingFolder(false)} className={`rounded px-3 py-1.5 text-sm ${modalButtonClasses}`}>Cancel</button>
        </form>
      )}

      <div className="space-y-3">
        {dataLoading ? (
          <p className={`text-sm ${emptyTextClasses}`}>Loading...</p>
        ) : currentItems.length === 0 ? (
          <p className={`text-sm italic ${emptyTextClasses}`}>
            The storage is empty. Use the "+ Add" button to create folders or upload files.
          </p>
        ) : (
          <p className={`text-sm font-medium ${emptyTextClasses}`}>
            {currentItems.filter((item) => !item.isFile).length} folders · {currentItems.filter((item) => item.isFile).length} files
          </p>
        )}

        {sortedCurrentItems.map((item) => (
          <div
            key={`${item.isFile ? "file" : "folder"}-${item.id}`}
            onClick={() => {
              if (item.isFile) {
                openFile(item);
              } else {
                setPath([...path, item.id]);
              }
            }}
            className={`flex items-center justify-between rounded-lg border p-4 transition cursor-pointer ${itemClasses}`}
          >
            <div className="flex items-center gap-3 flex-1">
              {item.isFile ? (
                <FaFile className="text-2xl text-sky-400" />
              ) : (
                <FaFolder className="text-2xl text-yellow-400" />
              )}

              {/*
                Only stop propagation while this row is actively being
                renamed — otherwise a click on the name should bubble up
                to the row's onClick and navigate/open like clicking
                anywhere else on the row. Text selection via click-drag
                or double-click still works normally since we never call
                preventDefault() here.
              */}
              <div
                className="flex-1"
                onClick={(e) => {
                  if (editId === item.id) e.stopPropagation();
                }}
              >
                {editId === item.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={`rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-sky-500 ${inputClasses}`}
                      autoFocus
                    />
                    <button onClick={() => handleSaveEdit(item.id, item.isFile)} className="rounded bg-green-600 px-2.5 py-1 text-xs text-white hover:bg-green-500">Save</button>
                    <button onClick={() => setEditId(null)} className={`rounded px-2.5 py-1 text-xs ${modalButtonClasses}`}>Cancel</button>
                  </div>
                ) : (
                  <div>
                    <h2 className="font-semibold">{item.name}</h2>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {editId !== item.id && (
                <button
                  onClick={() => { setEditId(item.id); setEditIsFolder(!item.isFile); setEditName(item.name); }}
                  className="rounded-lg p-2 text-slate-500 transition hover:!bg-sky-100 hover:!text-sky-600 dark:text-slate-400 dark:hover:!bg-sky-500/10 dark:hover:!text-sky-400"
                  style={{ background: "transparent", border: "none", outline: "none", boxShadow: "none", appearance: "none", WebkitAppearance: "none" }}
                  title="Rename"
                >
                  <FaEdit />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget({ id: item.id, name: item.name, isFile: item.isFile });
                }}
                className="rounded-lg p-2 text-slate-500 transition hover:!bg-red-100 hover:!text-red-500 dark:text-slate-400 dark:hover:!bg-red-500/10 dark:hover:!text-red-500"
                style={{ background: "transparent", border: "none", outline: "none", boxShadow: "none", appearance: "none", WebkitAppearance: "none" }}
                title="Delete"
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* File Preview Modal */}
      {viewingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className={`relative max-w-4xl w-full max-h-[90vh] border rounded-xl p-4 flex flex-col shadow-2xl ${modalContentClasses}`}>
            <div className={`flex items-center justify-between pb-3 border-b mb-4 ${modalHeaderClasses}`}>
              <h3 className="font-semibold text-lg truncate">{viewingFile.name}</h3>
              <button
                onClick={() => setViewingFile(null)}
                className={`rounded-lg p-2 transition ${modalButtonClasses}`}
              >
                <FaTimes />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              {viewingFile.isVideo ? (
                <video controls src={viewingFile.url} className="max-h-[70vh] max-w-full rounded object-contain" />
              ) : (
                <img src={viewingFile.url} alt={viewingFile.name} className="max-h-[70vh] max-w-full rounded object-contain" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-xl border p-6 text-center shadow-xl ${modalContentClasses}`}>
            <h3 className="mb-2 text-lg font-bold">Delete Item?</h3>
            <p className={`mb-6 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {deleteTarget.isFile
                ? <>Are you sure you want to delete <span className="font-semibold">"{deleteTarget.name}"</span>? This action cannot be undone.</>
                : <>This will permanently delete <span className="font-semibold">"{deleteTarget.name}"</span>, every subfolder inside it, and all photos inside those. This action cannot be undone.</>
              }
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${modalButtonClasses}`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
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

export default MediaStorage;