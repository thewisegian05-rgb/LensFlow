import { useEffect, useState } from "react";
import { FaUserCircle } from "react-icons/fa";
import Section from "../components/ui/Section";
import TabHeader from "../components/ui/TabHeader";
import { supabase } from "../../../lib/supabaseClient";

/*
  Client Profile page (starter).
  For now it only shows the signed-in account. Add the editable profile
  fields here once the profile data is synced.
*/

function Row({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-800 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-slate-200">{value || "Not set"}</dd>
    </div>
  );
}

export default function ProfileTab() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setUser(data?.user ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const meta = user?.user_metadata || {};
  const name = meta.full_name || meta.name || meta.display_name || user?.email?.split("@")[0] || "Client";
  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="min-w-0 space-y-4">
      <TabHeader eyebrow="Account" title="Profile" text="Your account details." />

      <Section title="My Profile" dot="bg-sky-400">
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading...</p>
        ) : !user ? (
          <p className="py-6 text-center text-sm text-slate-500">You're not signed in.</p>
        ) : (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-800 text-4xl text-slate-400">
              {meta.avatar_url ? (
                <img src={meta.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                <FaUserCircle />
              )}
            </div>
            <dl className="min-w-0 flex-1">
              <Row label="Name" value={name} />
              <Row label="Email" value={user.email} />
              <Row label="Member since" value={joined} />
            </dl>
          </div>
        )}
      </Section>
    </div>
  );
}