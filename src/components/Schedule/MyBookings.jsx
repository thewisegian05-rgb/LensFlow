import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createWorker } from "tesseract.js";
import { supabase } from "../../lib/supabaseClient";
const STATUS = {
  pending: { label: "Waiting for photographer", cls: "bg-amber-500/10 text-amber-300" },
  offered: { label: "Quote received", cls: "bg-sky-500/10 text-sky-300" },
  awaiting_dp: { label: "Awaiting downpayment", cls: "bg-amber-500/10 text-amber-300" },
  approved: { label: "Booked", cls: "bg-emerald-500/10 text-emerald-400" },
  declined: { label: "Declined by photographer", cls: "bg-rose-500/10 text-rose-300" },
  rejected: { label: "You declined the quote", cls: "bg-slate-700/50 text-slate-400" },
  cancelled: { label: "Cancelled", cls: "bg-slate-700/50 text-slate-400" },
};
const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
const shortDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
function refundNote(r) {
  const hasDown = r.downpayment_amount != null && Number(r.downpayment_amount) > 0;
  if (r.status === "approved") {
    if (hasDown && r.downpayment_received_at) {
      return `Your downpayment of ${peso(r.downpayment_amount)} has already been received and is non-refundable, even if your cancellation is approved.`;
    }
    if (hasDown) {
      return `If you already sent your downpayment of ${peso(r.downpayment_amount)}, it is non-refundable, even if your cancellation is approved.`;
    }
    return "Any downpayment you have paid is non-refundable, even if your cancellation is approved.";
  }
  if (!hasDown) return null;
  return `If you already sent your downpayment of ${peso(r.downpayment_amount)}, it is non-refundable. Please do not send it if you are cancelling.`;
}

