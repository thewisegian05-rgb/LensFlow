import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { supabase } from "../../lib/supabaseClient";
import { CATEGORY_LABELS } from "./eventCategory";
import { CREW_ROLES, crewSummary, crewTotal } from "./CrewNeededField";

// Database function that cancels a booked event after the client asked to cancel.
// It receives { p_id } (the booking request id). If yours is named differently,
// change it here.
const APPROVE_CANCELLATION_RPC = "approve_booking_cancellation";

// Confirms the downpayment of an event the photographer added by hand
// (those requests carry extra details in `manual_details`). It receives
// { p_id, p_paid_at } and returns the new schedule event's id.
const MANUAL_CONFIRM_RPC = "confirm_manual_downpayment";

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const shortDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const todayString = () => new Date().toLocaleDateString("en-CA");

// The transaction date the OCR read from a receipt, shown as a readable date.
// If your table names this column differently, add it to the list below.
const displayOcrTransactionDate = (submission) => {
  const raw =
    submission?.ocr_transaction_date ||
    submission?.ocr_transaction_at ||
    submission?.ocr_transaction_datetime ||
    "";

  if (!raw) return "Not detected";

  const text = String(raw);
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text);

  return Number.isNaN(parsed.getTime())
    ? text
    : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

// Talent fee and downpayment: whole pesos, up to 6 digits (max ₱999,999).
const MAX_MONEY_DIGITS = 6;
const moneyDigits = (value) => String(value).replace(/\D/g, "").slice(0, MAX_MONEY_DIGITS);

// No text box accepts more than this many characters.
const MAX_TEXT_LENGTH = 500;

// Message to the client: at most 500 characters, and "www" is cut down to "ww"
// (so "wwww" becomes "ww" too).
const cleanMessage = (value) =>
  String(value)
    .replace(/w{3,}/gi, (run) => run.slice(0, 2))
    .slice(0, MAX_TEXT_LENGTH);

// Quick reasons for declining. Picking one fills the message box, and it can
// still be edited before sending. To add or change a reason, edit this list.
const QUICK_REASONS = [
  {
    label: "Already booked on that date",
    text: "Thank you for your request. Unfortunately I'm already booked on that date. You're welcome to send a new request for another day and I'll gladly check my schedule.",
  },
  {
    label: "Schedule conflict at that time",
    text: "Thank you for your request. I have another commitment that overlaps with your event time, so I can't take this booking. If the time can be moved, please send a new request.",
  },
  {
    label: "Fully booked that week or season",
    text: "Thank you for thinking of me. My schedule is fully booked for that period, so I can't take on more events. I hope you find the right photographer for your day.",
  },
  {
    label: "Venue is too far / outside my service area",
    text: "Thank you for your request. The venue is outside the area I currently cover, so I can't commit to this booking. I wish you a great event.",
  },
  {
    label: "Team or crew not available",
    text: "Thank you for your request. I'm unable to put together the full team you asked for on that date, so I have to decline. Please feel free to request again with a different date or a smaller crew.",
  },
  {
    label: "Equipment not available",
    text: "Thank you for your request. The equipment needed for this event (for example drone or special gear) isn't available on that date, so I can't take this booking.",
  },
  {
    label: "Budget doesn't fit",
    text: "Thank you for your request. After reviewing the scope of the event, I'm not able to fit it within this booking. You're welcome to send a new request with an adjusted scope or crew.",
  },
  {
    label: "Not enough lead time",
    text: "Thank you for your request. There isn't enough time before the event for me to prepare properly, so I have to decline. For future events, please book a little earlier.",
  },
  {
    label: "I don't cover this type of event",
    text: "Thank you for your request. This type of event isn't something I currently offer, so I'm not the right fit. I hope you find a photographer who specializes in it.",
  },
  {
    label: "Personal or health reasons",
    text: "Thank you for your request. Due to personal reasons I'm unable to accept bookings on that date. I apologize for the inconvenience.",
  },
  {
    label: "Venue or event details are unclear",
    text: "Thank you for your request. I need clearer details about the venue and the event before I can accept. Please send a new request with the complete information.",
  },
  {
    label: "Other (write my own)",
    text: "",
  },
];

const field =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none";

// ---------- production team ----------
// The assigned team is saved on the request as [{ name, position }] and shown
// on the schedule event as readable text, the same format the Add Event form
// uses:  "Juan (Photographer) · Maria (Videographer)"
const MEMBER_SEPARATOR = " · ";

// Position given to rows the photographer adds with "+ Add team member".
// Positions can't be typed; the ones the client asked for are filled in automatically.
const DEFAULT_POSITION = "Assistant";

