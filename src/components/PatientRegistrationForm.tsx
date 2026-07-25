import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/FormInput';
import { FormSelect } from '@/components/ui/FormSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Patient, PatientFormData, BLOOD_GROUPS, CHRONIC_CONDITIONS } from '@/types/patient';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  User,
  Heart,
  AlertTriangle,
  Shield,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

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
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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
      if (!formData.emergencyContact.trim()) {
        newErrors.emergencyContact = 'Emergency contact is required';
      } else if (!/^[6-9]\d{9}$/.test(formData.emergencyContact.replace(/\D/g, ''))) {
        newErrors.emergencyContact = 'Enter a valid 10-digit Indian mobile number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);

    try {
      const allergiesArray = formData.allergies
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      const { data, error } = await supabase
        .from('patients')
        .insert({
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
          insurance_provider: formData.insuranceProvider || null,
          policy_number: formData.policyNumber || null,
          tpa_contact: formData.tpaContact || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Duplicate Phone Number',
            description: 'A patient with this phone number already exists.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        setIsSubmitting(false);
        return;
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
      toast({
        title: 'Registration Failed',
        description: 'There was an error saving the patient data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
              step === currentStep
                ? 'bg-primary text-primary-foreground scale-110'
                : step < currentStep
                ? 'bg-success text-success-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {step < currentStep ? '✓' : step}
          </div>
          {step < totalSteps && (
            <div
              className={`w-12 h-1 mx-1 rounded-full transition-colors duration-300 ${
                step < currentStep ? 'bg-success' : 'bg-muted'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Personal Information
          </h2>
          <p className="text-muted-foreground text-sm">Basic details about the patient</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
          <Heart className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Medical Information
          </h2>
          <p className="text-muted-foreground text-sm">Health-related details</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CHRONIC_CONDITIONS.map((condition) => (
            <label
              key={condition}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                selectedConditions.includes(condition)
                  ? 'border-primary bg-primary/5'
                  : 'border-input bg-card hover:border-primary/50'
              }`}
            >
              <Checkbox
                checked={selectedConditions.includes(condition)}
                onCheckedChange={() => toggleCondition(condition)}
              />
              <span className="text-sm font-medium">{condition}</span>
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
          className="min-h-[80px] text-base border-2 border-input bg-card rounded-xl focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
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
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
          <Shield className="w-6 h-6 text-accent-foreground" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Insurance Details
          </h2>
          <p className="text-muted-foreground text-sm">Optional insurance information</p>
        </div>
      </div>

      <FormInput
        label="Insurance Provider"
        placeholder="e.g., Star Health, ICICI Lombard"
        value={formData.insuranceProvider}
        onChange={(e) => updateField('insuranceProvider', e.target.value)}
      />

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

      {/* Summary */}
      <div className="mt-8 p-6 bg-muted rounded-2xl space-y-4">
        <h3 className="font-display font-semibold text-foreground">Registration Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Name</p>
            <p className="font-medium text-foreground">{formData.fullName || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p className="font-medium text-foreground">{formData.phoneNumber || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Blood Group</p>
            <p className="font-medium text-foreground">{formData.bloodGroup || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Emergency Contact</p>
            <p className="font-medium text-foreground">{formData.emergencyContact || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      {renderStepIndicator()}

      <div className="form-section">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        <div className="flex justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="btn-touch"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Back
          </Button>

          {currentStep < totalSteps ? (
            <Button onClick={handleNext} className="btn-touch">
              Next
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-touch bg-success hover:bg-success/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Heart className="w-5 h-5 mr-2" />
                  Register Patient
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