async function extractReceiptData(file) {
  const worker = await createWorker("eng");

  try {
    const {
      data: { text },
    } = await worker.recognize(file);

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    // ==========================================
    // 1. EXTRACT TRANSACTION AMOUNT
    // ==========================================

    let amount = null;

    const amountPatterns = [
      // Specific transfer/payment amount labels.
      /(?:transfer(?:red)?\s*amount|amount\s*(?:sent|transferred|paid)|payment\s*amount|transaction\s*amount)\s*[:\-]?\s*(?:PHP|₱|P)?\s*([\d,]+(?:\.\d{1,2})?)/i,

      // Generic amount label.
      /(?:^|\b)amount\s*[:\-]?\s*(?:PHP|₱|P)?\s*([\d,]+(?:\.\d{1,2})?)/im,

      // Total amount fallback.
      /total\s+amount\s*[:\-]?\s*(?:PHP|₱|P)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);

      if (match) {
        amount = Number(match[1].replace(/,/g, ""));
        break;
      }
    }

    // Handle labels and amounts on separate lines.
    if (amount === null) {
      const amountLabelIndex = lines.findIndex((line) =>
        /^(?:transfer(?:red)?\s*amount|amount\s*(?:sent|transferred|paid)|payment\s*amount|transaction\s*amount|amount)\s*[:\-]?\s*$/i.test(line)
      );

      if (amountLabelIndex !== -1) {
        for (
          let i = amountLabelIndex + 1;
          i < Math.min(amountLabelIndex + 3, lines.length);
          i++
        ) {
          if (/fee|total/i.test(lines[i])) continue;

          const match = lines[i].match(
            /(?:PHP|₱|P)?\s*([\d,]+(?:\.\d{1,2})?)/
          );

          if (match) {
            amount = Number(match[1].replace(/,/g, ""));
            break;
          }
        }
      }
    }

    // ==========================================
    // 2. EXTRACT REFERENCE NUMBER
    // ==========================================

    let referenceNumber = null;

    const referencePattern =
      /(?:reference\s*(?:no\.?|number)?|ref\.?\s*(?:no\.?|number)?|transaction\s*(?:id|no\.?|number)|trace\s*(?:no\.?|number)|instapay\s*(?:invoice\s*)?(?:no\.?|number))\s*[:#-]?\s*([A-Z0-9-]{6,})/i;

    const referenceMatch = text.match(referencePattern);

    if (referenceMatch) {
      referenceNumber = referenceMatch[1];
    } else {
      // Handle reference labels and values on separate lines.
      const referenceLabelIndex = lines.findIndex((line) =>
        /^(?:reference|reference\s*(?:no\.?|number)?|ref\.?\s*(?:no\.?|number)?|transaction\s*(?:id|no\.?|number)|trace\s*(?:no\.?|number)|instapay\s*(?:invoice\s*)?(?:no\.?|number))\s*[:#-]?\s*$/i.test(
          line
        )
      );

      if (referenceLabelIndex !== -1) {
        const referenceText = lines
          .slice(referenceLabelIndex + 1, referenceLabelIndex + 3)
          .join(" ");

        const match = referenceText.match(/\b([A-Z0-9-]{6,})\b/i);

        if (match) {
          referenceNumber = match[1];
        }
      }
    }

    // ==========================================
    // 3. EXTRACT TRANSACTION DATE
    // ==========================================

    let transactionDate = null;

    const monthPattern =
      "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";

    // Examples:
    // 06 Nov 2026, 10:31 AM
    // 05 Nov 2026, 17:36
    const dayFirstMatch = text.match(
      new RegExp(
        String.raw`\b(\d{1,2})\s+(${monthPattern})\s+(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?)?`,
        "i"
      )
    );


    // Examples:
    // Nov 06, 2026 10:31 AM
    // November 05, 2026
    const monthFirstMatch = text.match(
      new RegExp(
        String.raw`\b(${monthPattern})\s+(\d{1,2}),?\s*(\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?)?`,
        "i"
      )
    );

    // Examples:
    // 2026-11-06
    // 2026-11-06 10:31
    const isoMatch = text.match(
      /\b(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::\d{2})?)?/i
    );

    const monthNames = [
      "jan", "feb", "mar", "apr", "may", "jun",
      "jul", "aug", "sep", "oct", "nov", "dec",
    ];

    function buildDate(year, month, day, hour = 12, minute = 0, meridiem = "") {
      hour = Number(hour);
      minute = Number(minute);

      if (meridiem) {
        meridiem = meridiem.toUpperCase();

        if (meridiem === "PM" && hour < 12) hour += 12;
        if (meridiem === "AM" && hour === 12) hour = 0;
      }

      const parsedDate = new Date(
        Number(year),
        Number(month),
        Number(day),
        hour,
        minute
      );

      // Validate that the date components are valid.
      if (
        parsedDate.getFullYear() !== Number(year) ||
        parsedDate.getMonth() !== Number(month) ||
        parsedDate.getDate() !== Number(day)
      ) {
        return null;
      }

      return Number.isNaN(parsedDate.getTime())
        ? null
        : parsedDate.toISOString();
    }

    if (dayFirstMatch) {
      const monthIndex = monthNames.indexOf(
        dayFirstMatch[2].slice(0, 3).toLowerCase()
      );

      if (monthIndex >= 0) {
        transactionDate = buildDate(
          dayFirstMatch[3],
          monthIndex,
          dayFirstMatch[1],
          dayFirstMatch[4] || 12,
          dayFirstMatch[5] || 0,
          dayFirstMatch[6] || ""
        );
      }
    } else if (monthFirstMatch) {
      const monthIndex = monthNames.indexOf(
        monthFirstMatch[1].slice(0, 3).toLowerCase()
      );

      if (monthIndex >= 0) {
        transactionDate = buildDate(
          monthFirstMatch[3],
          monthIndex,
          monthFirstMatch[2],
          monthFirstMatch[4] || 12,
          monthFirstMatch[5] || 0,
          monthFirstMatch[6] || ""
        );
      }
    } else if (isoMatch) {
      transactionDate = buildDate(
        isoMatch[1],
        Number(isoMatch[2]) - 1,
        isoMatch[3],
        isoMatch[4] || 12,
        isoMatch[5] || 0
      );
    }

    // ==========================================
    // 4. RETURN EXTRACTED RECEIPT DATA
    // ==========================================

    return {
      extractedText: text,
      amount,
      referenceNumber,
      transactionDate,
    };
  } finally {
    await worker.terminate();
  }
}

function Icon({ name, className = "" }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  const paths = {
    wallet: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 8h18M16 14h.01" /><path d="M6 5V4a1 1 0 0 1 1-1h12" /></>,
    user: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20c.7-3.2 3.1-5 7-5s6.3 1.8 7 5" /></>,
    phone: <><path d="M7 3h3l1.2 4-2 1.5a15 15 0 0 0 6.3 6.3l1.5-2 4 1.2v3c0 1.1-.9 2-2 2C10.7 19 5 13.3 5 6c0-1.7.7-3 2-3Z" /></>,
    upload: <><path d="M12 16V4m-4 4 4-4 4 4" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    alert: <><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4m0 3h.01" /></>,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
      </>
    ),
  };
  return <svg {...common}>{paths[name] || null}</svg>;
}
/**
 * Client booking requests and quote responses.
 * photographerId - active photographer's id
 * refreshKey     - change this number to reload the list
 * onChanged      - called after booking actions or payment submission
 */
