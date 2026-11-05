// Supabase Edge Function: send-event-email
//
// Emails the client when a creative adds (or meaningfully changes) an event
// for them from the creatives portal.
//
// The browser sends ONLY { event_id, kind }. Everything else (the recipient,
// the event details, the photographer's name) is loaded here using the
// caller's own login, so the function can't be used to email arbitrary
// addresses or send arbitrary text.
//
// Required secrets (supabase secrets set ...):
//   RESEND_API_KEY     your Resend API key
//   FROM_EMAIL         e.g. LensEase <bookings@yourdomain.com>  (verified domain)
// Optional secrets:
//   CLIENT_PORTAL_URL  link shown as "View in client portal"
//   EVENT_TIMEZONE     defaults to Asia/Manila
//
// SUPABASE_URL and SUPABASE_ANON_KEY are provided automatically.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const peso = (n: number) =>
  `PHP ${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const GMAIL_PATTERN = /^[a-z0-9.]+@(gmail|googlemail)\.com$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  try {
    const { event_id: eventId, kind } = await req.json();

    if (typeof eventId !== "string" || !eventId) {
      return json({ error: "event_id is required." }, 400);
    }

    if (kind !== "created" && kind !== "updated") {
      return json({ error: 'kind must be "created" or "updated".' }, 400);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL");

    if (!resendKey || !fromEmail) {
      console.error("RESEND_API_KEY or FROM_EMAIL is not set.");
      return json({ error: "Email isn't set up on the server yet." }, 500);
    }

    // Everything below runs as the signed-in creative, so row-level security
    // applies: they can only read their own events and clients.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;

    if (userError || !user) {
      return json({ error: "Not signed in." }, 401);
    }

    const { data: event, error: eventError } = await supabase
      .from("schedule_events")
      .select(
        "id, user_id, title, client, client_id, location, start_time, end_time, talent_fee"
      )
      .eq("id", eventId)
      .maybeSingle();

    if (eventError || !event) {
      return json({ error: "Event not found." }, 404);
    }

    if (event.user_id !== user.id) {
      return json({ error: "You can only email clients of your own events." }, 403);
    }

    if (!event.client_id) {
      return json({ error: "This event has no client." }, 400);
    }

    const { data: client } = await supabase
      .from("clients")
      .select("name, email")
      .eq("id", event.client_id)
      .maybeSingle();

    const to = String(client?.email ?? "").trim().toLowerCase();

    if (!to || !GMAIL_PATTERN.test(to)) {
      return json({ error: "The client has no valid Google email on file." }, 400);
    }

    // Photographer's display name (best effort: profiles columns vary).
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const photographerName =
      profile?.full_name ||
      profile?.name ||
      profile?.display_name ||
      profile?.username ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      "Your photographer";

    // Downpayment (best effort: skipped if payments can't be read).
    let received = 0;
    const { data: payments } = await supabase
      .from("event_payments")
      .select("amount")
      .eq("event_id", event.id);

    if (Array.isArray(payments)) {
      received = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    }

    const fee = Number(event.talent_fee) || 0;
    const balance = Math.max(fee - received, 0);

    const timeZone = Deno.env.get("EVENT_TIMEZONE") || "Asia/Manila";
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);

    const dateText = new Intl.DateTimeFormat("en-PH", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone,
    }).format(start);

    const timeFormat = new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    });
    const timeText = `${timeFormat.format(start)} to ${timeFormat.format(end)}`;

    const clientName = String(client?.name || event.client || "there");
    const firstName = clientName.split(" ")[0];
    const portalUrl = Deno.env.get("CLIENT_PORTAL_URL") || "";

    const isCreated = kind === "created";
    const subject = isCreated
      ? `Booking added: ${event.title} on ${dateText}`
      : `Booking updated: ${event.title} on ${dateText}`;

    const intro = isCreated
      ? `${photographerName} has added a booking for you.`
      : `${photographerName} updated the details of your booking.`;

    // [label, value] rows shown in the email.
    const rows: Array<[string, string]> = [
      ["Event", String(event.title)],
      ["Date", dateText],
      ["Time", timeText],
    ];

    if (event.location) rows.push(["Location", String(event.location)]);
    if (fee > 0) {
      rows.push(["Agreed fee", peso(fee)]);
      if (received > 0) rows.push(["Downpayment received", peso(received)]);
      rows.push(["Balance due after the event", peso(balance)]);
    }

    const rowsHtml = rows
      .map(
        ([label, value]) =>
          `<tr>
            <td style="padding:6px 16px 6px 0;color:#64748b;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
            <td style="padding:6px 0;color:#0f172a;font-weight:600;">${escapeHtml(value)}</td>
          </tr>`
      )
      .join("");

    const buttonHtml = portalUrl
      ? `<p style="margin:24px 0 0;">
           <a href="${escapeHtml(portalUrl)}"
              style="background:#0ea5e9;color:#0f172a;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px;display:inline-block;">
             View in client portal
           </a>
         </p>`
      : "";

    const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
      <h2 style="margin:0 0 8px;color:#0f172a;">${isCreated ? "Your booking is set" : "Your booking was updated"}</h2>
      <p style="margin:0 0 20px;color:#334155;line-height:1.5;">
        Hi ${escapeHtml(firstName)}, ${escapeHtml(intro)}
        Here are the details:
      </p>
      <table style="border-collapse:collapse;font-size:14px;">${rowsHtml}</table>
      ${buttonHtml}
      <p style="margin:24px 0 0;color:#64748b;font-size:12px;line-height:1.5;">
        If anything here looks wrong, just reply to this email and
        ${escapeHtml(photographerName)} will get back to you.
      </p>
    </div>
  </body>
</html>`;

    const text = [
      `Hi ${firstName},`,
      "",
      `${intro} Here are the details:`,
      "",
      ...rows.map(([label, value]) => `${label}: ${value}`),
      portalUrl ? `\nView in client portal: ${portalUrl}` : "",
      "",
      `If anything looks wrong, reply to this email and ${photographerName} will get back to you.`,
    ].join("\n");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        // Replies go to the photographer, not to the no-reply sender.
        reply_to: user.email ?? undefined,
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Resend error:", response.status, detail);
      return json({ error: "The email service rejected the message." }, 502);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("send-event-email failed:", err);
    return json({ error: "Something went wrong sending the email." }, 500);
  }
});