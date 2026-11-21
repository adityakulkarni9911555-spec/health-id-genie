import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Droplets, Phone, AlertTriangle, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { publicEmergencyUrl } from '@/lib/publicUrl';
import type { Patient } from '@/types/patient';

export function PresentQrDialog({ patient, open, onOpenChange }: { patient: Patient; open: boolean; onOpenChange: (v: boolean) => void }) {
  // On Android, the hardware back button should close this screen instead of
  // leaving the app or doing nothing.
  useEffect(() => {
    if (!open || !Capacitor.isNativePlatform()) return;
    const handle = App.addListener('backButton', () => onOpenChange(false));
    return () => { handle.then(h => h.remove()); };
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-[100dvh] sm:h-auto sm:max-w-md sm:rounded-2xl rounded-none border-0 p-6 flex flex-col items-center justify-center gap-5 [&>button]:hidden">
        {/* Wrapped in a div: DialogContent hides its direct-child buttons (the built-in close), so the wrapper keeps this one visible. */}
        <div className="absolute right-4 z-10" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="h-12 w-12 rounded-full shadow-sm"
          >
            <X className="!h-6 !w-6" />
          </Button>
        </div>
        <div className="text-center">
          <DialogTitle className="font-display text-2xl font-bold">{patient.fullName}</DialogTitle>
          <DialogDescription className="mt-1">Scan for emergency information</DialogDescription>
        </div>
        <div className="health-qr rounded-2xl border border-border p-3 w-full max-w-[320px] aspect-square">
          {patient.shareToken && !patient.shareRevoked ? (
            <QRCodeSVG value={publicEmergencyUrl(patient.shareToken)} size={320} level="M" marginSize={4} bgColor="#ffffff" fgColor="#000000" className="w-full h-full" />
          ) : (
            <p className="h-full flex items-center justify-center text-center text-sm text-muted-foreground">Emergency QR is off. Turn it on in Manage.</p>
          )}
        </div>
        <div className="w-full max-w-[320px] space-y-3">
          {patient.bloodGroup && (
            <p className="flex items-center justify-between rounded-xl bg-destructive/10 px-4 py-3 text-destructive">
              <span className="flex items-center gap-2 text-sm font-medium"><Droplets className="h-4 w-4" />Blood group</span>
              <span className="text-xl font-bold">{patient.bloodGroup}</span>
            </p>
          )}
          {patient.allergies.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-warning/10 px-4 py-3 text-sm text-foreground">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-warning shrink-0" />
              <span><span className="font-semibold">Allergies: </span>{patient.allergies.join(', ')}</span>
            </p>
          )}
          {patient.emergencyContact && (
            <Button asChild variant="outline" className="w-full min-h-14 gap-2 text-base">
              <a href={`tel:${patient.emergencyContact}`}><Phone className="h-5 w-5" />Call {patient.emergencyContact}</a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
