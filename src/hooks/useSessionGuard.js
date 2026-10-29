import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

// How often an open tab asks the server "is my session still valid?"
const CHECK_EVERY_MS = 20000;

// Logged-in pages call this once. If this device was signed out from another
// device ("Sign Out Other Devices"), it notices within seconds and sends the
// user back to the login page.
export default function useSessionGuard(loginPath = "/login") {
  const navigate = useNavigate();

  useEffect(() => {
    let stopped = false;

    const goToLogin = () => {
      if (!stopped) navigate(loginPath, { replace: true });
    };

    const check = async () => {
      if (stopped || document.visibilityState !== "visible") return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Nothing stored locally: already signed out.
      if (!session) return;

      // getUser() asks the server, so it fails once the session was revoked.
      const { error } = await supabase.auth.getUser();

      // Only react to real auth failures, not to a dropped connection.
      if (error && (error.status === 401 || error.status === 403)) {
        await supabase.auth.signOut({ scope: "local" });
        goToLogin();
      }
    };

    // Check right away when the user comes back to the tab, then on a timer.
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    const timer = setInterval(check, CHECK_EVERY_MS);

    // Also react whenever Supabase itself reports a sign out.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") goToLogin();
    });

    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      clearInterval(timer);
      listener.subscription.unsubscribe();
    };
  }, [navigate, loginPath]);
}