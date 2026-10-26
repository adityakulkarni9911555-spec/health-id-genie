import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarClock, Upload, Check, Undo2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PatientDocument } from '@/components/DocumentUpload';
import {
  clearSnooze,
  daysSinceLastUpload,
  isReminderDue,
  maybeNotify,
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

  useEffect(() => {
    maybeNotify(documents);
  }, [documents]);

  const days = daysSinceLastUpload(documents);
  if (dismissed) return (
    <div className="no-print flex items-center gap-3 border-y border-border py-2" role="status">
      <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
      <p className="flex-1 text-sm text-muted-foreground">Snoozed for 14 days on this device</p>
      <Button variant="ghost" className="min-h-14 shrink-0 gap-1.5 px-2" onClick={() => {
        clearSnooze(); setDismissed(false);
      }}><Undo2 className="h-4 w-4" />Undo</Button>
    </div>
  );
  if (!isReminderDue(documents)) return null;

  return (
    <section className="no-print border-y border-border py-4" aria-labelledby="record-reminder-title">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <CalendarClock className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-1">
            <p className="text-xs font-medium text-accent-foreground mb-1">Record reminder</p>
            <h3 id="record-reminder-title" className="font-display text-base font-semibold text-foreground">
              {days === null ? 'Keep your first report handy' : 'Any new reports to add?'}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {days === null
              ? 'Add a prescription, test result or hospital summary to your private records.'
              : `Last upload: ${days} days ago. Add a recent report or prescription, if you have one.`}
          </p>

          <div className="mt-3 grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
            <Button className="min-h-14 px-3 whitespace-normal" onClick={onUploadClick} disabled={!onUploadClick}>
              <Upload className="h-4 w-4" />
              Add a record
            </Button>
            <Button
              variant="outline"
              className="min-h-14 px-3 whitespace-normal"
              onClick={() => {
                snoozeReminder();
                setDismissed(true);
                toast({ title: 'Snoozed for 14 days', description: 'This reminder will return when you next open Medora after that date.' });
              }}
            >
              Snooze 14 days
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
