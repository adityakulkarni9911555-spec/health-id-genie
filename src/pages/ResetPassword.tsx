import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Clock, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';
import { recoveryStep } from '@/lib/passwordRecovery';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (fn: string, args: Record<string, unknown>) => (supabase.rpc as any)(fn, args);
const formatUntil = (iso?: string) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

type Step = 'loading' | 'invalid' | 'error' | 'pin' | 'locked' | 'password';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('loading');
  const [patientId, setPatientId] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string>();
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let done = false;
    let disposed = false;
    const decide = async () => {
      if (done) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session || done || disposed) return;
      done = true;
      try {
        const { data: profile, error: profileError } = await supabase.from('profiles').select('patient_id').eq('id', data.session.user.id).maybeSingle();
        if (profileError || disposed) { if (!disposed) setStep('error'); return; }
        if (!profile?.patient_id) { setStep('password'); return; }
        setPatientId(profile.patient_id);
        const { data: hasPin, error: pinCheckError } = await supabase.rpc('has_document_pin', { _patient_id: profile.patient_id });
        if (pinCheckError || typeof hasPin !== 'boolean') { setStep('error'); return; }
        const { data: st, error: statusError } = hasPin ? await rpc('account_pin_status', { _patient_id: profile.patient_id }) : { data: null, error: null };
        if (disposed) return;
        if (st?.locked) setLockedUntil(st.locked_until);
        setStep(recoveryStep(hasPin, st, Boolean(statusError)));
      } catch {
        if (!disposed) setStep('error');
      }
    };
    // Defer database requests until the auth callback releases its session lock.
    const { data: sub } = supabase.auth.onAuthStateChange(() => { window.setTimeout(decide, 0); });
    decide();
    const t = window.setTimeout(() => { if (!done) setStep('invalid'); }, 6000);
    return () => { disposed = true; sub.subscription.unsubscribe(); window.clearTimeout(t); };
  }, []);

  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !/^[0-9]{4}$/.test(pin)) { setPinError('Enter your 4-digit PIN.'); return; }
    setBusy(true);
    const { data, error } = await rpc('verify_account_pin', { _patient_id: patientId, _pin: pin });
    setBusy(false);
    setPin('');
    if (error || !data) { setPinError('Could not check your PIN. Try again.'); return; }
    if (data.ok) { setPinError(''); setStep('password'); return; }
    if (data.reason === 'locked') { setLockedUntil(data.locked_until); setStep('locked'); return; }
    setPinError(`Wrong PIN. ${data.attempts_left} ${data.attempts_left === 1 ? 'attempt' : 'attempts'} left before a 24-hour lock.`);
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { toast({ title: 'Use at least 8 characters', variant: 'destructive' }); return; }
    if (pw !== confirm) { toast({ title: 'Passwords do not match', variant: 'destructive' }); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast({ title: 'Could not save password', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Password saved', description: 'You are signed in with your new password.' });
    navigate('/', { replace: true });
  };

  const cancel = async () => { await supabase.auth.signOut(); navigate('/auth', { replace: true }); };

  return (
    <main className="min-h-screen bg-background hero-surface">
      <Helmet><title>Reset password — Medora</title><meta name="robots" content="noindex" /></Helmet>
      <div className="container mx-auto px-5 py-6 max-w-md">
        <Link to="/" aria-label="Medora home" className="inline-block mb-8"><Logo /></Link>
        <div className="form-section p-7 space-y-5">
          {step === 'loading' && (
            <p role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /> Checking your reset link…</p>
          )}
          {step === 'invalid' && (
            <>
              <h1 className="font-display text-2xl font-semibold">Link expired</h1>
              <p className="text-sm text-muted-foreground">This reset link is no longer valid. Ask for a new one from the sign-in page.</p>
              <Button asChild className="btn-touch w-full"><Link to="/auth">Back to sign in</Link></Button>
            </>
          )}
          {step === 'error' && (
            <>
              <h1 className="font-display text-2xl font-semibold">Could not check security</h1>
              <p className="text-sm text-muted-foreground" role="alert">Your PIN protection could not be checked. Password changes stay unavailable. Please try again.</p>
              <Button className="min-h-14 w-full" onClick={() => window.location.reload()}>Try again</Button>
            </>
          )}
          {step === 'pin' && (
            <form onSubmit={submitPin} className="space-y-4">
              <h1 className="font-display text-2xl font-semibold flex items-center gap-2"><Lock className="w-5 h-5 text-primary" /> Enter your PIN</h1>
              <p className="text-sm text-muted-foreground">To protect your health records, confirm your 4-digit PIN. 3 wrong attempts lock this for 24 hours.</p>
              <Input autoFocus inputMode="numeric" maxLength={4} type="password" value={pin} aria-label="4-digit PIN"
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className="h-14 text-center text-2xl tracking-[0.6em]" />
              <div aria-live="polite" className="min-h-[1.25rem] text-sm text-destructive flex items-center gap-1.5">
                {pinError && <><Clock className="w-4 h-4 shrink-0" />{pinError}</>}
              </div>
              <Button type="submit" className="btn-touch w-full" disabled={busy || pin.length !== 4}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
              </Button>
              <Button type="button" variant="ghost" className="btn-touch w-full" onClick={cancel}>Cancel</Button>
            </form>
          )}
          {step === 'locked' && (
            <>
              <h1 className="font-display text-2xl font-semibold flex items-center gap-2"><Lock className="w-5 h-5 text-warning" /> Locked for safety</h1>
              <p className="text-sm text-muted-foreground" aria-live="polite">Too many wrong PIN attempts. You can try again after {formatUntil(lockedUntil)}.</p>
              <Button className="btn-touch w-full" onClick={cancel}>Back to sign in</Button>
            </>
          )}
          {step === 'password' && (
            <form onSubmit={submitPassword} className="space-y-4">
              <h1 className="font-display text-2xl font-semibold">Set a new password</h1>
              <div className="space-y-2">
                <Label htmlFor="new-pw">New password</Label>
                <div className="relative">
                  <Input id="new-pw" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" className="h-12 pr-12" />
                  <Button variant="ghost" size="icon" type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-muted-foreground">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pw">Confirm password</Label>
                <Input id="confirm-pw" type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className="h-12" />
              </div>
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
              <Button type="submit" className="btn-touch w-full" disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save new password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
