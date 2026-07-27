
-- 1) Patients: add share_token + share_revoked
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS share_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS share_revoked boolean NOT NULL DEFAULT false;

UPDATE public.patients SET share_token = gen_random_uuid() WHERE share_token IS NULL;

ALTER TABLE public.patients
  ALTER COLUMN share_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS patients_share_token_key ON public.patients(share_token);

-- 2) Emergency access logs
CREATE TABLE IF NOT EXISTS public.emergency_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  user_agent text
);

GRANT SELECT ON public.emergency_access_logs TO authenticated;
GRANT ALL ON public.emergency_access_logs TO service_role;

ALTER TABLE public.emergency_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their patient's access logs"
  ON public.emergency_access_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = emergency_access_logs.patient_id
        AND p.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS emergency_access_logs_patient_idx
  ON public.emergency_access_logs(patient_id, accessed_at DESC);
