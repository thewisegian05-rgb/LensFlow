import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FaRegImages } from "react-icons/fa";
import Section from "../components/ui/Section";
import TabHeader from "../components/ui/TabHeader";
import Lightbox from "../components/Lightbox";
import { getFeatured, publicUrl } from "../utils/portalUrls";

export default function PortfolioTab() {
  const { portal } = /** @type {any} */ (useOutletContext());
  const featured = getFeatured(portal);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  return (
    <div className="min-w-0 space-y-4">
      <TabHeader
        eyebrow="Portfolio"
        title="Featured Works"
        text="A selection of the photographer's best work. Tap a photo to view it full size."
      />

      <Section
        title="Featured Works"
        dot="bg-amber-400"
        right={
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-300">
            {featured.length}
          </span>
        }
      >
        {featured.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-700 py-10 text-center text-sm text-slate-500">
            <FaRegImages className="text-2xl text-slate-600" />
            No featured photos yet.
          </div>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {featured.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightboxIndex(index)}
                style={{ "--d": `${index * 80}ms` }}
                className="lf-photo lf-sheen group relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-700 bg-slate-800 transition hover:border-sky-400"
              >
                <img
                  src={publicUrl(photo.image_path)}
                  alt={photo.caption || "Featured photo"}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
                {photo.caption && (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 text-left text-[11px] text-white">
                    {photo.caption}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </Section>

      <Lightbox
        photos={featured}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onChange={setLightboxIndex}
      />
    </div>
  );
}