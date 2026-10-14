import { supabase } from '@/integrations/supabase/client';

export type AccessEventKind = 'pin_success' | 'pin_failure' | 'scan' | 'break_glass' | 'qr_rotated' | 'ai' | 'other';

export interface AccessEvent {
  id: string;
  at: string;
  kind: AccessEventKind;
  title: string;
  detail: string;
}

interface AuditRow {
  id: string;
  created_at: string;
  action: string;
  actor_role: string;
  access_method: string | null;
}

/** Map a raw audit row to plain-language text. Unknown actions get a neutral label. */
export function describeAudit(row: AuditRow): AccessEvent {
  const base = { id: `a-${row.id}`, at: row.created_at };
  switch (row.action) {
    case 'PIN_SUCCESS':
      return { ...base, kind: 'pin_success', title: 'Reports opened with your PIN', detail: 'Someone entered the correct document PIN on your emergency page.' };
    case 'PIN_FAILURE':
      return { ...base, kind: 'pin_failure', title: 'Wrong PIN entered', detail: 'Reports stayed locked.' };
    case 'BREAK_GLASS_REQUESTED':
      return { ...base, kind: 'break_glass', title: 'Clinical access requested', detail: 'The person was not verified, so no reports were unlocked.' };
    case 'AI_EXTRACTION':
      return { ...base, kind: 'ai', title: 'You analysed a document', detail: 'Read by Medora AI from your own account.' };
    default:
      return { ...base, kind: 'other', title: 'Account activity', detail: row.action.replace(/_/g, ' ').toLowerCase() };
  }
}

export function mergeEvents(...lists: AccessEvent[][]): AccessEvent[] {
  return lists.flat().sort((a, b) => b.at.localeCompare(a.at));
}

/**
 * Read-only. Row-level security already limits each log to the patient's
 * owner; the explicit patient_id filter is defence in depth.
 */
export async function loadAccessHistory(patientId: string, limit = 50): Promise<AccessEvent[]> {
  const [audit, scans, rotations] = await Promise.all([
    supabase.from('audit_events').select('id, created_at, action, actor_role, access_method').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(limit),
    supabase.from('emergency_access_logs').select('id, accessed_at').eq('patient_id', patientId).order('accessed_at', { ascending: false }).limit(limit),
    supabase.from('qr_rotation_logs').select('id, created_at').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(limit),
  ]);
  const err = audit.error || scans.error || rotations.error;
  if (err) throw new Error('Could not load access history');

  return mergeEvents(
    (audit.data ?? []).map(describeAudit),
    (scans.data ?? []).map((r) => ({ id: `s-${r.id}`, at: r.accessed_at, kind: 'scan' as const, title: 'Emergency page opened', detail: 'Your QR code was scanned. Only emergency information was shown.' })),
    (rotations.data ?? []).map((r) => ({ id: `r-${r.id}`, at: r.created_at, kind: 'qr_rotated' as const, title: 'Emergency QR replaced', detail: 'Old QR codes stopped working.' })),
  ).slice(0, limit);
}
