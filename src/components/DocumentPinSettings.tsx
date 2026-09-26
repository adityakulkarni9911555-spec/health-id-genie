import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, LockOpen, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DocumentPinSettingsProps {
  patientId: string;
}

export const DocumentPinSettings = ({ patientId }: DocumentPinSettingsProps) => {
  const { toast } = useToast();
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc('has_document_pin', { _patient_id: patientId })
      .then(({ data }) => {
        if (!cancelled) setHasPin(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const savePin = async () => {
    if (!/^[0-9]{4}$/.test(pin)) {
      toast({ title: 'Enter a 4-digit PIN', variant: 'destructive' });
      return;
    }
    if (pin !== confirmPin) {
      toast({ title: 'The two PINs do not match', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('set_document_pin', {
      _patient_id: patientId,
      _pin: pin,
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Could not save PIN', description: error.message, variant: 'destructive' });
      return;
    }
    setPin('');
    setConfirmPin('');
    setEditing(false);
    setHasPin(true);
    toast({
      title: 'Document PIN saved',
      description: 'Your reports now stay locked until the PIN is entered.',
    });
  };

  const removePin = async () => {
    if (!confirm('Remove the PIN? Anyone who scans your QR will be able to open your reports.')) return;
    setBusy(true);
    const { error } = await supabase.rpc('clear_document_pin', { _patient_id: patientId });
    setBusy(false);
    if (error) {
      toast({ title: 'Could not remove PIN', description: error.message, variant: 'destructive' });
      return;
    }
    setHasPin(false);
    setEditing(false);
    toast({ title: 'Document PIN removed' });
  };

  return (
    <div className="form-section no-print">
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            hasPin ? 'bg-success/10' : 'bg-warning/10'
          }`}
        >
          {hasPin ? (
            <ShieldCheck className="w-5 h-5 text-success" />
          ) : (
            <LockOpen className="w-5 h-5 text-warning" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground">
            Lock your reports with a PIN
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Blood group, allergies, conditions and your emergency contact always stay visible so
            anyone can help in an emergency. A PIN keeps your reports and scans hidden until you
            or your family share the 4 digits with the doctor.
          </p>
        </div>
      </div>

      {hasPin === null ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking…
        </p>
      ) : editing || !hasPin ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="doc-pin">4-digit PIN</Label>
              <Input
                id="doc-pin"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="btn-touch tracking-[0.5em] text-center font-mono"
              />
            </div>
            <div>
              <Label htmlFor="doc-pin-confirm">Confirm PIN</Label>
              <Input
                id="doc-pin-confirm"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="btn-touch tracking-[0.5em] text-center font-mono"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={savePin} disabled={busy} className="btn-touch w-full sm:w-auto">
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
              {hasPin ? 'Update PIN' : 'Turn on PIN lock'}
            </Button>
            {hasPin && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setPin('');
                  setConfirmPin('');
                }}
                className="btn-touch w-full sm:w-auto"
              >
                Cancel
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Keep the PIN somewhere your family can find it. Reports unlock only with these 4
            digits, and access locks for 15 minutes after 5 wrong tries.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-3 py-2">
            <Lock className="w-4 h-4 text-success" />
            <p className="text-sm text-foreground">
              PIN lock is on — reports stay hidden on the emergency page.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setEditing(true)} className="btn-touch w-full">
              Change PIN
            </Button>
            <Button
              variant="outline"
              onClick={removePin}
              disabled={busy}
              className="btn-touch w-full"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LockOpen className="w-4 h-4 mr-2" />}
              Remove PIN
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
