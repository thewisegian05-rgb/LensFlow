
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import TabHeader from "../components/ui/TabHeader";
import ReviewForm from "../components/ReviewForm";

export default function ReviewsTab() {
  const { activeId, reload } = /** @type {any} */ (useOutletContext());

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [canReview, setCanReview] = useState(null);
  const [sortOrder, setSortOrder] = useState("newest");

  // Load photographer reviews.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!activeId) {
        setReviews([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error: selectError } = await supabase
        .from("photographer_reviews")
        .select(
          "id, client_id, reviewer_name, rating, comment, shoot_type, created_at"
        )
        .eq("photographer_id", activeId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (selectError) {
        console.error("Could not load reviews:", selectError);
      } else {
        setReviews(
          (data || []).map((r) => ({
            ...r,
            mine: r.client_id === user?.id,
          }))
        );
      }

      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [activeId, refreshKey]);

  // Check review eligibility.
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!activeId) {
        setCanReview(false);
        return;
      }

      const { data, error: rpcErr } = await supabase.rpc(
        "my_event_progress"
      );

      if (cancelled) return;

      if (rpcErr) {
        console.error("Could not check event progress:", rpcErr.message);
        setCanReview(false);
        return;
      }

      setCanReview(
        (Array.isArray(data) ? data : []).some(
          (e) =>
            e.photographer_id === activeId &&
            e.stage === "completed"
        )
      );
    };

    check();

    const timer = setInterval(check, 15000);
    const onFocus = () => check();

    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [activeId]);

  const myReview = reviews.find((r) => r.mine) || null;

  // Rating statistics.
  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + Number(r.rating), 0) /
      reviews.length
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter(
      (r) => Math.round(Number(r.rating)) === rating
    ).length,
  }));

  // Sort reviews.
  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();

      return sortOrder === "newest"
        ? dateB - dateA
        : dateA - dateB;
    });
  }, [reviews, sortOrder]);

  // Submit or update a review.
  const handleReview = async (rating, comment, shootType) => {
    setSaving(true);
    setError("");

    const { error: rpcError } = await supabase.rpc("submit_review", {
      p_photographer_id: activeId,
      p_rating: rating,
      p_comment: comment,
      p_shoot_type: shootType || null,
    });

    setSaving(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setRefreshKey((k) => k + 1);

    try {
      await reload?.();
    } catch (err) {
      console.error("Portal reload failed:", err);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      {/* Page heading */}
      <TabHeader
        eyebrow="Feedback"
        title="Ratings & Reviews"
        text="Tell others what it was like to work with this photographer."
      />

      {/* Rating overview */}
      <section className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[125px_minmax(0,1fr)] sm:items-center sm:gap-5">

          {/* Average rating */}
          <div className="flex flex-col items-center justify-center border-b border-slate-700/60 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
            <div className="flex items-center gap-1">
              <span className="text-4xl font-bold tracking-tight text-white tabular-nums">
                {reviews.length ? average.toFixed(1) : "—"}
              </span>
              <span className="text-2xl text-amber-400">★</span>
            </div>

            <p className="mt-1 text-xs text-slate-400">
              {reviews.length}{" "}
              {reviews.length === 1 ? "review" : "reviews"}
            </p>
          </div>

          {/* Rating distribution: fixed columns keep the stars and counts
              separate from the progress bars on desktop and mobile. */}
          <div className="min-w-0 space-y-3">
            {ratingCounts.map(({ rating, count }) => {
              const percentage = reviews.length
                ? (count / reviews.length) * 100
                : 0;

              return (
                <div
                  key={rating}
                  className="grid min-w-0 grid-cols-[112px_minmax(0,1fr)_36px] items-center gap-2 sm:gap-3"
                >
                  {/* Stars and count have enough reserved width. */}
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <div
                      className="flex shrink-0 items-center gap-px text-[15px] leading-none"
                      aria-label={`${rating} out of 5 stars`}
                    >
                      {Array.from({ length: 5 }, (_, i) => (
                        <span
                          key={i}
                          aria-hidden="true"
                          className={
                            i < rating
                              ? "text-amber-400"
                              : "text-slate-600"
                          }
                        >
                          {i < rating ? "★" : "☆"}
                        </span>
                      ))}
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-400 tabular-nums">
                      ({count})
                    </span>
                  </div>

                  {/* Bar can shrink without sliding beneath the stars. */}
                  <div
                    className="h-2 min-w-0 overflow-hidden rounded-full bg-slate-800"
                    role="progressbar"
                    aria-label={`${rating}-star reviews`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(percentage)}
                  >
                    <div
                      className="h-full rounded-full bg-sky-400 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <span className="text-right text-[11px] text-slate-400 tabular-nums">
                    {Math.round(percentage)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Review eligibility */}
      {canReview === null && !myReview ? (
        <div className="h-11 animate-pulse rounded-lg bg-slate-800/70" />
      ) : canReview || myReview ? (
        <section className="space-y-3">
          <ReviewForm
            key={`${activeId}-${myReview?.id || "new"}`}
            existing={myReview}
            onSubmit={handleReview}
            saving={saving}
            error={error}
          />
        </section>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/[0.06] px-3 py-2.5">
          <span className="mt-px text-sm text-sky-400">ⓘ</span>

          <p className="text-[13px] leading-relaxed text-slate-300">
            You can leave a review once your event reaches{" "}
            <span className="font-semibold text-white">
              Completed
            </span>
            . You can follow its progress on the Home page.
          </p>
        </div>
      )}

      {/* Reviews heading and sorting */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-200">
            Reviews ({reviews.length})
          </h3>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-300 outline-none transition hover:border-slate-500 focus:border-sky-500"
            aria-label="Sort reviews"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>

        {/* Review list */}
        {loading ? (
          <div className="space-y-2">
            <div className="h-20 animate-pulse rounded-xl bg-slate-800/70" />
            <div className="h-20 animate-pulse rounded-xl bg-slate-800/70" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700/70 px-4 py-10 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-xl text-slate-400">
              ☆
            </div>

            <p className="mt-3 text-sm font-medium text-slate-300">
              No reviews yet
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Client feedback will appear here once someone leaves a review.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedReviews.map((review) => (
              <article
                key={review.id}
                className="rounded-xl border border-slate-700/60 bg-slate-950/30 p-3 transition-colors hover:border-slate-600/80 sm:p-4"
              >
                <div className="flex items-start gap-3">

                  {/* Avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.42 0-8 2.24-8 5v2h16v-2c0-2.76-3.58-5-8-5Z" />
                    </svg>
                  </div>

                  {/* Review content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-200">
                          {review.reviewer_name || "Client"}
                        </p>

                        <div className="mt-1 flex items-center gap-0.5 text-sm leading-none text-amber-400">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span
                              key={i}
                              className={
                                i < Number(review.rating)
                                  ? "opacity-100"
                                  : "opacity-25"
                              }
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>

                      <span className="shrink-0 text-[10px] text-slate-500">
                        {new Date(review.created_at).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </span>
                    </div>

                    {review.comment && (
                      <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">
                        {review.comment}
                      </p>
                    )}

                    {review.shoot_type && (
                      <span className="mt-2 inline-flex rounded-full border border-slate-700/70 bg-slate-800/60 px-2 py-0.5 text-[10px] text-slate-400">
                        {review.shoot_type}
                      </span>
                    )}

                    {review.mine && (
                      <span className="ml-2 inline-flex rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-300">
                        You
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
