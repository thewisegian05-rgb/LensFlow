import { useState } from "react";
import { FaStar, FaRegStar } from "react-icons/fa";

const SHOOT_TYPES = [
  "Weddings",
  "Prenup",
  "Couple Shoot",
  "Life & Family Milestones",
  "Portrait & Lifestyle",
  "Events & Performances",
  "Corporate & Commercial",
  "Real Estate",
  "Product & Business",
  "Baptism",
  "Pet Photography",
];

// Presentational form. The parent (ReviewsTab) loads the existing review and
// saves it through supabase.rpc("submit_review"). Give it a `key` that changes
// when `existing` changes so the fields reset (ReviewsTab already does this).
export default function ReviewForm({ existing, onSubmit, saving, error }) {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [comment, setComment] = useState(existing?.comment || "");
  const [shootType, setShootType] = useState(existing?.shoot_type || "");
  const [hover, setHover] = useState(0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (rating) onSubmit(rating, comment, shootType);
      }}
      className="min-w-0 rounded-lg border border-slate-700 bg-slate-950/50 p-3"
    >
      <p className="mb-1.5 text-xs font-semibold text-slate-300">
        {existing ? "Update your rating" : "Rate this photographer"}
      </p>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="lf-star text-lg text-amber-400"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >
              {n <= (hover || rating) ? <FaStar /> : <FaRegStar className="text-slate-600" />}
            </button>
          ))}
        </div>

        <select
          value={shootType}
          onChange={(e) => setShootType(e.target.value)}
          aria-label="What shoot did you do?"
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white focus:border-sky-500 focus:outline-none sm:w-52"
        >
          <option value="">What shoot did you do?</option>
          {SHOOT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Share your experience (optional)"
        className="w-full resize-none rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
      />

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={!rating || saving}
          className="lf-btn rounded-md bg-sky-500 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : existing ? "Update rating" : "Submit rating"}
        </button>
      </div>
    </form>
  );
}