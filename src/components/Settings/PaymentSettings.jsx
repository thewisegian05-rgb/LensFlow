
import { useEffect, useRef, useState } from "react";
import {
  FaQrcode,
  FaUpload,
  FaTrash,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import { supabase } from "../../lib/supabaseClient";

const QR_BUCKET = "photographer-payment-qr";
const MAX_QR_SIZE = 5 * 1024 * 1024;

const PAYMENT_PROVIDERS = [
  "GCash",
  "LANDBANK",
  "MariBank",
  "BDO",
  "BPI",
  "Maya",
  "Other",
];

export default function PaymentSettings() {
  const fileInputRef = useRef(null);

  // Account details
  const [userId, setUserId] = useState(null);
  const [provider, setProvider] = useState("GCash");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  // QR code
  const [qrPath, setQrPath] = useState("");
  const [qrPreview, setQrPreview] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [removeExistingQR, setRemoveExistingQR] = useState(false);

  // UI states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  // Load existing payment details
  useEffect(() => {
    let active = true;

    const loadPaymentDetails = async () => {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        const user = authData?.user;

        if (!user) {
          throw new Error("Please sign in again.");
        }

        if (!active) return;

        setUserId(user.id);

        const { data, error } = await supabase
          .from("photographer_payment_methods")
          .select("*")
          .eq("photographer_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (!active) return;

        if (data) {
          setProvider(data.provider || "GCash");

          setAccountName(
            data.account_name ||
              data.gcash_account_name ||
              ""
          );

          setAccountNumber(
            data.account_number ||
              data.gcash_number ||
              ""
          );

          const savedQRPath =
            data.qr_storage_path ||
            data.gcash_qr_path ||
            "";

          setQrPath(savedQRPath);

          if (savedQRPath) {
            const { data: signedData, error: signedError } =
              await supabase.storage
                .from(QR_BUCKET)
                .createSignedUrl(savedQRPath, 3600);

            if (signedError) throw signedError;

            if (active) {
              setQrPreview(signedData.signedUrl);
            }
          }
        }
      } catch (error) {
        console.error("Payment settings load failed:", error);

        if (active) {
          setMessage(
            error.message || "Unable to load payment details."
          );
          setMessageType("error");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPaymentDetails();

    return () => {
      active = false;
    };
  }, []);

  // Handle provider changes
  const handleProviderChange = (event) => {
    setProvider(event.target.value);
    setMessage("");
  };

  // Handle QR image selection
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    ) {
      setMessage("Please select a PNG, JPG, or WEBP image.");
      setMessageType("error");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_QR_SIZE) {
      setMessage("QR image must be 5 MB or smaller.");
      setMessageType("error");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setQrPreview(URL.createObjectURL(file));
    setRemoveExistingQR(false);
    setMessage("");
  };

  // Remove QR from the form.
  // The stored image is deleted only after the database save succeeds.
  const handleRemoveQR = () => {
    setSelectedFile(null);
    setQrPreview("");
    setRemoveExistingQR(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Save payment details
  const handleSave = async (event) => {
    event.preventDefault();

    if (!userId) {
      setMessage("Please sign in again.");
      setMessageType("error");
      return;
    }

    const cleanedNumber =
      provider === "GCash"
        ? accountNumber.replace(/\s+/g, "")
        : accountNumber.trim();

    // Validate account name
    if (!accountName.trim()) {
      setMessage("Enter the registered account holder name.");
      setMessageType("error");
      return;
    }

    // Validate account number
    if (!cleanedNumber) {
      setMessage("Enter your bank or e-wallet account number.");
      setMessageType("error");
      return;
    }

    // GCash-specific validation
    if (
      provider === "GCash" &&
      !/^09\d{9}$/.test(cleanedNumber)
    ) {
      setMessage("Enter a valid 11-digit GCash mobile number.");
      setMessageType("error");
      return;
    }

    // General bank/e-wallet account validation
    if (
      provider !== "GCash" &&
      !/^[A-Za-z0-9\s-]{5,30}$/.test(cleanedNumber)
    ) {
      setMessage("Enter a valid account number.");
      setMessageType("error");
      return;
    }

    setSaving(true);
    setMessage("");

    let uploadedPath = "";

    try {
      let finalQRPath = removeExistingQR ? "" : qrPath;

      // Upload a newly selected QR image
      if (selectedFile) {
        const extension = selectedFile.name
          .split(".")
          .pop()
          .toLowerCase();

        uploadedPath =
          `${userId}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from(QR_BUCKET)
          .upload(uploadedPath, selectedFile, {
            contentType: selectedFile.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        finalQRPath = uploadedPath;
      }

      // Save generic payment details
      const { error: saveError } = await supabase
        .from("photographer_payment_methods")
        .upsert(
          {
            photographer_id: userId,

            // Generic payment fields
            provider,
            account_name: accountName.trim(),
            account_number: cleanedNumber,
            qr_storage_path: finalQRPath || null,

            // Keep legacy fields populated only for GCash
            gcash_account_name:
              provider === "GCash"
                ? accountName.trim()
                : null,

            gcash_number:
              provider === "GCash"
                ? cleanedNumber
                : null,

            gcash_qr_path:
              provider === "GCash"
                ? finalQRPath || null
                : null,

            is_active: true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "photographer_id",
          }
        );

      if (saveError) throw saveError;

      // Delete the previous QR only after successful database save
      if (
        qrPath &&
        qrPath !== finalQRPath
      ) {
        const { error: removeError } = await supabase.storage
          .from(QR_BUCKET)
          .remove([qrPath]);

        if (removeError) {
          console.warn(
            "Old QR image could not be removed:",
            removeError
          );
        }
      }

      // Update local state
      setQrPath(finalQRPath);
      setSelectedFile(null);
      setRemoveExistingQR(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Generate a fresh preview URL
      if (finalQRPath) {
        const { data: signedData, error: signedError } =
          await supabase.storage
            .from(QR_BUCKET)
            .createSignedUrl(finalQRPath, 3600);

        if (signedError) throw signedError;

        setQrPreview(signedData.signedUrl);
      } else {
        setQrPreview("");
      }

      setMessage("Your payment details have been saved.");
      setMessageType("success");
    } catch (error) {
      console.error("Saving payment details failed:", error);

      // Remove newly uploaded file if the database save failed
      if (uploadedPath) {
        await supabase.storage
          .from(QR_BUCKET)
          .remove([uploadedPath]);
      }

      setMessage(
        error.message || "Unable to save payment details."
      );
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="mt-6 animate-pulse rounded-xl border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="mb-4 h-5 w-40 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-64 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  return (
    <section>
      <form onSubmit={handleSave} className="space-y-5">

        {/* Payment Provider */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Bank / E-wallet
          </label>

          <select
            value={provider}
            onChange={handleProviderChange}
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {PAYMENT_PROVIDERS.map((item) => (
              <option key={item} value={item}>
                {item === "Other"
                  ? "Other Bank / E-wallet"
                  : item}
              </option>
            ))}
          </select>

          <p className="mt-1 text-xs text-slate-500">
            Select where your clients should send their payments.
          </p>
        </div>

        {/* Account Holder Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Account Holder Name
          </label>

          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Enter registered account name"
            maxLength={100}
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        {/* Account Number */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {provider === "GCash"
              ? "GCash Mobile Number"
              : "Account Number / Mobile Number"}
          </label>

          <input
            type="text"
            inputMode={provider === "GCash" ? "numeric" : "text"}
            value={accountNumber}
            onChange={(e) =>
              setAccountNumber(
                e.target.value.replace(/[^A-Za-z0-9\s-]/g, "")
              )
            }
            placeholder={
              provider === "GCash"
                ? "09XX XXX XXXX"
                : "Enter your account number"
            }
            maxLength={30}
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />

          <p className="mt-1 text-xs text-slate-500">
            Enter the account number or registered mobile number
            associated with your selected payment provider.
          </p>
        </div>

        {/* Payment QR Code */}
        <div>
          <div className="mb-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Payment QR Code
              <span className="ml-1 font-normal text-slate-400">
                (Optional)
              </span>
            </label>

            <p className="mt-1 text-xs text-slate-500">
              Upload your bank or e-wallet QR code (PNG, JPG, or
              WEBP, maximum 5 MB).
            </p>
          </div>

          {qrPreview ? (
            <div className="relative w-fit rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
              <img
                src={qrPreview}
                alt="Payment QR code preview"
                className="h-48 w-48 rounded-lg object-contain"
              />

              <button
                type="button"
                onClick={handleRemoveQR}
                className="mt-3 flex w-full items-center justify-center gap-2 !border !border-rose-300 !bg-rose-50 !text-rose-600 px-3 py-2 text-sm font-medium rounded-lg transition hover:!bg-rose-100 dark:!border-rose-500/40 dark:!bg-rose-500/5 dark:!text-rose-400 dark:hover:!bg-rose-500/10"
              >
                <FaTrash />
                Remove QR
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-5 py-9 text-center transition hover:border-sky-500 hover:bg-sky-500/5 dark:border-slate-700 dark:hover:border-sky-500"
            >
              <FaQrcode className="mb-3 text-3xl text-slate-400" />

              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Upload Payment QR Code
              </span>

              <span className="mt-1 text-xs text-slate-500">
                Click to browse your image
              </span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {qrPreview && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 flex items-center gap-2 border-0 bg-transparent p-0 text-sm font-medium text-sky-600 transition hover:text-sky-700 hover:underline focus:outline-none focus:ring-0 dark:text-sky-400 dark:hover:text-sky-300"
            >
              <FaUpload />
              Choose another image
            </button>
          )}
        </div>

        {/* Feedback Message */}
        {message && (
          <div
            className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
              messageType === "success"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
            }`}
          >
            {messageType === "success" ? (
              <FaCheckCircle className="mt-0.5 shrink-0" />
            ) : (
              <FaExclamationCircle className="mt-0.5 shrink-0" />
            )}

            <span>{message}</span>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end border-t border-slate-200 pt-5 dark:border-slate-700">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Payment Details"}
          </button>
        </div>
      </form>
    </section>
  );
}
