import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

/* Sign in / sign up (clients use their own account) */
export default function ClientAuth() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (mode === "signup") {
      setInfo("Check your email to confirm your account, then sign in.");
    }
  }

  return (
    <main className="flex min-h-[100dvh] w-full items-center justify-center overflow-x-hidden bg-[#070D1D] px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <section className="lf-rise my-auto w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-5 shadow-2xl shadow-black/30 sm:p-7">
        <h2 className="mb-1 text-lg font-semibold text-white sm:text-xl">
          {mode === "signin" ? "Client sign in" : "Create a client account"}
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Sign in, then enter the code your photographer gave you.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="min-h-11 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 sm:text-sm"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="min-h-11 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 sm:text-sm"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          {info && <p className="text-xs text-sky-400">{info}</p>}
          <button
            type="submit"
            disabled={loading}
            className="lf-btn min-h-11 w-full rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setInfo("");
          }}
          className="mt-3 w-full text-center text-xs text-slate-400 hover:text-white"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}