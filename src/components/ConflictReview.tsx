import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BLOOD_GROUPS, type DocumentConflict, type Patient, type PatientDocumentRef } from '@/types/patient';

interface Props {
  patient: Patient;
  doc: PatientDocumentRef;
  onUpdated: (p: Patient) => void;
}

const normBlood = (v: string) => {
  const s = v.toUpperCase().replace(/\s+/g, '').replace('POSITIVE', '+').replace('NEGATIVE', '-').replace('VE', '');
  return (BLOOD_GROUPS as readonly string[]).includes(s) ? (s as Patient['bloodGroup']) : null;
};

/** AI never overwrites the patient's values; the patient decides here. */
export const ConflictReview = ({ patient, doc, onUpdated }: Props) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState<number | null>(null);
  const open = (doc.conflicts ?? []).map((c, i) => ({ c, i })).filter(({ c }) => !c.resolution);
  if (open.length === 0) return null;

  const resolve = async (index: number, accept: boolean) => {
    const conflict = doc.conflicts![index];
    setBusy(index);
    try {
      const update: Record<string, unknown> = {};
      let next: Patient = { ...patient };
      if (accept && conflict.field === 'blood_group') {
        const bg = normBlood(conflict.document_value);
        if (!bg) throw new Error('unrecognised');
        update.blood_group = bg;
        next.bloodGroup = bg;
      }
      if (accept && conflict.field === 'allergy') {
        const allergies = Array.from(new Set([...(patient.allergies ?? []), conflict.document_value.trim()]));
        update.allergies = allergies;
        next.allergies = allergies;
      }
      const conflicts: DocumentConflict[] = doc.conflicts!.map((c, i) =>
        i === index
          ? { ...c, resolution: accept ? 'accepted_document' : 'kept_profile', resolved_at: new Date().toISOString() }
          : c,
      );
      const documents = (patient.documents ?? []).map((d) =>
        d.path === doc.path
          ? { ...d, conflicts, provenance: { ...d.provenance, verification_status: 'USER_VERIFIED' } }
          : d,
      );
      update.documents = documents;
      const { error } = await supabase.from('patients').update(update as never).eq('id', patient.id);
      if (error) throw error;
      next = { ...next, documents };
      onUpdated(next);
      toast({ title: accept ? 'Profile updated from document' : 'Kept your saved value' });
    } catch {
      toast({ title: "We couldn't save that", description: 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-warning/40 bg-warning/10 p-3 space-y-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <AlertTriangle className="w-4 h-4 text-warning" />
        Possible conflicting information found
      </p>
      {open.map(({ c, i }) => (
        <div key={i} className="text-sm space-y-2">
          {c.field === 'blood_group' ? (
            <p>
              Blood group — your profile: <strong>{c.profile_value}</strong>, document: <strong>{c.document_value}</strong>
            </p>
          ) : (
            <p>
              Allergy in document not on your profile: <strong>{c.document_value}</strong>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => resolve(i, false)}>
              {c.field === 'blood_group' ? 'Keep my value' : 'Ignore'}
            </Button>
            <Button size="sm" disabled={busy !== null} onClick={() => resolve(i, true)}>
              {busy === i && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {c.field === 'blood_group' ? 'Use document value' : 'Add to my allergies'}
            </Button>
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">AI-extracted. Check the original document before changing your profile.</p>
    </div>
  );
};
