import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { getFeaturedPhotoSignedUrl } from "../utils/portalUrls";

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
      if (request !== requestRef.current) return;
      setPortal({ ...data, featured_photos: featuredPhotos });
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