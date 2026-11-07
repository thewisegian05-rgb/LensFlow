import { useEffect, useState } from "react";
import { FaKey } from "react-icons/fa";
import Section from "../components/ui/Section";
import TabHeader from "../components/ui/TabHeader";
import { supabase } from "../../../lib/supabaseClient";

/*
  Client Settings page (starter).
  Has a working "change password" email. Add more settings sections here later.
*/

export default function SettingsTab() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setEmail(data?.user?.email || "");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sendReset = async () => {
    if (!email) return;
    setBusy(true);
    setMessage("");
    setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setBusy(false);
    if (resetError) {
      console.error("Password reset failed:", resetError);
      setError(resetError.message || "Couldn't send the reset email.");
    } else {
      setMessage(`We sent a password reset link to ${email}.`);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <TabHeader eyebrow="Account" title="Settings" text="Manage your account." />

      <Section title="Security" dot="bg-amber-400">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100">Password</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {email ? `We'll email a reset link to ${email}.` : "Sign in to change your password."}
            </p>
          </div>
          <button
            type="button"
            onClick={sendReset}
            disabled={busy || !email}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaKey /> {busy ? "Sending..." : "Send reset link"}
          </button>
        </div>
        {message && (
          <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}
      </Section>
    </div>
  );
}