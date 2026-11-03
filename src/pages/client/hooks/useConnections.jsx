import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export function useConnections(user, authLoading) {
  const [connections, setConnections] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState("");
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [codeError, setCodeError] = useState("");

  // keep the latest activeId without making `load` change every time it changes
  const activeRef = useRef(null);
  activeRef.current = activeId;

  const load = useCallback(async (preferredId = null) => {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.rpc("my_connections");
      if (error) {
        console.error("Failed to load connections:", error.message);
        setError(error.message);
        return [];
      }
      const rows = Array.isArray(data) ? data : [];
      setConnections(rows);
      const has = (id) => id && rows.some((row) => row.photographer_id === id);
      setActiveId(
        has(preferredId) ? preferredId : has(activeRef.current) ? activeRef.current : rows[0]?.photographer_id || null
      );
      if (rows.length > 0) setShowCodeForm(false);
      return rows;
    } catch (err) {
      console.error("Unexpected connection loading error:", err);
      setError(err.message || "Could not load your photographer connections.");
      return [];
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      load();
    } else {
      setConnections([]);
      setActiveId(null);
      setLoaded(false);
      setError("");
      setCodeError("");
      setShowCodeForm(false);
    }
  }, [user, authLoading, load]);

  const connect = async (code, reset) => {
    setConnecting(true);
    setCodeError("");
    setError("");
    try {
      const { data, error } = await supabase.rpc("connect_with_code", {
        p_code: code.trim().toUpperCase(),
      });
      if (error) throw error;

      // connect_with_code returns { success: true, photographer_id: "..." }
      const photographerId = data?.photographer_id;
      if (!photographerId || typeof photographerId !== "string") {
        throw new Error("The connection response did not include a valid photographer ID.");
      }
      const rows = await load(photographerId);
      if (!rows.some((row) => row.photographer_id === photographerId)) {
        throw new Error(
          "The code was accepted, but the saved connection could not be found. Refresh and try again."
        );
      }
      reset?.();
      setShowCodeForm(false);
      setActiveId(photographerId);
    } catch (err) {
      console.error("Failed to connect to photographer:", err);
      setCodeError(err.message || "Could not connect to the photographer.");
    } finally {
      setConnecting(false);
    }
  };

  return {
    connections,
    activeId,
    setActiveId,
    loading,
    error,
    noConnections: loaded && !loading && connections.length === 0,
    showCodeForm,
    openCodeForm: () => {
      setCodeError("");
      setShowCodeForm(true);
    },
    closeCodeForm: () => setShowCodeForm(false),
    connecting,
    codeError,
    connect,
  };
}