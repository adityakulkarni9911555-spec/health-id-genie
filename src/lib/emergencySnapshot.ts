import type { Patient } from '@/types/patient';

// Minimal emergency card kept on the owner's own device so the QR still opens offline.
// Contains only what the public emergency page already shows; cleared on sign-out.
const KEY = 'medora:emergency-snapshot';
const FIELDS = ['id', 'fullName', 'bloodGroup', 'allergies', 'chronicConditions', 'emergencyContact', 'shareToken', 'shareRevoked'] as const;

export function saveEmergencySnapshot(p: Patient) {
  try {
    const snap: Record<string, unknown> = {};
    FIELDS.forEach((f) => { snap[f] = p[f]; });
    localStorage.setItem(KEY, JSON.stringify(snap));
  } catch { /* storage unavailable */ }
}

export function loadEmergencySnapshot(): Patient | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return { dateOfBirth: '', phoneNumber: '', gender: 'other', height: '', weight: '', createdAt: '', updatedAt: '', allergies: [], chronicConditions: [], ...s } as Patient;
  } catch { return null; }
}

export function clearEmergencySnapshot() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
