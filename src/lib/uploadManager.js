import { supabase } from "./supabaseClient";
import {
  PHOTOS_BUCKET,
  getSignedUrl,
  getPreviewUrl,
  makeThumbnail,
  formatBytes,
} from "./photoStorage";

/*
  Background upload manager.

  Lives outside React, so uploads keep running when the Culling page
  unmounts (switching pages, folders, or tabs inside the app).
  It does NOT survive closing or refreshing the browser tab.
*/

const CONCURRENCY = 2;
const DONE_VISIBLE_MS = 3500;

let progress = null; // { total, done, failed, bytesDone, bytesTotal, currentName, phase }
let cardVisible = false; // true while the in-page progress card is on screen
let snapshot = { progress, cardVisible };

let queue = []; // [{ file, userId, folderId }]
let activeWorkers = 0;
let clearTimer = null;

const stateSubscribers = new Set();
const photoSubscribers = new Set();

function emit() {
  snapshot = { progress, cardVisible };
  stateSubscribers.forEach((fn) => fn());
}

function setProgress(updater) {
  progress = typeof updater === "function" ? updater(progress) : updater;
  emit();
}

/* ---- store API (used with useSyncExternalStore) ---- */
export function subscribeUploads(fn) {
  stateSubscribers.add(fn);
  return () => stateSubscribers.delete(fn);
}

export function getUploadSnapshot() {
  return snapshot;
}

export function setUploadCardVisible(visible) {
  if (cardVisible === visible) return;
  cardVisible = visible;
  emit();
}

export function uploadPercent(p) {
  if (!p) return 0;
  if (p.phase === "done") return 100;
  if (p.bytesTotal > 0) return Math.min(99, Math.round((p.bytesDone / p.bytesTotal) * 100));
  return Math.round((p.done / Math.max(p.total, 1)) * 100);
}

/* ---- photo events: the page listens while mounted ---- */
export function onPhotoUploaded(fn) {
  photoSubscribers.add(fn);
  return () => photoSubscribers.delete(fn);
}

/* ---- leaving the tab mid-upload would cancel it, so ask first ---- */
function warnBeforeUnload(e) {
  e.preventDefault();
  e.returnValue = "";
}

/* ---- queue ---- */
export function enqueueUploads(files, { userId, folderId }) {
  if (!files || files.length === 0) return;

  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }

  const addedBytes = files.reduce((sum, f) => sum + f.size, 0);

  if (!progress || progress.phase === "done") {
    // Fresh batch.
    progress = {
      total: files.length,
      done: 0,
      failed: 0,
      bytesDone: 0,
      bytesTotal: addedBytes,
      currentName: "",
      phase: "uploading",
    };
  } else {
    // Extend the batch that is already running.
    progress = {
      ...progress,
      total: progress.total + files.length,
      bytesTotal: progress.bytesTotal + addedBytes,
    };
  }

  files.forEach((file) => queue.push({ file, userId, folderId }));
  emit();

  window.addEventListener("beforeunload", warnBeforeUnload);

  while (activeWorkers < CONCURRENCY && activeWorkers < queue.length) {
    runWorker();
  }
}

// Clears files that haven't started yet (uploads already in flight finish).
// The totals are adjusted so the progress card stays truthful.
export function cancelUploads() {
  if (queue.length > 0 && progress) {
    const droppedBytes = queue.reduce((sum, job) => sum + job.file.size, 0);
    progress = {
      ...progress,
      total: progress.total - queue.length,
      bytesTotal: progress.bytesTotal - droppedBytes,
    };
    queue = [];
    emit();
    return;
  }
  queue = [];
}

// Only a real sign-out cancels the queue. (The page briefly has no user
// while it loads, which must NOT be treated as a sign-out.)
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") cancelUploads();
});

async function runWorker() {
  activeWorkers++;

  try {
    while (queue.length > 0) {
      const job = queue.shift();
      let ok = false;

      try {
        ok = await uploadOne(job);
      } catch (err) {
        console.error("Upload error:", err);
      }

      setProgress((prev) =>
        prev
          ? {
              ...prev,
              done: prev.done + 1,
              failed: prev.failed + (ok ? 0 : 1),
              bytesDone: prev.bytesDone + job.file.size,
            }
          : prev
      );
    }
  } finally {
    activeWorkers--;
    if (activeWorkers === 0) finish();
  }
}

function finish() {
  window.removeEventListener("beforeunload", warnBeforeUnload);

  setProgress((prev) => (prev ? { ...prev, phase: "done", currentName: "" } : prev));

  clearTimer = setTimeout(() => {
    clearTimer = null;
    if (progress?.phase === "done") {
      progress = null;
      emit();
    }
  }, DONE_VISIBLE_MS);
}

/* ---- one file: thumbnail first, then the original ---- */
async function uploadOne({ file, userId, folderId }) {
  const isPreviewable = file.type.startsWith("image/");
  const uniqueId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const storagePath = `${userId}/${folderId}/${uniqueId}-${file.name}`;

  setProgress((prev) => (prev ? { ...prev, currentName: file.name } : prev));

  // 1) Thumbnail, so the photo can show in the grid quickly.
  let thumbPath = null;
  let thumbUrl = null;

  if (isPreviewable) {
    try {
      const blob = await makeThumbnail(file);
      if (blob) {
        const candidate = `${userId}/${folderId}/thumbs/${uniqueId}.webp`;
        const { error: thumbErr } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .upload(candidate, blob, { contentType: "image/webp" });

        if (!thumbErr) thumbPath = candidate;
        else console.error("Thumbnail upload failed:", thumbErr);
      }
    } catch (err) {
      console.warn("Thumbnail generation failed, using fallback:", err);
      thumbPath = null;
    }

    if (thumbPath) thumbUrl = await getSignedUrl(thumbPath);
  }

  // 2) The original.
  const { error: uploadErr } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(storagePath, file);

  if (uploadErr) {
    console.error("Upload failed:", uploadErr);
    if (thumbPath) {
      await supabase.storage.from(PHOTOS_BUCKET).remove([thumbPath]);
    }
    return false;
  }

  if (isPreviewable && !thumbUrl) {
    thumbUrl = await getPreviewUrl(storagePath);
  }

  const { data: row, error: insertErr } = await supabase
    .from("photos")
    .insert({
      folder_id: folderId,
      user_id: userId,
      file_name: file.name,
      storage_path: storagePath,
      thumb_path: thumbPath,
      size_bytes: file.size,
      previewable: isPreviewable,
    })
    .select()
    .single();

  if (insertErr) {
    console.error("Insert failed:", insertErr);
    return false;
  }

  const photo = {
    id: row.id,
    folderId,
    fileName: file.name,
    storagePath,
    thumbPath,
    thumbUrl,
    fullUrl: null,
    previewable: isPreviewable,
    sizeLabel: formatBytes(file.size),
  };

  // If the page is open it adds the photo to the grid; if not,
  // the photo is simply loaded from the database next time.
  photoSubscribers.forEach((fn) => fn(photo));

  return true;
}