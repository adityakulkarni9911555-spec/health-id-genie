import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { tapFeedback } from '@/lib/haptics';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert, BadgeCheck, Building2, Phone, FileText, Clock, Check, X, AlertTriangle } from 'lucide-react';

type Req = {
  id: string; facility_name: string; facility_verified: boolean; requester_kind: string;
  requester_phone: string; reason: string; expires_at: string;
};

/** Short two-tone chime so the request is noticed even if the screen isn't watched. */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 660].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.25;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.start(t); o.stop(t + 0.24);
    });
    window.setTimeout(() => void ctx.close(), 800);
  } catch { /* audio unavailable */ }
}

function alertNewRequest(r: Req) {
  chime();
  // System notification while Medora is open in the background (no patient details in the text).
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
    try {
      new Notification('Emergency access request', {
        body: `${r.requester_kind === 'clinic' ? 'A clinic' : 'A hospital'} is asking to see your reports. Open Medora to approve or reject.`,
        icon: '/favicon.ico', tag: `medora-emergency-${r.id}`, requireInteraction: true,
      });
    } catch { /* unavailable */ }
  }
}

/** Signed-in patient: shows pending emergency access requests to approve or reject. */
export default function EmergencyRequestPrompt() {
  const { user } = useAuth();
  const location = useLocation();
  const [queue, setQueue] = useState<Req[]>([]);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('emergency_access_requests')
      .select('id, facility_name, facility_verified, requester_kind, requester_phone, reason, expires_at')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });
    setQueue((prev) => {
      const next = (data ?? []) as Req[];
      const fresh = next.filter((r) => !prev.find((p) => p.id === r.id));
      if (fresh.length) { tapFeedback(400); alertNewRequest(fresh[0]); }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!user) { setQueue([]); return; }
    void load();
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => undefined);
    }
    const channel = supabase
      .channel(`emergency-requests-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_access_requests' }, () => void load())
      .subscribe();
    const poll = window.setInterval(() => void load(), 15000);
    const onVis = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user, load]);

  useEffect(() => {
    if (!queue.length) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [queue.length]);

  const current = queue.find((r) => new Date(r.expires_at).getTime() > now);
  if (!user || !current || location.pathname.startsWith('/e/')) return null;

  const secs = Math.max(0, Math.round((new Date(current.expires_at).getTime() - now) / 1000));
  const masked = current.requester_phone.replace(/\d(?=\d{4})/g, '•');

  const decide = async (approve: boolean) => {
    setBusy(true);
    const { data, error } = await supabase.rpc('decide_emergency_request', { _request_id: current.id, _approve: approve });
    setBusy(false);
    const res = data as { ok?: boolean; reason?: string } | null;
    if (error || !res?.ok) toast.error(res?.reason === 'expired' ? 'This request has already expired.' : 'Could not save your answer. Try again.');
    else toast.success(approve ? 'Approved — reports open for 15 minutes.' : 'Request rejected.');
    setQueue((q) => q.filter((r) => r.id !== current.id));
    void load();
  };

  const urgent = secs < 60;
  const pct = Math.min(100, (secs / 180) * 100);
  return (
    <AlertDialog open>
      <AlertDialogContent className="max-w-[calc(100vw-1.5rem)] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-md">
        <div className="h-1 w-full bg-muted">
          <div className={`h-full transition-all duration-1000 ${urgent ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="space-y-4 p-5">
          <AlertDialogHeader className="space-y-3 text-left">
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/10">
                <ShieldAlert className="h-6 w-6 text-destructive" />
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${urgent ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'}`}>
                <Clock className="h-4 w-4" />{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
              </span>
            </div>
            <AlertDialogTitle className="text-xl leading-tight">Someone wants to see your reports</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">A responder scanned your emergency QR and asked for access.</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="divide-y divide-border rounded-2xl border border-border bg-muted/40">
            <div className="flex items-start gap-3 p-3">
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{current.requester_kind === 'clinic' ? 'Clinic' : 'Hospital'}</p>
                <p className="truncate font-semibold text-foreground">{current.facility_name}</p>
              </div>
              {current.facility_verified
                ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"><BadgeCheck className="h-3.5 w-3.5" />Verified</span>
                : <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"><AlertTriangle className="h-3.5 w-3.5" />Not verified</span>}
            </div>
            <div className="flex items-center gap-3 p-3">
              <Phone className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium tabular-nums text-foreground">{masked}</p></div>
            </div>
            <div className="flex items-start gap-3 p-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0"><p className="text-xs text-muted-foreground">Reason</p><p className="break-words font-medium text-foreground">{current.reason}</p></div>
            </div>
          </div>

          {!current.facility_verified && (
            <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">This hospital is not in our verified list. Approve only if you expect this request.</p>
          )}
          <p className="text-xs text-muted-foreground">If you approve, they can view your reports for 15 minutes only. You can see this in your access history.</p>

          <AlertDialogFooter className="grid grid-cols-2 gap-3 sm:space-x-0">
            <Button variant="outline" className="min-h-14 rounded-2xl text-base" disabled={busy} onClick={() => decide(false)}>
              <X className="mr-1 h-5 w-5" />Reject
            </Button>
            <Button className="min-h-14 rounded-2xl text-base" disabled={busy} onClick={() => decide(true)}>
              <Check className="mr-1 h-5 w-5" />Approve
            </Button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
