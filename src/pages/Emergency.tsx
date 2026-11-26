import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EmergencyAccessRequest } from '@/components/EmergencyAccessRequest';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertTriangle,
  Phone,
  Droplets,
  ArrowRight,
  FileText,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Lock,
  Unlock,
  Landmark,
} from 'lucide-react';
import { formatAbhaNumber } from '@/lib/abha';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SecureDocumentViewer } from '@/components/SecureDocumentViewer';

interface EmergencyDoc {
  name: string;
  url: string;
  type: string | null;
  size: number | null;
  uploaded_at: string | null;
  summary?: string | null;
  document_type?: string | null;
  document_date?: string | null;
  provider_name?: string | null;
}

interface EmergencyPayload {
  patient: {
    full_name: string;
    blood_group: string | null;
    allergies: string[];
    chronic_conditions: string[];
    emergency_contact: string;
    abha_number?: string | null;
    abha_address?: string | null;
  };
  documents: EmergencyDoc[];
  documents_locked?: boolean;
  document_count?: number;
  pin_status?: string | null;
  pin_retry_after?: number | null;
  pin_attempts_left?: number | null;
  pass_status?: string | null;
  pass_attempts_left?: number | null;
  override_status?: string | null;
  /** When a patient-approved window stops working. */
  access_until?: string | null;
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
  // Set by the wipe handler so an finished approval window can lock this tab.
  const lockRef = useRef<() => void>(() => {});
  const [state, setState] = useState<
    'loading' | 'ready' | 'notfound' | 'error' | 'ratelimited' | 'wiped'
  >(() => {
    try {
      if (window.location.hash === '#ended' || sessionStorage.getItem('medora:emergency-ended:' + (token ?? ''))) return 'wiped';
    } catch { /* ignore */ }
    return 'loading';
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const t = (en: string, hi: string) => (lang === 'hi' ? hi : en);
  const [pinInput, setPinInput] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [clinicianPhone, setClinicianPhone] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideBusy, setOverrideBusy] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideLogged, setOverrideLogged] = useState<string | null>(null);
  const [overridePhone, setOverridePhone] = useState<string | null>(null);
  const [abhaCopied, setAbhaCopied] = useState(false);
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
  const [shielded, setShielded] = useState(false);
  const [captureWarning, setCaptureWarning] = useState(false);

