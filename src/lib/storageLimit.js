import { supabase } from "./supabaseClient";

// Storage limit per user. Change it here and every page that imports it follows.
export const STORAGE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB

// Adds up the size of every photo the user owns, including files sitting in
// Media Storage's Trash (they still occupy space until permanently deleted).
export async function getUsedBytes(userId) {
  const PAGE_SIZE = 1000;
  let total = 0;

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("photos")
      .select("size_bytes")
      .eq("user_id", userId)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    total += (data || []).reduce(
      (sum, row) => sum + (Number(row.size_bytes) || 0),
      0
    );

    if (!data || data.length < PAGE_SIZE) break;
  }

  return total;
}

// Splits dropped files into the ones that still fit and the ones that don't.
// Files are accepted in order until the limit would be passed.
export function splitByLimit(files, usedBytes) {
  let remaining = Math.max(STORAGE_LIMIT_BYTES - usedBytes, 0);
  const accepted = [];
  const rejected = [];

  for (const file of files) {
    if (file.size <= remaining) {
      accepted.push(file);
      remaining -= file.size;
    } else {
      rejected.push(file);
    }
  }

  return { accepted, rejected, remaining };
}