export default function MyBookings({ photographerId, refreshKey = 0, onChanged }) {
  const [rows, setRows] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [errorId, setErrorId] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [reason, setReason] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [isQrExpanded, setIsQrExpanded] = useState(false);
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [paymentQrUrl, setPaymentQrUrl] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [paymentSubmissions, setPaymentSubmissions] = useState({});
  const [receiptFiles, setReceiptFiles] = useState({});
  const [uploadBusyId, setUploadBusyId] = useState(null);
  const [paymentLoadError, setPaymentLoadError] = useState("");
  const receiptInputRefs = useRef({});
  const qrSignedAt = useRef(0);
  const qrPathRef = useRef("");
  const confirmRow = rows.find((r) => r.id === confirmId) || null;
  const load = useCallback(async () => {
    if (!photographerId) return;
    const { data, error: err } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("photographer_id", photographerId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (err) {
      console.error("Failed to load bookings:", err.message);
      setLoadError(err.message);
      return;
    }
    setLoadError("");
    const bookingRows = data || [];
    setRows(bookingRows);
    const awaitingBookings = bookingRows.filter(
      (booking) => booking.status === "awaiting_dp"
    );
    if (awaitingBookings.length === 0) {
      setPaymentMethod(null);
      setPaymentQrUrl("");
      setPaymentSubmissions({});
      setPaymentLoadError("");
      qrSignedAt.current = 0;
      qrPathRef.current = "";
      return;
    }
    const bookingIds = awaitingBookings.map((booking) => booking.id);
    let nextPaymentError = "";
    const { data: submissions, error: submissionsError } = await supabase
      .from("booking_payment_submissions")
      .select("*")
      .in("booking_request_id", bookingIds)
      .order("created_at", { ascending: false });
    if (submissionsError) {
      console.error("Payment submissions loading failed:", submissionsError);
      nextPaymentError = submissionsError.message;
    } else {
      const latestByBooking = {};
      for (const submission of submissions || []) {
        if (!latestByBooking[submission.booking_request_id]) {
          latestByBooking[submission.booking_request_id] = submission;
        }
      }
      setPaymentSubmissions(latestByBooking);
    }
    const { data: method, error: methodError } = await supabase
      .from("photographer_payment_methods")
      .select("*")
      .eq("photographer_id", photographerId)
      .eq("is_active", true)
      .maybeSingle();
    if (methodError) {
      console.error("Payment details loading failed:", methodError);
      nextPaymentError = nextPaymentError || methodError.message;
      setPaymentMethod(null);
      setPaymentQrUrl("");
    } else {
      setPaymentMethod(method || null);
      const nextQrPath =
        method?.qr_storage_path ||
        method?.gcash_qr_path ||
        "";
      const shouldRefreshSignedUrl =
        nextQrPath &&
        (nextQrPath !== qrPathRef.current ||
          !paymentQrUrl ||
          Date.now() - qrSignedAt.current > 50 * 60 * 1000);
      if (shouldRefreshSignedUrl) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from("photographer-payment-qr")
          .createSignedUrl(nextQrPath, 3600);
        if (signedError) {
          console.error("Payment QR loading failed:", signedError);
          nextPaymentError = nextPaymentError || signedError.message;
          setPaymentQrUrl("");
        } else {
          setPaymentQrUrl(signedData.signedUrl);
          qrPathRef.current = nextQrPath;
          qrSignedAt.current = Date.now();
        }
      } else if (!nextQrPath) {
        setPaymentQrUrl("");
        qrPathRef.current = "";
        qrSignedAt.current = 0;
      }
    }
    setPaymentLoadError(nextPaymentError);
  }, [photographerId, paymentQrUrl]);
  useEffect(() => {
    load();
  }, [load, refreshKey]);
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const timer = setInterval(load, 10000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [load]);
  useEffect(() => {
    if (!confirmId) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !busyId) setConfirmId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmId, busyId]);
  useEffect(() => {
    if (!selectedBookingId) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !busyId && !uploadBusyId) {
        setSelectedBookingId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedBookingId, busyId, uploadBusyId]);

  // Reset the agreement whenever the booking details modal opens or closes.
  useEffect(() => {
    setTermsAccepted(false);
  }, [selectedBookingId]);

  async function run(id, call) {
    setBusyId(id);
    setError("");
    setErrorId(null);
    const { error: err } = await call();
    setBusyId(null);
    if (err) {
      console.error("Booking action failed:", err);
      setError(err.message);
      setErrorId(id);
    }
    await load();
    onChanged?.();
  }
  const accept = (id) =>
    run(id, () => supabase.rpc("respond_to_offer", { p_id: id, p_accept: true }));
  const decline = (id) =>
    run(id, () => supabase.rpc("respond_to_offer", { p_id: id, p_accept: false }));
  const cancel = (id) => run(id, () => supabase.rpc("cancel_booking", { p_id: id }));
  const cancelAwaiting = (id) =>
    run(id, () => supabase.rpc("cancel_awaiting_request", { p_id: id }));
  async function submitReceipt(booking) {
    if (!termsAccepted) {
      setError("Please read and agree to the Downpayment Terms and Conditions.");
      setErrorId(booking.id);
      return;
    }
    const file = receiptFiles[booking.id];
    if (!file) {
      setError("Please select your payment receipt first.");
      setErrorId(booking.id);
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Please upload a PNG, JPG, or WEBP image.");
      setErrorId(booking.id);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Your receipt must be 5 MB or smaller.");
      setErrorId(booking.id);
      return;
    }
    if (!paymentMethod?.is_active) {
      setError("The photographer's payment details are unavailable.");
      setErrorId(booking.id);
      return;
    }
    setUploadBusyId(booking.id);
    setError("");
    setErrorId(null);
    let uploadedPath = "";
    let submissionCreated = false;
    try {
      // STEP 1: Process receipt using Tesseract.js.
      let ocrResult = null;
      try {
        ocrResult = await extractReceiptData(file);
        console.log("Payment receipt OCR Results:", ocrResult);
      } catch (ocrError) {
        console.warn("OCR processing failed:", ocrError);
      }
      // STEP 2: Upload receipt to Supabase Storage.
      const extension = file.name.split(".").pop().toLowerCase();
      uploadedPath = `${booking.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(uploadedPath, file, {
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;
      // STEP 3: Create payment submission.
      const { data: submissionId, error: submitError } =
        await supabase.rpc("submit_booking_payment", {
          p_booking_request_id: booking.id,
          p_receipt_storage_path: uploadedPath,
          p_terms_accepted: termsAccepted,
        });
      if (submitError) throw submitError;
      submissionCreated = true;
      // STEP 4: Save OCR results if extraction succeeded.
      if (ocrResult) {
        const { error: ocrSaveError } = await supabase.rpc(
          "save_booking_payment_ocr",
          {
            p_submission_id: submissionId,
            p_extracted_text: ocrResult.extractedText || null,
            p_amount: ocrResult.amount,
            p_reference_number: ocrResult.referenceNumber,
            p_transaction_date: ocrResult.transactionDate,
          }
        );
        if (ocrSaveError) {
          console.warn("Could not save OCR results:", ocrSaveError);
        }
      }
      // STEP 5: Clear selected receipt.
      setReceiptFiles((previous) => {
        const updated = { ...previous };
        delete updated[booking.id];
        return updated;
      });
      if (receiptInputRefs.current[booking.id]) {
        receiptInputRefs.current[booking.id].value = "";
      }
      // STEP 6: Refresh payment submissions.
      await load();
      onChanged?.();
    } catch (submitError) {
      console.error("Receipt submission failed:", submitError);
      // Only delete the uploaded file if the database
      // submission was not successfully created.
      if (uploadedPath && !submissionCreated) {
        const { error: cleanupError } = await supabase.storage
          .from("payment-receipts")
          .remove([uploadedPath]);
        if (cleanupError) {
          console.warn("Could not remove unused receipt:", cleanupError);
        }
      }
      setError(submitError.message || "Unable to submit your receipt.");
      setErrorId(booking.id);
    } finally {
      setUploadBusyId(null);
    }
  }
  async function confirmCancel() {
    if (!confirmRow) return;
    const row = confirmRow;
    if (row.status === "approved") {
      await run(row.id, () =>
        supabase.rpc("request_booking_cancellation", {
          p_id: row.id,
          p_reason: reason,
        })
      );
    } else {
      await (row.status === "awaiting_dp" ? cancelAwaiting(row.id) : cancel(row.id));
    }
    setConfirmId(null);
    setReason("");
  }
  if (loadError) {
    return (
      <p className="rounded-lg border border-rose-500/40 p-3 text-xs text-rose-300">
        Could not load your bookings: {loadError}
      </p>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-700 py-6 text-center text-sm text-slate-500">
        No booking requests yet. Click an open date on the calendar to start one.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-b from-slate-900/90 to-slate-950/80 shadow-lg shadow-black/10">
      {/* Booking list container header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/70 bg-slate-900/70 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
            <Icon name="calendar" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-100">Booking activity</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Select a booking to view its details and available actions.
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full border border-blue-400/15 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-blue-300">
          {rows.length} {rows.length === 1 ? "booking" : "bookings"}
        </span>
      </div>
      {/* Independently scrollable booking list */}
      <div className="custom-scrollbar max-h-[70vh] min-h-[260px] overflow-y-auto overscroll-contain p-3 sm:p-4">
        {error && !errorId && (
          <p className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}
        <div className="space-y-3">
          {rows.map((r) => {
        const cancelPending = r.status === "approved" && Boolean(r.cancel_requested_at);
        const s = cancelPending
          ? { label: "Cancellation requested", cls: "bg-amber-500/10 text-amber-300" }
          : STATUS[r.status] || STATUS.cancelled;
        const busy = busyId === r.id;
        const hasDown = r.downpayment_amount != null && Number(r.downpayment_amount) > 0;
        const balance = Math.max(Number(r.offered_fee || 0) - Number(r.downpayment_amount || 0), 0);
        const canCancel =
          ["pending", "offered", "awaiting_dp", "approved"].includes(r.status) && !cancelPending;
        if (selectedBookingId === r.id) {
          return createPortal(
            <div
              key={`booking-detail-${r.id}`}
              className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-6"
              onMouseDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  busyId !== r.id &&
                  uploadBusyId !== r.id
                ) {
                  setSelectedBookingId(null);
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`booking-detail-title-${r.id}`}
                className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/50"
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">
                      Booking details
                    </p>
                    <h2
                      id={`booking-detail-title-${r.id}`}
                      className="mt-0.5 truncate text-sm font-semibold text-white"
                    >
                      {r.title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBookingId(null)}
                    disabled={busyId === r.id || uploadBusyId === r.id}
                    aria-label="Close booking details"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 transition hover:border-blue-400/50 hover:bg-blue-500/10 hover:text-white disabled:opacity-50"
                  >
                    <span aria-hidden="true" className="text-xl leading-none">×</span>
                  </button>
                </div>
                <div className="custom-scrollbar min-h-0 overflow-y-auto p-3 sm:p-5">
                            <article
            key={r.id}
            className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-3 sm:p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{r.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {r.event_date} · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
                  {r.location ? ` · ${r.location}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${s.cls}`}>
                {s.label}
              </span>
            </div>
            {r.status === "offered" && (
              <div className="mt-3 rounded-xl border border-sky-500/30 bg-sky-500/5 p-3">
                <p className="text-xs text-slate-400">Photographer's quote</p>
                <p className="mt-1 text-xl font-bold text-sky-300">{peso(r.offered_fee)}</p>
                {hasDown && (
                  <div className="mt-2 space-y-1 text-sm text-slate-300">
                    <p>
                      Downpayment to secure your date: {" "}
                      <span className="font-semibold text-white">{peso(r.downpayment_amount)}</span>
                    </p>
                    <p>
                      Balance, paid at the end of the event: {" "}
                      <span className="font-semibold text-white">{peso(balance)}</span>
                    </p>
                    <p className="pt-1 text-xs text-slate-500">
                      The downpayment is non-refundable. Send it to your photographer to confirm
                      your date.
                    </p>
                  </div>
                )}
                {r.admin_message && (
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{r.admin_message}</p>
                )}
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decline(r.id)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => accept(r.id)}
                    className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
                  >
                    {busy ? "Please wait..." : "Accept & book"}
                  </button>
                </div>
              </div>
            )}
            {r.status === "awaiting_dp" && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/70">
                {/* Awaiting payment banner */}
                <div className="flex items-center gap-3 border-b border-blue-400/20 bg-blue-500/10 px-4 py-3 sm:px-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
                    <Icon name="clock" className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-blue-200">Awaiting Downpayment</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Send your downpayment to secure your booking.
                    </p>
                  </div>
                </div>
                {/* Design A: summary left, GCash payment right */}
                <div className="grid gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[0.82fr_1.5fr]">
                  {/* Booking payment summary */}
                  <section className="flex flex-col rounded-xl border border-slate-700/70 bg-slate-800/55 p-4">
                    <div>
                      <p className="text-xs font-medium text-slate-400">Booking Payment</p>
                      <p className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                        {peso(r.downpayment_amount)}
                      </p>
                      <span className="mt-2 inline-flex rounded-full bg-blue-500/15 px-2.5 py-1 text-[10px] font-semibold text-blue-300">
                        Downpayment
                      </span>
                    </div>
                    <div className="mt-5 space-y-2 border-t border-slate-700/80 pt-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">Total fee</span>
                        <span className="font-semibold text-slate-200">{peso(r.offered_fee)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">Balance due</span>
                        <span className="font-semibold text-slate-200">{peso(balance)}</span>
                      </div>
                    </div>
                    <div className="mt-auto pt-5">
                      <div className="flex items-start gap-2 rounded-lg bg-slate-700/40 p-3">
                        <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                        <p className="text-xs leading-relaxed text-slate-300">
                          The downpayment is non-refundable. Your booking is added to the
                          photographer's schedule after payment verification.
                        </p>
                      </div>
                    </div>
                  </section>
                  {/* Payment details and receipt upload */}
                  <section className="min-w-0 rounded-xl border border-slate-700/70 bg-slate-800/55 p-3 sm:p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                        {(paymentMethod?.provider || "GCash").charAt(0)}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Pay via {paymentMethod?.provider || "GCash"}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Photographer's preferred payment method
                        </p>
                      </div>
                    </div>
                    {paymentMethod ? (
                      <>
                        <div className="grid gap-3 sm:grid-cols-[minmax(112px,0.72fr)_1fr] sm:items-center">
                          {paymentQrUrl ? (
                            <button
                              type="button"
                              onClick={() => setIsQrExpanded(true)}
                              aria-label="Enlarge payment QR code"
                              title="Click to enlarge"
                              className="group relative flex min-h-[150px] cursor-zoom-in items-center justify-center rounded-xl bg-white p-3 text-left transition hover:ring-2 hover:ring-blue-400/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                            >
                              <img
                                src={paymentQrUrl}
                                alt="Photographer's payment QR code"
                                className="max-h-48 w-full object-contain"
                              />
                              <span className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 rounded-lg bg-slate-950/75 px-2 py-1.5 text-[11px] font-semibold text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 group-focus-visible:opacity-100">
                                <Icon name="maximize-2" className="h-3.5 w-3.5" />
                                Click to enlarge
                              </span>
                            </button>
                          ) : (
                            <div className="flex min-h-[150px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900/60 p-3 text-center">
                              <Icon name="wallet" className="h-7 w-7 text-slate-500" />
                              <p className="mt-2 text-[11px] text-slate-500">No QR code provided</p>
                            </div>
                          )}
                          <div className="space-y-3">
                            <div className="flex items-start gap-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300">
                                <Icon name="user" className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-[11px] text-slate-500">Account Holder Name</p>
                                <p className="break-words text-sm font-semibold text-slate-100">
                                  {paymentMethod.account_name ||
                                    paymentMethod.gcash_account_name ||
                                    "Not provided"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300">
                                <Icon name="wallet" className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-[11px] text-slate-500">
                                  {paymentMethod.provider === "GCash"
                                    ? "GCash Mobile Number"
                                    : "Account Number"}
                                </p>
                                <p className="break-words text-sm font-semibold text-slate-100">
                                  {paymentMethod.account_number ||
                                    paymentMethod.gcash_number ||
                                    "Not provided"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 border-t border-slate-700/80 pt-4">
                          {(() => {
                            const submission = paymentSubmissions[r.id];
                            if (submission?.status === "pending") {
                              return (
                                <div className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3">
                                  <Icon name="clock" className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                                  <div>
                                    <p className="text-sm font-semibold text-amber-200">
                                      Receipt submitted · Under review
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                                      Your photographer will review your receipt and confirm the
                                      payment.
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                            if (submission?.status === "verified") {
                              return (
                                <div className="flex items-start gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3">
                                  <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                                  <div>
                                    <p className="text-sm font-semibold text-emerald-200">
                                      Payment verified
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                      Your downpayment has been verified.
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <>
                                {submission?.status === "rejected" && (
                                  <div className="mb-3 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3">
                                    <p className="text-sm font-semibold text-rose-200">
                                      Receipt needs attention
                                    </p>
                                    {submission.review_note && (
                                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                                        Photographer's note: {submission.review_note}
                                      </p>
                                    )}
                                    <p className="mt-1 text-xs text-slate-400">
                                      You can upload a corrected receipt below.
                                    </p>
                                  </div>
                                )}
                                {paymentLoadError && (
                                  <p className="mb-3 rounded-lg bg-rose-500/10 p-2 text-xs text-rose-300">
                                    Could not load all payment information: {paymentLoadError}
                                  </p>
                                )}
                                <div className="flex flex-col gap-3 rounded-xl border border-dashed border-blue-400/50 bg-blue-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300">
                                      <Icon name="upload" className="h-5 w-5" />
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-slate-100">
                                        Upload payment receipt
                                      </p>
                                      <p className="mt-0.5 text-[11px] text-slate-500">
                                        PNG, JPG, or WEBP · Maximum 5 MB
                                      </p>
                                      {receiptFiles[r.id] && (
                                        <p className="mt-1 truncate text-[11px] text-blue-300">
                                          {receiptFiles[r.id].name}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <label className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-blue-400/40 bg-blue-500/10 px-3.5 py-2 text-xs font-semibold text-blue-200 transition hover:border-blue-300/70 hover:bg-blue-500/20">
                                    Choose file
                                    <input
                                      ref={(node) => {
                                        receiptInputRefs.current[r.id] = node;
                                      }}
                                      type="file"
                                      accept="image/png,image/jpeg,image/webp"
                                      className="sr-only"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          setReceiptFiles((previous) => ({
                                            ...previous,
                                            [r.id]: file,
                                          }));
                                          setError("");
                                          setErrorId(null);
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                                
                                <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/5 p-3 sm:p-4">
                                  <div className="flex items-start gap-2">
                                    <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                                    <div>
                                      <p className="text-sm font-semibold text-amber-200">
                                        Downpayment Terms and Conditions
                                      </p>
                                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                                        Please review the payment and cancellation policy before submitting
                                        your receipt.
                                      </p>
                                    </div>
                                  </div>

                                  <details className="mt-3 group">
                                    <summary className="cursor-pointer text-xs font-semibold text-blue-300 transition hover:text-blue-200">
                                      View full Terms and Conditions
                                    </summary>

                                    <div className="mt-3 space-y-3 border-t border-slate-700/70 pt-3 text-xs leading-relaxed text-slate-300">
                                      <div>
                                        <p className="font-semibold text-slate-100">1. Downpayment Requirement</p>
                                        <p className="mt-1">
                                          A downpayment is required to secure your booking. Your booking
                                          will only be confirmed after your photographer verifies your payment.
                                        </p>
                                      </div>

                                      <div>
                                        <p className="font-semibold text-slate-100">2. Non-Refundable Downpayment</p>
                                        <p className="mt-1">
                                          Once paid, the downpayment is non-refundable if you voluntarily
                                          cancel the booking or fail to attend the scheduled session.
                                        </p>
                                      </div>

                                      <div>
                                        <p className="font-semibold text-slate-100">3. Booking Cancellation</p>
                                        <p className="mt-1">
                                          Please communicate with your photographer as early as possible
                                          if you need to cancel or make changes to your booking.
                                        </p>
                                      </div>

                                      <div>
                                        <p className="font-semibold text-slate-100">4. Rescheduling</p>
                                        <p className="mt-1">
                                          Rescheduling requests are subject to the photographer's
                                          availability and approval.
                                        </p>
                                      </div>

                                      <div>
                                        <p className="font-semibold text-slate-100">5. Photographer Cancellation</p>
                                        <p className="mt-1">
                                          If the photographer cancels or cannot provide the agreed service,
                                          an appropriate remedy, including a refund where applicable,
                                          should be arranged.
                                        </p>
                                      </div>

                                      <div>
                                        <p className="font-semibold text-slate-100">6. Payment Verification</p>
                                        <p className="mt-1">
                                          You must submit a valid payment receipt. Your photographer may
                                          reject incomplete, invalid, or unverifiable payment submissions.
                                        </p>
                                      </div>
                                    </div>
                                  </details>

                                  <label
                                    htmlFor={`downpayment-terms-${r.id}`}
                                    className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-700/70 bg-slate-900/60 p-3"
                                  >
                                    <input
                                      id={`downpayment-terms-${r.id}`}
                                      type="checkbox"
                                      checked={termsAccepted}
                                      onChange={(e) => setTermsAccepted(e.target.checked)}
                                      disabled={uploadBusyId === r.id}
                                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-blue-500"
                                    />
                                    <span className="text-xs leading-relaxed text-slate-300">
                                      I have read and agree to the Downpayment Terms and Conditions.
                                      I understand that my downpayment is non-refundable under the
                                      stated conditions.
                                    </span>
                                  </label>
                                </div>

                                <button
                                  type="button"
                                  disabled={
                                    !receiptFiles[r.id] ||
                                    !termsAccepted ||
                                    uploadBusyId === r.id
                                  }
                                  onClick={() => submitReceipt(r)}
                                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
                                >
                                  <Icon name="send" className="h-4 w-4" />
                                  {uploadBusyId === r.id
                                    ? "Submitting receipt..."
                                    : !termsAccepted
                                      ? "Agree to Terms to Continue"
                                      : "Submit Payment Receipt"}
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3">
                        <p className="text-sm font-semibold text-amber-200">
                          Payment details unavailable
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">
                          {paymentLoadError ||
                            "The photographer has not configured their payment details yet. Please contact them before sending payment."}
                        </p>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            )}
            {r.status === "approved" && r.offered_fee != null && (
              <div className="mt-2 space-y-0.5 text-xs text-slate-400">
                <p>Agreed fee: {peso(r.offered_fee)}</p>
                {hasDown &&
                  (r.downpayment_received_at ? (
                    <p className="text-emerald-400">
                      Downpayment of {peso(r.downpayment_amount)} received on {" "}
                      {shortDate(r.downpayment_received_at)}. Balance of {peso(balance)} is due at
                      the end of the event.
                    </p>
                  ) : (
                    <p className="text-amber-300">
                      Waiting for your {peso(r.downpayment_amount)} downpayment.
                    </p>
                  ))}
              </div>
            )}
            {cancelPending && (
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-sm text-slate-300">
                  You asked to cancel this event on {" "}
                  <span className="font-semibold text-white">{shortDate(r.cancel_requested_at)}</span>.
                  Your date stays booked until your photographer confirms.
                </p>
                {r.cancel_reason && (
                  <p className="mt-1 whitespace-pre-line text-xs text-slate-400">
                    Your note: {r.cancel_reason}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">The downpayment is non-refundable.</p>
              </div>
            )}
            {error && errorId === r.id && (
              <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {error}
              </p>
            )}
            {r.status === "declined" && r.admin_message && (
              <p className="mt-2 text-xs text-slate-400">{r.admin_message}</p>
            )}
            {canCancel && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setReason("");
                    setConfirmId(r.id);
                  }}
                  className={
                    r.status === "approved"
                      ? "rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                      : "text-xs text-slate-500 hover:text-white disabled:opacity-50"
                  }
                >
                  {r.status === "approved" ? "Request cancellation" : "Cancel request"}
                </button>
              </div>
            )}
          </article>
                </div>
              </div>
            </div>,
            document.body
          );
        }
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedBookingId(r.id)}
            className="group w-full rounded-xl border border-slate-800 bg-slate-950/35 p-4 text-left transition duration-200 hover:border-blue-500/50 hover:bg-blue-500/[0.045] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 sm:px-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-blue-300">
                  <Icon name="info" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100 transition group-hover:text-white">
                    {r.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {r.event_date} · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
                    {r.location ? ` · ${r.location}` : ""}
                  </p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${s.cls}`}>
                {s.label}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-800/80 pt-3">
              <p className="text-xs text-slate-500">
                {r.status === "awaiting_dp"
                  ? "Payment details and receipt submission are available"
                  : r.status === "offered"
                  ? "Review the photographer's quote and respond"
                  : r.status === "approved"
                  ? "View your confirmed booking and payment summary"
                  : "View booking information and available actions"}
              </p>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-blue-400 transition group-hover:gap-2 group-hover:text-blue-300">
                View details <span aria-hidden="true">→</span>
              </span>
            </div>
          </button>
        );
          })}
        </div>
      </div>
    </div>
      {/* Expanded payment QR lightbox */}
      {isQrExpanded &&
        paymentQrUrl &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
            style={{ zIndex: 2147483646 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setIsQrExpanded(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsQrExpanded(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Enlarged payment QR code"
              className="relative flex max-h-[92vh] w-full max-w-md flex-col items-center rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-6"
            >
              <button
                type="button"
                onClick={() => setIsQrExpanded(false)}
                aria-label="Close enlarged QR code"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xl text-slate-300 transition hover:border-blue-400/50 hover:bg-blue-500/10 hover:text-white"
              >
                ×
              </button>
              <div className="mb-4 pr-10 text-center">
                <h3 className="text-base font-semibold text-white">
                  {paymentMethod?.provider || "Payment"} QR Code
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Scan this code using the corresponding bank or e-wallet app.
                </p>
              </div>
              <div className="flex max-h-[72vh] w-full items-center justify-center overflow-auto rounded-xl bg-white p-4">
                <img
                  src={paymentQrUrl}
                  alt="Enlarged photographer's payment QR code"
                  className="max-h-[68vh] max-w-full object-contain"
                />
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                Click outside or press Escape to close.
              </p>
            </div>
          </div>,
          document.body
        )}
      {/* Cancel confirmation */}
      {confirmRow &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            style={{ zIndex: 2147483647 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !busyId) setConfirmId(null);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-booking-title"
              className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl"
            >
              <h3 id="cancel-booking-title" className="mb-2 text-lg font-bold text-white">
                {confirmRow.status === "approved"
                  ? "Request to cancel this event?"
                  : "Cancel this request?"}
              </h3>
              <p className="text-sm font-medium text-slate-200">{confirmRow.title}</p>
              <p className="mb-3 text-xs text-slate-500">
                {confirmRow.event_date} · {confirmRow.start_time.slice(0, 5)}–
                {confirmRow.end_time.slice(0, 5)}
              </p>
              <p className="mb-3 text-sm leading-relaxed text-slate-300">
                {confirmRow.status === "approved"
                  ? "You're about to send a cancellation request to your photographer. Your event stays booked until they confirm."
                  : "You're about to cancel this request."}
              </p>
              {refundNote(confirmRow) && (
                <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
                  {refundNote(confirmRow)}
                </p>
              )}
              {confirmRow.status === "approved" && (
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Reason for cancelling (optional)"
                  className="mb-4 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-left text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              )}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={busyId === confirmRow.id}
                  onClick={() => setConfirmId(null)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
                >
                  Keep booking
                </button>
                <button
                  type="button"
                  disabled={busyId === confirmRow.id}
                  onClick={confirmCancel}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:bg-red-500 disabled:opacity-50"
                >
                  {busyId === confirmRow.id
                    ? "Sending..."
                    : confirmRow.status === "approved"
                    ? "Send request"
                    : "Yes, cancel"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
