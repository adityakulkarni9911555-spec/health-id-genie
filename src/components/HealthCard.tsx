import { QRCodeSVG } from 'qrcode.react';
import { Patient } from '@/types/patient';
import { Phone, Droplets, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { publicEmergencyUrl, publicOrigin } from '@/lib/publicUrl';

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

  return (
    <div className="health-card relative w-full max-w-md mx-auto overflow-hidden animate-scale-in print:shadow-none">
      {/* Decorative gradient orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-40 blur-3xl print:hidden"
        style={{ background: 'var(--gradient-primary)' }}
      />

      {/* Header */}
      <div
        className="relative -mx-6 -mt-6 mb-6 px-6 py-5 text-primary-foreground"
        style={{ background: 'var(--gradient-primary)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
              <Logo size={26} />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg leading-tight tracking-tight">
                Medora Card
              </h3>
              <p className="text-primary-foreground/80 text-xs uppercase tracking-[0.15em] mt-0.5">
                Digital Health ID
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/15 text-[10px] uppercase tracking-wider font-semibold">
            <ShieldCheck className="w-3 h-3" />
            <span>Verified</span>
          </div>
        </div>
      </div>

      {/* Patient Info & QR */}
      <div className="relative flex gap-6">
        {/* Details */}
        <div className="flex-1 space-y-4 min-w-0">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-1">
              Patient
            </p>
            <p className="font-display font-bold text-foreground text-xl leading-tight tracking-tight truncate">
              {patient.fullName}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              DOB · {formatDate(patient.dateOfBirth)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {patient.bloodGroup && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold">
                <Droplets className="w-3.5 h-3.5" />
                {patient.bloodGroup}
              </div>
            )}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent text-accent-foreground text-xs font-semibold capitalize">
              {patient.gender}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
                Emergency
              </p>
              <p className="font-medium text-foreground text-sm truncate">
                {patient.emergencyContact}
              </p>
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex-shrink-0 flex flex-col items-center w-[180px]">
          <div className="relative p-3 rounded-2xl bg-white border border-border shadow-sm">
            <div
              aria-hidden
              className="absolute inset-0 rounded-2xl opacity-60 -z-10 blur-md print:hidden"
              style={{ background: 'var(--gradient-primary)' }}
            />
            <QRCodeSVG
              value={
                patient.shareToken
                  ? publicEmergencyUrl(patient.shareToken)
                  : patient.id
              }

              size={160}
              level="M"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2 font-mono tracking-widest">
            {shortId}
          </p>
          {patient.shareToken && (
            <p className="text-[9px] text-muted-foreground/80 text-center mt-0.5 font-mono">
              /e/{patient.shareToken.slice(0, 8)}
            </p>
          )}
        </div>

      </div>

      {/* Allergies Warning */}
      {patient.allergies.length > 0 && (
        <div className="relative mt-5 pt-4 border-t border-border">
          <div className="flex items-start gap-2 bg-warning/10 border border-warning/25 rounded-xl px-3.5 py-3">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-warning font-bold">
                Allergies
              </p>
              <p className="text-sm text-foreground font-medium mt-0.5">
                {patient.allergies.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="relative mt-5 pt-4 border-t border-border flex justify-between items-center">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
          Issued · {formatDate(patient.createdAt)}
        </p>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
          <span className="text-[10px] uppercase tracking-[0.15em] text-success font-bold">
            Active
          </span>
        </div>
      </div>
    </div>
  );
};
