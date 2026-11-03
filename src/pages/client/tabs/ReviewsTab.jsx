import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import Section from "../components/ui/Section";
import Stars from "../components/ui/Stars";
import TabHeader from "../components/ui/TabHeader";
import ReviewForm from "../components/ReviewForm";
import { getReviews } from "../utils/portalUrls";

export default function ReviewsTab() {
  const { portal, activeId, reload } = /** @type {any} */ (useOutletContext());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reviews = getReviews(portal);
  const myReview = reviews.find((r) => r.mine) || null;

  const handleReview = async (rating, comment) => {
    setSaving(true);
    setError("");
    const { error: rpcError } = await supabase.rpc("submit_review", {
      p_photographer_id: activeId,
      p_rating: rating,
      p_comment: comment,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await reload();
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
            {portal.rating_count}
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
          {reviews.length === 0 ? (
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