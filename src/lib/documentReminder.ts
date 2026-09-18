import type { PatientDocument } from '@/components/DocumentUpload';

/** Remind the user to refresh their records after this many days without an upload. */
export const REMINDER_AFTER_DAYS = 90;
/** How long a "remind me later" tap silences the reminder. */
const SNOOZE_DAYS = 14;
/** Minimum gap between two browser notifications. */
const NOTIFY_GAP_DAYS = 7;

const SNOOZE_KEY = 'medora.docReminder.snoozedUntil';
const NOTIFIED_KEY = 'medora.docReminder.lastNotifiedAt';
const OPTIN_KEY = 'medora.docReminder.notifyEnabled';

const DAY_MS = 24 * 60 * 60 * 1000;

const readTime = (key: string): number => {
  const raw = localStorage.getItem(key);
  const value = raw ? Date.parse(raw) : NaN;
  return Number.isNaN(value) ? 0 : value;
};

export const lastUploadAt = (documents: PatientDocument[] = []): Date | null => {
  const times = documents
    .map((doc) => Date.parse(doc.uploadedAt))
    .filter((t) => !Number.isNaN(t));
  if (times.length === 0) return null;
  return new Date(Math.max(...times));
};

export const daysSinceLastUpload = (documents: PatientDocument[] = []): number | null => {
  const last = lastUploadAt(documents);
  if (!last) return null;
  return Math.floor((Date.now() - last.getTime()) / DAY_MS);
};

export const isSnoozed = (): boolean => readTime(SNOOZE_KEY) > Date.now();

export const snoozeReminder = () => {
  localStorage.setItem(SNOOZE_KEY, new Date(Date.now() + SNOOZE_DAYS * DAY_MS).toISOString());
};

export const clearSnooze = () => localStorage.removeItem(SNOOZE_KEY);

/** True when records look stale (or empty) and the reminder is not snoozed. */
export const isReminderDue = (documents: PatientDocument[] = []): boolean => {
  if (isSnoozed()) return false;
  const days = daysSinceLastUpload(documents);
  if (days === null) return documents.length === 0;
  return days >= REMINDER_AFTER_DAYS;
};

export const notificationsEnabled = (): boolean =>
  localStorage.getItem(OPTIN_KEY) === 'true' &&
  typeof Notification !== 'undefined' &&
  Notification.permission === 'granted';

export const requestReminderNotifications = async (): Promise<boolean> => {
  if (typeof Notification === 'undefined') return false;
  const permission =
    Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  const granted = permission === 'granted';
  localStorage.setItem(OPTIN_KEY, granted ? 'true' : 'false');
  return granted;
};

export const disableReminderNotifications = () => localStorage.setItem(OPTIN_KEY, 'false');

/** Fires a gentle browser reminder, at most once a week. */
export const maybeNotify = (documents: PatientDocument[] = []) => {
  if (!notificationsEnabled() || !isReminderDue(documents)) return;
  if (Date.now() - readTime(NOTIFIED_KEY) < NOTIFY_GAP_DAYS * DAY_MS) return;
  const days = daysSinceLastUpload(documents);
  try {
    new Notification('Medora — keep your health records fresh', {
      body:
        days === null
          ? 'Add your first report or prescription so your emergency card is complete.'
          : `It has been ${days} days since your last upload. Add any recent reports or prescriptions.`,
      icon: '/favicon.ico',
      tag: 'medora-doc-reminder',
    });
    localStorage.setItem(NOTIFIED_KEY, new Date().toISOString());
  } catch {
    /* notifications unavailable */
  }
};