// Parentheses and "·" are never allowed because they separate members in the text.
const NAME_RULE = /[^\p{L}\p{M}\s.'’-]/gu;

const cleanText = (value, rule, max) =>
  String(value).replace(rule, "").replace(/^\s+/, "").replace(/\s{2,}/g, " ").slice(0, max);

const MAX_NAME_LENGTH = 40; // whole name
const MAX_TEAM_SIZE = 20; // rows in one team

// What can be typed in a name box. On top of the letters-only rule:
//  - it must start with a letter
//  - the same letter can't repeat 3+ times in a row ("Aaaaron" -> "Aaron")
//  - one word can't be longer than 20 characters
const cleanName = (value) =>
  cleanText(value, NAME_RULE, MAX_NAME_LENGTH)
    .replace(/^[^\p{L}]+/u, "")
    .replace(/(\p{L})\1{2,}/giu, "$1$1")
    .replace(/([\p{L}\p{M}.'’-]{20})[\p{L}\p{M}.'’-]+/gu, "$1");

// "juan dela cruz" -> "Juan Dela Cruz" (only the first letters are touched,
// so names like "McDonald" stay as typed).
const toTitleCase = (name) =>
  name.replace(/(^|[\s-])(\p{L})/gu, (_, sep, ch) => `${sep}${ch.toUpperCase()}`);

// Returns a message if the name doesn't look like a real name, otherwise null.
const nameProblem = (name) => {
  const letters = name.replace(/[^\p{L}]/gu, "");

  if (letters.length < 2) return "a name needs at least 2 letters.";

  if (/^[a-z]+$/i.test(letters) && !/[aeiouy]/i.test(letters)) {
    return "this doesn't look like a real name.";
  }

  return null;
};

const emptyMember = (position = "") => ({ name: "", position });

// One empty row per creative the client asked for, with the position already
// filled in, so the photographer only has to type the names.
const teamFromCrew = (crew) => {
  const rows = [];
  for (const role of CREW_ROLES) {
    const n = Math.min(Math.max(Math.floor(Number(crew?.[role.key]) || 0), 0), 10);
    for (let i = 0; i < n; i += 1) rows.push(emptyMember(role.single));
  }
  return rows.length ? rows : [emptyMember(DEFAULT_POSITION)];
};

const cleanTeam = (members) =>
  (members || [])
    .map((m) => ({ name: String(m.name || "").trim(), position: String(m.position || "").trim() }))
    .filter((m) => m.name);

const teamToText = (members) =>
  cleanTeam(members)
    .map((m) => (m.position ? `${m.name} (${m.position})` : m.name))
    .join(MEMBER_SEPARATOR);

// The team to show for a request: the one assigned here, or the one typed in
// the Add Event form for events added by hand.
const teamTextOf = (r) =>
  (Array.isArray(r.team_members) && teamToText(r.team_members)) ||
  String(r.manual_details?.photographer || "");

/**
 * Photographer's inbox of client booking requests. Two separate boxes:
 *
 * Booking Requests
 * 1. See how many creatives the client needs, assign your team (names; the
 *    positions are filled in from the request), quote a talent fee +
 *    downpayment (or decline).
 * 2. After the client accepts, the request waits here as "Awaiting downpayment".
 *    Events the photographer adds by hand also wait here.
 * 3. "Downpayment received" puts the event on the schedule (with the team you
 *    assigned); "Cancel" drops it.
 *
 * Cancellation Requests
 * 4. If a client asks to cancel a booked event, it shows up here to approve or keep.
 *
 *  onBooked   - called after the schedule changes (downpayment confirmed or
 *               booking cancelled) so the schedule can refresh
 *  onMessage  - optional. Called with the request when you click "Message", so
 *               you can open your own chat. Without it, "Message" opens an email
 *               (client_email) or text (client_phone) if the request has one.
 *  refreshKey - optional. Change this number to make the list reload right away
 *               (e.g. after a manual event was added).
 */
export default function BookingRequests({
  hideWhenEmpty = false,
  onBooked,
  onMessage,
  refreshKey = 0,
}) {
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({}); // { [id]: { fee, downpayment, message, team } }
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [errorId, setErrorId] = useState(null); // which request the error belongs to
  const [loadError, setLoadError] = useState("");

  // "Downpayment received / Cancel" modal
  const [modal, setModal] = useState(null); // the request being reviewed
  const [modalVisible, setModalVisible] = useState(false);
  const [paidDate, setPaidDate] = useState(todayString());
  const [modalBusy, setModalBusy] = useState(null); // "confirm" | "cancel" | null
  const [modalError, setModalError] = useState("");

  // "Why are you declining?" popup
  const [declineTarget, setDeclineTarget] = useState(null); // the request being declined
  const [declineText, setDeclineText] = useState("");
  const [declineBusy, setDeclineBusy] = useState(false);
  const [declineError, setDeclineError] = useState("");
  const [declineQuick, setDeclineQuick] = useState(""); // index of the chosen quick reason

  // Payment receipts the clients uploaded for requests awaiting downpayment
  const [paymentSubmissions, setPaymentSubmissions] = useState({}); // { [requestId]: latest submission }
  const [receiptUrls, setReceiptUrls] = useState({}); // { [requestId]: signed preview url }
  const receiptCache = useRef({}); // { [storagePath]: { url, at } } so previews don't reload every refresh
  const [reviewNote, setReviewNote] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  const load = useCallback(async () => {
    // New requests, plus booked events the client has asked to cancel.
    const { data, error: err } = await supabase
      .from("booking_requests")
      .select("*")
      .or(
        "status.in.(pending,offered,awaiting_dp),and(status.eq.approved,cancel_requested_at.not.is.null)"
      )
      .order("event_date", { ascending: true });

    if (err) {
      console.error("Failed to load booking requests:", err.message);
      setLoadError(err.message);
      return;
    }
    setLoadError("");
    const bookingRows = data || [];
    setRows(bookingRows);

    // Receipts only matter for requests the client already accepted.
    const awaitingIds = bookingRows
      .filter((row) => row.status === "awaiting_dp" && !row.manual_details)
      .map((row) => row.id);

    if (!awaitingIds.length) {
      setPaymentSubmissions({});
      setReceiptUrls({});
      return;
    }

    const { data: submissions, error: paymentError } = await supabase
      .from("booking_payment_submissions")
      .select("*")
      .in("booking_request_id", awaitingIds)
      .order("created_at", { ascending: false });

    if (paymentError) {
      console.error("Failed to load payment submissions:", paymentError);
      setPaymentSubmissions({});
      setReceiptUrls({});
      return;
    }

    // Newest receipt per request.
    const latestByBooking = {};
    for (const submission of submissions || []) {
      if (!latestByBooking[submission.booking_request_id]) {
        latestByBooking[submission.booking_request_id] = submission;
      }
    }
    setPaymentSubmissions(latestByBooking);

    // Signed preview links last an hour. Reuse them so the receipt image in the
    // popup doesn't reload every time the list refreshes (every 10 seconds).
    const signedEntries = await Promise.all(
      Object.values(latestByBooking).map(async (submission) => {
        const path = submission.receipt_storage_path;
        if (!path) return [submission.booking_request_id, ""];

        const cached = receiptCache.current[path];
        if (cached && Date.now() - cached.at < 50 * 60 * 1000) {
          return [submission.booking_request_id, cached.url];
        }

        const { data: signed, error: signedError } = await supabase.storage
          .from("payment-receipts")
          .createSignedUrl(path, 3600);

        if (signedError) {
          console.error("Could not create receipt preview URL:", signedError);
          return [submission.booking_request_id, ""];
        }

        const url = signed?.signedUrl || "";
        receiptCache.current[path] = { url, at: Date.now() };
        return [submission.booking_request_id, url];
      })
    );

    setReceiptUrls(Object.fromEntries(signedEntries));
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    // Check for new client requests every 10 seconds.
    const timer = setInterval(load, 10000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [load]);

  // Reload right away when the parent says something changed.
  useEffect(() => {
    if (refreshKey) load();
  }, [refreshKey, load]);

  // A request's form values. The team starts with one row per creative the
  // client asked for, so it isn't lost when the list reloads.
  const getDraft = (r) =>
    drafts[r.id] || { fee: "", downpayment: "", message: "", team: teamFromCrew(r.crew_needed) };

  const setDraft = (r, patch) =>
    setDrafts((d) => ({ ...d, [r.id]: { ...getDraft(r), ...patch } }));

  const updateMember = (r, index, value) => {
    const clean = cleanName(value);

    setDraft(r, {
      team: getDraft(r).team.map((m, i) => (i === index ? { ...m, name: clean } : m)),
    });
  };

  // When the box loses focus: trim the ends and capitalize each word.
  const tidyMember = (r, index) => {
    setDraft(r, {
      team: getDraft(r).team.map((m, i) =>
        i === index ? { ...m, name: toTitleCase(m.name.trim().replace(/[\s.'’-]+$/u, "")) } : m
      ),
    });
  };

  const addMember = (r) => {
    if (getDraft(r).team.length >= MAX_TEAM_SIZE) return;
    setDraft(r, { team: [...getDraft(r).team, emptyMember(DEFAULT_POSITION)] });
  };

  const removeMember = (r, index) => {
    const next = getDraft(r).team.filter((_, i) => i !== index);
    setDraft(r, { team: next.length ? next : [emptyMember(DEFAULT_POSITION)] });
  };

  function fail(id, message) {
    setError(message);
    setErrorId(id);
  }

  async function sendOffer(r) {
    const { fee, downpayment, message, team } = getDraft(r);
    const amount = Number(fee);
    const down = Number(downpayment);

    if (fee === "" || Number.isNaN(amount) || amount < 0) {
      fail(r.id, "Enter a valid talent fee before sending the offer.");
      return;
    }

    if (downpayment === "" || Number.isNaN(down) || down < 0) {
      fail(r.id, "Enter the downpayment the client must pay to secure the date (use 0 if none).");
      return;
    }

    if (down > amount) {
      fail(r.id, "The downpayment can't be more than the talent fee.");
      return;
    }

    // Rows without a name (like the prefilled position rows) are simply left out.
    const members = cleanTeam(team).map((m) => ({ ...m, name: toTitleCase(m.name) }));

    for (const m of members) {
      const problem = nameProblem(m.name);
      if (problem) {
        fail(r.id, `Check the team name "${m.name}": ${problem}`);
        return;
      }
    }

    setBusyId(r.id);
    setError("");
    setErrorId(null);

    const { error: err } = await supabase
      .from("booking_requests")
      .update({
        status: "offered",
        offered_fee: amount,
        downpayment_amount: down,
        team_members: members.length ? members : null,
        admin_message: message.trim() || null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", r.id)
      .eq("status", "pending");

    setBusyId(null);
    if (err) fail(r.id, err.message);
    load();
  }

  // Declining (or withdrawing an offer) asks why first. The reason is saved as
  // the message the client sees with the decision.
  function openDecline(r) {
    setDeclineTarget(r);
    setDeclineText(cleanMessage(getDraft(r).message || ""));
    setDeclineQuick("");
    setDeclineError("");
  }

  function closeDecline() {
    if (declineBusy) return;
    setDeclineTarget(null);
    setDeclineError("");
  }

  async function submitDecline() {
    if (!declineTarget) return;

    const reason = declineText.trim();

    if (reason.length < 5) {
      setDeclineError("Please tell the client why (at least 5 characters).");
      return;
    }

    setDeclineBusy(true);
    setDeclineError("");

    const { error: err } = await supabase
      .from("booking_requests")
      .update({
        status: "declined",
        admin_message: reason,
        responded_at: new Date().toISOString(),
      })
      .eq("id", declineTarget.id)
      .in("status", ["pending", "offered"]);

    setDeclineBusy(false);

    if (err) {
      console.error("Failed to decline request:", err);
      setDeclineError(err.message);
      return;
    }

    setDeclineTarget(null);
    load();
  }

  // ---------- client cancellation requests ----------

  function messageClient(r) {
    if (onMessage) {
      onMessage(r);
      return;
    }

    const subject = encodeURIComponent(`Your booking: ${r.title}`);
    if (r.client_email) {
      window.location.href = `mailto:${r.client_email}?subject=${subject}`;
    } else if (r.client_phone) {
      window.location.href = `sms:${r.client_phone}`;
    } else {
      fail(r.id, "There is no email or phone number saved on this request, so there is nothing to message.");
    }
  }

  async function cancelBooking(r) {
    if (
      !window.confirm(
        "Cancel this booking? The event will be removed from your schedule. The downpayment stays non-refundable."
      )
    ) {
      return;
    }

    setBusyId(r.id);
    setError("");
    setErrorId(null);

    const { error: err } = await supabase.rpc(APPROVE_CANCELLATION_RPC, { p_id: r.id });

    setBusyId(null);

    if (err) {
      console.error("Failed to cancel booking:", err);
      fail(r.id, err.message);
    }

    await load();
    if (!err) onBooked?.();
  }

  // ---------- awaiting-downpayment modal ----------

  function openModal(r) {
    setModal(r);
    setModalVisible(false);
    setPaidDate(todayString());
    setModalError("");
    setModalSuccess("");
    setReviewNote("");
    setModalBusy(null);

    // Let the browser render the hidden state before starting the transition.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setModalVisible(true));
    });
  }

  function closeModal() {
    if (modalBusy) return;
    setModalVisible(false);
    setModalError("");
  }

  function handleModalTransitionEnd(e) {
    if (
      e.target === e.currentTarget &&
      e.propertyName === "opacity" &&
      !modalVisible
    ) {
      setModal(null);
    }
  }

  // Emails the client that their event is booked, through the same
  // `send-event-email` Edge Function the schedule page uses. Only used for
  // events added by hand: they're emailed once the downpayment is confirmed,
  // because that is when the event actually lands on the schedule. A failure
  // never undoes the booking; it just tells the photographer.
  async function emailClientAboutManualEvent(eventId) {
    const { error: mailError } = await supabase.functions.invoke("send-event-email", {
      body: { event_id: eventId, kind: "created" },
    });

    if (!mailError) return;

    let detail = mailError.message;

    try {
      const body = await mailError.context.json();
      if (body?.error) detail = body.error;
    } catch {
      // keep the default message
    }

    console.error("Failed to email the client:", detail);
    window.alert(
      `The event was added to your schedule, but the confirmation email to the client could not be sent (${detail}).`
    );
  }

  // Puts the team you assigned onto the schedule event that was just created
  // from a client's request. The confirm function doesn't know about the team,
  // so it's added right after. A failure never undoes the booking.
  async function applyTeamToEvent(request, eventId) {
    const text = teamToText(request.team_members);
    if (!text) return;

    let updatedId = null;

    // 1. The confirm function may have returned the new event's id.
    if (typeof eventId === "string" && eventId) {
      const { data } = await supabase
        .from("schedule_events")
        .update({ photographer: text })
        .eq("id", eventId)
        .select("id");
      updatedId = data?.[0]?.id || null;
    }

    // 2. Otherwise find the new event: same title, same day, no team yet.
    if (!updatedId) {
      const dayStart = new Date(`${request.event_date}T00:00:00`);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const { data: found } = await supabase
        .from("schedule_events")
        .select("id")
        .eq("title", request.title)
        .gte("start_time", dayStart.toISOString())
        .lt("start_time", dayEnd.toISOString())
        .or("photographer.is.null,photographer.eq.")
        .limit(1);

      const foundId = found?.[0]?.id;

      if (foundId) {
        const { data } = await supabase
          .from("schedule_events")
          .update({ photographer: text })
          .eq("id", foundId)
          .select("id");
        updatedId = data?.[0]?.id || null;
      }
    }

    if (!updatedId) {
      console.error("Could not add the team to the new schedule event.");
      window.alert(
        "The event was added to your schedule, but the team you assigned could not be added to it. You can add it by editing the event."
      );
      return;
    }

    onBooked?.();
  }

  // Verify or reject the receipt the client uploaded.
  async function reviewPayment(status) {
    if (!modal) return;

    const submission = paymentSubmissions[modal.id];

    if (!submission) {
      setModalError("No payment receipt has been submitted for this booking yet.");
      return;
    }

    if (submission.status !== "pending") {
      setModalError("This receipt has already been reviewed.");
      return;
    }

    setModalBusy(status === "verified" ? "verify" : "reject");
    setModalError("");
    setModalSuccess("");

    const { error: reviewError } = await supabase.rpc("review_booking_payment", {
      p_submission_id: submission.id,
      p_status: status,
      p_review_note: reviewNote.trim() || null,
    });

    setModalBusy(null);

    if (reviewError) {
      console.error("Failed to review payment receipt:", reviewError);
      setModalError(reviewError.message);
      return;
    }

    setReviewNote("");
    await load();
    setModalSuccess(
      status === "verified"
        ? "Receipt verified. You can now confirm the booking."
        : "Receipt rejected. The client can submit another receipt."
    );
  }

  async function confirmDownpayment() {
    if (!modal) return;

    // Events the photographer added by hand use their own confirm function,
    // because they carry extra details (team, gear, project, client).
    const isManual = Boolean(modal.manual_details);
    const manualClientEmail = modal.manual_details?.client_email;
    const request = modal;

    // Client bookings need a verified receipt first.
    if (!isManual) {
      const submission = paymentSubmissions[modal.id];

      if (!submission || submission.status !== "verified") {
        setModalError("Verify the client's payment receipt before confirming this booking.");
        return;
      }
    }

    setModalBusy("confirm");
    setModalError("");
    setModalSuccess("");

    const { data: newEventId, error: err } = await supabase.rpc(
      isManual ? MANUAL_CONFIRM_RPC : "confirm_downpayment",
      {
        p_id: modal.id,
        p_paid_at: new Date(`${paidDate || todayString()}T12:00:00`).toISOString(),
      }
    );

    setModalBusy(null);

    if (err) {
      console.error("Failed to confirm downpayment:", err);
      setModalError(err.message);
      return;
    }

    setModalVisible(false);
    await load();
    onBooked?.();

    if (isManual && manualClientEmail && newEventId) {
      emailClientAboutManualEvent(newEventId);
    }

    if (!isManual) {
      applyTeamToEvent(request, newEventId);
    }
  }

  async function cancelAwaiting() {
    if (!modal) return;

    if (
      !window.confirm(
        "Cancel this booking? Nothing will be added to your schedule and the client will see it as cancelled."
      )
    ) {
      return;
    }

    setModalBusy("cancel");
    setModalError("");
    setModalSuccess("");

    const { error: err } = await supabase.rpc("cancel_awaiting_request", { p_id: modal.id });

    setModalBusy(null);

    if (err) {
      console.error("Failed to cancel request:", err);
      setModalError(err.message);
      return;
    }

    setModalVisible(false);
    await load();
  }

  if (loadError) {
    return (
      <p className="mb-4 rounded-xl border border-rose-500/40 p-3 text-xs text-rose-300">
        Could not load booking requests: {loadError}
      </p>
    );
  }

  if (rows.length === 0) {
    // On the dashboard the Booking Requests number already says "all caught up".
    if (hideWhenEmpty) return null;

    return (
      <section className="mb-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Booking Requests
        </h3>
        <p className="mt-2 text-xs text-slate-500">
          No pending requests. New client requests will appear here automatically.
        </p>
      </section>
    );
  }

  // Split into the two boxes
  const cancelRows = rows.filter(
    (r) => r.status === "approved" && Boolean(r.cancel_requested_at)
  );
  const requestRows = rows.filter((r) => r.status !== "approved");

  const errorInCancelBox = cancelRows.some((r) => r.id === errorId);

  const modalFee = Number(modal?.offered_fee || 0);
  const modalDown = Number(modal?.downpayment_amount || 0);
  const modalTeam = modal ? teamTextOf(modal) : "";
  const modalPayment = modal ? paymentSubmissions[modal.id] : null;
  const modalReceiptUrl = modal ? receiptUrls[modal.id] : "";

  return (
    <>
      {/* ---------- Box 1: new booking requests ---------- */}
      {requestRows.length > 0 ? (
        <section className="mb-4 rounded-xl border border-amber-500/30 bg-slate-900 p-4">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Booking Requests
            </h3>
            <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-xs font-semibold tabular-nums">
              {requestRows.length}
            </span>
          </header>

          {error && !errorInCancelBox && <p className="mb-2 text-xs text-red-400">{error}</p>}

          <div className="space-y-3">
            {requestRows.map((r) => {
              const d = getDraft(r);
              const busy = busyId === r.id;
              const feeNum = Number(d.fee) || 0;
              const downNum = Number(d.downpayment) || 0;
              const requestedCrew = crewSummary(r.crew_needed);
              const requestedTotal = crewTotal(r.crew_needed);
              const assignedCount = cleanTeam(d.team).length;
              const savedTeam = teamTextOf(r);

              // What is still missing. "Send offer" stays disabled until this is empty.
              const offerMissing = [];
              if (d.team.some((m) => !m.name.trim()) || assignedCount < requestedTotal) {
                offerMissing.push("a name for every team member");
              }
              if (d.fee === "") offerMissing.push("the talent fee");
              if (d.downpayment === "") {
                offerMissing.push("the downpayment");
              } else if (d.fee !== "" && downNum > feeNum) {
                offerMissing.push("a downpayment that isn't more than the fee");
              }

              return (
                <div
                  key={r.id}
                  className="rounded-lg border border-slate-700 bg-slate-500/[0.04] p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{r.title}</p>
                      <p className="truncate text-xs text-slate-400">
                        {r.client_name} · {CATEGORY_LABELS[r.category] || r.category || "Event"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.event_date} · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
                        {r.location ? ` · ${r.location}` : ""}
                      </p>
                      {requestedCrew && (
                        <p className="mt-1 text-xs text-sky-400">
                          Client needs: {requestedCrew}
                        </p>
                      )}
                      {r.notes && <p className="mt-1 text-xs text-slate-400">{r.notes}</p>}
                    </div>

                    {r.status === "offered" && (
                      <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-500">
                        Waiting for client
                      </span>
                    )}
                    {r.status === "awaiting_dp" && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                        Awaiting downpayment
                      </span>
                    )}
                  </div>

                  {r.status === "pending" && (
                    <div className="mt-3 space-y-3">
                      {/* ---- assign the team ---- */}
                      <div>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-300">Assign your team</p>
                          {requestedTotal > 0 && (
                            <p
                              className={`text-xs ${
                                assignedCount >= requestedTotal ? "text-emerald-400" : "text-slate-500"
                              }`}
                            >
                              {assignedCount} of {requestedTotal} assigned
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          {d.team.map((member, index) => (
                            <div
                              key={index}
                              className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
                            >
                              <input
                                className={field}
                                placeholder="Full name"
                                aria-label={`Team member ${index + 1} name`}
                                maxLength={MAX_NAME_LENGTH}
                                autoComplete="off"
                                value={member.name}
                                onChange={(e) => updateMember(r, index, e.target.value)}
                                onBlur={() => tidyMember(r, index)}
                              />
                              <input
                                className={`${field} cursor-default select-none text-slate-300 focus:border-slate-700`}
                                aria-label={`Team member ${index + 1} position`}
                                readOnly
                                tabIndex={-1}
                                value={member.position}
                              />
                              <button
                                type="button"
                                onClick={() => removeMember(r, index)}
                                aria-label={`Remove team member ${index + 1}`}
                                className="rounded-lg border border-slate-700 px-3 text-slate-500 transition hover:text-red-400"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => addMember(r)}
                          disabled={d.team.length >= MAX_TEAM_SIZE}
                          className="mt-2 text-xs font-semibold text-sky-400 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
                        >
                          + Add team member
                        </button>
                      </div>

                      {/* ---- fee, downpayment, message ---- */}
                      <div className="grid gap-2 sm:grid-cols-[9rem_9rem_1fr]">
                        <input
                          className={field}
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={MAX_MONEY_DIGITS}
                          placeholder="Talent fee (₱)"
                          value={d.fee}
                          onChange={(e) => setDraft(r, { fee: moneyDigits(e.target.value) })}
                        />
                        <input
                          className={field}
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={MAX_MONEY_DIGITS}
                          placeholder="Downpayment (₱)"
                          value={d.downpayment}
                          onChange={(e) => setDraft(r, { downpayment: moneyDigits(e.target.value) })}
                        />
                        <div className="min-w-0">
                          <input
                            className={field}
                            placeholder="Message to client (optional)"
                            aria-label="Message to client"
                            value={d.message}
                            onChange={(e) => setDraft(r, { message: cleanMessage(e.target.value) })}
                            maxLength={MAX_TEXT_LENGTH}
                          />
                          <p
                            className={`mt-1 text-right text-[11px] tabular-nums ${
                              d.message.length >= MAX_TEXT_LENGTH
                                ? "text-amber-400"
                                : "text-slate-500"
                            }`}
                            aria-live="polite"
                          >
                            {d.message.length}/{MAX_TEXT_LENGTH}
                          </p>
                        </div>
                      </div>

                      {feeNum > 0 && d.downpayment !== "" && (
                        <p className="text-xs text-slate-400">
                          {peso(feeNum)} fee − {peso(downNum)} down ={" "}
                          <span className="font-semibold">{peso(Math.max(feeNum - downNum, 0))}</span>{" "}
                          due after the event
                        </p>
                      )}

                      {offerMissing.length > 0 && (
                        <p className="text-right text-xs text-slate-500" aria-live="polite">
                          To send the offer, add: {offerMissing.join(", ")}.
                        </p>
                      )}

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => openDecline(r)}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          disabled={busy || offerMissing.length > 0}
                          onClick={() => sendOffer(r)}
                          className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy ? "Sending..." : "Send offer"}
                        </button>
                      </div>
                    </div>
                  )}

                  {r.status === "offered" && (
                    <div className="mt-3 rounded-lg bg-slate-500/10 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm">
                          Offered <span className="font-semibold text-sky-500">{peso(r.offered_fee)}</span>
                          {r.downpayment_amount != null && (
                            <>
                              {" · "}Downpayment{" "}
                              <span className="font-semibold text-sky-500">{peso(r.downpayment_amount)}</span>
                            </>
                          )}
                        </p>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => openDecline(r)}
                          className="text-xs text-slate-500 hover:text-white disabled:opacity-50"
                        >
                          Withdraw offer
                        </button>
                      </div>
                      {savedTeam && (
                        <p className="mt-1 text-xs text-slate-400">Team: {savedTeam}</p>
                      )}
                    </div>
                  )}

                  {r.status === "awaiting_dp" && (
                    <div className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm">
                          Fee <span className="font-semibold">{peso(r.offered_fee)}</span>
                          {" · "}Downpayment due{" "}
                          <span className="font-semibold text-amber-600">{peso(r.downpayment_amount)}</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => openModal(r)}
                          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-400"
                        >
                          Review downpayment
                        </button>
                      </div>
                      {savedTeam && (
                        <p className="mt-1 text-xs text-slate-400">Team: {savedTeam}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        // No new requests. On the dashboard this box stays hidden.
        !hideWhenEmpty && (
          <section className="mb-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Booking Requests
            </h3>
            <p className="mt-2 text-xs text-slate-500">
              No pending requests. New client requests will appear here automatically.
            </p>
          </section>
        )
      )}

      {/* ---------- Box 2: cancellation requests (only when there are some) ---------- */}
      {cancelRows.length > 0 && (
        <section className="mb-4 rounded-xl border border-rose-500/30 bg-slate-900 p-4">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              Cancellation Requests
            </h3>
            <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-xs font-semibold tabular-nums">
              {cancelRows.length}
            </span>
          </header>

          {error && errorInCancelBox && <p className="mb-2 text-xs text-red-400">{error}</p>}

          <div className="space-y-3">
            {cancelRows.map((r) => {
              const busy = busyId === r.id;
              const hasDown = r.downpayment_amount != null && Number(r.downpayment_amount) > 0;

              return (
                <div
                  key={r.id}
                  className="rounded-lg border border-slate-700 bg-slate-500/[0.04] p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{r.title}</p>
                      <p className="truncate text-xs text-slate-400">
                        {r.client_name} · {CATEGORY_LABELS[r.category] || r.category || "Event"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.event_date} · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
                        {r.location ? ` · ${r.location}` : ""}
                      </p>
                    </div>

                    <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-500">
                      Cancellation requested
                    </span>
                  </div>

                  <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                    <p className="text-sm text-slate-300">
                      The client asked to cancel this booked event on{" "}
                      <span className="font-semibold text-white">
                        {shortDate(r.cancel_requested_at)}
                      </span>
                      . The date stays booked until you answer.
                    </p>

                    {r.cancel_reason && (
                      <p className="mt-1 whitespace-pre-line text-xs text-slate-400">
                        Client's note: {r.cancel_reason}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-slate-500">
                      Fee {peso(r.offered_fee)}
                      {hasDown &&
                        ` · Downpayment ${peso(r.downpayment_amount)}${
                          r.downpayment_received_at
                            ? ` received on ${shortDate(r.downpayment_received_at)}`
                            : " not received yet"
                        }`}
                      . The downpayment is non-refundable.
                    </p>

                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => messageClient(r)}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                      >
                        Message
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => cancelBooking(r)}
                        className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
                      >
                        {busy ? "Please wait..." : "Cancel booking"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------- Decline: ask why, send the reason to the client ---------- */}
      {declineTarget &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeDecline();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="booking-decline-title"
              className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <h3 id="booking-decline-title" className="text-lg font-bold text-white">
                {declineTarget.status === "offered" ? "Withdraw offer" : "Decline request"}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Tell {declineTarget.client_name || "the client"} why. This message is sent back to
                them with your decision.
              </p>

              <div className="mt-4 rounded-lg bg-slate-500/10 p-3 text-sm">
                <p className="font-semibold text-white">{declineTarget.title}</p>
                <p className="text-xs text-slate-400">
                  {declineTarget.event_date} · {declineTarget.start_time.slice(0, 5)}–
                  {declineTarget.end_time.slice(0, 5)}
                </p>
              </div>

              <label
                htmlFor="booking-decline-quick"
                className="mt-4 block text-xs font-semibold text-slate-300"
              >
                Quick reason
              </label>
              <select
                id="booking-decline-quick"
                className={`${field} mt-1 ${declineQuick === "" ? "text-slate-500" : ""}`}
                value={declineQuick}
                onChange={(e) => {
                  const value = e.target.value;
                  setDeclineQuick(value);
                  setDeclineError("");
                  setDeclineText(cleanMessage(QUICK_REASONS[Number(value)]?.text || ""));
                }}
              >
                <option value="" disabled>
                  Choose a reason to fill in the message
                </option>
                {QUICK_REASONS.map((reason, index) => (
                  <option key={reason.label} value={String(index)} className="bg-slate-800 text-white">
                    {reason.label}
                  </option>
                ))}
              </select>

              <label
                htmlFor="booking-decline-reason"
                className="mt-3 block text-xs font-semibold text-slate-300"
              >
                Message to the client
              </label>
              <textarea
                id="booking-decline-reason"
                className={`${field} mt-1 resize-none`}
                rows={4}
                maxLength={MAX_TEXT_LENGTH}
                placeholder="e.g. I'm already booked on that date. Feel free to request another day."
                value={declineText}
                onChange={(e) => setDeclineText(cleanMessage(e.target.value))}
                autoFocus
              />
              <p
                className={`mt-1 text-right text-[11px] tabular-nums ${
                  declineText.length >= MAX_TEXT_LENGTH ? "text-amber-400" : "text-slate-500"
                }`}
                aria-live="polite"
              >
                {declineText.length}/{MAX_TEXT_LENGTH}
              </p>

              {declineError && (
                <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
                  {declineError}
                </p>
              )}

              <div className="mt-5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={closeDecline}
                  disabled={declineBusy}
                  className="text-xs text-slate-500 transition-colors duration-200 hover:text-white disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={submitDecline}
                  disabled={declineBusy}
                  className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-rose-400 disabled:opacity-50"
                >
                  {declineBusy
                    ? "Sending..."
                    : declineTarget.status === "offered"
                    ? "Withdraw and send reason"
                    : "Decline and send reason"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ---------- Downpayment received / Cancel ---------- */}
      {modal &&
        createPortal(
          <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm transition-opacity duration-200 ease-out motion-reduce:transition-none ${
              modalVisible ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
            onTransitionEnd={handleModalTransitionEnd}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="booking-downpayment-title"
              className={`my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl transition-all duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none ${
                modalVisible
                  ? "translate-y-0 scale-100 opacity-100"
                  : "translate-y-2 scale-[0.97] opacity-0"
              }`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <h3 id="booking-downpayment-title" className="text-lg font-bold text-white">
                Downpayment
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {modal.manual_details
                  ? "You added this event manually. The date is added to your schedule once you confirm the downpayment."
                  : "The client accepted the quote. The date is added to your schedule once you confirm the downpayment."}
              </p>

              <div className="mt-4 space-y-1 rounded-lg bg-slate-500/10 p-3 text-sm">
                <p className="font-semibold text-white">{modal.title}</p>
                <p className="text-slate-400">
                  {modal.client_name} · {modal.event_date} · {modal.start_time.slice(0, 5)}–
                  {modal.end_time.slice(0, 5)}
                </p>
                {modalTeam && <p className="text-xs text-slate-400">Team: {modalTeam}</p>}
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400">Talent fee</span>
                  <span className="font-semibold">{peso(modalFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Downpayment to receive</span>
                  <span className="font-semibold text-amber-600">{peso(modalDown)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Balance after the event</span>
                  <span className="font-semibold">{peso(Math.max(modalFee - modalDown, 0))}</span>
                </div>
              </div>

              {!modal.manual_details && (
                <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-white">Client payment receipt</h4>
                    {modalPayment && (
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                          modalPayment.status === "verified"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : modalPayment.status === "rejected"
                              ? "bg-rose-500/10 text-rose-400"
                              : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {modalPayment.status === "verified"
                          ? "Verified"
                          : modalPayment.status === "rejected"
                            ? "Rejected"
                            : "Pending review"}
                      </span>
                    )}
                  </div>

                  {!modalPayment ? (
                    <p className="text-xs text-slate-400">
                      The client has not submitted a payment receipt yet.
                    </p>
                  ) : (
                    <>
                      {modalReceiptUrl ? (
                        <a href={modalReceiptUrl} target="_blank" rel="noreferrer" className="block">
                          <img
                            src={modalReceiptUrl}
                            alt="Client's uploaded payment receipt"
                            className="max-h-64 w-full rounded-lg border border-slate-700 bg-slate-900 object-contain"
                          />
                          <span className="mt-1 block text-center text-xs text-sky-400 hover:underline">
                            Open receipt in a new tab
                          </span>
                        </a>
                      ) : (
                        <p className="text-xs text-amber-400">
                          Receipt preview is unavailable. Check the payment-receipts storage permissions.
                        </p>
                      )}

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md bg-slate-900/70 p-2">
                          <p className="text-slate-500">Submitted amount</p>
                          <p className="mt-1 font-semibold text-white">{peso(modalPayment.amount)}</p>
                        </div>
                        <div className="rounded-md bg-slate-900/70 p-2">
                          <p className="text-slate-500">OCR amount</p>
                          <p className="mt-1 font-semibold text-white">
                            {modalPayment.ocr_amount != null ? peso(modalPayment.ocr_amount) : "Not detected"}
                          </p>
                        </div>
                        <div className="rounded-md bg-slate-900/70 p-2">
                          <p className="text-slate-500">Reference number</p>
                          <p className="mt-1 break-all font-semibold text-white">
                            {modalPayment.ocr_reference_number || "Not detected"}
                          </p>
                        </div>
                        <div className="rounded-md bg-slate-900/70 p-2">
                          <p className="text-slate-500">Transaction date</p>
                          <p className="mt-1 font-semibold text-white">
                            {displayOcrTransactionDate(modalPayment)}
                          </p>
                        </div>
                      </div>

                      {modalPayment.review_note && (
                        <p className="mt-2 rounded-md bg-slate-900/70 p-2 text-xs text-slate-300">
                          Review note: {modalPayment.review_note}
                        </p>
                      )}

                      {modalPayment.ocr_extracted_text && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs font-medium text-sky-400">
                            View extracted OCR text
                          </summary>
                          <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-950 p-2 text-[10px] text-slate-400">
                            {modalPayment.ocr_extracted_text}
                          </pre>
                        </details>
                      )}

                      {modalPayment.status === "pending" && (
                        <>
                          <label className="mt-3 block text-xs text-slate-400">
                            Review note (optional)
                          </label>
                          <textarea
                            value={reviewNote}
                            onChange={(e) => setReviewNote(cleanMessage(e.target.value))}
                            rows={2}
                            maxLength={MAX_TEXT_LENGTH}
                            placeholder="Add a note for the client..."
                            className={`${field} mt-1 resize-y`}
                          />
                          <p
                            className={`mt-1 text-right text-[11px] tabular-nums ${
                              reviewNote.length >= MAX_TEXT_LENGTH ? "text-amber-400" : "text-slate-500"
                            }`}
                          >
                            {reviewNote.length}/{MAX_TEXT_LENGTH}
                          </p>

                          <div className="mt-2 flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => reviewPayment("rejected")}
                              disabled={!!modalBusy}
                              className="rounded-lg border border-rose-500/50 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
                            >
                              {modalBusy === "reject" ? "Rejecting..." : "Reject receipt"}
                            </button>
                            <button
                              type="button"
                              onClick={() => reviewPayment("verified")}
                              disabled={!!modalBusy}
                              className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                            >
                              {modalBusy === "verify" ? "Verifying..." : "Verify receipt"}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              <label className="mt-4 block text-xs text-slate-400">Date received</label>
              <input
                type="date"
                className={`${field} mt-1`}
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />

              <p className="mt-2 text-xs text-slate-500">
                Downpayments are non-refundable. Confirming adds the event to your schedule and
                records {peso(modalDown)} as income.
              </p>

              {modalError && (
                <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                  {modalError}
                </p>
              )}

              {modalSuccess && (
                <p className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                  {modalSuccess}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={!!modalBusy}
                  className="text-xs text-slate-500 transition-colors duration-200 hover:text-white disabled:opacity-50"
                >
                  Close
                </button>

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelAwaiting}
                    disabled={!!modalBusy}
                    className="rounded-lg border border-rose-500/50 px-4 py-2 text-sm font-semibold text-rose-500 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-rose-500/10 active:translate-y-0 disabled:opacity-50"
                  >
                    {modalBusy === "cancel" ? "Cancelling…" : "Cancel booking"}
                  </button>
                  <button
                    type="button"
                    onClick={confirmDownpayment}
                    disabled={
                      !!modalBusy || (!modal.manual_details && modalPayment?.status !== "verified")
                    }
                    className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-sky-400 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {modalBusy === "confirm"
                      ? "Saving…"
                      : modal.manual_details
                        ? "Downpayment received"
                        : "Confirm booking"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}