import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertTriangle,
  Phone,
  Droplets,
  FileText,
  ExternalLink,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';

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
}

const Emergency = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<EmergencyPayload | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound' | 'error'>(
    'loading'
  );

  useEffect(() => {
    document.title = 'Emergency Medical Info · Medora';
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setState('notfound');
        return;
      }
      try {
        const { data: res, error } = await supabase.functions.invoke(
          'emergency-lookup',
          { body: { token } }
        );
        if (cancelled) return;
        if (error || !res || (res as any).error) {
          setState('notfound');
          return;
        }
        setData(res as EmergencyPayload);
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">Loading emergency medical info…</p>
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

        {/* Emergency contact */}
        <section className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Emergency Contact
          </h2>
          <a
            href={`tel:${p.emergency_contact}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition"
          >
            <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Tap to call</p>
              <p className="font-mono text-lg font-semibold text-foreground">
                {p.emergency_contact}
              </p>
            </div>
          </a>
        </section>

        {/* Documents — always fresh */}
        <section className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
              Medical Records
            </h2>
            <span className="text-xs text-muted-foreground">
              {data!.documents.length} file
              {data!.documents.length === 1 ? '' : 's'} · current
            </span>
          </div>
          {data!.documents.length === 0 ? (
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
                  <Button asChild size="sm" variant="outline">
                    <a href={d.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Open
                    </a>
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
      </main>
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
