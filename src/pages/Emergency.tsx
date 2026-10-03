import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertTriangle,
  Phone,
  Droplets,
  FileText,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Lock,
  Unlock,
  Scale,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SecureDocumentViewer } from '@/components/SecureDocumentViewer';

interface EmergencyDoc {
  name: string;
  url: string;
  type: string | null;
  size: number | null;
  uploaded_at: string | null;
}

interface EmergencyPayload {
  patient: {
    full_name: string;
    date_of_birth: string;
    gender: string;
    blood_group: string | null;
    height: string | null;
    weight: string | null;
    allergies: string[];
    chronic_conditions: string[];
    emergency_contact: string;
  };
  documents: EmergencyDoc[];
  documents_locked?: boolean;
  document_count?: number;
  pin_status?: string | null;
  pin_retry_after?: number | null;
  pin_attempts_left?: number | null;
  override_status?: string | null;
}

/** Show only the first 2 and last 3 digits: +91 98••• ••214 */
const maskPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 6) return '•'.repeat(Math.max(digits.length, 4));
  const cc = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ` : '';
  const local = digits.slice(-10);
  return `${cc}${local.slice(0, 2)}••• ••${local.slice(-3)}`;
};


const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          size?: 'invisible' | 'normal' | 'compact';
          callback: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
        },
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

const Emergency = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const shouldOpenProtectedReport = searchParams.get('view') === 'report';
  const [data, setData] = useState<EmergencyPayload | null>(null);
  const [state, setState] = useState<
    'loading' | 'ready' | 'notfound' | 'error' | 'ratelimited' | 'wiped'
  >('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [pinInput, setPinInput] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [clinicianPhone, setClinicianPhone] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideBusy, setOverrideBusy] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overridePhone, setOverridePhone] = useState<string | null>(null);
  const [viewing, setViewing] = useState<EmergencyDoc | null>(null);
  const [sessionId] = useState(() =>
    Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase(),
  );
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    document.title = 'Emergency Medical Info · Medora';

    // Prevent this page from being cached, indexed, or restored from bfcache.
    const metas: HTMLMetaElement[] = [];
    const addMeta = (attr: 'name' | 'http-equiv', key: string, content: string) => {
      const m = document.createElement('meta');
      m.setAttribute(attr, key);
      m.content = content;
      document.head.appendChild(m);
      metas.push(m);
    };
    addMeta('name', 'robots', 'noindex, nofollow, noarchive, nosnippet');
    addMeta('http-equiv', 'Cache-Control', 'no-store, no-cache, must-revalidate');
    addMeta('http-equiv', 'Pragma', 'no-cache');

    // Wipe everything the moment the tab is hidden, closed, or navigated away.
    const wipe = () => {
      setViewing(null);
      setData(null);
      setState('wiped');

      // Belt-and-suspenders: also clear any strays this route could have created.
      try {
        Object.keys(sessionStorage)
          .filter((k) => k.startsWith('emergency:'))
          .forEach((k) => sessionStorage.removeItem(k));
      } catch {}
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') wipe();
    };
    // `beforeunload` also disables bfcache in Chrome/Safari, so a "Back" from
    // another tab re-runs the challenge + lookup rather than showing cached data.
    window.addEventListener('pagehide', wipe);
    window.addEventListener('beforeunload', wipe);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('pagehide', wipe);
      window.removeEventListener('beforeunload', wipe);
      document.removeEventListener('visibilitychange', onVisibility);
      metas.forEach((m) => m.remove());
      // Note: do NOT call wipe() here — React StrictMode double-invokes effects
      // in dev, and wiping on cleanup would reset an in-flight lookup to
      // 'loading' forever. Real tab close is covered by pagehide/beforeunload.
    };
  }, []);


  const runLookup = async (turnstileToken?: string, pin?: string) => {
    if (!token) {
      setState('notfound');
      return;
    }
    try {
      const { data: res, error } = await supabase.functions.invoke('emergency-lookup', {
        body: { token, turnstile_token: turnstileToken, pin },
      });
      if (error || !res || (res as any).error) {
        const errBody = (res as any)?.error;
        if (errBody === 'rate_limited') {
          setState('ratelimited');
        } else {
          setState('notfound');
        }
        return;
      }
      const payload = res as EmergencyPayload;
      setData(payload);
      setState('ready');
      if (shouldOpenProtectedReport) {
        if (payload.documents_locked) {
          window.setTimeout(() => pinInputRef.current?.focus(), 0);
        } else if (payload.documents.length > 0) {
          setViewing(payload.documents[0]);
        }
      }
      return payload;
    } catch {
      setState('error');
    }
  };

  const submitOverride = async () => {
    if (!/^[6-9][0-9]{9}$/.test(clinicianPhone)) {
      setOverrideError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setOverrideBusy(true);
    setOverrideError(null);
    try {
      const { data: res, error } = await supabase.functions.invoke('emergency-lookup', {
        body: {
          token,
          override: { clinician_phone: clinicianPhone, reason: overrideReason.trim() || undefined },
        },
      });
      const errBody = (res as any)?.error;
      if (error || !res || errBody) {
        setOverrideError('Could not unlock just now. Please try again.');
        return;
      }
      const payload = res as EmergencyPayload;
      if (payload.override_status === 'limit') {
        setOverrideError('Emergency override limit reached for this hour. Use the PIN or contact family.');
        return;
      }
      if (payload.documents_locked) {
        setOverrideError('Could not unlock just now. Please try again.');
        return;
      }
      setOverridePhone(clinicianPhone);
      setData(payload);
      setShowOverride(false);
      if (payload.documents.length > 0) setViewing(payload.documents[0]);
    } catch {
      setOverrideError('Network problem. Please try again.');
    } finally {
      setOverrideBusy(false);
    }
  };

  const submitPin = async () => {
    if (!/^[0-9]{4}$/.test(pinInput)) {
      setPinError('Enter the 4-digit PIN.');
      return;
    }
    setPinBusy(true);
    setPinError(null);
    try {
      // Dedicated PIN lookup: never touches the page-level state, so a
      // refused request (rate limit / challenge) can never wipe the
      // life-critical info already on screen.
      const { data: res, error } = await supabase.functions.invoke('emergency-lookup', {
        body: { token, pin: pinInput },
      });
      const errBody = (res as any)?.error;
      if (error || !res || errBody) {
        setPinError(
          errBody === 'rate_limited'
            ? 'Too many requests right now. Wait a minute and try the PIN again.'
            : 'Could not check the PIN just now. Please try again.',
        );
        return;
      }
      const payload = res as EmergencyPayload;
      if (payload.documents_locked) {
        if (payload.pin_status === 'locked') {
          const mins = Math.ceil((payload.pin_retry_after ?? 900) / 60);
          setPinError(`Too many wrong tries. Try again in about ${mins} minute${mins === 1 ? '' : 's'}.`);
        } else {
          const left = payload.pin_attempts_left;
          setPinError(
            left != null
              ? `Wrong PIN. ${left} ${left === 1 ? 'try' : 'tries'} left before a 15-minute lock.`
              : 'Wrong PIN.',
          );
        }
        setPinInput('');
      } else {
        // Unlocked — merge the fresh payload into the existing view.
        setData(payload);
        setPinInput('');
        if (shouldOpenProtectedReport && payload.documents.length > 0) {
          setViewing(payload.documents[0]);
        }
      }
    } catch {
      setPinError('Network problem. The info above is still valid — try the PIN again.');
    } finally {
      setPinBusy(false);
    }
  };


  useEffect(() => {
    let cancelled = false;

    // Watchdog: never leave the user staring at a spinner. If neither the
    // Turnstile challenge nor the lookup resolves within 8s, show the
    // "not available" fallback so bad/expired tokens fail fast.
    const watchdog = window.setTimeout(() => {
      if (!cancelled) {
        setState((prev) => (prev === 'loading' ? 'notfound' : prev));
      }
    }, 8000);

    const start = async () => {
      // No Turnstile configured → call directly.
      if (!TURNSTILE_SITE_KEY) {
        if (!cancelled) await runLookup();
        return;
      }

      // Load Turnstile script once, then render invisibly.
      const ensureScript = () =>
        new Promise<void>((resolve, reject) => {
          if (window.turnstile) return resolve();
          const existing = document.querySelector<HTMLScriptElement>(
            'script[data-turnstile]',
          );
          if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject());
            return;
          }
          const s = document.createElement('script');
          s.src =
            'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
          s.async = true;
          s.defer = true;
          s.dataset.turnstile = 'true';
          s.onload = () => resolve();
          s.onerror = () => reject();
          document.head.appendChild(s);
        });

      try {
        await ensureScript();
        if (cancelled || !turnstileRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          size: 'invisible',
          callback: (tok) => {
            if (!cancelled) runLookup(tok);
          },
          'error-callback': () => {
            if (!cancelled) runLookup();
          },
        });
      } catch {
        // Script blocked — fall back to plain lookup (rate limits still apply).
        if (!cancelled) runLookup();
      }
    };

    start();
    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, reloadKey]);

  const retry = () => {
    widgetIdRef.current = null;
    setData(null);
    setState('loading');
    setReloadKey((k) => k + 1);
  };

  if (state === 'wiped') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display text-xl font-bold mb-2">Emergency info hidden</h1>
          <p className="text-sm text-muted-foreground mb-4">
            For privacy, the record was cleared from this device when you left the
            page. Tap below to load the latest info again.
          </p>
          <Button onClick={retry}>Show emergency info again</Button>
        </div>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <div ref={turnstileRef} className="hidden" />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">Verifying and loading emergency info…</p>
      </div>
    );
  }


  if (state === 'ratelimited') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-warning" />
          </div>
          <h1 className="font-display text-xl font-bold mb-2">Too many requests</h1>
          <p className="text-sm text-muted-foreground mb-4">
            This link has been accessed a lot recently. Please wait a minute and try again.
          </p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (state === 'notfound' || state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="font-display text-xl font-bold mb-2">
            This emergency link is not available
          </h1>
          <p className="text-sm text-muted-foreground">
            The link may have been revoked by the patient, or the code is
            invalid. Please contact the patient's emergency contact directly.
          </p>
        </div>
      </div>
    );
  }

  const p = data!.patient;
  const dob = new Date(p.date_of_birth).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Red emergency banner so it's unmistakable */}
      <header className="bg-destructive text-destructive-foreground">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest opacity-90">
              Emergency Medical Info
            </p>
            <p className="text-sm font-semibold leading-tight">
              Shared by the patient via Medora
            </p>
          </div>
          <Logo size={32} />
        </div>
      </header>

      {/* DPDP audit notice */}
      <div className="bg-warning/10 border-b border-warning/30">
        <div className="container mx-auto px-4 py-2.5 max-w-2xl flex items-start gap-2">
          <Scale className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <p className="text-[11px] leading-relaxed text-foreground/80">
            <span className="font-semibold">Emergency access logged with network ID.</span>{' '}
            Unauthorised extraction, copying or misuse of this patient's personal data is
            prohibited under the Digital Personal Data Protection Act, 2023.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-5">

        {/* Identity */}
        <section className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Patient
          </p>
          <h1 className="font-display text-2xl font-bold text-foreground mt-1">
            {p.full_name}
          </h1>
          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            <Field label="Date of Birth" value={dob} />
            <Field
              label="Gender"
              value={p.gender.charAt(0).toUpperCase() + p.gender.slice(1)}
            />
            <Field
              label="Blood Group"
              value={p.blood_group || 'Not specified'}
              icon={<Droplets className="w-4 h-4 text-destructive" />}
              highlight
            />
            <Field
              label="Height / Weight"
              value={
                [p.height ? `${p.height} cm` : null, p.weight ? `${p.weight} kg` : null]
                  .filter(Boolean)
                  .join(' · ') || 'Not specified'
              }
            />
          </div>
        </section>

        {/* Allergies */}
        {p.allergies.length > 0 && (
          <section className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h2 className="font-semibold text-destructive uppercase text-sm tracking-wide">
                Allergies
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.allergies.map((a) => (
                <span
                  key={a}
                  className="px-3 py-1 rounded-full bg-destructive text-destructive-foreground text-sm font-medium"
                >
                  {a}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Chronic conditions */}
        {p.chronic_conditions.length > 0 && (
          <section className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              Chronic Conditions
            </h2>
            <div className="flex flex-wrap gap-2">
              {p.chronic_conditions.map((c) => (
                <span
                  key={c}
                  className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm"
                >
                  {c}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Emergency contact — masked, tap to call */}
        <section className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Emergency Contact
          </h2>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border mb-3">
            <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Number hidden for privacy</p>
              <p className="font-mono text-lg font-semibold text-foreground tracking-wide">
                {maskPhone(p.emergency_contact)}
              </p>
            </div>
          </div>
          <Button
            asChild
            size="lg"
            className="w-full bg-success text-success-foreground hover:bg-success/90 min-h-[56px] text-base font-semibold"
          >
            <a href={`tel:${p.emergency_contact}`}>
              <Phone className="w-5 h-5 mr-2" />
              Call Emergency Contact
            </a>
          </Button>
        </section>

        {/* Documents — always fresh, PIN-gated when the patient locked them */}
        <section className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
              Medical Records
            </h2>
            <span className="text-xs text-muted-foreground">
              {(data!.documents_locked ? (data!.document_count ?? 0) : data!.documents.length)} file
              {(data!.documents_locked ? (data!.document_count ?? 0) : data!.documents.length) === 1
                ? ''
                : 's'}{' '}
              · current
            </span>
          </div>
          {data!.documents_locked ? (
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-base font-semibold text-foreground">
                Medical documents protected
              </h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4 leading-relaxed">
                Enter the patient's 4-digit PIN to open lab reports and scans. The patient or
                their family can share it with you.
              </p>
              <div className="max-w-[220px] mx-auto space-y-3">
                <Input
                  ref={pinInputRef}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitPin();
                  }}
                  placeholder="••••"
                  aria-label="4-digit document PIN"
                  disabled={pinBusy || data!.pin_status === 'locked'}
                  className="text-center font-mono text-2xl tracking-[0.5em] min-h-[56px]"
                />
                <Button
                  onClick={submitPin}
                  disabled={pinBusy || data!.pin_status === 'locked'}
                  className="w-full min-h-[56px] text-base font-semibold"
                >
                  {pinBusy ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Unlock className="w-5 h-5 mr-2" />
                  )}
                  Unlock documents
                </Button>
              </div>
              {pinError && (
                <p className="text-sm text-destructive mt-3 font-medium">{pinError}</p>
              )}
              <div className="mt-5 pt-5 border-t border-border text-left">
                {!showOverride ? (
                  <Button
                    variant="destructive"
                    className="w-full min-h-[56px] text-base font-semibold"
                    onClick={() => setShowOverride(true)}
                  >
                    Break glass: emergency clinician access
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      Patient unconscious or can't give the PIN?
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Emergency access without a PIN is permanently logged under the DPDP Act
                      2023. Your number is stamped on every page and the patient can see this
                      access in their Medora app.
                    </p>
                    <Input
                      inputMode="numeric"
                      autoComplete="tel"
                      value={clinicianPhone}
                      onChange={(e) => setClinicianPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Your mobile number (10 digits)"
                      aria-label="Clinician mobile number"
                      className="min-h-[56px] text-base"
                    />
                    <Input
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value.slice(0, 200))}
                      placeholder="Hospital / reason (optional)"
                      aria-label="Hospital or reason"
                      className="min-h-[56px] text-base"
                    />
                    <Button
                      variant="destructive"
                      onClick={submitOverride}
                      disabled={overrideBusy}
                      className="w-full min-h-[56px] text-base font-semibold"
                    >
                      {overrideBusy && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                      Unlock reports for immediate care
                    </Button>
                    {overrideError && (
                      <p className="text-sm text-destructive font-medium">{overrideError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : data!.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No documents uploaded by the patient.
            </p>
          ) : (

            <ul className="space-y-2">
              {data!.documents.map((d) => (
                <li
                  key={d.url}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.size ? `${(d.size / 1024).toFixed(1)} KB` : ''}
                      {d.uploaded_at
                        ? ` · uploaded ${new Date(
                            d.uploaded_at
                          ).toLocaleDateString()}`
                        : ''}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setViewing(d)}>
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Document links are generated live and expire in 5 minutes. The
            patient can revoke this emergency page at any time from their Medora
            app.
          </p>
        </section>

        {/* Privacy footer + explicit wipe */}
        <section className="text-center pt-2 pb-8">
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Nothing on this page is saved to this device. Closing the tab
            clears the record instantly. Document links expire in 5 minutes.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setData(null);
              setState('wiped');

              window.close();
              // If the tab can't be closed by script, send them away.
              setTimeout(() => {
                window.location.replace('about:blank');
              }, 150);
            }}
          >
            Close & wipe from this device
          </Button>
        </section>
      </main>
      {viewing && (
        <SecureDocumentViewer
          name={viewing.name}
          url={viewing.url}
          type={viewing.type}
          sessionId={sessionId}
          clinicianPhone={overridePhone}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
};

const Field = ({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) => (
  <div
    className={`rounded-xl p-3 border ${
      highlight
        ? 'border-destructive/30 bg-destructive/5'
        : 'border-border bg-background'
    }`}
  >
    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
      {label}
    </p>
    <div className="flex items-center gap-1.5 mt-0.5">
      {icon}
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  </div>
);

export default Emergency;