  // Screenshot / copy deterrents. Browsers cannot fully block OS screenshots,
  // so this blocks common shortcuts, hides content when focus leaves the page
  // (snipping tools), warns the viewer, and relies on the session watermark.
  useEffect(() => {
    let warnTimer: number | undefined;
    const warn = () => {
      setCaptureWarning(true);
      window.clearTimeout(warnTimer);
      warnTimer = window.setTimeout(() => setCaptureWarning(false), 3500);
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (
        k === 'printscreen' ||
        (mod && ['p', 's', 'c'].includes(k)) ||
        (mod && e.shiftKey && ['3', '4', '5', 's'].includes(k))
      ) {
        e.preventDefault();
        if (k === 'printscreen') {
          try { navigator.clipboard.writeText(''); } catch { /* ignore */ }
        }
        setShielded(true);
        warn();
        window.setTimeout(() => setShielded(false), 1500);
      }
    };
    const block = (e: Event) => { e.preventDefault(); warn(); };
    const onBlur = () => setShielded(true);
    const onFocus = () => setShielded(false);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    document.addEventListener('contextmenu', block);
    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('dragstart', block);
    window.addEventListener('beforeprint', warn);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearTimeout(warnTimer);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('dragstart', block);
      window.removeEventListener('beforeprint', warn);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, []);


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
      // Lock this tab for good: refresh or back must not reload the record.
      try {
        sessionStorage.setItem('medora:emergency-ended:' + (token ?? ''), '1');
        window.history.replaceState(null, '', window.location.pathname + '#ended');
      } catch { /* ignore */ }

      // Belt-and-suspenders: also clear any strays this route could have created.
      try {
        Object.keys(sessionStorage)
          .filter((k) => k.startsWith('emergency:'))
          .forEach((k) => sessionStorage.removeItem(k));
      } catch { /* storage unavailable */ }
    };
    lockRef.current = wipe;
    // A responder tapping a "Call" button leaves for the phone dialer. Give
    // that call a bounded grace period (3 min hidden) instead of wiping
    // instantly; any other hide/close still wipes at once.
    const CALL_GRACE_MS = 3 * 60 * 1000;
    let hiddenTimer: number | undefined;
    const inCallGrace = () => Date.now() < ((window as any).__medoraCallGraceUntil ?? 0);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (inCallGrace()) {
          (window as any).__medoraCallGraceUntil = 0;
          hiddenTimer = window.setTimeout(wipe, CALL_GRACE_MS);
        } else wipe();
      } else if (hiddenTimer) {
        window.clearTimeout(hiddenTimer);
        hiddenTimer = undefined;
      }
    };
    const onBeforeUnload = () => { if (!inCallGrace()) wipe(); };
    const markCall = (e: Event) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href^="tel:"]');
      if (a) (window as any).__medoraCallGraceUntil = Date.now() + 5000;
    };
    document.addEventListener('click', markCall, true);
    // `beforeunload` also disables bfcache in Chrome/Safari, so a "Back" from
    // another tab re-runs the challenge + lookup rather than showing cached data.
    window.addEventListener('pagehide', wipe);
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('pagehide', wipe);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('click', markCall, true);
      if (hiddenTimer) window.clearTimeout(hiddenTimer);
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
      if (error || !res || (res as { error?: string }).error) {
        const errBody = (res as { error?: string } | null)?.error;
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
      const errBody = (res as { error?: string } | null)?.error;
      if (error || !res || errBody) {
        setOverrideError('Could not unlock just now. Please try again.');
        return;
      }
      const payload = res as EmergencyPayload;
      if (payload.override_status === 'limit') {
        setOverrideError('Too many access requests this hour. Call the emergency contact above for the PIN.');
        return;
      }
      if (payload.documents_locked) {
        setOverrideLogged(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
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

  const handleRequestApproved = useCallback((payload: EmergencyPayload) => {
    setData(payload);
    setShowOverride(false);
    if (payload.documents.length > 0) setViewing(payload.documents[0]);
    // The patient's approval is time-boxed. When the window ends, lock this tab
    // exactly like closing it would, so the record cannot linger on screen.
    const until = payload.access_until ? new Date(payload.access_until).getTime() : 0;
    if (until > 0) {
      window.setTimeout(() => lockRef.current(), Math.max(0, until - Date.now()) + 1500);
    }
  }, []);

  const submitPin = async () => {
    const isPass = /^[0-9]{6}$/.test(pinInput);
    if (!isPass && !/^[0-9]{4}$/.test(pinInput)) {
      setPinError('Enter the 4-digit PIN or the 6-digit doctor pass.');
      return;
    }
    setPinBusy(true);
    setPinError(null);
    try {
      // Dedicated PIN lookup: never touches the page-level state, so a
      // refused request (rate limit / challenge) can never wipe the
      // life-critical info already on screen.
      const { data: res, error } = await supabase.functions.invoke('emergency-lookup', {
        body: isPass ? { token, pass: pinInput } : { token, pin: pinInput },
      });
      const errBody = (res as { error?: string } | null)?.error;
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
        if (isPass) {
          const left = payload.pass_attempts_left;
          setPinError(
            payload.pass_status === 'no_pass'
              ? 'This doctor pass has expired or was cancelled. Ask the patient for a new one.'
              : left != null && left > 0
                ? `Wrong doctor pass. ${left} ${left === 1 ? 'try' : 'tries'} left.`
                : 'Wrong doctor pass. Ask the patient for a new one.',
          );
        } else if (payload.pin_status === 'locked') {
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
    // A closed session stays closed: never fetch the record again in this tab.
    try {
      if (window.location.hash === '#ended' || sessionStorage.getItem('medora:emergency-ended:' + (token ?? ''))) return;
    } catch { /* ignore */ }

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
          <h1 className="font-display text-xl font-bold mb-2">Emergency session ended</h1>
          <p className="text-sm text-muted-foreground">
            For patient privacy, all information was wiped from this device when the
            page was closed or put in the background. To view it again, scan the
            patient's QR card.
          </p>
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

  return (
    <div className="emergency-protected relative min-h-screen bg-background select-none">
      {/* Session watermark across the whole page — screenshots stay traceable */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden opacity-[0.06]">
        <div className="absolute -inset-1/2 flex rotate-[-30deg] flex-col justify-center gap-16">
          {Array.from({ length: 16 }).map((_, i) => (
            <p key={i} className="whitespace-nowrap text-sm font-semibold tracking-widest text-foreground">
              {`CONFIDENTIAL · SESSION ${sessionId} · ACCESS LOGGED   ·   `.repeat(4)}
            </p>
          ))}
        </div>
      </div>

      {shielded && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-background/95 px-6 text-center backdrop-blur-xl">
          <ShieldAlert className="h-10 w-10 text-primary" />
          <p className="font-display text-lg font-bold text-foreground">{t('Protected medical information', 'सुरक्षित चिकित्सा जानकारी')}</p>
          <p className="max-w-xs text-sm text-muted-foreground">{t('Tap here to continue viewing. Screenshots and copying are not allowed.', 'देखना जारी रखने के लिए टैप करें। स्क्रीनशॉट और कॉपी की अनुमति नहीं है।')}</p>
          <Button className="mt-2 min-h-12 rounded-xl px-6" onClick={() => setShielded(false)}>{t('Continue', 'जारी रखें')}</Button>
        </div>
      )}

      {captureWarning && (
        <div role="alert" className="fixed inset-x-4 top-4 z-[70] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-destructive/40 bg-card p-4 shadow-lg animate-in fade-in slide-in-from-top-2">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-semibold text-foreground">{t('Screenshots are not allowed', 'स्क्रीनशॉट की अनुमति नहीं है')}</p>
            <p className="text-xs text-muted-foreground">{t(`This page is stamped with session ${sessionId}. Any capture can be traced and this visit is logged.`, `यह पेज सत्र ${sessionId} से चिह्नित है। हर कैप्चर ट्रेस किया जा सकता है।`)}</p>
          </div>
        </div>
      )}

      {/* Clinical session header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive text-destructive-foreground shadow-sm">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold leading-tight text-foreground">
              {t('Emergency Medical Info', 'आपातकालीन चिकित्सा जानकारी')}
            </p>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              {t(`Secure session · ${sessionId}`, `सुरक्षित सत्र · ${sessionId}`)}
            </p>
          </div>
          <button type="button" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')} aria-label="Switch language / भाषा बदलें" className="min-h-11 rounded-full border border-border bg-background px-3.5 text-sm font-semibold text-foreground hover:bg-muted">
            {lang === 'en' ? 'हिंदी' : 'EN'}
          </button>
        </div>
        <div className="border-t border-warning/30 bg-warning/10">
          <p className="container mx-auto flex max-w-2xl items-center gap-2 px-4 py-1.5 text-[11px] text-foreground">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-warning" />
            {t('Confidential · for care only · screenshots traceable · visit logged', 'गोपनीय · केवल इलाज हेतु · स्क्रीनशॉट ट्रेस होते हैं · विज़िट दर्ज')}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 max-w-2xl space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">

        {/* Identity */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-md">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('Patient', 'मरीज़')}
          </p>
          <h1 className="font-display text-2xl font-bold text-foreground mt-1">
            {p.full_name}
          </h1>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-destructive"><Droplets className="h-3.5 w-3.5" />{t('Blood', 'रक्त')}</p>
              <p className="mt-1.5 font-display text-2xl font-extrabold leading-none text-destructive">{p.blood_group || '—'}</p>
            </div>
            <div className={`rounded-2xl border p-3 ${p.allergies.length ? 'border-destructive/30 bg-destructive/10' : 'border-success/30 bg-success/10'}`}>
              <p className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${p.allergies.length ? 'text-destructive' : 'text-success'}`}><AlertTriangle className="h-3.5 w-3.5" />{t('Allergies', 'एलर्जी')}</p>
              <p className={`mt-1.5 font-display text-2xl font-extrabold leading-none ${p.allergies.length ? 'text-destructive' : 'text-success'}`}>{p.allergies.length || 'NKDA'}</p>
            </div>
            <div className={`rounded-2xl border p-3 ${p.chronic_conditions.length ? 'border-warning/30 bg-warning/10' : 'border-border bg-muted/50'}`}>
              <p className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${p.chronic_conditions.length ? 'text-warning' : 'text-muted-foreground'}`}><FileText className="h-3.5 w-3.5" />{t('Conditions', 'बीमारियाँ')}</p>
              <p className="mt-1.5 font-display text-2xl font-extrabold leading-none text-foreground">{p.chronic_conditions.length || t('None', 'नहीं')}</p>
            </div>
          </div>
          {p.allergies.length === 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">{t('NKDA = no known drug allergies recorded by the patient.', 'NKDA = मरीज़ ने कोई ज्ञात दवा एलर्जी दर्ज नहीं की।')}</p>
          )}

          {/* National health ID — helps hospitals look the patient up in the
              national system. Shown only when the patient has saved one. */}
          {(p.abha_number || p.abha_address) && (
            <div className="mt-3 rounded-xl border border-border bg-background p-3 flex items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"
                aria-hidden="true"
              >
                <Landmark className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('National Health ID · ABHA', 'राष्ट्रीय स्वास्थ्य आईडी · अब्हा')}
                </p>
                {p.abha_number && (
                  <p className="font-mono text-sm font-semibold text-foreground tracking-wider">
                    {formatAbhaNumber(p.abha_number)}
                  </p>
                )}
                {p.abha_address && (
                  <p className="text-xs text-muted-foreground break-all">{p.abha_address}</p>
                )}
              </div>
              <button
                type="button"
                onClick={async () => {
                  const id = p.abha_number || p.abha_address || '';
                  if (!id) return;
                  try {
                    await navigator.clipboard.writeText(id);
                    setAbhaCopied(true);
                    window.setTimeout(() => setAbhaCopied(false), 2000);
                  } catch { /* clipboard unavailable */ }
                }}
                className="min-h-11 shrink-0 rounded-lg px-3 text-xs font-semibold text-primary hover:bg-accent"
                aria-label="Copy ABHA ID"
              >
                {abhaCopied ? t('Copied', 'कॉपी हआ') : t('Copy', 'कॉपी')}
              </button>
            </div>
          )}
        </section>

        {/* Allergies */}
        {p.allergies.length > 0 && (
          <section className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h2 className="font-semibold text-destructive uppercase text-sm tracking-wide">
                {t('Allergies', 'एलर्जी')}
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
          <section className="bg-card border border-warning/40 rounded-2xl p-5 shadow-sm">
            <h2 className="text-xs uppercase tracking-widest text-warning mb-3 font-semibold">
              {t('Medical conditions', 'बीमारियाँ')} · {p.chronic_conditions.length}
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
            {t('Emergency Contact', 'आपातकालीन संपर्क')}
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
                {data!.pin_status === 'no_pin'
                  ? 'Reports stay private. If the patient gave you a 6-digit doctor pass, enter it here.'
                  : "Enter the patient's 4-digit PIN, or a 6-digit doctor pass the patient made for you, to open lab reports and scans."}
              </p>
              <div className="max-w-[220px] mx-auto space-y-3">
                <Input
                  ref={pinInputRef}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitPin();
                  }}
                  placeholder={data!.pin_status === 'no_pin' ? '••••••' : '••••'}
                  aria-label="Document PIN or doctor pass"
                  disabled={pinBusy}
                  className="text-center font-mono text-2xl tracking-[0.5em] min-h-[56px]"
                />
                <Button
                  onClick={submitPin}
                  disabled={pinBusy || (data!.pin_status === 'locked' && pinInput.length !== 6)}
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
              <div aria-live="assertive" role="status">
                {pinError && (
                  <p className="text-sm text-destructive mt-3 font-medium">{pinError}</p>
                )}
              </div>
              <div className="mt-5 pt-5 border-t border-border text-left">
                {!showOverride ? (
                  <Button
                    variant="destructive"
                    className="w-full min-h-[56px] text-base font-semibold"
                    onClick={() => setShowOverride(true)}
                  >
                    Request clinical access
                  </Button>
                ) : (
                  <EmergencyAccessRequest
                    token={token!}
                    t={t}
                    emergencyContact={data!.patient.emergency_contact}
                    onApproved={handleRequestApproved}
                    onHavePin={() => { setShowOverride(false); window.setTimeout(() => pinInputRef.current?.focus(), 0); }}
                  />
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
                <li key={d.url} className="rounded-2xl border border-border bg-background p-3.5 transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[
                          d.document_type ? d.document_type.replace(/_/g, ' ') : null,
                          d.provider_name,
                          d.document_date
                            ? new Date(d.document_date).toLocaleDateString()
                            : d.uploaded_at
                              ? `uploaded ${new Date(d.uploaded_at).toLocaleDateString()}`
                              : null,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="min-h-11 rounded-xl" onClick={() => setViewing(d)}>
                      <ExternalLink className="w-4 h-4 mr-1" />
                      {t('View', 'देखें')}
                    </Button>
                  </div>
                  {d.summary ? (
                    <div className="mt-3 rounded-xl border-l-4 border-primary bg-primary/5 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                        {t('AI summary', 'AI सारांश')}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-foreground break-words">{d.summary}</p>
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        {t('Auto-generated — check the original report before acting.', 'स्वचालित — निर्णय से पहले मूल रिपोर्ट देखें।')}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t('No AI summary yet — open the report to read it.', 'अभी कोई सारांश नहीं — रिपोर्ट खोलें।')}
                    </p>
                  )}
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

        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] no-print">
          <div className="mx-auto grid max-w-2xl grid-cols-2 gap-2 rounded-2xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur">
            <Button asChild className="min-h-14 bg-success text-success-foreground hover:bg-success/90 text-base font-semibold rounded-xl">
              <a href={`tel:${p.emergency_contact}`}><Phone className="mr-2 h-5 w-5" />{t('Call family', 'परिवार को कॉल')}</a>
            </Button>
            <Button className="min-h-14 text-base font-semibold rounded-xl" onClick={() => { pinInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); window.setTimeout(() => pinInputRef.current?.focus(), 350); }}>
              <Unlock className="mr-2 h-5 w-5" />{t('Open reports', 'रिपोर्ट खोलें')}
            </Button>
          </div>
        </div>

        {/* Privacy footer — wiping is automatic on tab close/hide */}
        <section className="text-center pt-2 pb-8">
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Nothing on this page is saved to this device. The record is wiped
            automatically when this tab is closed or left. Document links expire
            in 5 minutes.
          </p>

          {/* Gentle referral — someone who saw this page can make their own card */}
          <div className="mt-8 pt-6 border-t border-border/60 max-w-sm mx-auto">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Medora keeps medical records behind a private link like this one —
              available in an emergency, locked from everyone else.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-1.5 min-h-[56px] px-3 text-sm font-semibold text-primary hover:underline"
            >
              Create your own free Medora card
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
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
