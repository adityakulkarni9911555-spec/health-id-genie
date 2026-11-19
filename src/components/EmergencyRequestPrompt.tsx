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
import { ShieldAlert, BadgeCheck } from 'lucide-react';

type Req = {
  id: string; facility_name: string; facility_verified: boolean; requester_kind: string;
  requester_phone: string; reason: string; expires_at: string;
};

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
      if (next.some((r) => !prev.find((p) => p.id === r.id))) tapFeedback(400);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!user) { setQueue([]); return; }
    void load();
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

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-destructive" /> Emergency access request</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-1 font-medium text-foreground">
                {current.facility_name}
                {current.facility_verified
                  ? <span className="inline-flex items-center gap-1 text-xs text-primary"><BadgeCheck className="h-4 w-4" />Verified</span>
                  : <span className="text-xs text-muted-foreground">(not verified)</span>}
              </p>
              <p>{current.requester_kind === 'clinic' ? 'Clinic' : 'Hospital'} · {masked}</p>
              <p>Reason: {current.reason}</p>
              <p>Approving opens your reports to them for 15 minutes. Expires in {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <Button variant="outline" className="min-h-14" disabled={busy} onClick={() => decide(false)}>Reject</Button>
          <Button className="min-h-14" disabled={busy} onClick={() => decide(true)}>Approve</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
