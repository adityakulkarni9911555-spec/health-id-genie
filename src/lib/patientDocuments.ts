import { supabase } from '@/integrations/supabase/client';
import type { PatientDocument } from '@/components/DocumentUpload';

const BUCKET = 'patient-documents';
const FREE_DOCUMENT_LIMIT = 5;

const slugify = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_').slice(0, 80);

async function getPlanDocumentLimit(userId: string): Promise<number> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_slug')
    .eq('id', userId)
    .maybeSingle();

  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('max_documents')
    .eq('slug', profile?.plan_slug || 'free')
    .maybeSingle();

  return plan?.max_documents ?? FREE_DOCUMENT_LIMIT;
}

export async function uploadPatientDocument(
  patientId: string,
  file: File,
): Promise<PatientDocument> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error('You must be signed in to upload documents.');

  const { data: patient } = await supabase
    .from('patients')
    .select('documents')
    .eq('id', patientId)
    .eq('owner_id', userId)
    .maybeSingle();

  const currentDocs = Array.isArray(patient?.documents) ? (patient?.documents as PatientDocument[]) : [];
  const limit = await getPlanDocumentLimit(userId);
  if (limit !== null && currentDocs.length >= limit) {
    throw new Error(`Document limit reached. Upgrade your plan to upload more.`);
  }

  const safeName = slugify(file.name);
  const path = `${userId}/${patientId}/${Date.now()}_${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (error) throw error;

  return {
    path,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };
}

export async function uploadPatientDocuments(
  patientId: string,
  files: File[],
): Promise<PatientDocument[]> {
  const out: PatientDocument[] = [];
  for (const f of files) {
    // Sequential to keep upload progress predictable on tablets.
    // eslint-disable-next-line no-await-in-loop
    out.push(await uploadPatientDocument(patientId, f));
  }
  return out;
}

export async function persistPatientDocuments(
  patientId: string,
  documents: PatientDocument[],
): Promise<void> {
  const { error } = await supabase
    .from('patients')
    .update({ documents: documents as unknown as never })
    .eq('id', patientId);
  if (error) throw error;
}

/** Generate a fresh short-lived URL for a stored document. */
export async function getSignedDocumentUrl(
  path: string,
  expiresInSeconds = 60 * 10,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) {
    console.error('Signed URL error:', error);
    return null;
  }
  return data?.signedUrl ?? null;
}
