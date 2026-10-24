// src/lib/pendingDeletes.js
import { useMemo, useSyncExternalStore } from "react";

// ---------------------------------------------------------
// Shared "deleting" store.
// ---------------------------------------------------------

const DONE_VISIBLE_MS = 1800;   // how long the "Deleted" toast stays
const ERROR_VISIBLE_MS = 4000;  // how long the "Failed" toast stays

let items = [];
const listeners = new Set();
const timers = new Map();

const setItems = (next) => {
  items = next; // always a NEW array, so React sees the change
  listeners.forEach((fn) => fn());
};

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const getSnapshot = () => items;

const clearTimer = (id) => {
  clearTimeout(timers.get(id));
  timers.delete(id);
};

// ---------------------------------------------------------
// Basic API (unchanged: existing code keeps working)
// ---------------------------------------------------------

export const markDeleting = (id, label = "") => {
  clearTimer(id);
  setItems([
    ...items.filter((item) => item.id !== id),
    { id, label, status: "deleting", message: "" },
  ]);
};

// Removes the item completely (no "done" toast).
export const unmarkDeleting = (id) => {
  clearTimer(id);
  setItems(items.filter((item) => item.id !== id));
};

// ---------------------------------------------------------
// New: finish with a visible result
// ---------------------------------------------------------

export const finishDeleting = (id, { ok = true, message = "" } = {}) => {
  if (!items.some((item) => item.id === id)) return;

  clearTimer(id);

  setItems(
    items.map((item) =>
      item.id === id
        ? { ...item, status: ok ? "done" : "error", message }
        : item
    )
  );

  timers.set(
    id,
    setTimeout(() => unmarkDeleting(id), ok ? DONE_VISIBLE_MS : ERROR_VISIBLE_MS)
  );
};

// ---------------------------------------------------------
   //   RUNDELETE
// ---------------------------------------------------------

export async function runDelete({ id, label = "", task, onDone, minMs = 1000 }) {
  markDeleting(id, label);

  const minWait = new Promise((resolve) => setTimeout(resolve, minMs));

  try {
    await task();
    await minWait;
    await onDone?.();
    finishDeleting(id, { ok: true });
    return true;
  } catch (err) {
    console.error("Delete failed:", err?.message || err);
    finishDeleting(id, { ok: false, message: err?.message || "" });
    return false;
  }
}

// ---------------------------------------------------------
// Hooks
// ---------------------------------------------------------


export function usePendingDeletes() {
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return useMemo(
    () =>
      new Set(
        all.filter((item) => item.status === "deleting").map((item) => item.id)
      ),
    [all]
  );
}

// Every toast item, including "done" / "error" (used by DeleteToast).
export function usePendingDeleteItems() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}