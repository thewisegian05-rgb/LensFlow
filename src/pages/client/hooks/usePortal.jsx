import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { getFeaturedPhotoSignedUrl } from "../utils/portalUrls";

// Album photos live in the same private "photos" bucket as the featured
// photos, so each stored path needs a signed link before it can be shown.
// A full web address is used as it is.
async function signPhotoPath(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return getFeaturedPhotoSignedUrl(path);
}

// Real stats, safe profile info and carousel albums for a connected client.
// This is a separate database call, so if it fails the rest of the portal
// still loads (the tiles just stay empty).
async function loadExtras(photographerId) {
  const { data, error } = await supabase.rpc("get_portal_extras", {
    p_photographer_id: photographerId,
  });

  if (error) {
    console.error("Failed to load portal extras:", error.message || error);
    return null;
  }

  if (!data) return null;

  const albums = await Promise.all(
    (data.albums || []).map(async (album) => ({
      ...album,
      photos: await Promise.all(
        (album.photos || []).map(async (photo) => ({
          ...photo,
          src: await signPhotoPath(photo.path),
        }))
      ),
    }))
  );

  return { ...data, albums };
}

export function usePortal(photographerId) {
  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0); // ignore out-of-date responses

  const load = useCallback(async (id) => {
    const request = ++requestRef.current;
    if (!id || typeof id !== "string") {
      setPortal(null);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.rpc("get_portal", { p_photographer_id: id });
      if (error) throw error;
      if (!data) throw new Error("The photographer portal returned no data.");
      const featuredPhotos = await Promise.all(
        (data?.featured_photos || []).map(async (photo) => ({
          ...photo,
          photo_url: await getFeaturedPhotoSignedUrl(photo.storage_path),
        }))
      );

      // The avatar lives in the same private bucket, so it needs a signed link too.
      // get_portal returns the photographer fields at the top level; also check nested shapes.
      const avatarPath =
        data?.avatar_path || data?.profile?.avatar_path || data?.photographer?.avatar_path || null;
      const avatarSignedUrl = await getFeaturedPhotoSignedUrl(avatarPath);

      // Stats, profile info and carousel albums (see get_portal_extras in Supabase).
      const extras = await loadExtras(id);

      if (request !== requestRef.current) return;
      setPortal({
        ...data,
        featured_photos: featuredPhotos,
        avatar_signed_url: avatarSignedUrl,
        // PortfolioTab reads portal.overview (stats + info) and portal.albums.
        // If the extras call failed, keep whatever get_portal already had.
        overview: extras ? { stats: extras.stats, info: extras.info } : undefined,
        albums: extras ? extras.albums : data.albums,
      });
    } catch (err) {
      if (request !== requestRef.current) return;
      console.error("Failed to load portal:", err.message || err);
      setError(err.message || "Failed to load photographer portal.");
      setPortal(null);
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, []);

  // switching photographer: clear the old one, then load the new one
  useEffect(() => {
    setPortal(null);
    load(photographerId);
  }, [photographerId, load]);

  const reload = useCallback(() => load(photographerId), [load, photographerId]);

  return { portal, loading, error, reload };
}