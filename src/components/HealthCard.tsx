import { QRCodeSVG } from 'qrcode.react';
import { Patient } from '@/types/patient';
import { Heart, Phone, Droplets, User } from 'lucide-react';

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

  return (
    <div className="health-card w-full max-w-md mx-auto overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg">Smart Health Card</h3>
            <p className="text-primary-foreground/80 text-sm">Digital Health ID</p>
          </div>
        </div>
      </div>

      {/* Patient Info & QR */}
      <div className="flex gap-6">
        {/* QR Code */}
        <div className="flex-shrink-0">
          <div className="bg-card p-3 rounded-xl border-2 border-health-border">
            <QRCodeSVG
              value={patient.id}
              size={100}
              level="H"
              includeMargin={false}
              bgColor="transparent"
              fgColor="hsl(200, 25%, 15%)"
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2 font-mono">
            {patient.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Details */}
        <div className="flex-1 space-y-3">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-display font-semibold text-foreground text-lg leading-tight">
                {patient.fullName}
              </p>
              <p className="text-sm text-muted-foreground">
                DOB: {formatDate(patient.dateOfBirth)}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            {patient.bloodGroup && (
              <div className="flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-destructive" />
                <span className="font-semibold text-foreground">{patient.bloodGroup}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Emergency:</span>
            <span className="font-medium text-foreground">{patient.emergencyContact}</span>
          </div>
        </div>
      </div>

      {/* Allergies Warning */}
      {patient.allergies.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <div className="bg-warning/10 border border-warning/20 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-warning">
              ⚠️ Allergies: {patient.allergies.join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          Issued: {formatDate(patient.createdAt)}
        </p>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse-soft" />
          <span className="text-xs text-success font-medium">Active</span>
        </div>
      </div>
    </div>
  );
};
