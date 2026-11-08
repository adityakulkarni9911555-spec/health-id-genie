import { useEffect, useState } from 'react';
import { Pill } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Med = { id: string; medication_name: string; dosage: string | null; frequency: string | null };

export function ActiveMedications({ patientId }: { patientId: string }) {
  const [meds, setMeds] = useState<Med[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.from('patient_medications').select('id,medication_name,dosage,frequency,status')
      .eq('patient_id', patientId).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => {
        if (cancelled) return;
        setMeds((data ?? []).filter((m) => !['stopped', 'completed', 'inactive', 'discontinued'].includes(String(m.status).toLowerCase())).slice(0, 6));
      });
    return () => { cancelled = true; };
  }, [patientId]);

  if (!meds || meds.length === 0) return null;
  return (
    <section className="mb-4 rounded-xl border border-border bg-card p-4" aria-label="Current medicines">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Pill className="h-4 w-4 text-primary" />Current medicines
      </h2>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {meds.map((m) => (
          <li key={m.id} className="shrink-0 rounded-lg bg-accent px-3 py-2 text-accent-foreground">
            <p className="text-sm font-medium">{m.medication_name}</p>
            {(m.dosage || m.frequency) && <p className="text-xs opacity-80">{[m.dosage, m.frequency].filter(Boolean).join(' · ')}</p>}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">Read from your uploaded prescriptions. Check with your doctor.</p>
    </section>
  );
}
