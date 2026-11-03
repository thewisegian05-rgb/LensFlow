import { supabase } from "./supabaseClient";
import { PHOTOS_BUCKET, getSignedUrlMap } from "./photoStorage";

/*
  All Supabase access for the Profile page.

  Tables:   profiles, profile_albums, profile_album_photos, profile_featured_photos
  Storage:  the existing "photos" bucket, under  <userId>/profile/...
*/

const MAX_AVATAR = 640;
const MAX_PHOTO = 1600;

/* ============ helpers ============ */

// Shrink a photo in the browser before upload so profile images stay light.
async function resizeToWebp(file, maxSize, quality = 0.85) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality)
  );
  if (!blob) throw new Error("Could not process that image.");
  return blob;
}

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function uploadImage(userId, kind, file, maxSize) {
  const blob = await resizeToWebp(file, maxSize);
  const path = `${userId}/profile/${kind}/${newId()}.webp`;

  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, blob, { contentType: "image/webp" });

  if (error) throw error;
  return path;
}

async function removePaths(paths) {
  const list = (paths || []).filter(Boolean);
  if (list.length === 0) return;

  const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove(list);
  if (error) console.error("Storage cleanup failed:", error);
}

function mapPhoto(row, urls) {
  return {
    id: row.id,
    title: row.title || "",
    path: row.storage_path,
    src: urls[row.storage_path] || "",
  };
}

/* ============ load ============ */

export async function fetchProfileBundle(userId) {
  const [profileRes, albumsRes, featuredRes] = await Promise.all([
    supabase.from("profile_details").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("profile_albums")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true }),
    supabase
      .from("profile_featured_photos")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true }),
  ]);

  for (const res of [profileRes, albumsRes, featuredRes]) {
    if (res.error) throw res.error;
  }

  const albumRows = albumsRes.data || [];
  const featuredRows = featuredRes.data || [];
  let photoRows = [];

  if (albumRows.length > 0) {
    const { data, error } = await supabase
      .from("profile_album_photos")
      .select("*")
      .in(
        "album_id",
        albumRows.map((a) => a.id)
      )
      .order("position", { ascending: true });

    if (error) throw error;
    photoRows = data || [];
  }

  const profileRow = profileRes.data;

  // One request signs every image on the page.
  const urls = await getSignedUrlMap(
    [
      profileRow?.avatar_path,
      ...photoRows.map((p) => p.storage_path),
      ...featuredRows.map((p) => p.storage_path),
    ].filter(Boolean)
  );

  return {
    profile: profileRow
      ? {
          username: profileRow.username,
          bio: profileRow.bio,
          profileInfo: profileRow.profile_info || {},
          avatarPath: profileRow.avatar_path || null,
          avatarUrl: urls[profileRow.avatar_path] || "",
        }
      : null,
    albums: albumRows.map((album) => ({
      id: album.id,
      title: album.title || "",
      photos: photoRows
        .filter((p) => p.album_id === album.id)
        .map((p) => mapPhoto(p, urls)),
    })),
    featured: featuredRows.map((p) => mapPhoto(p, urls)),
  };
}

/* ============ profile row ============ */

