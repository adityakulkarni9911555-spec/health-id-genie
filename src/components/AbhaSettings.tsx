import { useEffect, useState } from 'react';
import { BadgeCheck, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatAbhaNumber, validateAbha, ABHA_UPDATED_EVENT } from '@/lib/abha';

export const AbhaSettings = ({ patientId }: { patientId: string }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ number: string | null; address: string | null }>({ number: null, address: null });
  const [number, setNumber] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('patients')
      .select('abha_number, abha_address')
      .eq('id', patientId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setSaved({ number: data?.abha_number ?? null, address: data?.abha_address ?? null });
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const startEdit = () => {
    setNumber(saved.number ? formatAbhaNumber(saved.number) : '');
    setAddress(saved.address ?? '');
    setEditing(true);
  };

  const save = async () => {
    const check = validateAbha(number, address);
    if (check.ok === false) {
      toast({ title: (check as { error: string }).error, variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from('patients')
      .update({ abha_number: check.number, abha_address: check.address })
      .eq('id', patientId);
    setBusy(false);
    if (error) {
      toast({ title: 'Could not save ABHA details', description: 'Please try again.', variant: 'destructive' });
      return;
    }
    setSaved({ number: check.number, address: check.address });
    setEditing(false);
    window.dispatchEvent(new Event(ABHA_UPDATED_EVENT));
    toast({ title: 'ABHA details saved' });
  };

  const hasAny = !!(saved.number || saved.address);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
          <BadgeCheck className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold text-foreground">ABHA health ID</h3>
          <p className="text-sm text-muted-foreground">
            Optional. Your Ayushman Bharat number helps hospitals find your government health records.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : editing ? (
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="abha-number">ABHA number (14 digits)</Label>
            <Input
              id="abha-number"
              inputMode="numeric"
              autoComplete="off"
              placeholder="12-3456-7890-1234"
              value={number}
              onChange={(e) => setNumber(formatAbhaNumber(e.target.value))}
              className="min-h-[56px] font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="abha-address">ABHA address</Label>
            <Input
              id="abha-address"
              autoComplete="off"
              autoCapitalize="none"
              placeholder="yourname@abdm"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="min-h-[56px]"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 min-h-[56px]" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
            <Button className="flex-1 min-h-[56px]" onClick={save} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {hasAny && (
            <dl className="rounded-xl bg-muted/50 p-3 text-sm space-y-1">
              {saved.number && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Number</dt>
                  <dd className="font-mono font-semibold text-foreground">{formatAbhaNumber(saved.number)}</dd>
                </div>
              )}
              {saved.address && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="font-semibold text-foreground truncate">{saved.address}</dd>
                </div>
              )}
            </dl>
          )}
          <Button variant="outline" className="w-full min-h-[56px]" onClick={startEdit}>
            <Pencil className="w-4 h-4 mr-2" />
            {hasAny ? 'Edit ABHA details' : 'Add ABHA number'}
          </Button>
        </div>
      )}
    </div>
  );
};
