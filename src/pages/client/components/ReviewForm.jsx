import { useState } from "react";
import { FaStar, FaRegStar } from "react-icons/fa";

export default function ReviewForm({ existing, onSubmit, saving, error }) {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [comment, setComment] = useState(existing?.comment || "");
  const [hover, setHover] = useState(0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (rating) onSubmit(rating, comment);
      }}
      className="min-w-0 rounded-lg border border-slate-700 bg-slate-950/50 p-3 sm:p-4"
    >
      <p className="mb-2 text-xs font-semibold text-slate-300">
        {existing ? "Update your rating" : "Rate this photographer"}
      </p>
      <div className="mb-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="lf-star text-xl text-amber-400"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            {n <= (hover || rating) ? <FaStar /> : <FaRegStar className="text-slate-600" />}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Share your experience (optional)"
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={!rating || saving}
          className="lf-btn rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : existing ? "Update rating" : "Submit rating"}
        </button>
      </div>
    </form>
  );
}