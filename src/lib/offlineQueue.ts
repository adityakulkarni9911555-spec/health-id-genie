import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'smart-health:pending-patients';
const EVENT_NAME = 'smart-health:queue-changed';

export interface PendingPatientRecord {
  localId: string;
  createdAt: string;
  payload: {
    full_name: string;
    date_of_birth: string;
    phone_number: string;
    gender: string;
    blood_group: string | null;
    height: string | null;
    weight: string | null;
    allergies: string[];
    chronic_conditions: string[];
    emergency_contact: string;
    insurance_provider: string | null;
    policy_number: string | null;
    tpa_contact: string | null;
  };
}

const readQueue = (): PendingPatientRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingPatientRecord[]) : [];
  } catch {
    return [];
  }
};

const writeQueue = (records: PendingPatientRecord[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
};

export const getQueue = readQueue;

export const getQueueCount = (): number => readQueue().length;

export const enqueuePatient = (
  payload: PendingPatientRecord['payload']
): PendingPatientRecord => {
  const record: PendingPatientRecord = {
    localId:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    payload,
  };
  writeQueue([...readQueue(), record]);
  return record;
};

export const subscribeToQueue = (listener: () => void) => {
  const handler = () => listener();
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
};

let syncing = false;

export const syncPendingPatients = async (): Promise<{
  synced: number;
  failed: number;
}> => {
  if (syncing) return { synced: 0, failed: 0 };
  const queue = readQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  syncing = true;
  let synced = 0;
  let failed = 0;
  const remaining: PendingPatientRecord[] = [];

  try {
    for (const record of queue) {
      try {
        const { error } = await supabase.from('patients').insert(record.payload);
        if (error && error.code !== '23505') {
          remaining.push(record);
          failed += 1;
        } else {
          synced += 1;
        }
      } catch {
        remaining.push(record);
        failed += 1;
      }
    }
    writeQueue(remaining);
  } finally {
    syncing = false;
  }

  return { synced, failed };
};
