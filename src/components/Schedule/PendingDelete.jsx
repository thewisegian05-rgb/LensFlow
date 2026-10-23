import { useEffect, useState } from "react";

// Module-level state: components unmount when you switch pages/tabs,
// but this module stays alive, so the "deleting" state is never lost.
const pending = new Set();
const listeners = new Set();

const emit = () => listeners.forEach((fn) => fn(new Set(pending)));

export const markDeleting = (id) => {
  pending.add(id);
  emit();
};

export const unmarkDeleting = (id) => {
  pending.delete(id);
  emit();
};

export function usePendingDeletes() {
  const [ids, setIds] = useState(() => new Set(pending));

  useEffect(() => {
    listeners.add(setIds);
    // catch up if a delete started while this component was unmounted
    setIds(new Set(pending));

    return () => {
      listeners.delete(setIds);
    };
  }, []);

  return ids;
}