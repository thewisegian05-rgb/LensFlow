export default function PortalSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="lf-skeleton" style={{ "--i": 0 }}>
        <div className="lf-skeleton-top">
          <span className="lf-skeleton-avatar lf-shimmer-bar" />
          <span className="lf-skeleton-lines">
            <span className="lf-skeleton-line lf-shimmer-bar w40" />
            <span className="lf-skeleton-line lf-shimmer-bar w70" />
          </span>
        </div>
        <span className="lf-skeleton-line lf-shimmer-bar w90" />
        <span className="lf-skeleton-line lf-shimmer-bar w60" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="lf-skeleton" style={{ "--i": i }}>
            <span className="lf-skeleton-photo lf-shimmer-bar" />
          </div>
        ))}
      </div>
    </div>
  );
}