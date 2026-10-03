CREATE TABLE public.emergency_override_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinician_phone text NOT NULL,
  reason text,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.emergency_override_logs TO authenticated;
GRANT ALL ON public.emergency_override_logs TO service_role;
ALTER TABLE public.emergency_override_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view override logs" ON public.emergency_override_logs
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.owner_id = auth.uid()));
CREATE INDEX ON public.emergency_override_logs (patient_id, created_at);