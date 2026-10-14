import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CircleAlert, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { loadPatientForCurrentUser } from '@/lib/patientProfile';
import { supabase } from '@/integrations/supabase/client';
import { AccessHistory } from '@/components/AccessHistory';
import type { Patient } from '@/types/patient';

const Status = ({ ok, label, detail }: { ok: boolean; label: string; detail: string }) => (
  <li className="flex gap-3 rounded-xl border border-border p-4">
    {ok ? <CheckCircle2 className="w-5 h-5 text-success shrink-0" /> : <CircleAlert className="w-5 h-5 text-warning shrink-0" />}
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
    </div>
  </li>
);

const PrivacyCenter = () => {
  const { user, loading: authLoading } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    loadPatientForCurrentUser()
      .then(async (p) => {
        setPatient(p);
        if (p) {
          const { data, error } = await supabase.rpc('has_document_pin', { _patient_id: p.id });
          setHasPin(error ? null : Boolean(data));
        }
      })
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  const qrActive = Boolean(patient?.shareToken) && !patient?.shareRevoked;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Privacy & Security — Medora</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-3 max-w-3xl">
          <Button asChild variant="ghost" size="sm" className="min-h-[48px]">
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" /> Back to my health card</Link>
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">Privacy & Security</h1>
        </div>

        {authLoading || loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground" role="status">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : !patient ? (
          <div className="form-section text-sm text-muted-foreground">
            Create your health card first — your privacy settings and access history will appear here.
            <div className="mt-4"><Button asChild><Link to="/">Create health card</Link></Button></div>
          </div>
        ) : (
          <>
            <section className="form-section" aria-labelledby="status-title">
              <h2 id="status-title" className="font-display text-lg font-semibold text-foreground mb-4">Your protection at a glance</h2>
              <ul className="space-y-2">
                <Status ok={qrActive} label={qrActive ? 'Emergency QR is active' : 'Emergency QR is not active'}
                  detail={qrActive ? 'You can replace it any time from your health card; old codes stop working immediately.' : 'Open your health card to set up your emergency QR.'} />
                <Status ok={hasPin === true} label={hasPin ? 'Reports protected by your PIN' : hasPin === false ? 'No report PIN set' : 'PIN status unavailable'}
                  detail={hasPin ? 'Reports open on your emergency page only after the correct 4-digit PIN.' : 'Without a PIN, your reports are never shown on your emergency page.'} />
                <Status ok label="Doctor phone numbers can't unlock reports"
                  detail="Requests with a typed phone number are logged and shown to you, but never open your reports." />
              </ul>
            </section>

            <section className="form-section" aria-labelledby="public-title">
              <div className="flex items-center gap-2 mb-3">
                <EyeOff className="w-5 h-5 text-primary" />
                <h2 id="public-title" className="font-display text-lg font-semibold text-foreground">What a QR scan shows</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Anyone who scans your QR sees only:</p>
              <p className="text-sm text-foreground">Name · Blood group · Allergies · Conditions · Emergency contact</p>
              <p className="text-xs text-muted-foreground mt-3">
                Date of birth, phone number, insurance and reports are not shown. Change your PIN or replace your QR from your health card.
              </p>
            </section>

            <AccessHistory patientId={patient.id} />
          </>
        )}
      </main>
    </div>
  );
};

export default PrivacyCenter;
