import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BellRing, BellOff, CalendarClock, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PatientDocument } from '@/components/DocumentUpload';
import {
  REMINDER_AFTER_DAYS,
  daysSinceLastUpload,
  disableReminderNotifications,
  isReminderDue,
  maybeNotify,
  notificationsEnabled,
  requestReminderNotifications,
  snoozeReminder,
} from '@/lib/documentReminder';

interface DocumentReminderProps {
  documents: PatientDocument[];
  /** Scrolls the user to the upload area. */
  onUploadClick?: () => void;
}

export const DocumentReminder = ({ documents, onUploadClick }: DocumentReminderProps) => {
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [notifyOn, setNotifyOn] = useState(false);

  useEffect(() => {
    setNotifyOn(notificationsEnabled());
  }, []);

  useEffect(() => {
    maybeNotify(documents);
  }, [documents]);

  const due = isReminderDue(documents) && !dismissed;
  if (!due) return null;

  const days = daysSinceLastUpload(documents);

  const toggleNotify = async () => {
    if (notifyOn) {
      disableReminderNotifications();
      setNotifyOn(false);
      toast({ title: 'Reminders turned off' });
      return;
    }
    const granted = await requestReminderNotifications();
    setNotifyOn(granted);
    toast({
      title: granted ? 'Reminders turned on' : 'Reminders blocked',
      description: granted
        ? 'We will nudge you when your records look out of date.'
        : 'Allow notifications in your browser settings to get reminders.',
      variant: granted ? undefined : 'destructive',
    });
  };

  return (
    <div className="no-print rounded-2xl border border-primary/25 bg-primary/5 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-semibold text-foreground">
              {days === null ? 'Add your first health document' : 'Time to refresh your records'}
            </h3>
            <Badge variant="secondary" className="text-xs">Reminder</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {days === null
              ? 'Upload a recent prescription, lab report or discharge summary so your emergency card is complete.'
              : `Your last upload was ${days} days ago. If you have had a test, prescription or hospital visit since, add it now — we check every ${REMINDER_AFTER_DAYS} days.`}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="lg" className="min-h-[48px]" onClick={onUploadClick}>
              <Upload className="mr-2 h-4 w-4" />
              Upload now
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="min-h-[48px]"
              onClick={toggleNotify}
            >
              {notifyOn ? <BellOff className="mr-2 h-4 w-4" /> : <BellRing className="mr-2 h-4 w-4" />}
              {notifyOn ? 'Turn off reminders' : 'Remind me'}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="min-h-[48px]"
              onClick={() => {
                snoozeReminder();
                setDismissed(true);
                toast({ title: 'Reminder snoozed', description: 'We will check again in two weeks.' });
              }}
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
