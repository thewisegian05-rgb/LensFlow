import { supabase } from "./supabaseClient";

export const PHOTOS_BUCKET = "photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export function formatBytes(bytes) {
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

const PREVIEW_TRANSFORM = {
  width: 360,
  height: 360,
  resize: "contain",
  quality: 40,
};

export async function getSignedUrl(path, transform = null) {
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

// Sign many paths in a single request.
export async function getSignedUrlMap(paths) {
  if (paths.length === 0) return {};

  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error("Batch signed URL error:", error);
    return {};
  }

  return Object.fromEntries(
    (data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl])
  );
}

// Fallback for older photos that have no stored thumbnail:
// try the server-side resize. If it's unavailable we return null on purpose,
// because falling back to the multi-MB original is what makes the grid lag.
// Older photos get a real thumbnail automatically in the background.
export async function getPreviewUrl(path) {
  if (!path) return null;

  const transformed = await getSignedUrl(path, PREVIEW_TRANSFORM);
  if (!transformed) {
    console.warn("Preview transformation unavailable for", path);
  }
  return transformed;
}

// Create a small WebP thumbnail in the browser so the gallery never
// has to download (or server-resize) the multi-MB original.
export async function makeThumbnail(file, width = 360) {
  // Ask the browser to decode straight to the small size instead of
  // decoding the full-resolution photo first.
  const bitmap = await createImageBitmap(file, {
    resizeWidth: width,
    resizeQuality: "medium",
  });
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0);
  bitmap.close();

  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.6));
}