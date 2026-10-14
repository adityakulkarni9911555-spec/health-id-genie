import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, History, KeyRound, Loader2, Lock, QrCode, RefreshCw, ScanLine, Sparkles, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadAccessHistory, type AccessEvent, type AccessEventKind } from '@/lib/accessHistory';

const ICONS: Record<AccessEventKind, JSX.Element> = {
  pin_success: <KeyRound className="w-4 h-4 text-success" />,
  pin_failure: <Lock className="w-4 h-4 text-warning" />,
  scan: <ScanLine className="w-4 h-4 text-primary" />,
  break_glass: <AlertTriangle className="w-4 h-4 text-destructive" />,
  qr_rotated: <QrCode className="w-4 h-4 text-primary" />,
  ai: <Sparkles className="w-4 h-4 text-primary" />,
  other: <Activity className="w-4 h-4 text-muted-foreground" />,
};

export const AccessHistory = ({ patientId }: { patientId: string }) => {
  const [events, setEvents] = useState<AccessEvent[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    loadAccessHistory(patientId)
      .then(setEvents)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(load, [load]);

  return (
    <section className="form-section" aria-labelledby="access-history-title">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h2 id="access-history-title" className="font-display text-lg font-semibold text-foreground">Access history</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} aria-label="Refresh access history">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Who opened your emergency page and what they could see. This list is read-only — nobody, including you, can edit it.
      </p>

      {loading && !events ? (
        <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground" role="status">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading history…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm" role="alert">
          <p className="font-medium text-foreground">Couldn't load your access history.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={load}>Try again</Button>
        </div>
      ) : !events || events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No one has opened your emergency page yet.
        </div>
      ) : (
        <ol className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="flex gap-3 rounded-xl border border-border p-3">
              <div className="mt-0.5 shrink-0">{ICONS[e.kind]}</div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.detail}</p>
                <time className="text-xs text-muted-foreground" dateTime={e.at}>
                  {new Date(e.at).toLocaleString()}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
