import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BadgeCheck, Building2, Hospital, Loader2, PhoneCall, ShieldAlert, XCircle } from 'lucide-react';

interface Facility { id: string; name: string; facility_type: string; ownership: string; city: string | null; state: string }

interface Props {
  token: string;
  t: (en: string, hi: string) => string;
  emergencyContact?: string | null;
  onApproved: (payload: any) => void;
  onHavePin: () => void;
}

const WAIT_SECONDS = 180;
const REASONS = [
  'Unconscious after accident',
  'Medication / allergy check before treatment',
  'Emergency surgery history',
  'Cardiac / breathing emergency',
];

export function EmergencyAccessRequest({ token, t, emergencyContact, onApproved, onHavePin }: Props) {
  const [kind, setKind] = useState<'hospital' | 'clinic'>('hospital');
  const [phone, setPhone] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [facility, setFacility] = useState<Facility | null>(null);
  const [results, setResults] = useState<Facility[]>([]);
  const [searching, setSearching] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'form' | 'waiting' | 'rejected' | 'expired'>('form');
  const [left, setLeft] = useState(WAIT_SECONDS);
  const req = useRef<{ id: string; secret: string } | null>(null);

  // Live facility search (verified registry only).
  useEffect(() => {
    if (facility || facilityName.trim().length < 2) { setResults([]); return; }
    const h = window.setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.functions.invoke('emergency-lookup', {
        body: { token, facility_search: facilityName.trim() },
      });
      const list = ((data as any)?.facilities ?? []) as Facility[];
      setResults(list.filter((f) => f.facility_type === kind));
      setSearching(false);
    }, 350);
    return () => window.clearTimeout(h);
  }, [facilityName, facility, kind, token]);

  // Poll while waiting for the patient's decision.
  useEffect(() => {
    if (stage !== 'waiting') return;
    const tick = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    const poll = window.setInterval(async () => {
      if (!req.current) return;
      const { data } = await supabase.functions.invoke('emergency-lookup', {
        body: { token, poll: { request_id: req.current.id, secret: req.current.secret } },
      });
      const st = (data as any)?.request_status;
      if (st === 'approved' && (data as any)?.documents) { req.current = null; onApproved(data); }
      else if (st === 'rejected') { req.current = null; setStage('rejected'); }
      else if (st === 'expired' || st === 'access_ended') { req.current = null; setStage('expired'); }
    }, 4000);
    return () => { window.clearInterval(tick); window.clearInterval(poll); };
  }, [stage, token, onApproved]);

  const submit = async () => {
    if (!/^[6-9][0-9]{9}$/.test(phone)) return setError(t('Enter a valid 10-digit Indian mobile number (starts with 6–9).', 'सही 10 अंकों का भारतीय मोबाइल नंबर डालें (6–9 से शुरू)।'));
    if (facilityName.trim().length < 3) return setError(kind === 'hospital' ? t('Enter the hospital name.', 'अस्पताल का नाम डालें।') : t('Enter the clinic name.', 'क्लिनिक का नाम डालें।'));
    if (reason.trim().length < 5) return setError(t('Write a short reason.', 'छोटा कारण लिखें।'));
    setBusy(true); setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke('emergency-lookup', {
        body: {
          token,
          access_request: { phone, kind, facility_name: facility?.name ?? facilityName.trim(), facility_id: facility?.id, reason: reason.trim() },
        },
      });
      const p = data as any;
      if (err || !p || p.error) return setError(t('Could not send the request. Try again.', 'अनुरोध नहीं भेजा जा सका। फिर कोशिश करें।'));
      if (p.request_status === 'limit') return setError(t('Too many requests this hour. Call the emergency contact for the PIN.', 'इस घंटे बहुत अनुरोध हो गए। PIN के लिए इमरजेंसी संपर्क को कॉल करें।'));
      if (!p.request_id) return setError(t('Could not send the request. Try again.', 'अनुरोध नहीं भेजा जा सका। फिर कोशिश करें।'));
      req.current = { id: p.request_id, secret: p.request_secret };
      setLeft(WAIT_SECONDS);
      setStage('waiting');
    } catch {
      setError(t('Network problem. Please try again.', 'नेटवर्क समस्या। फिर कोशिश करें।'));
    } finally { setBusy(false); }
  };

  const fallback = (
    <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-destructive" />
        {t("Patient's phone broken, off or not answering?", 'मरीज़ का फ़ोन टूटा, बंद या जवाब नहीं दे रहा?')}
      </p>
      <ol className="text-sm text-foreground list-decimal pl-5 space-y-1">
        <li>{t('Treat using the blood group, allergies and conditions shown above.', 'ऊपर दिए ब्लड ग्रुप, एलर्जी और बीमारियों के अनुसार इलाज करें।')}</li>
        <li>{t('Call the emergency contact. They can give the 4-digit PIN or a 6-digit doctor pass.', 'इमरजेंसी संपर्क को कॉल करें। वे 4 अंकों का PIN या 6 अंकों का डॉक्टर पास दे सकते हैं।')}</li>
        <li>{t('Enter it in the box above to open reports.', 'रिपोर्ट खोलने के लिए ऊपर के बॉक्स में डालें।')}</li>
      </ol>
      {emergencyContact && (
        <Button asChild className="w-full min-h-[56px] text-base font-semibold">
          <a href={`tel:${emergencyContact}`}><PhoneCall className="w-5 h-5 mr-2" />{t('Call emergency contact', 'इमरजेंसी संपर्क को कॉल करें')}</a>
        </Button>
      )}
      <Button variant="outline" className="w-full min-h-[56px]" onClick={onHavePin}>{t('I have the PIN / pass', 'मेरे पास PIN / पास है')}</Button>
    </div>
  );

  if (stage === 'waiting') {
    const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, '0');
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center space-y-2">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
          <p className="font-semibold text-foreground">{t("Waiting for the patient's approval", 'मरीज़ की मंज़ूरी का इंतज़ार')}</p>
          <p className="text-sm text-muted-foreground">{t('A request popped up in their Medora app.', 'उनके Medora ऐप में अनुरोध दिखाया गया है।')}</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">{mm}:{ss}</p>
        </div>
        {fallback}
      </div>
    );
  }

  if (stage === 'rejected' || stage === 'expired') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex gap-3">
          <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            {stage === 'rejected'
              ? t('The patient declined this request. Reports stay locked.', 'मरीज़ ने अनुरोध अस्वीकार किया। रिपोर्ट बंद रहेंगी।')
              : t('No answer in time. The request has expired.', 'समय पर जवाब नहीं मिला। अनुरोध समाप्त हो गया।')}
          </p>
        </div>
        {fallback}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-base font-semibold text-foreground">{t('Request access from the patient', 'मरीज़ से पहुँच माँगें')}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('The patient approves or rejects in their Medora app. Approval opens reports for 15 minutes.', 'मरीज़ अपने Medora ऐप में मंज़ूर या अस्वीकार करेगा। मंज़ूरी पर रिपोर्ट 15 मिनट खुलेंगी।')}</p>
      </div>

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('Where are you from?', 'आप कहाँ से हैं?')}>
        {(['hospital', 'clinic'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => { setKind(k); setFacility(null); }}
            className={`min-h-[56px] rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${kind === k ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}
          >
            {k === 'hospital' ? <Hospital className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            {k === 'hospital' ? t('Hospital', 'अस्पताल') : t('Clinic', 'क्लिनिक')}
          </button>
        ))}
      </div>

      <div className="flex items-stretch rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring">
        <span className="px-3 flex items-center bg-muted text-sm font-semibold text-muted-foreground">+91</span>
        <input
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder={t('Your mobile number', 'आपका मोबाइल नंबर')}
          aria-label={t('Your mobile number', 'आपका मोबाइल नंबर')}
          className="flex-1 min-h-[56px] px-3 text-base bg-background outline-none"
        />
      </div>

      <div className="relative">
        <Input
          value={facility ? facility.name : facilityName}
          onChange={(e) => { setFacility(null); setFacilityName(e.target.value.slice(0, 120)); }}
          placeholder={kind === 'hospital' ? t('Hospital name', 'अस्पताल का नाम') : t('Clinic name', 'क्लिनिक का नाम')}
          aria-label={kind === 'hospital' ? 'Hospital name' : 'Clinic name'}
          className="min-h-[56px] text-base"
        />
        {searching && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-5 text-muted-foreground" />}
        {results.length > 0 && !facility && (
          <ul className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
            {results.map((f) => (
              <li key={f.id}>
                <button type="button" onClick={() => { setFacility(f); setResults([]); }} className="w-full text-left px-4 py-3 min-h-[56px] hover:bg-muted">
                  <p className="text-sm font-medium text-foreground">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{[f.city, f.state].filter(Boolean).join(', ')} · {f.ownership === 'government' ? t('Government', 'सरकारी') : t('Private', 'निजी')}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {facility ? (
        <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><BadgeCheck className="w-4 h-4" />{t('Verified registered facility', 'सत्यापित पंजीकृत संस्थान')}</p>
      ) : facilityName.trim().length >= 3 && !searching ? (
        <p className="text-xs text-muted-foreground">{t('Not found in the registry — the patient will see it as "not verified".', 'रजिस्ट्री में नहीं मिला — मरीज़ इसे "असत्यापित" देखेगा।')}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {REASONS.map((r) => (
          <button key={r} type="button" onClick={() => setReason(r)} className={`px-3 py-2 rounded-full border text-xs font-medium ${reason === r ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}>{r}</button>
        ))}
      </div>
      <Textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, 200))} placeholder={t('Reason for access', 'पहुँच का कारण')} aria-label="Reason" className="text-base" rows={2} />

      <Button variant="destructive" onClick={submit} disabled={busy} className="w-full min-h-[56px] text-base font-semibold">
        {busy && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
        {t('Send request to patient', 'मरीज़ को अनुरोध भेजें')}
      </Button>
      {error && <p className="text-sm text-destructive font-medium" role="alert">{error}</p>}
    </div>
  );
}
