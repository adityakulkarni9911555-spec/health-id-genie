import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, ChevronRight, Droplet, FileText, KeyRound, Loader2, Lock, LogOut,
  Moon, QrCode, ShieldCheck, Sun, UserRound, History, Eye, EyeOff, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { loadPatientForCurrentUser } from '@/lib/patientProfile';
import type { Patient } from '@/types/patient';
import { ProfilePhotoUploader } from '@/components/ProfilePhotoUploader';
import { usePatientPhotoUrl } from '@/lib/patientPhoto';
import { WalletNavigation } from '@/components/WalletNavigation';

type PinStatus = { locked: boolean; locked_until?: string; attempts_left: number };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (fn: string, args: Record<string, unknown>) => (supabase.rpc as any)(fn, args);

const Glass = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <section className={`profile-section border-b border-border ${className}`}>
    {children}
  </section>
);

const Row = ({ icon, title, detail, onClick, to, trailing }: {
  icon: React.ReactNode; title: string; detail?: string; onClick?: () => void; to?: string; trailing?: React.ReactNode;
}) => {
  const inner = (
    <>
      <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">{icon}</span>
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        {detail && <span className="block text-xs text-muted-foreground whitespace-normal break-words">{detail}</span>}
      </span>
      {trailing ?? <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />}
    </>
  );
  const cls = 'group w-full flex items-center gap-3 px-4 min-h-[64px] transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:bg-accent/60';
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return <Button variant="ghost" type="button" onClick={onClick} disabled={!onClick} className={`${cls} h-auto rounded-none justify-start whitespace-normal`}>{inner}</Button>;
};