export async function saveProfileFields(userId, fields) {
  const { error } = await supabase
    .from("profile_details")
    .upsert(
      { user_id: userId, ...fields, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}

export async function setAvatar(userId, file, oldPath) {
  const path = await uploadImage(userId, "avatar", file, MAX_AVATAR);

  try {
    await saveProfileFields(userId, { avatar_path: path });
  } catch (err) {
    await removePaths([path]);
    throw err;
  }

  if (oldPath) await removePaths([oldPath]);

  const urls = await getSignedUrlMap([path]);
  return { path, url: urls[path] || "" };
}

export async function deleteAvatar(userId, oldPath) {
  // Clear the database reference first.
  await saveProfileFields(userId, { avatar_path: null });

  // Remove the old image from Supabase Storage.
  if (oldPath) await removePaths([oldPath]);
}

// One-time import of what the old localStorage version saved
// (name, bio, details and profile picture). Photos can't be recovered:
// the old version only stored temporary browser links for them.
export async function migrateLocalProfile(userId) {
  let data = null;

  try {
    const raw = localStorage.getItem("lensflow_profile");
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!data) return false;

  await saveProfileFields(userId, {
    username: data.username ?? null,
    bio: data.bio ?? null,
    profile_info: data.profileInfo || {},
  });

  if (typeof data.profilePicture === "string" && data.profilePicture.startsWith("data:")) {
    try {
      const blob = await (await fetch(data.profilePicture)).blob();
      const file = new File([blob], "avatar", { type: blob.type || "image/jpeg" });
      await setAvatar(userId, file, null);
    } catch (err) {
      console.error("Avatar migration failed:", err);
    }
  }

  return true;
}

/* ============ carousel albums ============ */

export async function createAlbum(userId, title, items) {
  const { data: album, error } = await supabase
    .from("profile_albums")
    .insert({ user_id: userId, title, position: Date.now() })
    .select()
    .single();

  if (error) throw error;

  try {
    const photos = await addAlbumPhotos(userId, album.id, items);
    return { id: album.id, title: album.title || "", photos };
  } catch (err) {
    await supabase.from("profile_albums").delete().eq("id", album.id);
    throw err;
  }
}

export async function renameAlbum(albumId, title) {
  const { error } = await supabase
    .from("profile_albums")
    .update({ title })
    .eq("id", albumId);

  if (error) throw error;
}

export async function addAlbumPhotos(userId, albumId, items) {
  const uploaded = [];

  try {
    const rows = [];

    for (let i = 0; i < items.length; i++) {
      const path = await uploadImage(userId, "album", items[i].file, MAX_PHOTO);
      uploaded.push(path);
      rows.push({
        album_id: albumId,
        user_id: userId,
        storage_path: path,
        title: items[i].title || "",
        position: Date.now() + i,
      });
    }

    const { data, error } = await supabase
      .from("profile_album_photos")
      .insert(rows)
      .select();

    if (error) throw error;

    const urls = await getSignedUrlMap(data.map((r) => r.storage_path));
    return [...data]
      .sort((a, b) => a.position - b.position)
      .map((r) => mapPhoto(r, urls));
  } catch (err) {
    await removePaths(uploaded);
    throw err;
  }
}

export async function deleteAlbumPhoto(photo) {
  const { error } = await supabase
    .from("profile_album_photos")
    .delete()
    .eq("id", photo.id);

  if (error) throw error;
  await removePaths([photo.path]);
}

export async function deleteAlbum(album) {
  // Photo rows are removed with the album (cascade); clean up the files too.
  const { error } = await supabase
    .from("profile_albums")
    .delete()
    .eq("id", album.id);

  if (error) throw error;
  await removePaths(album.photos.map((p) => p.path));
}

/* ============ featured photos ============ */

export async function addFeatured(userId, items) {
  const uploaded = [];

  try {
    const rows = [];

    for (let i = 0; i < items.length; i++) {
      const path = await uploadImage(userId, "featured", items[i].file, MAX_PHOTO);
      uploaded.push(path);
      rows.push({
        user_id: userId,
        storage_path: path,
        title: items[i].title || "",
        position: Date.now() + i,
      });
    }

    const { data, error } = await supabase
      .from("profile_featured_photos")
      .insert(rows)
      .select();

    if (error) throw error;

    const urls = await getSignedUrlMap(data.map((r) => r.storage_path));
    return [...data]
      .sort((a, b) => a.position - b.position)
      .map((r) => mapPhoto(r, urls));
  } catch (err) {
    await removePaths(uploaded);
    throw err;
  }
}

export async function renameFeatured(photoId, title) {
  const { error } = await supabase
    .from("profile_featured_photos")
    .update({ title })
    .eq("id", photoId);

  if (error) throw error;
}

export async function deleteFeatured(photo) {
  const { error } = await supabase
    .from("profile_featured_photos")
    .delete()
    .eq("id", photo.id);

  if (error) throw error;
  await removePaths([photo.path]);
}