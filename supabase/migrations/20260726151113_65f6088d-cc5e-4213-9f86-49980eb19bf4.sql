
-- 1. Patients ownership hardening
DELETE FROM public.patients WHERE owner_id IS NULL;

ALTER TABLE public.patients ALTER COLUMN owner_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_patient_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  NEW.owner_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_patient_owner_ins ON public.patients;
CREATE TRIGGER enforce_patient_owner_ins
BEFORE INSERT ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.enforce_patient_owner();

ALTER TABLE public.patients
  ADD CONSTRAINT patients_full_name_len CHECK (char_length(full_name) BETWEEN 1 AND 120),
  ADD CONSTRAINT patients_phone_len CHECK (char_length(phone_number) BETWEEN 6 AND 20),
  ADD CONSTRAINT patients_emergency_len CHECK (char_length(emergency_contact) BETWEEN 6 AND 20),
  ADD CONSTRAINT patients_insurance_len CHECK (insurance_provider IS NULL OR char_length(insurance_provider) <= 120),
  ADD CONSTRAINT patients_policy_len CHECK (policy_number IS NULL OR char_length(policy_number) <= 60),
  ADD CONSTRAINT patients_tpa_len CHECK (tpa_contact IS NULL OR char_length(tpa_contact) <= 60);

-- 2. Storage RLS on patient-documents bucket (folder = auth.uid())
DROP POLICY IF EXISTS "patient-docs owner select" ON storage.objects;
DROP POLICY IF EXISTS "patient-docs owner insert" ON storage.objects;
DROP POLICY IF EXISTS "patient-docs owner update" ON storage.objects;
DROP POLICY IF EXISTS "patient-docs owner delete" ON storage.objects;

CREATE POLICY "patient-docs owner select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'patient-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "patient-docs owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'patient-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "patient-docs owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'patient-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'patient-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "patient-docs owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'patient-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Remove unused staff/role surface
DROP TABLE IF EXISTS public.patient_edit_logs CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP FUNCTION IF EXISTS public.staff_get_patient(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.staff_update_patient_safe_fields(uuid, text[], text) CASCADE;
DROP FUNCTION IF EXISTS public.is_staff(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP TYPE IF EXISTS public.app_role;

-- 4. Phone OTP table: enable RLS, no client policies, revoke grants
ALTER TABLE public.phone_otp_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.phone_otp_codes FROM anon, authenticated;
GRANT ALL ON public.phone_otp_codes TO service_role;