const formatUntil = (iso?: string) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { resolved: theme, setMode } = useTheme();
  const toggleTheme = () => setMode(theme === 'dark' ? 'light' : 'dark');
  const { planSlug } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const photoUrl = usePatientPhotoUrl(patient?.photoPath);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pinStatus, setPinStatus] = useState<PinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = user?.id;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<'pin' | 'password'>('pin');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshPinStatus = async (pid: string) => {
    const { data } = await rpc('account_pin_status', { _patient_id: pid });
    if (data) setPinStatus(data as PinStatus);
  };

  useEffect(() => {
    if (authLoading || !userId) return;
    let cancelled = false;
    loadPatientForCurrentUser()
      .then(async (p) => {
        if (cancelled) return;
        setPatient(p);
        if (p) {
          const [pinResult, statusResult] = await Promise.all([
            supabase.rpc('has_document_pin', { _patient_id: p.id }),
            rpc('account_pin_status', { _patient_id: p.id }),
          ]);
          if (cancelled) return;
          setHasPin(pinResult.error ? null : Boolean(pinResult.data));
          if (statusResult.data) setPinStatus(statusResult.data as PinStatus);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authLoading, userId]);

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  const openPasswordDialog = () => {
    setStep('pin'); setPin(''); setPinError(''); setNewPw(''); setConfirmPw('');
    setDialogOpen(true);
  };

  const submitPin = async () => {
    if (!patient || !/^[0-9]{4}$/.test(pin)) { setPinError('Enter your 4-digit PIN.'); return; }
    setBusy(true);
    const { data, error } = await rpc('verify_account_pin', { _patient_id: patient.id, _pin: pin });
    setBusy(false);
    setPin('');
    if (error) { setPinError('Could not check your PIN. Try again.'); return; }
    const res = data as { ok: boolean; reason: string; attempts_left?: number; locked_until?: string };
    if (res.ok) { setPinError(''); setStep('password'); await refreshPinStatus(patient.id); return; }
    if (res.reason === 'locked') {
      setPinError(`Too many wrong attempts. Locked until ${formatUntil(res.locked_until)}.`);
    } else if (res.reason === 'no_pin') {
      setPinError('Set a PIN on your health card first.');
    } else {
      setPinError(`Wrong PIN. ${res.attempts_left} ${res.attempts_left === 1 ? 'attempt' : 'attempts'} left before a 24-hour lock.`);
    }
    await refreshPinStatus(patient.id);
  };

  const submitPassword = async () => {
    if (newPw.length < 8) { toast({ title: 'Use at least 8 characters', variant: 'destructive' }); return; }
    if (newPw !== confirmPw) { toast({ title: 'Passwords do not match', variant: 'destructive' }); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setBusy(false);
    if (error) { toast({ title: 'Could not change password', description: error.message, variant: 'destructive' }); return; }
    setDialogOpen(false);
    toast({ title: 'Password changed', description: 'Use your new password next time you sign in.' });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const locked = pinStatus?.locked;
  const initials = (patient?.fullName || user?.email || '?').split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  const qrActive = Boolean(patient?.shareToken) && !patient?.shareRevoked;
  const docCount = patient?.documents?.length ?? 0;

  return (
    <div className="min-h-screen bg-background wallet-surface">
      <Helmet>
        <title>Profile & Settings — Medora</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <header className="sticky top-0 z-40 glass-nav border-b border-border/60">
        <div className="container mx-auto px-4 py-2 max-w-2xl grid grid-cols-[56px_1fr_56px] items-center">
          <Button asChild variant="ghost" size="icon" className="h-14 w-14">
            <Link to="/" aria-label="Back to health card"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <h1 className="font-display text-base font-bold text-foreground text-center">Profile</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8 max-w-2xl space-y-4">
        <WalletNavigation active="profile" />
        {authLoading || loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground" role="status">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <Glass className="py-4">
              <div className="relative flex items-center gap-4">
                <div className="w-14 h-16 sm:w-16 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                  {photoUrl ? <img src={photoUrl} alt="Your profile" className="w-full h-full object-cover" /> : initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl font-bold text-foreground break-words [overflow-wrap:anywhere]">{patient?.fullName || 'Your account'}</p>
                  <p className="text-xs text-muted-foreground break-all mt-1">{user?.email}</p>
                  <Badge variant="secondary" className="mt-2 capitalize">{planSlug || 'free'} plan</Badge>
                </div>
              </div>
              {patient && (
                <div className="relative grid grid-cols-3 gap-2 mt-5">
                  <Stat icon={<Droplet className="w-4 h-4" />} label="Blood" value={patient.bloodGroup || '—'} />
                  <Link to="/?section=records" className="min-h-14" aria-label="Open records"><Stat icon={<FileText className="w-4 h-4" />} label="Documents" value={String(docCount)} /></Link>
                  <Link to="/?section=manage" className="min-h-14" aria-label="Manage emergency QR"><Stat icon={<QrCode className="w-4 h-4" />} label="QR" value={qrActive ? 'Active' : 'Paused'} /></Link>
                </div>
              )}
            </Glass>

            {patient && (
              <ProfilePhotoUploader
                patientId={patient.id}
                fullName={patient.fullName}
                photoPath={patient.photoPath}
                onChange={(photoPath) => setPatient((prev) => (prev ? { ...prev, photoPath } : prev))}
              />
            )}

            {patient && (
              <Glass className="overflow-hidden">
                <h2 className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Health details</h2>
                <div className="divide-y divide-border/60">
                  <Row icon={<UserRound className="w-5 h-5" />} title="Personal & emergency info"
                    detail={patient.emergencyContact ? `Emergency contact: ${patient.emergencyContact}` : 'Name, allergies, conditions'} to="/?section=manage" />
                </div>
              </Glass>
            )}

            <Glass className="overflow-hidden">
              <h2 className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Security</h2>
              <div className="divide-y divide-border/60">
                <Row icon={<KeyRound className="w-5 h-5" />} title="Change password"
                  detail={!patient ? 'Create your health card first' : hasPin === false ? 'Set a PIN on your health card first' : locked ? `Locked until ${formatUntil(pinStatus?.locked_until)}` : 'Confirm with your 4-digit PIN'}
                  onClick={patient && hasPin && !locked ? openPasswordDialog : undefined}
                  trailing={locked ? <Lock className="w-4 h-4 text-warning" /> : undefined} />
                <Row icon={<ShieldCheck className="w-5 h-5" />} title="Report PIN"
                  detail={hasPin ? 'Set — reports stay locked without it' : 'Not set'} to="/?section=manage" />
                <Row icon={<History className="w-5 h-5" />} title="Privacy & access history" detail="Who opened your card, and when" to="/privacy" />
              </div>
            </Glass>

            <Glass className="overflow-hidden">
              <h2 className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferences</h2>
              <div className="divide-y divide-border/60">
                <Row icon={theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  title="Appearance" detail={theme === 'dark' ? 'Dark' : 'Light'} onClick={toggleTheme}
                  trailing={<span className="text-xs font-medium text-primary">Switch</span>} />
              </div>
            </Glass>

            <Glass className="overflow-hidden">
              <Row icon={<LogOut className="w-5 h-5" />} title="Sign out" onClick={signOut} />
            </Glass>

            <p className="text-center text-xs text-muted-foreground px-6">
              For your safety, passwords are stored scrambled and can never be shown — not even to us. You can set a new one any time.
            </p>
          </>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl bg-card/90 backdrop-blur-xl">
          {step === 'pin' ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-primary" /> Enter your PIN</DialogTitle>
                <DialogDescription>
                  3 wrong attempts lock this for 24 hours.
                  {pinStatus && !pinStatus.locked && ` ${pinStatus.attempts_left} left.`}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); submitPin(); }} className="space-y-4">
                <Input autoFocus inputMode="numeric" maxLength={4} type="password" value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="h-14 text-center text-2xl tracking-[0.6em]" aria-label="4-digit PIN" disabled={locked} />
                <div aria-live="polite" className="min-h-[1.25rem] text-sm text-destructive flex items-center gap-1.5">
                  {pinError && <><Clock className="w-4 h-4 shrink-0" />{pinError}</>}
                </div>
                <Button type="submit" className="w-full min-h-[56px]" disabled={busy || locked || pin.length !== 4}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Set a new password</DialogTitle>
                <DialogDescription>At least 8 characters.</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); submitPassword(); }} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-pw">New password</Label>
                  <div className="relative">
                    <Input id="new-pw" type={showPw ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)} className="h-12 pr-12" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-1 top-1 h-10 w-10 flex items-center justify-center text-muted-foreground" aria-label={showPw ? 'Hide password' : 'Show password'}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pw">Confirm password</Label>
                  <Input id="confirm-pw" type={showPw ? 'text' : 'password'} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="h-12" autoComplete="new-password" />
                </div>
                <Button type="submit" className="w-full min-h-[56px]" disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save new password'}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="min-w-0 border-t border-border px-1 pt-3">
    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">{icon}{label}</div>
    <p className="text-sm font-bold text-foreground mt-0.5">{value}</p>
  </div>
);

export default Profile;
