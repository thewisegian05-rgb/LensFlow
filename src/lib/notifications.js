/*
  Tiny notification store (lives outside React, saved in localStorage).

  Anything in the app can call pushNotification(...), even after the page
  that started the work has been left. The bell reads from here.
*/

const KEY = "lensflow_notifications";
const MAX_ITEMS = 30;

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let items = load();
let snapshot = items; // stable reference, replaced only when something changes
const subscribers = new Set();

function commit(next) {
  items = next.slice(0, MAX_ITEMS);
  snapshot = items;

  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage full or blocked: keep working in memory.
  }

  subscribers.forEach((fn) => fn());
}

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/* ---- store API (works with useSyncExternalStore) ---- */
export function subscribeNotifications(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function getNotifications() {
  return snapshot;
}

/* ---- actions ---- */

// type: "culling" | "previews" | "info"   to: optional route to open on click
export function pushNotification({ type = "info", title, body = "", to = null }) {
  commit([
    { id: newId(), type, title, body, to, createdAt: Date.now(), read: false },
    ...items,
  ]);
}

export function markAllRead() {
  if (items.some((item) => !item.read)) {
    commit(items.map((item) => ({ ...item, read: true })));
  }
}

export function clearNotifications() {
  commit([]);
}

// Development only: lets you test the bell from the browser console, e.g.
//   pushNotification({ type: "culling", title: "Test", body: "It works" })
if (typeof window !== "undefined" && import.meta.env && import.meta.env.DEV) {
  window.pushNotification = pushNotification;
}