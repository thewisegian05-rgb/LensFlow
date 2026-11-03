import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import Section from "../components/ui/Section";
import Stars from "../components/ui/Stars";
import TabHeader from "../components/ui/TabHeader";
import ReviewForm from "../components/ReviewForm";

export default function ReviewsTab() {
  const { activeId, reload } = /** @type {any} */ (useOutletContext());

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load this photographer's reviews straight from the reviews table.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!activeId) {
        setReviews([]);
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error: selectError } = await supabase
        .from("photographer_reviews")
        .select("id, client_id, reviewer_name, rating, comment, shoot_type, created_at")
        .eq("photographer_id", activeId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (selectError) {
        console.error("Could not load reviews:", selectError);
      } else {
        setReviews(
          (data || []).map((r) => ({ ...r, mine: r.client_id === user?.id }))
        );
      }
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [activeId, refreshKey]);

  const myReview = reviews.find((r) => r.mine) || null;

  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

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

    // Show the new review right away, then refresh the rest of the portal.
    setRefreshKey((k) => k + 1);
    try {
      await reload?.();
    } catch (err) {
      console.error("Portal reload failed:", err);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <TabHeader
        eyebrow="Feedback"
        title="Ratings & Reviews"
        text="Tell others what it was like to work with this photographer."
      />

      <Section
        title="Ratings & Reviews"
        dot="bg-emerald-400"
        right={
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-300">
            {reviews.length ? `${average.toFixed(1)} ★ · ${reviews.length}` : reviews.length}
          </span>
        }
      >
        <div className="space-y-3">
          <ReviewForm
            key={`${activeId}-${myReview?.id || "new"}`}
            existing={myReview}
            onSubmit={handleReview}
            saving={saving}
            error={error}
          />

          {loading ? (
            <div className="h-16 animate-pulse rounded-lg bg-slate-800" aria-label="Loading reviews" />
          ) : reviews.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-700 py-6 text-center text-sm text-slate-500">
              No reviews yet.
            </p>
          ) : (
            reviews.map((review, i) => (
              <article
                key={review.id}
                style={{ "--d": `${i * 70}ms` }}
                className="lf-row rounded-lg border border-slate-700 bg-slate-950/40 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Stars value={review.rating} size="text-xs" />

                    <span className="text-xs font-semibold text-slate-300">
                      {review.reviewer_name || "Client"}
                    </span>

                    {review.shoot_type && (
                      <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                        {review.shoot_type}
                      </span>
                    )}

                    {review.mine && (
                      <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                        You
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-500">
                    {new Date(review.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {review.comment && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{review.comment}</p>
                )}
              </article>
            ))
          )}
        </div>
      </Section>
    </div>
  );
}