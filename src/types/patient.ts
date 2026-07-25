export interface PatientDocumentRef {
  path: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

export interface Patient {
  id: string;
  fullName: string;
  dateOfBirth: string;
  phoneNumber: string;
  gender: 'male' | 'female' | 'other';
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | '';
  height: string;
  weight: string;
  allergies: string[];
  chronicConditions: string[];
  emergencyContact: string;
  insuranceProvider?: string;
  policyNumber?: string;
  tpaContact?: string;
  documents?: PatientDocumentRef[];
  createdAt: string;
  updatedAt: string;
}

export interface PatientFormData {
  fullName: string;
  dateOfBirth: string;
  phoneNumber: string;
  gender: 'male' | 'female' | 'other' | '';
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | '';
  height: string;
  weight: string;
  allergies: string;
  chronicConditions: string;
  emergencyContact: string;
  insuranceProvider: string;
  policyNumber: string;
  tpaContact: string;
}

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export const CHRONIC_CONDITIONS = [
  'Diabetes',
  'Hypertension',
  'Asthma',
  'Heart Disease',
  'Thyroid',
  'Arthritis',
  'COPD',
  'Kidney Disease',
] as const;
