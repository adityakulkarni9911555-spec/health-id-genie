import { QRCodeSVG } from 'qrcode.react';
import { Patient } from '@/types/patient';
import { Phone, Droplets, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { publicEmergencyUrl } from '@/lib/publicUrl';
import { usePatientPhotoUrl } from '@/lib/patientPhoto';

interface HealthCardProps {
  patient: Patient;
  showPrintButton?: boolean;
}

export const HealthCard = ({ patient }: HealthCardProps) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const shortId = patient.id.slice(0, 8).toUpperCase();
  const photoUrl = usePatientPhotoUrl(patient.photoPath);
  const initials = patient.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <article className="health-card wallet-id-card w-full max-w-md mx-auto overflow-hidden print:shadow-none" aria-label="Medora health card">
      <header className="flex items-center justify-between gap-3 border-b border-border pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <Logo size={28} />
          <div>
            <h2 className="font-display font-bold text-sm text-foreground">Medora Health ID</h2>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{shortId}</p>
          </div>
        </div>
        <span className={`flex items-center gap-1 text-xs font-medium ${patient.shareToken && !patient.shareRevoked ? 'text-success' : 'text-muted-foreground'}`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          {patient.shareToken && !patient.shareRevoked ? 'Active' : 'Inactive'}
        </span>
      </header>

      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-16 rounded-lg overflow-hidden border border-border bg-primary/10 flex items-center justify-center shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt={`${patient.fullName} photo`} className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold text-primary text-lg">{initials || 'M'}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-foreground text-xl leading-snug break-words [overflow-wrap:anywhere]">{patient.fullName}</p>
          <p className="text-xs text-muted-foreground mt-1">Born {formatDate(patient.dateOfBirth)}</p>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_116px] sm:grid-cols-[minmax(0,1fr)_140px] gap-4 items-start">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-2">
            {patient.bloodGroup && (
              <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 text-destructive px-2 py-1 text-sm font-bold">
                <Droplets className="w-3.5 h-3.5" />{patient.bloodGroup}
              </span>
            )}
            <span className="inline-flex items-center rounded-md bg-accent text-accent-foreground px-2 py-1 text-xs font-medium capitalize">{patient.gender}</span>
          </div>
          <div className="pt-1">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><Phone className="w-3.5 h-3.5 text-primary" />Emergency contact</p>
            <p className="text-base font-semibold text-foreground break-words [overflow-wrap:anywhere] tabular-nums">{patient.emergencyContact || 'Not provided'}</p>
          </div>
        </div>
        <div className="min-w-0 text-center">
          <div className="health-qr rounded-lg border border-border p-1.5 aspect-square flex items-center justify-center">
            {patient.shareToken ? (
              <QRCodeSVG value={publicEmergencyUrl(patient.shareToken)} size={128} level="M" marginSize={4} bgColor="#ffffff" fgColor="#000000" className="w-full h-full" />
            ) : (
              <p className="text-xs text-muted-foreground">QR not available</p>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">Emergency QR</p>
        </div>
      </div>

      {patient.allergies.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">Allergies</p>
            <p className="text-sm font-medium text-foreground break-words mt-1">{patient.allergies.join(', ')}</p>
          </div>
        </div>
      )}
      <footer className="mt-4 pt-3 border-t border-border flex justify-between gap-3 text-[10px] text-muted-foreground"><span>Private health wallet</span><span>Issued {formatDate(patient.createdAt)}</span></footer>
    </article>
  );
};
