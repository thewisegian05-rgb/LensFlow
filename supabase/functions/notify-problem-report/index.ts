// @ts-nocheck
// // Posts every new row in public.problem_reports to a Discord channel.
// Triggered by a Supabase Database Webhook (INSERT on problem_reports).

const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL");

const cut = (text: string, max: number) =>
  text.length > max ? text.slice(0, max - 1) + "…" : text;

Deno.serve(async (req) => {
  if (!DISCORD_WEBHOOK_URL) {
    return new Response("Missing DISCORD_WEBHOOK_URL secret", { status: 500 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const report = payload?.record;
  if (payload?.type !== "INSERT" || !report) {
    return new Response("Ignored", { status: 200 });
  }

  const res = await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "LensFlow Reports",
      // Stops anything a user types (like @everyone) from pinging people.
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: cut(`New problem report: ${report.subject}`, 250),
          description: cut(report.description ?? "", 3500),
          color: 0x0ea5e9,
          fields: [
            { name: "Category", value: cut(report.category || "-", 1000), inline: true },
            { name: "From", value: cut(report.user_email || "Unknown", 1000), inline: true },
            { name: "Page", value: cut(report.page_url || "-", 1000) },
          ],
          footer: { text: `Report ${report.id}` },
          timestamp: report.created_at,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("Discord rejected the message:", res.status, await res.text());
    return new Response("Discord error", { status: 502 });
  }

  return new Response("ok", { status: 200 });
});