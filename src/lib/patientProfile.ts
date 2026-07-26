import { supabase } from '@/integrations/supabase/client';
import type { Patient } from '@/types/patient';

export function mapPatientRow(data: Record<string, any>): Patient {
  return {
    id: data.id,
    fullName: data.full_name,
    dateOfBirth: data.date_of_birth,
    phoneNumber: data.phone_number,
    gender: data.gender as Patient['gender'],
    bloodGroup: (data.blood_group || '') as Patient['bloodGroup'],
    height: data.height || '',
    weight: data.weight || '',
    allergies: data.allergies || [],
    chronicConditions: data.chronic_conditions || [],
    emergencyContact: data.emergency_contact,
    insuranceProvider: data.insurance_provider || undefined,
    policyNumber: data.policy_number || undefined,
    tpaContact: data.tpa_contact || undefined,
    documents: (data.documents as Patient['documents']) || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function loadPatientForCurrentUser(): Promise<Patient | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('patient_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.patient_id) return null;

  const { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', profile.patient_id)
    .maybeSingle();

  if (error || !patient) return null;
  return mapPatientRow(patient);
}

export async function linkPatientToProfile(patientId: string): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return;
  await supabase
    .from('profiles')
    .upsert({ id: user.id, patient_id: patientId }, { onConflict: 'id' });
}
