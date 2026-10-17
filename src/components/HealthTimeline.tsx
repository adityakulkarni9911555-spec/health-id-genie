import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSignedDocumentUrl } from '@/lib/patientDocuments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarClock, FileText, FlaskConical, Pill, ExternalLink, AlertCircle, RefreshCw, Image, Stethoscope, Syringe, ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Doc = { id: string; storage_path: string; title: string; document_type: string; document_date: string | null; uploaded_at: string; provider_name: string | null; summary: string | null };
type Med = { id: string; medication_name: string; dosage: string | null; frequency: string | null; status: string; verification_status: string; source_document_id: string | null };
type Lab = { id: string; test_name: string; result_value: string | null; unit: string | null; reference_range: string | null; status: string; test_date: string | null; source_page: number | null; source_document_id: string | null };

const TYPE_LABEL: Record<string, string> = {
  prescription: 'Prescription', lab_report: 'Lab report', imaging: 'Imaging', discharge_summary: 'Discharge summary',
  consultation: 'Consultation', insurance: 'Insurance', vaccination: 'Vaccination', other: 'Document',
};
const parseDate = (value: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
const fmt = (d: string) => {
  const date = parseDate(d);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const monthLabel = (d: string) => {
  const date = parseDate(d);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};
const TYPE_ICON: Record<string, typeof FileText> = {
  prescription: Pill, lab_report: FlaskConical, imaging: Image, consultation: Stethoscope,
  vaccination: Syringe, insurance: ShieldCheck,
};

export function HealthTimeline({ patientId, refreshKey }: { patientId: string; refreshKey?: unknown }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [meds, setMeds] = useState<Med[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    const [d, m, l] = await Promise.all([
      supabase.from('documents').select('id,storage_path,title,document_type,document_date,uploaded_at,provider_name,summary').eq('patient_id', patientId).eq('status', 'active'),
      supabase.from('patient_medications').select('id,medication_name,dosage,frequency,status,verification_status,source_document_id').eq('patient_id', patientId).order('created_at', { ascending: false }),
      supabase.from('patient_lab_results').select('id,test_name,result_value,unit,reference_range,status,test_date,source_page,source_document_id').eq('patient_id', patientId).order('test_date', { ascending: false, nullsFirst: false }),
    ]);
    if (d.error || m.error || l.error) { setFailed(true); setLoading(false); return; }
    const sorted = ((d.data as Doc[]) ?? []).sort((a, b) =>
      (parseDate(b.document_date ?? b.uploaded_at).getTime() || 0) - (parseDate(a.document_date ?? a.uploaded_at).getTime() || 0));
    setDocs(sorted); setMeds((m.data as Med[]) ?? []); setLabs((l.data as Lab[]) ?? []);
    setLoading(false);
  }, [patientId]);
  useEffect(() => { void load(); }, [load, refreshKey]);

  const openOriginal = async (id: string | null) => {
    const doc = docs.find((d) => d.id === id);
    if (!doc) return;
    const w = window.open('', '_blank'); if (w) w.opener = null;
    const url = await getSignedDocumentUrl(doc.storage_path, 300);
    if (url && w) w.location.href = url; else { w?.close(); alert('This document could not be opened. It may have been removed.'); }
  };
  const ViewBtn = ({ id }: { id: string | null }) =>
    id && docs.some((d) => d.id === id) ? <Button size="sm" variant="link" className="min-h-[56px] px-0 whitespace-normal text-left" onClick={() => openOriginal(id)}><ExternalLink aria-hidden="true" className="h-4 w-4" />View original</Button> : null;

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

  const groups = docs.reduce<{ label: string; documents: Doc[] }[]>((out, doc) => {
    const label = monthLabel(doc.document_date ?? doc.uploaded_at);
    const last = out[out.length - 1];
    if (last?.label === label) last.documents.push(doc);
    else out.push({ label, documents: [doc] });
    return out;
  }, []);

  return (
    <section className="border-y border-border py-6" aria-labelledby="timeline-h" aria-busy={loading}>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2 id="timeline-h" className="text-xl font-semibold text-foreground">Your health records</h2>
          <p className="text-sm text-muted-foreground mt-1">{loading ? 'Loading records…' : `${docs.length} ${docs.length === 1 ? 'document' : 'documents'}`} · Most recent first</p>
        </div>
        <CalendarClock aria-hidden="true" className="h-6 w-6 shrink-0 text-primary mt-1" />
      </div>
      <Tabs defaultValue="timeline">
        <TabsList className="grid grid-cols-3 h-auto w-full mb-6 p-1 gap-1" aria-label="Health records">
          {tabs.map((t) => (
            <TabsTrigger key={t.k} value={t.k} className="min-h-[56px] min-w-0 px-1 flex-col gap-1 sm:flex-row sm:gap-2">
              <t.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="flex items-center gap-1 text-xs sm:text-sm">{t.label}<span className="text-muted-foreground tabular-nums">{loading ? '—' : t.n}</span></span>
            </TabsTrigger>
          ))}
        </TabsList>
        {failed ? <div role="alert" className="flex flex-col items-center py-8 gap-3 text-center"><AlertCircle aria-hidden="true" className="h-6 w-6 text-destructive" /><p className="text-sm text-destructive">Couldn't load your records.</p><Button variant="outline" className="min-h-[56px]" onClick={load}><RefreshCw aria-hidden="true" />Try again</Button></div> : loading ? <div role="status" className="space-y-4 py-2"><span className="sr-only">Loading health records</span>{[0, 1, 2].map((i) => <div key={i} aria-hidden="true" className="flex gap-4 motion-safe:animate-pulse"><div className="h-10 w-10 rounded-md bg-muted shrink-0" /><div className="flex-1 space-y-2"><div className="h-4 w-1/3 rounded bg-muted" /><div className="h-5 w-3/4 rounded bg-muted" /><div className="h-3 w-1/2 rounded bg-muted" /></div></div>)}</div> : (
          <>
            <TabsContent value="timeline">
              {docs.length === 0 ? <Empty text="No documents yet." /> : (
                <div className="space-y-7">
                  {groups.map((group) => (
                    <div key={group.label}>
                      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-3">{group.label}<span className="h-px bg-border flex-1" /></h3>
                      <ol className="space-y-0">
                        {group.documents.map((d, index) => {
                          const Icon = TYPE_ICON[d.document_type] ?? FileText;
                          return (
                            <li key={d.id} className="relative flex gap-3 sm:gap-4 pb-5 last:pb-0">
                              {index < group.documents.length - 1 && <span aria-hidden="true" className="absolute left-5 top-10 bottom-0 w-px bg-border" />}
                              <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${d.document_type === 'lab_report' ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary'}`}><Icon aria-hidden="true" className="h-5 w-5" /></span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                  <time dateTime={d.document_date ?? d.uploaded_at}>{fmt(d.document_date ?? d.uploaded_at)}</time>
                                  <span>· {d.document_date ? 'Document date' : 'Upload date'}</span>
                                </div>
                                <h4 className="font-semibold text-foreground mt-1 break-words">{d.title}</h4>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <Badge variant="secondary" className="text-xs">{TYPE_LABEL[d.document_type] ?? 'Document'}</Badge>
                                  {d.provider_name && <span className="text-xs text-muted-foreground break-words">{d.provider_name}</span>}
                                </div>
                                {d.summary && <p className="text-sm text-muted-foreground mt-2 leading-relaxed break-words">{d.summary}</p>}
                                <ViewBtn id={d.id} />
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

          <TabsContent value="meds">{(meds.length === 0 ? <Empty text="No medicines found in your documents yet." /> : (
            <ul className="space-y-3">
              {meds.map((m) => (
                <li key={m.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{m.medication_name}</span>
                    <Badge variant={m.verification_status === 'AI_EXTRACTED' ? 'outline' : 'secondary'} className="text-xs">{m.verification_status === 'AI_EXTRACTED' ? 'AI-extracted' : 'Confirmed by you'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{[m.dosage, m.frequency].filter(Boolean).join(' · ') || 'Dose not stated'} · From: {docName(m.source_document_id)} <ViewBtn id={m.source_document_id} /></p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(['active', 'completed', 'stopped'] as const).map((s) => (
                      <Button key={s} size="sm" variant={m.status === s ? 'default' : 'outline'} className="min-h-[56px]" onClick={() => setMedStatus(m.id, s)}>
                        {s === 'active' ? 'Still taking' : s === 'completed' ? 'Finished' : 'Stopped'}
                      </Button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ))}</TabsContent>

          <TabsContent value="labs">{(labs.length === 0 ? <Empty text="No lab results found in your documents yet." /> : (
            <ul className="space-y-2">
              {labs.map((l) => (
                <li key={l.id} className="rounded-lg border border-border p-4 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{l.test_name}</p>
                    <p className="text-xs text-muted-foreground">{l.test_date ? fmt(l.test_date) : 'Date not printed'}{l.source_page ? ` · page ${l.source_page}` : ''} · From: {docName(l.source_document_id)} · AI-extracted <ViewBtn id={l.source_document_id} /></p>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground">{l.result_value ?? '—'} {l.unit}</p>
                    {l.reference_range && <p className="text-xs text-muted-foreground">Ref: {l.reference_range}</p>}
                    {l.status === 'abnormal' && <Badge variant="destructive" className="text-xs">Flagged on report</Badge>}
                  </div>
                </li>
              ))}
              <p className="text-xs text-muted-foreground pt-2">Values are copied by AI from your reports and may contain errors. Reference ranges vary by lab and need a doctor's interpretation — this is not a diagnosis.</p>
            </ul>
          ))}</TabsContent>
        </>
        )}
      </Tabs>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex flex-col items-center gap-3 py-10 text-center"><FileText aria-hidden="true" className="h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">{text}</p></div>;
}
