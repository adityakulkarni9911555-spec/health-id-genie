export const RouteLoader = () => (
  <div className="min-h-screen bg-background px-4 py-5" role="status" aria-live="polite" aria-label="Loading Medora">
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="h-6 w-28 rounded bg-muted" />
      <div className="h-64 rounded-lg border border-border bg-card" />
      <span className="sr-only">Loading Medora…</span>
    </div>
  </div>
);
