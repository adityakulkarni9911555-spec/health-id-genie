import { useCallback, useEffect, useState } from 'react';
import { Copy, Loader2, Stethoscope, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const minutesLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000));

export const DoctorPassSettings = ({ patientId }: { patientId: string }) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [, tick] = useState(0);

  const loadStatus = useCallback(async () => {
    const { data } = await supabase.rpc('doctor_pass_status', { _patient_id: patientId });
    const s = data as { active?: boolean; expires_at?: string | null } | null;
    setExpiresAt(s?.active ? s.expires_at ?? null : null);
  }, [patientId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Refresh the countdown once a minute; clear the code when it expires.
  useEffect(() => {
    if (!expiresAt) return;
    const id = window.setInterval(() => {
      if (minutesLeft(expiresAt) <= 0) {
        setExpiresAt(null);
        setCode(null);
      }
      tick((n) => n + 1);
    }, 30000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  const create = async (minutes: 15 | 60) => {
    setBusy(String(minutes));
    const { data, error } = await supabase.rpc('create_doctor_pass', { _patient_id: patientId, _minutes: minutes });
    setBusy(null);
    if (error || !data) {
      toast({ title: 'Could not create a doctor pass', description: 'Please try again.', variant: 'destructive' });
      return;
    }
    const r = data as { code: string; expires_at: string };
    setCode(r.code);
    setExpiresAt(r.expires_at);
  };

  const revoke = async () => {
    setBusy('revoke');
    const { error } = await supabase.rpc('revoke_doctor_pass', { _patient_id: patientId });
    setBusy(null);
    if (error) {
      toast({ title: 'Could not cancel the pass', variant: 'destructive' });
      return;
    }
    setCode(null);
    setExpiresAt(null);
    toast({ title: 'Doctor pass cancelled' });
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Pass copied' });
    } catch {
      /* clipboard not allowed — the code is visible on screen */
    }
  };

  const active = !!expiresAt && minutesLeft(expiresAt) > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Stethoscope className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold text-foreground">Temporary doctor pass</h3>
          <p className="text-sm text-muted-foreground">
            Give a doctor a 6-digit code that opens your reports after scanning your QR — without sharing your PIN.
            It stops working on its own.
          </p>
        </div>
      </div>

      {active ? (
        <div className="mt-4 space-y-3">
          {code ? (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
              <p className="text-xs text-muted-foreground">Tell the doctor this code</p>
              <p className="font-mono text-4xl font-bold tracking-[0.3em] text-foreground mt-1" aria-live="polite">
                {code}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Works for {minutesLeft(expiresAt!)} more min. Shown only once.
              </p>
            </div>
          ) : (
            <p className="rounded-xl bg-muted/50 p-3 text-sm text-foreground">
              A doctor pass is active for {minutesLeft(expiresAt!)} more min.
            </p>
          )}
          <div className="flex gap-2">
            {code && (
              <Button variant="outline" className="flex-1 min-h-[56px]" onClick={copy}>
                <Copy className="w-4 h-4 mr-2" />Copy
              </Button>
            )}
            <Button variant="outline" className="flex-1 min-h-[56px] text-destructive" onClick={revoke} disabled={busy !== null}>
              {busy === 'revoke' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              Cancel pass
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button className="min-h-[56px]" onClick={() => create(15)} disabled={busy !== null}>
            {busy === '15' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}15 minutes
          </Button>
          <Button variant="outline" className="min-h-[56px]" onClick={() => create(60)} disabled={busy !== null}>
            {busy === '60' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}1 hour
          </Button>
        </div>
      )}
    </div>
  );
};
