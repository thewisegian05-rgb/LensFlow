
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import TabHeader from "../components/ui/TabHeader";
import ReviewForm from "../components/ReviewForm";

export default function ReviewsTab() {
  const { activeId, reload } = useOutletContext() || {};

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [canReview, setCanReview] = useState(null);
  const [sortOrder, setSortOrder] = useState("newest");

  // ==========================================
  // LOAD REVIEWS
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!activeId) {
        setReviews([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        const { data, error: selectError } =
          await supabase
            .from("photographer_reviews")
            .select(
              "id, client_id, reviewer_name, rating, comment, shoot_type, created_at"
            )
            .eq("photographer_id", activeId)
            .order("created_at", { ascending: false });

        if (selectError) throw selectError;
        if (cancelled) return;

        setReviews(
          (data || []).map((review) => ({
            ...review,
            mine: review.client_id === user?.id,
          }))
        );
      } catch (err) {
        console.error("Could not load reviews:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [activeId, refreshKey]);

  // ==========================================
  // CHECK REVIEW ELIGIBILITY
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!activeId) {
        setCanReview(false);
        return;
      }

      try {
        const { data, error: rpcError } =
          await supabase.rpc("my_event_progress");

        if (rpcError) throw rpcError;
        if (cancelled) return;

        setCanReview(
          (Array.isArray(data) ? data : []).some(
            (event) =>
              event.photographer_id === activeId &&
              event.stage === "completed"
          )
        );
      } catch (err) {
        console.error(
          "Could not check review eligibility:",
          err
        );

        if (!cancelled) setCanReview(false);
      }
    };

    setCanReview(null);
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

  // ==========================================
  // REVIEW STATISTICS
  // ==========================================

  const myReview =
    reviews.find((review) => review.mine) || null;

  const average = reviews.length
    ? reviews.reduce(
        (sum, review) => sum + Number(review.rating),
        0
      ) / reviews.length
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map(
    (rating) => ({
      rating,
      count: reviews.filter(
        (review) =>
          Math.round(Number(review.rating)) === rating
      ).length,
    })
  );

  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();

      return sortOrder === "newest"
        ? dateB - dateA
        : dateA - dateB;
    });
  }, [reviews, sortOrder]);

  // ==========================================
  // SUBMIT / UPDATE REVIEW
  // ==========================================

  const handleReview = async (
    rating,
    comment,
    shootType
  ) => {
    if (saving || !activeId) return;

    setSaving(true);
    setError("");

    try {
      const { error: rpcError } =
        await supabase.rpc("submit_review", {
          p_photographer_id: activeId,
          p_rating: rating,
          p_comment: comment,
          p_shoot_type: shootType || null,
        });

      if (rpcError) throw rpcError;

      setRefreshKey((key) => key + 1);

      try {
        await reload?.();
      } catch (err) {
        console.error("Portal reload failed:", err);
      }
    } catch (err) {
      console.error("Review submission failed:", err);
      setError(
        err.message || "Unable to submit your review."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="min-w-0 space-y-4 text-slate-900 dark:text-slate-100">
      <TabHeader
        eyebrow="Feedback"
        title="Ratings & Reviews"
        text="Tell others what it was like to work with this photographer."
      />

      {/* ======================================
          RATING OVERVIEW
         ====================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-700/60 dark:bg-slate-950/40 dark:shadow-none">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[125px_minmax(0,1fr)] sm:items-center">
          <div className="flex flex-col items-center justify-center border-b border-slate-200 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5 dark:border-slate-700/60">
            <div className="flex items-center gap-1">
              <span className="text-4xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                {reviews.length
                  ? average.toFixed(1)
                  : "—"}
              </span>

              <span className="text-2xl text-amber-400">
                ★
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {reviews.length}{" "}
              {reviews.length === 1
                ? "review"
                : "reviews"}
            </p>
          </div>

          {/* STAR DISTRIBUTION */}
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
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <div
                      className="flex shrink-0 items-center gap-px text-[15px] leading-none"
                      aria-label={`${rating} out of 5 stars`}
                    >
                      {Array.from(
                        { length: 5 },
                        (_, index) => (
                          <span
                            key={index}
                            aria-hidden="true"
                            className={
                              index < rating
                                ? "text-amber-400"
                                : "text-slate-300 dark:text-slate-600"
                            }
                          >
                            {index < rating ? "★" : "☆"}
                          </span>
                        )
                      )}
                    </div>

                    <span className="shrink-0 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                      ({count})
                    </span>
                  </div>

                  <div
                    className="h-2 min-w-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                    role="progressbar"
                    aria-label={`${rating}-star reviews`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(percentage)}
                  >
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  <span className="text-right text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                    {Math.round(percentage)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================
          REVIEW ELIGIBILITY
         ====================================== */}

      {canReview === null && !myReview ? (
        <div className="h-11 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800/70" />
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
        <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 dark:border-sky-500/30 dark:bg-sky-500/[0.06]">
          <span className="mt-px text-sm text-sky-600 dark:text-sky-400">
            ⓘ
          </span>

          <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
            You can leave a review once your event
            reaches{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              Completed
            </span>
            . You can follow its progress on the Home page.
          </p>
        </div>
      )}

      {/* ======================================
          REVIEWS & SORTING
         ====================================== */}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200">
            Reviews ({reviews.length})
          </h3>

          <select
            value={sortOrder}
            onChange={(event) =>
              setSortOrder(event.target.value)
            }
            aria-label="Sort reviews"
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 outline-none transition hover:border-sky-300 focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800/70" />
            <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800/70" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center shadow-sm dark:border-slate-700/70 dark:bg-slate-950/20 dark:shadow-none">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              ☆
            </div>
            <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-300">
              No reviews yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Client feedback will appear here once
              someone leaves a review.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedReviews.map((review) => (
              <article
                key={review.id}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-sky-200 sm:p-4 dark:border-slate-700/60 dark:bg-slate-950/30 dark:shadow-none dark:hover:border-slate-600/80"
              >
                <div className="flex items-start gap-3">
                  {/* AVATAR */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.42 0-8 2.24-8 5v2h16v-2c0-2.76-3.58-5-8-5Z" />
                    </svg>
                  </div>

                  {/* REVIEW DETAILS */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-200">
                          {review.reviewer_name || "Client"}
                        </p>

                        <div className="mt-1 flex items-center gap-0.5 text-sm leading-none text-amber-400">
                          {Array.from(
                            { length: 5 },
                            (_, index) => (
                              <span
                                key={index}
                                className={
                                  index < Number(review.rating)
                                    ? "opacity-100"
                                    : "opacity-25"
                                }
                              >
                                ★
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      <span className="shrink-0 text-[10px] text-slate-500">
                        {new Date(
                          review.created_at
                        ).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {review.comment && (
                      <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {review.comment}
                      </p>
                    )}

                    {review.shoot_type && (
                      <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-400">
                        {review.shoot_type}
                      </span>
                    )}

                    {review.mine && (
                      <span className="ml-2 inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
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
