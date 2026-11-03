import { useEffect } from "react";
import { FaCameraRetro, FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { publicUrl } from "../utils/portalUrls";

/* photos: [{ id, image_path, caption }]   index: number | null */
export default function Lightbox({ photos, index, onClose, onChange }) {
  const count = photos.length;

  useEffect(() => {
    if (index === null) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onChange((index + 1) % count);
      else if (e.key === "ArrowLeft") onChange((index - 1 + count) % count);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, count, onClose, onChange]);

  if (index === null || !photos[index]) return null;
  const photo = photos[index];

  return (
    <div
      className="lf-lightbox fixed inset-0 z-50 flex flex-col overflow-hidden bg-black/95 px-1 backdrop-blur-sm sm:px-2"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between px-4 py-4 text-white sm:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="flex items-center gap-2 text-sm text-slate-300">
          <FaCameraRetro className="text-sky-500" />
          {index + 1} / {count}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 transition-colors hover:text-white"
          aria-label="Close"
        >
          <FaTimes className="text-lg" />
        </button>
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {count > 1 && (
          <button
            type="button"
            onClick={() => onChange((index - 1 + count) % count)}
            className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/70 hover:text-white sm:left-6"
            aria-label="Previous photo"
          >
            <FaChevronLeft />
          </button>
        )}
        <img
          key={index}
          src={publicUrl(photo.image_path)}
          alt={photo.caption || "Featured photo"}
          className="lf-lightbox-img max-h-[min(78vh,900px)] max-w-full rounded-lg object-contain shadow-2xl"
        />
        {count > 1 && (
          <button
            type="button"
            onClick={() => onChange((index + 1) % count)}
            className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/70 hover:text-white sm:right-6"
            aria-label="Next photo"
          >
            <FaChevronRight />
          </button>
        )}
      </div>
      <p className="py-5 text-center text-sm text-slate-300">{photo.caption || ""}</p>
    </div>
  );
}