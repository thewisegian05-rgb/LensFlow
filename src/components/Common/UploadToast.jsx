import { useSyncExternalStore } from "react";
import { FaCheckCircle } from "react-icons/fa";
import { subscribeUploads, getUploadSnapshot, uploadPercent } from "../../lib/uploadManager";
import { formatBytes } from "../../lib/photoStorage";

/*
  Floating upload status. Mount it ONCE in your app layout so uploads
  stay visible on every page. It hides itself while the Culling page's
  own progress card is on screen.
*/
export default function UploadToast() {
  const { progress, cardVisible } = useSyncExternalStore(subscribeUploads, getUploadSnapshot);

  if (!progress || cardVisible) return null;

  const finished = progress.phase === "done";
  const percent = uploadPercent(progress);
  const failed = progress.failed;

  const barColor = finished ? (failed > 0 ? "bg-amber-500" : "bg-emerald-500") : "bg-sky-500";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[60] w-72 rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl"
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
            finished
              ? failed > 0
                ? "bg-amber-500/10 text-amber-400"
                : "bg-emerald-500/10 text-emerald-400"
              : "bg-sky-500/10 text-sky-400"
          }`}
        >
          {finished ? (
            <FaCheckCircle />
          ) : (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-semibold text-white">
              {finished
                ? failed > 0
                  ? "Upload finished with issues"
                  : "Upload complete"
                : "Uploading photos"}
            </p>
            <span className="text-xs font-bold tabular-nums text-white">{percent}%</span>
          </div>
          <p className="mt-0.5 truncate text-[11px] tabular-nums text-slate-400">
            {finished
              ? `${progress.total - failed} of ${progress.total} added`
              : `${progress.done} of ${progress.total} · ${formatBytes(progress.bytesDone)} of ${formatBytes(progress.bytesTotal)}`}
            {failed > 0 && ` · ${failed} failed`}
          </p>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}