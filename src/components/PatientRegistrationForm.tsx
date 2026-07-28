import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/FormInput';
import { FormSelect } from '@/components/ui/FormSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Patient, PatientFormData, BLOOD_GROUPS, CHRONIC_CONDITIONS } from '@/types/patient';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useSubscription } from '@/hooks/useSubscription';
import { enqueuePatient } from '@/lib/offlineQueue';
import { DocumentUpload } from '@/components/DocumentUpload';
import { UpgradeBanner } from '@/components/UpgradeBanner';
import {
  uploadPatientDocuments,
  persistPatientDocuments,
} from '@/lib/patientDocuments';
import { linkPatientToProfile } from '@/lib/patientProfile';
import {
  User,
  Heart,
  AlertTriangle,
  Shield,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

const patientSchema = z
  .object({
    full_name: z.string().trim().min(1).max(120),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    phone_number: z.string().regex(/^[6-9]\d{9}$/),
    gender: z.enum(['male', 'female', 'other']),
    emergency_contact: z.string().regex(/^[6-9]\d{9}$/),
    blood_group: z.string().max(3).nullable(),
    height: z.string().max(10).nullable(),
    weight: z.string().max(10).nullable(),
    allergies: z.array(z.string().max(80)).max(30),
    chronic_conditions: z.array(z.string().max(80)).max(30),
    insurance_provider: z.string().max(120).nullable(),
    policy_number: z.string().max(60).nullable(),
    tpa_contact: z.string().max(60).nullable(),
  })
  .refine((data) => data.emergency_contact !== data.phone_number, {
    message: 'Emergency contact must be different from your phone number',
    path: ['emergency_contact'],
  });

interface PatientRegistrationFormProps {
  onPatientRegistered: (patient: Patient) => void;
}

const initialFormData: PatientFormData = {
  fullName: '',
  dateOfBirth: '',
  phoneNumber: '',
  gender: '',
  bloodGroup: '',
  height: '',
  weight: '',
  allergies: '',
  chronicConditions: '',
  emergencyContact: '',
  insuranceProvider: '',
  policyNumber: '',
  tpaContact: '',
};

export const PatientRegistrationForm = ({ onPatientRegistered }: PatientRegistrationFormProps) => {
  const [formData, setFormData] = useState<PatientFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof PatientFormData, string>>>({});
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const { planSlug, isPaid, isFamily, documentLimit, loading: subLoading } = useSubscription();

  const totalSteps = 3;

  const updateField = (field: keyof PatientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const toggleCondition = (condition: string) => {
    setSelectedConditions((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition]
    );
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof PatientFormData, string>> = {};

    if (step === 1) {
      if (!formData.fullName.trim()) {
        newErrors.fullName = 'Full name is required';
      }
      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = 'Date of birth is required';
      }
      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = 'Phone number is required';
      } else if (!/^[6-9]\d{9}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
        newErrors.phoneNumber = 'Enter a valid 10-digit Indian mobile number';
      }
      if (!formData.gender) {
        newErrors.gender = 'Please select gender';
      }
    }

    if (step === 2) {
      const emergencyDigits = formData.emergencyContact.replace(/\D/g, '');
      const phoneDigits = formData.phoneNumber.replace(/\D/g, '');
      if (!formData.emergencyContact.trim()) {
        newErrors.emergencyContact = 'Emergency contact is required';
      } else if (!/^[6-9]\d{9}$/.test(emergencyDigits)) {
        newErrors.emergencyContact = 'Enter a valid 10-digit Indian mobile number';
      } else if (emergencyDigits === phoneDigits) {
        newErrors.emergencyContact = 'Emergency contact must be different from your phone number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);

    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      const ownerId = userRes.user?.id;
      if (userErr || !ownerId) {
        toast({
          title: 'Please sign in',
          description: 'Your session expired. Sign in again to save your record.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      const allergiesArray = formData.allergies
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      const rawPayload = {
        full_name: formData.fullName.trim(),
        date_of_birth: formData.dateOfBirth,
        phone_number: formData.phoneNumber.replace(/\D/g, ''),
        gender: formData.gender,
        blood_group: formData.bloodGroup || null,
        height: formData.height || null,
        weight: formData.weight || null,
        allergies: allergiesArray,
        chronic_conditions: selectedConditions,
        emergency_contact: formData.emergencyContact.replace(/\D/g, ''),
        insurance_provider: formData.insuranceProvider?.trim() || null,
        policy_number: formData.policyNumber?.trim() || null,
        tpa_contact: formData.tpaContact?.trim() || null,
      };

      const parsed = patientSchema.safeParse(rawPayload);
      if (!parsed.success) {
        toast({
          title: 'Please check your details',
          description: parsed.error.issues[0]?.message ?? 'Some fields are invalid.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      const payload = parsed.data;

      const buildLocalPatient = (localId: string, createdAt: string): Patient => ({
        id: localId,
        fullName: payload.full_name,
        dateOfBirth: payload.date_of_birth,
        phoneNumber: payload.phone_number,
        gender: payload.gender as Patient['gender'],
        bloodGroup: (payload.blood_group || '') as Patient['bloodGroup'],
        height: payload.height || '',
        weight: payload.weight || '',
        allergies: payload.allergies,
        chronicConditions: payload.chronic_conditions,
        emergencyContact: payload.emergency_contact,
        insuranceProvider: payload.insurance_provider || undefined,
        policyNumber: payload.policy_number || undefined,
        tpaContact: payload.tpa_contact || undefined,
        createdAt,
        updatedAt: createdAt,
      });

      if (!isOnline) {
        const record = enqueuePatient(rawPayload);
        toast({
          title: 'Saved on this device',
          description: 'No internet — will sync automatically when you reconnect.',
        });
        onPatientRegistered(buildLocalPatient(record.localId, record.createdAt));
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase
        .from('patients')
        .insert({ ...rawPayload, owner_id: ownerId })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Duplicate Phone Number',
            description: 'A patient with this phone number already exists.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
        const record = enqueuePatient(rawPayload);
        toast({
          title: 'Saved locally',
          description: 'Cloud unreachable. Record queued and will sync automatically.',
        });
        onPatientRegistered(buildLocalPatient(record.localId, record.createdAt));
        setIsSubmitting(false);
        return;
      }

      await linkPatientToProfile(data.id);

      let uploadedDocs: Patient['documents'] = [];
      if (pendingFiles.length > 0) {
        setUploadStatus(`Uploading ${pendingFiles.length} file(s)…`);
        try {
          uploadedDocs = await uploadPatientDocuments(data.id, pendingFiles);
          await persistPatientDocuments(data.id, uploadedDocs);
        } catch {
          toast({
            title: 'Files not uploaded',
            description:
              'Patient was registered but the attached files failed to upload. You can retry from the record.',
            variant: 'destructive',
          });
          uploadedDocs = [];
        } finally {
          setUploadStatus(null);
        }
      }

      const patient: Patient = {
        id: data.id,
        fullName: data.full_name,
        dateOfBirth: data.date_of_birth,
        phoneNumber: data.phone_number,
        gender: data.gender as Patient['gender'],
        bloodGroup: (data.blood_group || '') as Patient['bloodGroup'],
        height: data.height || '',
        weight: data.weight || '',
        allergies: data.allergies || [],
        chronicConditions: data.chronic_conditions || [],
        emergencyContact: data.emergency_contact,
        insuranceProvider: data.insurance_provider || undefined,
        policyNumber: data.policy_number || undefined,
        tpaContact: data.tpa_contact || undefined,
        documents: uploadedDocs,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      toast({
        title: 'Patient Registered Successfully!',
        description: `Health Card ID: ${patient.id.slice(0, 8).toUpperCase()}`,
      });

      onPatientRegistered(patient);
    } catch (error) {
      console.error('Error registering patient:', error);
      const record = enqueuePatient({
        full_name: formData.fullName.trim(),
        date_of_birth: formData.dateOfBirth,
        phone_number: formData.phoneNumber.replace(/\D/g, ''),
        gender: formData.gender,
        blood_group: formData.bloodGroup || null,
        height: formData.height || null,
        weight: formData.weight || null,
        allergies: formData.allergies.split(',').map((a) => a.trim()).filter(Boolean),
        chronic_conditions: selectedConditions,
        emergency_contact: formData.emergencyContact.replace(/\D/g, ''),
        insurance_provider: formData.insuranceProvider || null,
        policy_number: formData.policyNumber || null,
        tpa_contact: formData.tpaContact || null,
      });
      toast({
        title: 'Saved locally',
        description: 'Something went wrong reaching the cloud. The record is queued for sync.',
      });
      onPatientRegistered({
        id: record.localId,
        fullName: formData.fullName.trim(),
        dateOfBirth: formData.dateOfBirth,
        phoneNumber: formData.phoneNumber.replace(/\D/g, ''),
        gender: formData.gender as Patient['gender'],
        bloodGroup: (formData.bloodGroup || '') as Patient['bloodGroup'],
        height: formData.height || '',
        weight: formData.weight || '',
        allergies: formData.allergies.split(',').map((a) => a.trim()).filter(Boolean),
        chronicConditions: selectedConditions,
        emergencyContact: formData.emergencyContact.replace(/\D/g, ''),
        insuranceProvider: formData.insuranceProvider || undefined,
        policyNumber: formData.policyNumber || undefined,
        tpaContact: formData.tpaContact || undefined,
        createdAt: record.createdAt,
        updatedAt: record.createdAt,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8 md:mb-10">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
              step === currentStep
                ? 'bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/25'
                : step < currentStep
                ? 'bg-success text-success-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {step < currentStep ? '✓' : step}
          </div>
          {step < totalSteps && (
            <div
              className={`w-8 sm:w-12 md:w-16 h-1 mx-1 sm:mx-2 rounded-full transition-colors duration-300 ${
                step < currentStep ? 'bg-success' : 'bg-muted'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6 md:space-y-7 animate-slide-up">
      <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="w-6 h-6 md:w-7 md:h-7 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground tracking-tight">
            A bit about you
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">Let's start with the basics</p>
        </div>
      </div>

      <FormInput
        label="Full Name"
        placeholder="Enter patient's full name"
        value={formData.fullName}
        onChange={(e) => updateField('fullName', e.target.value)}
        error={errors.fullName}
        required
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
        <FormInput
          label="Date of Birth"
          type="date"
          value={formData.dateOfBirth}
          onChange={(e) => updateField('dateOfBirth', e.target.value)}
          error={errors.dateOfBirth}
          required
          max={new Date().toISOString().split('T')[0]}
        />

        <FormSelect
          label="Gender"
          placeholder="Select gender"
          value={formData.gender}
          onValueChange={(value) => updateField('gender', value)}
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
          ]}
          error={errors.gender}
          required
        />
      </div>

      <FormInput
        label="Phone Number"
        placeholder="10-digit mobile number"
        value={formData.phoneNumber}
        onChange={(e) => updateField('phoneNumber', e.target.value)}
        error={errors.phoneNumber}
        required
        type="tel"
        maxLength={10}
      />
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 md:space-y-7 animate-slide-up">
      <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
          <Heart className="w-6 h-6 md:w-7 md:h-7 text-destructive" />
        </div>
        <div>
          <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground tracking-tight">
            Your medical info
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">The stuff a doctor would want to know</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
        <FormSelect
          label="Blood Group"
          placeholder="Select"
          value={formData.bloodGroup}
          onValueChange={(value) => updateField('bloodGroup', value)}
          options={BLOOD_GROUPS}
        />

        <FormInput
          label="Height (cm)"
          placeholder="e.g., 170"
          value={formData.height}
          onChange={(e) => updateField('height', e.target.value)}
          type="number"
        />

        <FormInput
          label="Weight (kg)"
          placeholder="e.g., 65"
          value={formData.weight}
          onChange={(e) => updateField('weight', e.target.value)}
          type="number"
        />
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Chronic Conditions
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {CHRONIC_CONDITIONS.map((condition) => (
            <label
              key={condition}
              className={`flex items-center gap-3 min-h-[56px] px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none ${
                selectedConditions.includes(condition)
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-input bg-card hover:border-primary/50'
              }`}
            >
              <Checkbox
                checked={selectedConditions.includes(condition)}
                onCheckedChange={() => toggleCondition(condition)}
                className="h-5 w-5"
              />
              <span className="text-sm md:text-base font-medium">{condition}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">
          Known Allergies
        </Label>
        <Textarea
          placeholder="Enter allergies separated by commas (e.g., Penicillin, Peanuts)"
          value={formData.allergies}
          onChange={(e) => updateField('allergies', e.target.value)}
          className="min-h-[96px] text-base p-4 border-2 border-input bg-card rounded-xl focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </div>

      <FormInput
        label="Emergency Contact"
        placeholder="10-digit mobile number"
        value={formData.emergencyContact}
        onChange={(e) => updateField('emergencyContact', e.target.value)}
        error={errors.emergencyContact}
        required
        type="tel"
        maxLength={10}
      />
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 md:space-y-7 animate-slide-up">
      <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
          <Shield className="w-6 h-6 md:w-7 md:h-7 text-accent-foreground" />
        </div>
        <div>
          <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground tracking-tight">
            Insurance & documents
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">Optional — helpful in a pinch</p>
        </div>
      </div>

      <FormInput
        label="Insurance Provider"
        placeholder="e.g., Star Health, ICICI Lombard"
        value={formData.insuranceProvider}
        onChange={(e) => updateField('insuranceProvider', e.target.value)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
        <FormInput
          label="Policy Number"
          placeholder="Enter policy number"
          value={formData.policyNumber}
          onChange={(e) => updateField('policyNumber', e.target.value)}
        />

        <FormInput
          label="TPA Contact"
          placeholder="Third Party Administrator contact"
          value={formData.tpaContact}
          onChange={(e) => updateField('tpaContact', e.target.value)}
        />
      </div>

      <DocumentUpload
        documents={[]}
        onChange={() => {}}
        pendingFiles={pendingFiles}
        onPendingChange={setPendingFiles}
      />

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground/80 flex gap-3">
        <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <p>
          Your documents are private. They are stored encrypted and are only accessible
          from your own signed-in account — not even the app team can view them.
        </p>
      </div>

      {/* Summary */}
      <div className="mt-8 p-5 md:p-6 bg-muted/60 border border-border rounded-2xl space-y-4">
        <h3 className="font-display font-semibold text-foreground text-base md:text-lg">
          Registration Summary
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 text-sm">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Name</p>
            <p className="font-medium text-foreground mt-1">{formData.fullName || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Phone</p>
            <p className="font-medium text-foreground mt-1">{formData.phoneNumber || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Blood Group</p>
            <p className="font-medium text-foreground mt-1">{formData.bloodGroup || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Emergency</p>
            <p className="font-medium text-foreground mt-1">{formData.emergencyContact || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-3xl mx-auto">
      {renderStepIndicator()}

      <div className="form-section p-5 sm:p-7 md:p-9">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 sm:gap-4 mt-8 md:mt-10 pt-6 md:pt-7 border-t border-border">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="btn-touch w-full sm:w-auto"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Back
          </Button>

          {currentStep < totalSteps ? (
            <Button onClick={handleNext} className="btn-touch w-full sm:w-auto">
              Next
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-touch w-full sm:w-auto bg-success hover:bg-success/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {uploadStatus
                    ? uploadStatus
                    : isOnline
                    ? 'Saving to cloud…'
                    : 'Saving on device…'}
                </>
              ) : (
                <>
                  <Heart className="w-5 h-5 mr-2" />
                  {isOnline ? 'Register Patient' : 'Save Offline'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
