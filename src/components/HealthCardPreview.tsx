import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HealthCard } from '@/components/HealthCard';
import { FamilyManager } from '@/components/FamilyManager';
import { UpgradeBanner } from '@/components/UpgradeBanner';
import { Patient } from '@/types/patient';
import { useSubscription } from '@/hooks/useSubscription';
import {
  Download,
  Printer,
  ArrowLeft,
  CheckCircle2,
  FileText,
  ExternalLink,
  Loader2,
  ShieldOff,
  RefreshCw,
  ShieldCheck,
  Copy,
  Crown,
  Users,
  Sparkles,
  AlertCircle,
  Pill,
  Stethoscope,
  Calendar,
  ClipboardList,
} from 'lucide-react';
import { getSignedDocumentUrl, analyzePatientDocument } from '@/lib/patientDocuments';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HealthCardPreviewProps {
  patient: Patient;
  onBack: () => void;
}

export const HealthCardPreview = ({ patient: initialPatient, onBack }: HealthCardPreviewProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [patient, setPatient] = useState<Patient>(initialPatient);
  const [openingPath, setOpeningPath] = useState<string | null>(null);
  const [analyzingPaths, setAnalyzingPaths] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<'revoke' | 'restore' | 'rotate' | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { planSlug, isPaid, isFamily, familyGroupId, documentLimit, loading: subLoading } = useSubscription();

  const shareUrl = patient.shareToken
    ? `${window.location.origin}/e/${patient.shareToken}`
    : null;

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Emergency link copied' });
    } catch {
      toast({ title: 'Could not copy link', variant: 'destructive' });
    }
  };

  const setRevoked = async (revoked: boolean) => {
    setBusy(revoked ? 'revoke' : 'restore');
    const { error } = await supabase
      .from('patients')
      .update({ share_revoked: revoked })
      .eq('id', patient.id);
    setBusy(null);
    if (error) {
      toast({ title: 'Could not update link', description: error.message, variant: 'destructive' });
      return;
    }
    setPatient({ ...patient, shareRevoked: revoked });
    toast({
      title: revoked ? 'Emergency link revoked' : 'Emergency link restored',
      description: revoked
        ? 'Old QR codes will no longer show your info.'
        : 'Old QR codes work again.',
    });
  };

  const rotateToken = async () => {
    if (!confirm('Generate a new emergency link? Any previously printed QR codes will stop working.')) return;
    setBusy('rotate');
    const newToken = crypto.randomUUID();
    const { data, error } = await supabase
      .from('patients')
      .update({ share_token: newToken, share_revoked: false })
      .eq('id', patient.id)
      .select('share_token, share_revoked')
      .maybeSingle();
    setBusy(null);
    if (error || !data) {
      toast({ title: 'Could not rotate link', description: error?.message, variant: 'destructive' });
      return;
    }
    setPatient({ ...patient, shareToken: data.share_token, shareRevoked: !!data.share_revoked });
    toast({
      title: 'New emergency link generated',
      description: 'Print a fresh QR to share it.',
    });
  };


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

  const handleAnalyze = async (path: string) => {
    setAnalyzingPaths((prev) => new Set(prev).add(path));
    try {
      const updatedDoc = await analyzePatientDocument(patient.id, path);
      setPatient((prev) => ({
        ...prev,
        documents: prev.documents.map((d) => (d.path === path ? updatedDoc : d)),
      }));
      toast({
        title: 'Analysis complete',
        description: 'AI has extracted key details from this document.',
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Analysis failed',
        description: err instanceof Error ? err.message : 'Could not analyze this document.',
        variant: 'destructive',
      });
      // Mark as failed locally so the user can retry.
      setPatient((prev) => ({
        ...prev,
        documents: prev.documents.map((d) =>
          d.path === path ? { ...d, status: 'failed' as const } : d
        ),
      }));
    } finally {
      setAnalyzingPaths((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
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
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          Your Medora wallet is ready
        </h1>

        <p className="text-muted-foreground">
          Your Medora Card is saved and stays with you on every device you sign in from.
        </p>
      </div>

      {!subLoading && !isPaid && (
        <div className="mb-6 no-print">
          <UpgradeBanner variant="compact" reason="documents" remaining={Math.max(0, documentLimit - patient.documents.length)} />
        </div>
      )}

      {/* Card Preview */}
      <div ref={cardRef} className="mb-8 print:shadow-none">
        <HealthCard patient={patient} />
      </div>

      {/* Plan chip hidden until paid plans launch */}


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

      {/* Family management */}
      {!subLoading && isFamily && familyGroupId && (
        <div className="mt-6 no-print">
          <FamilyManager groupId={familyGroupId} />
        </div>
      )}

      {!subLoading && !isFamily && (
        <div className="mt-6 no-print">
          <UpgradeBanner variant="card" reason="family" />
        </div>
      )}

      {/* Emergency link controls */}
      {shareUrl && (
        <div className="mt-6 form-section no-print">
          <div className="flex items-start gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${patient.shareRevoked ? 'bg-destructive/10' : 'bg-success/10'}`}>
              {patient.shareRevoked ? (
                <ShieldOff className="w-5 h-5 text-destructive" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-success" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base font-semibold text-foreground">
                Emergency QR link
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {patient.shareRevoked
                  ? 'Revoked. Old QR codes no longer show your info.'
                  : 'Live link — whoever scans your QR always sees your latest documents.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 mb-3">
            <p className="text-xs font-mono truncate flex-1 text-muted-foreground">
              {shareUrl}
            </p>
            <Button size="sm" variant="ghost" onClick={copyShareUrl} className="shrink-0">
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {patient.shareRevoked ? (
              <Button
                variant="outline"
                onClick={() => setRevoked(false)}
                disabled={busy !== null}
                className="btn-touch w-full"
              >
                {busy === 'restore' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                Restore link
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setRevoked(true)}
                disabled={busy !== null}
                className="btn-touch w-full"
              >
                {busy === 'revoke' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldOff className="w-4 h-4 mr-2" />}
                Revoke access
              </Button>
            )}
            <Button
              variant="outline"
              onClick={rotateToken}
              disabled={busy !== null}
              className="btn-touch w-full"
            >
              {busy === 'rotate' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Rotate & reprint
            </Button>
          </div>
        </div>
      )}

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
            <ul className="space-y-3">
              {patient.documents.map((doc) => {
                const isAnalyzing = analyzingPaths.has(doc.path);
                const status = doc.status ?? 'pending';
                return (
                  <li
                    key={doc.path}
                    className="p-3 rounded-xl border border-border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(doc.size / 1024).toFixed(1)} KB
                          {status === 'processed' && (
                            <span className="inline-flex items-center gap-1 ml-2 text-success">
                              <CheckCircle2 className="w-3 h-3" /> Analyzed
                            </span>
                          )}
                          {status === 'failed' && (
                            <span className="inline-flex items-center gap-1 ml-2 text-destructive">
                              <AlertCircle className="w-3 h-3" /> Analysis failed
                            </span>
                          )}
                          {(status === 'processing' || isAnalyzing) && (
                            <span className="inline-flex items-center gap-1 ml-2 text-primary">
                              <Loader2 className="w-3 h-3 animate-spin" /> Analyzing…
                            </span>
                          )}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAnalyze(doc.path)}
                        disabled={isAnalyzing || status === 'processing' || status === 'processed'}
                        aria-label={status === 'processed' ? `${doc.name} already analyzed` : `Analyze ${doc.name} with AI`}
                        title={status === 'processed' ? 'Already analyzed' : 'Analyze with AI'}
                      >
                        {isAnalyzing || status === 'processing' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className={`w-4 h-4 ${status === 'processed' ? 'text-success' : 'text-primary'}`} />
                        )}
                      </Button>
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
                    </div>

                    {doc.extractedData && (
                      <div className="mt-3 pt-3 border-t border-dashed border-border">
                        <ExtractionSummary data={doc.extractedData} />
                      </div>
                    )}
                  </li>
                );
              })}
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

function ExtractionSummary({ data }: { data: Record<string, unknown> }) {
  const diagnoses = Array.isArray(data.diagnoses) ? data.diagnoses.filter(Boolean) as string[] : [];
  const medications = Array.isArray(data.medications)
    ? (data.medications as Record<string, string>[]).filter((m) => m.name)
    : [];
  const allergies = Array.isArray(data.allergies) ? data.allergies.filter(Boolean) as string[] : [];
  const summary = typeof data.summary === 'string' ? data.summary : null;

  return (
    <div className="space-y-2 text-sm">
      {summary && (
        <p className="text-foreground/90 leading-relaxed">
          <span className="font-semibold text-foreground">Summary:</span> {summary}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {diagnoses.length > 0 && (
          <div className="inline-flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
            <Stethoscope className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Diagnoses: {diagnoses.join(', ')}</span>
          </div>
        )}
        {medications.length > 0 && (
          <div className="inline-flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium">
            <Pill className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Medications:{' '}
              {medications.map((m) => `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`).join(', ')}
            </span>
          </div>
        )}
        {allergies.length > 0 && (
          <div className="inline-flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-warning/10 text-warning text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Allergies: {allergies.join(', ')}</span>
          </div>
        )}
        {typeof data.provider_name === 'string' && data.provider_name && (
          <div className="inline-flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
            <ClipboardList className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Provider: {data.provider_name}</span>
          </div>
        )}
        {typeof data.document_date === 'string' && data.document_date && (
          <div className="inline-flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Date: {data.document_date}</span>
          </div>
        )}
      </div>
    </div>
  );
}
