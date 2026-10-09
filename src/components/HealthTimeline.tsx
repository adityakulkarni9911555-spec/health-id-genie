import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarClock, FileText, FlaskConical, Pill, Loader2 } from 'lucide-react';

type Doc = { id: string; title: string; document_type: string; document_date: string | null; uploaded_at: string; provider_name: string | null; summary: string | null };
type Med = { id: string; medication_name: string; dosage: string | null; frequency: string | null; status: string; verification_status: string; source_document_id: string | null };
type Lab = { id: string; test_name: string; result_value: string | null; unit: string | null; reference_range: string | null; status: string; test_date: string | null; source_document_id: string | null };

const TYPE_LABEL: Record<string, string> = {
  prescription: 'Prescription', lab_report: 'Lab report', imaging: 'Imaging', discharge_summary: 'Discharge summary',
  consultation: 'Consultation', insurance: 'Insurance', vaccination: 'Vaccination', other: 'Document',
};
const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function HealthTimeline({ patientId, refreshKey }: { patientId: string; refreshKey?: unknown }) {
  const [tab, setTab] = useState<'timeline' | 'meds' | 'labs'>('timeline');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [meds, setMeds] = useState<Med[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [d, m, l] = await Promise.all([
      supabase.from('documents').select('id,title,document_type,document_date,uploaded_at,provider_name,summary').eq('patient_id', patientId).eq('status', 'active'),
      supabase.from('patient_medications').select('id,medication_name,dosage,frequency,status,verification_status,source_document_id').eq('patient_id', patientId).order('created_at', { ascending: false }),
      supabase.from('patient_lab_results').select('id,test_name,result_value,unit,reference_range,status,test_date,source_document_id').eq('patient_id', patientId).order('test_date', { ascending: false, nullsFirst: false }),
    ]);
    const sorted = ((d.data as Doc[]) ?? []).sort((a, b) =>
      new Date(b.document_date ?? b.uploaded_at).getTime() - new Date(a.document_date ?? a.uploaded_at).getTime());
    setDocs(sorted); setMeds((m.data as Med[]) ?? []); setLabs((l.data as Lab[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [patientId, refreshKey]);

  const docName = (id: string | null) => docs.find((d) => d.id === id)?.title ?? 'Unknown document';

  const setMedStatus = async (id: string, status: string) => {
    await supabase.from('patient_medications').update({ status, verification_status: 'USER_VERIFIED', updated_at: new Date().toISOString() }).eq('id', id);
    load();
  };

  const tabs = [
    { k: 'timeline' as const, label: 'Timeline', icon: CalendarClock, n: docs.length },
    { k: 'meds' as const, label: 'Medicines', icon: Pill, n: meds.length },
    { k: 'labs' as const, label: 'Lab results', icon: FlaskConical, n: labs.length },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm" aria-labelledby="timeline-h">
      <h2 id="timeline-h" className="text-lg font-semibold text-foreground">Your health records</h2>
      <p className="text-sm text-muted-foreground mb-4">Built from your uploaded documents. Tap the AI button on a document to fill medicines and lab results.</p>
      <div className="flex gap-2 mb-4 overflow-x-auto" role="tablist">
        {tabs.map((t) => (
          <Button key={t.k} role="tab" aria-selected={tab === t.k} variant={tab === t.k ? 'default' : 'outline'} className="min-h-[48px]" onClick={() => setTab(t.k)}>
            <t.icon className="h-4 w-4 mr-2" />{t.label} <span className="ml-1 opacity-70">({t.n})</span>
          </Button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
        <>
          {tab === 'timeline' && (docs.length === 0 ? <Empty text="No documents yet." /> : (
            <ol className="relative border-l-2 border-border ml-2 space-y-5">
              {docs.map((d) => (
                <li key={d.id} className="ml-5">
                  <span className="absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full bg-primary border-2 border-background" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{d.document_date ? fmt(d.document_date) : fmt(d.uploaded_at)}</span>
                    <Badge variant="outline" className="text-xs">{d.document_date ? 'Date on document' : 'Upload date'}</Badge>
                    <Badge variant="secondary" className="text-xs">{TYPE_LABEL[d.document_type] ?? 'Document'}</Badge>
                  </div>
                  <p className="text-sm text-foreground mt-1 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />{d.title}{d.provider_name && <span className="text-muted-foreground"> · {d.provider_name}</span>}</p>
                  {d.summary && <p className="text-sm text-muted-foreground mt-0.5">{d.summary}</p>}
                </li>
              ))}
            </ol>
          ))}

          {tab === 'meds' && (meds.length === 0 ? <Empty text="No medicines found in your documents yet." /> : (
            <ul className="space-y-3">
              {meds.map((m) => (
                <li key={m.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{m.medication_name}</span>
                    <Badge variant={m.verification_status === 'AI_EXTRACTED' ? 'outline' : 'secondary'} className="text-xs">{m.verification_status === 'AI_EXTRACTED' ? 'AI-extracted' : 'Confirmed by you'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{[m.dosage, m.frequency].filter(Boolean).join(' · ') || 'Dose not stated'} · From: {docName(m.source_document_id)}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(['active', 'completed', 'stopped'] as const).map((s) => (
                      <Button key={s} size="sm" variant={m.status === s ? 'default' : 'outline'} onClick={() => setMedStatus(m.id, s)}>
                        {s === 'active' ? 'Still taking' : s === 'completed' ? 'Finished' : 'Stopped'}
                      </Button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ))}

          {tab === 'labs' && (labs.length === 0 ? <Empty text="No lab results found in your documents yet." /> : (
            <ul className="space-y-2">
              {labs.map((l) => (
                <li key={l.id} className="rounded-xl border border-border p-3 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{l.test_name}</p>
                    <p className="text-xs text-muted-foreground">{l.test_date ? fmt(l.test_date) : 'Date not printed'} · From: {docName(l.source_document_id)} · AI-extracted</p>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground">{l.result_value ?? '—'} {l.unit}</p>
                    {l.reference_range && <p className="text-xs text-muted-foreground">Ref: {l.reference_range}</p>}
                    {l.status === 'abnormal' && <Badge variant="destructive" className="text-xs">Flagged on report</Badge>}
                  </div>
                </li>
              ))}
              <p className="text-xs text-muted-foreground pt-2">Values are copied from your reports. Please discuss results with your doctor.</p>
            </ul>
          ))}
        </>
      )}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{text}</p>;
}
