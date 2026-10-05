CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  actor_user_id uuid,
  actor_role text NOT NULL DEFAULT 'anonymous',
  action text NOT NULL,
  resource_type text,
  resource_id text,
  access_method text,
  reason text,
  ip_hash text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view their patient audit events" ON public.audit_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = audit_events.patient_id AND p.owner_id = auth.uid()));
CREATE INDEX audit_events_patient_created_idx ON public.audit_events (patient_id, created_at DESC);

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS qr_rotated_at timestamptz;

CREATE TABLE public.qr_rotation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  old_token_hash text NOT NULL,
  rotated_by uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.qr_rotation_logs TO authenticated;
GRANT ALL ON public.qr_rotation_logs TO service_role;
ALTER TABLE public.qr_rotation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view their QR rotations" ON public.qr_rotation_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = qr_rotation_logs.patient_id AND p.owner_id = auth.uid()));
CREATE INDEX qr_rotation_logs_patient_idx ON public.qr_rotation_logs (patient_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.rotate_share_token(_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _old uuid;
  _new uuid := gen_random_uuid();
  _now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  SELECT share_token INTO _old FROM public.patients
    WHERE id = _patient_id AND owner_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  UPDATE public.patients
    SET share_token = _new, share_revoked = false, qr_rotated_at = _now
    WHERE id = _patient_id;
  INSERT INTO public.qr_rotation_logs (patient_id, old_token_hash, rotated_by)
    VALUES (_patient_id, encode(digest(_old::text, 'sha256'), 'hex'), auth.uid());
  INSERT INTO public.audit_events (patient_id, actor_user_id, actor_role, action, resource_type, access_method)
    VALUES (_patient_id, auth.uid(), 'owner', 'QR_ROTATED', 'share_token', 'owner_session');
  RETURN jsonb_build_object('share_token', _new, 'qr_rotated_at', _now);
END;
$$;
REVOKE ALL ON FUNCTION public.rotate_share_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotate_share_token(uuid) TO authenticated;

CREATE TABLE public.clinician_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  registration_number text,
  organization_name text,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','pending','verified','suspended')),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.clinician_profiles TO authenticated;
GRANT ALL ON public.clinician_profiles TO service_role;
ALTER TABLE public.clinician_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinicians view own profile" ON public.clinician_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clinicians create own unverified profile" ON public.clinician_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND verification_status = 'unverified' AND verified_at IS NULL);
CREATE POLICY "Admins update clinician profiles" ON public.clinician_profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.emergency_override_logs ADD COLUMN IF NOT EXISTS granted boolean NOT NULL DEFAULT true;
ALTER TABLE public.emergency_override_logs ADD COLUMN IF NOT EXISTS verification text NOT NULL DEFAULT 'unverified_phone';