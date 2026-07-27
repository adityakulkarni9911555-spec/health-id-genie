import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { HealthCard } from '@/components/HealthCard';
import { Patient } from '@/types/patient';
import { Download, Printer, ArrowLeft, CheckCircle2, FileText, ExternalLink, Loader2 } from 'lucide-react';
import { getSignedDocumentUrl } from '@/lib/patientDocuments';
import { useToast } from '@/hooks/use-toast';

interface HealthCardPreviewProps {
  patient: Patient;
  onBack: () => void;
}

export const HealthCardPreview = ({ patient, onBack }: HealthCardPreviewProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [openingPath, setOpeningPath] = useState<string | null>(null);
  const { toast } = useToast();

  const openDocument = async (path: string) => {
    setOpeningPath(path);
    try {
      const url = await getSignedDocumentUrl(path);
      if (!url) throw new Error('No URL');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error(err);
      toast({
        title: 'Could not open file',
        description: 'The document link could not be generated. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setOpeningPath(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a simple text-based card info for now
    const cardData = `
SMART HEALTH CARD
==================
Patient ID: ${patient.id.slice(0, 8).toUpperCase()}
Name: ${patient.fullName}
DOB: ${patient.dateOfBirth}
Blood Group: ${patient.bloodGroup || 'Not specified'}
Emergency Contact: ${patient.emergencyContact}
${patient.allergies.length > 0 ? `Allergies: ${patient.allergies.join(', ')}` : ''}
==================
Generated: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([cardData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-card-${patient.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-slide-up">
      {/* Success Message */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-4">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          Your Medora wallet is ready
        </h2>
        <p className="text-muted-foreground">
          Your Medora Card is saved and stays with you on every device you sign in from.
        </p>
      </div>

      {/* Card Preview */}
      <div ref={cardRef} className="mb-8 print:shadow-none">
        <HealthCard patient={patient} />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 no-print">
        <Button
          variant="outline"
          onClick={onBack}
          className="btn-touch w-full"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Update details
        </Button>

        <Button
          variant="outline"
          onClick={handleDownload}
          className="btn-touch w-full"
        >
          <Download className="w-5 h-5 mr-2" />
          Download Card
        </Button>

        <Button
          onClick={handlePrint}
          className="btn-touch w-full"
        >
          <Printer className="w-5 h-5 mr-2" />
          Print Card
        </Button>
      </div>

      {/* Patient Details */}
      <div className="mt-8 form-section no-print">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">
          Your details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">

          <DetailItem label="Patient ID" value={patient.id.slice(0, 8).toUpperCase()} />
          <DetailItem label="Full Name" value={patient.fullName} />
          <DetailItem label="Date of Birth" value={new Date(patient.dateOfBirth).toLocaleDateString()} />
          <DetailItem label="Gender" value={patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)} />
          <DetailItem label="Phone" value={patient.phoneNumber} />
          <DetailItem label="Blood Group" value={patient.bloodGroup || 'Not specified'} />
          <DetailItem label="Height" value={patient.height ? `${patient.height} cm` : 'Not specified'} />
          <DetailItem label="Weight" value={patient.weight ? `${patient.weight} kg` : 'Not specified'} />
          <DetailItem label="Emergency Contact" value={patient.emergencyContact} />
          {patient.chronicConditions.length > 0 && (
            <DetailItem
              label="Chronic Conditions"
              value={patient.chronicConditions.join(', ')}
              className="col-span-2"
            />
          )}
          {patient.allergies.length > 0 && (
            <DetailItem
              label="Allergies"
              value={patient.allergies.join(', ')}
              className="col-span-2 md:col-span-1"
            />
          )}
          {patient.insuranceProvider && (
            <DetailItem label="Insurance Provider" value={patient.insuranceProvider} />
          )}
          {patient.policyNumber && (
            <DetailItem label="Policy Number" value={patient.policyNumber} />
          )}
        </div>

        {patient.documents && patient.documents.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="font-display text-base font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Attached Documents ({patient.documents.length})
            </h4>
            <ul className="space-y-2">
              {patient.documents.map((doc) => (
                <li
                  key={doc.path}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(doc.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openDocument(doc.path)}
                    disabled={openingPath === doc.path}
                  >
                    {openingPath === doc.path ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Open
                      </>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

    </div>
  );
};

const DetailItem = ({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) => (
  <div className={className}>
    <p className="text-sm text-muted-foreground mb-1">{label}</p>
    <p className="font-medium text-foreground">{value}</p>
  </div>
);
