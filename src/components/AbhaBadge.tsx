import { useEffect, useState } from 'react';
import { ExternalLink, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatAbhaNumber, ABHA_PORTAL_URL, ABHA_UPDATED_EVENT } from '@/lib/abha';

/** National health ID badge shown under the card. Display only. */
export const AbhaBadge = ({ patientId }: { patientId: string }) => {
  const [abha, setAbha] = useState<{ number: string | null; address: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      supabase.from('patients').select('abha_number, abha_address').eq('id', patientId).maybeSingle()
        .then(({ data }) => { if (!cancelled) setAbha({ number: data?.abha_number ?? null, address: data?.abha_address ?? null }); });
    load();
    window.addEventListener(ABHA_UPDATED_EVENT, load);
    return () => { cancelled = true; window.removeEventListener(ABHA_UPDATED_EVENT, load); };
  }, [patientId]);

  if (!abha) return null;
  const linked = Boolean(abha.number || abha.address);

  return (
    <div className="no-print mb-3 rounded-xl border border-border bg-card p-3 flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground" aria-hidden="true">
        <Landmark className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">National Health ID · ABHA</p>
        {linked ? (
          <>
            {abha.number && <p className="font-mono text-sm font-semibold text-foreground tracking-wider">{formatAbhaNumber(abha.number)}</p>}
            {abha.address && <p className="text-xs text-muted-foreground break-all">{abha.address}</p>}
          </>
        ) : (
          <Link to="/profile" className="text-sm font-medium text-primary">Add your ABHA number</Link>
        )}
      </div>
      <a href={ABHA_PORTAL_URL} target="_blank" rel="noopener noreferrer"
        className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium text-primary hover:bg-accent"
        aria-label="Open the official ABHA portal">
        Portal <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
};
