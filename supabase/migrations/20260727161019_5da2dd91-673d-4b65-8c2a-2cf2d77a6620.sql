ALTER TABLE public.patients
  ADD CONSTRAINT patients_emergency_contact_differs_from_phone
  CHECK (emergency_contact <> phone_number);