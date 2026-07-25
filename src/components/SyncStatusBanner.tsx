import { useEffect, useState } from 'react';
import { CloudOff, CloudUpload, CheckCircle2, RefreshCw, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  getQueueCount,
  subscribeToQueue,
  syncPendingPatients,
} from '@/lib/offlineQueue';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export const SyncStatusBanner = () => {
  const isOnline = useOnlineStatus();
  const [pending, setPending] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setPending(getQueueCount());
    return subscribeToQueue(() => setPending(getQueueCount()));
  }, []);

  const runSync = async () => {
    if (!isOnline || isSyncing || pending === 0) return;
    setIsSyncing(true);
    const { synced, failed } = await syncPendingPatients();
    setIsSyncing(false);
    if (synced > 0) {
      setJustSynced(true);
      toast({
        title: 'Synced to cloud',
        description: `${synced} record${synced > 1 ? 's' : ''} uploaded successfully.`,
      });
      setTimeout(() => setJustSynced(false), 3500);
    }
    if (failed > 0) {
      toast({
        title: 'Some records could not sync',
        description: `${failed} record${failed > 1 ? 's remain' : ' remains'} queued. We'll retry automatically.`,
        variant: 'destructive',
      });
    }
  };

  // Auto-sync when we come back online or on mount if there are pending records
  useEffect(() => {
    if (isOnline && pending > 0 && !isSyncing) {
      runSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, pending]);

  // Nothing to show: online, nothing pending, no recent success
  if (isOnline && pending === 0 && !isSyncing && !justSynced) return null;

  let tone = '';
  let icon = null;
  let title = '';
  let description = '';
  let showRetry = false;

  if (!isOnline) {
    tone =
      'border-warning/40 bg-warning/10 text-warning-foreground [--dot:hsl(var(--warning))]';
    icon = <WifiOff className="w-5 h-5 text-warning" />;
    title = 'You are offline';
    description =
      pending > 0
        ? `${pending} record${pending > 1 ? 's' : ''} saved on this device — will sync when connection returns.`
        : 'New registrations will be saved on this device and synced automatically when you reconnect.';
  } else if (isSyncing) {
    tone = 'border-primary/30 bg-primary/5 text-foreground [--dot:hsl(var(--primary))]';
    icon = <CloudUpload className="w-5 h-5 text-primary animate-pulse" />;
    title = 'Syncing to cloud…';
    description = `Uploading ${pending} pending record${pending > 1 ? 's' : ''}.`;
  } else if (pending > 0) {
    tone =
      'border-warning/40 bg-warning/10 text-warning-foreground [--dot:hsl(var(--warning))]';
    icon = <CloudOff className="w-5 h-5 text-warning" />;
    title = `${pending} record${pending > 1 ? 's' : ''} waiting to sync`;
    description = 'Saved locally on this tablet. Tap retry to upload now.';
    showRetry = true;
  } else if (justSynced) {
    tone = 'border-success/40 bg-success/10 text-success [--dot:hsl(var(--success))]';
    icon = <CheckCircle2 className="w-5 h-5 text-success" />;
    title = 'All data synced';
    description = 'Your records are safely stored in the cloud.';
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`no-print border-b ${tone} transition-all duration-300`}
    >
      <div className="container mx-auto px-4 py-2.5 flex items-center gap-3">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight text-foreground">
            {title}
          </p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        {showRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={runSync}
            disabled={isSyncing}
            className="flex-shrink-0 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
};
