// src/lib/pendingDeletes.js
import { useEffect, useMemo, useState } from "react";

// Module-level state: components unmount when you switch pages/tabs,
// but this module stays alive, so the "deleting" state is never lost.
// id -> label (the label is what the toast shows, e.g. the event title)
const pending = new Map();
const listeners = new Set();

const emit = () => listeners.forEach((fn) => fn(new Map(pending)));

export const markDeleting = (id, label = "") => {
  pending.set(id, label);
  emit();
};

export const unmarkDeleting = (id) => {
  pending.delete(id);
  emit();
};

function usePendingMap() {
  const [map, setMap] = useState(() => new Map(pending));

  useEffect(() => {
    listeners.add(setMap);
    // catch up if a delete started while this component was unmounted
    setMap(new Map(pending));

    return () => {
      listeners.delete(setMap);
    };
  }, []);

  return map;
}

// Set of ids being deleted (used by the row exit animation)
export function usePendingDeletes() {
  const map = usePendingMap();
  return useMemo(() => new Set(map.keys()), [map]);
}

// [{ id, label }] (used by the "Deleting..." toast)
export function usePendingDeleteItems() {
  const map = usePendingMap();
  return useMemo(
    () => Array.from(map, ([id, label]) => ({ id, label })),
    [map]
  );
}