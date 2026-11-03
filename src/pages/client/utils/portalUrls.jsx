import { supabase } from "../../../lib/supabaseClient";

export const PORTFOLIO_BUCKET = "portfolio";

export async function getFeaturedPhotoSignedUrl(storagePath) {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from("photos")
    .createSignedUrl(storagePath, 60 * 60);
  if (error) {
    console.error("Failed to load featured photo:", error.message);
    return null;
  }
  return data.signedUrl;
}

export const publicUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path).data.publicUrl;
};

/* get_portal returns the photographer fields at the top level
   (username, bio, avatar_path, featured_photos) or nested under
   profile / photographer. Support both shapes. */
export const getProfile = (portal) =>
  portal?.profile || portal?.photographer || portal || null;

export function getFeatured(portal) {
  const raw = portal?.featured || portal?.featured_photos || [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((photo, index) => ({
      ...photo,
      id:
        photo.id ??
        photo.photo_id ??
        `${index}-${photo.storage_path || photo.image_path || photo.photo_url || "photo"}`,
      image_path:
        photo.photo_url || photo.image_path || photo.storage_path || photo.photo_path || null,
      caption: photo.caption || photo.title || photo.photo_name || "",
    }))
    .filter((photo) => Boolean(photo.image_path));
}

export const getReviews = (portal) =>
  Array.isArray(portal?.reviews) ? portal.reviews : [];