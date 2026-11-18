CREATE TABLE public.healthcare_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  facility_type text NOT NULL CHECK (facility_type IN ('hospital','clinic')),
  ownership text NOT NULL CHECK (ownership IN ('government','private')),
  city text,
  state text NOT NULL DEFAULT 'Haryana',
  registration_id text,
  verified boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX healthcare_facilities_name_idx ON public.healthcare_facilities (lower(name));
GRANT ALL ON public.healthcare_facilities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.healthcare_facilities TO authenticated;
ALTER TABLE public.healthcare_facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage facilities" ON public.healthcare_facilities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.emergency_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  requester_phone text NOT NULL,
  requester_kind text NOT NULL CHECK (requester_kind IN ('hospital','clinic')),
  facility_name text NOT NULL,
  facility_id uuid REFERENCES public.healthcare_facilities(id) ON DELETE SET NULL,
  facility_verified boolean NOT NULL DEFAULT false,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  poll_secret_hash text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '3 minutes',
  decided_at timestamptz,
  decided_by uuid,
  access_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX emergency_access_requests_patient_idx ON public.emergency_access_requests (patient_id, created_at DESC);
GRANT SELECT ON public.emergency_access_requests TO authenticated;
GRANT ALL ON public.emergency_access_requests TO service_role;
ALTER TABLE public.emergency_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners see their access requests" ON public.emergency_access_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.owner_id = auth.uid()));
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_access_requests;

CREATE OR REPLACE FUNCTION public.decide_emergency_request(_request_id uuid, _approve boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.emergency_access_requests;
BEGIN
  SELECT er.* INTO r FROM public.emergency_access_requests er
    JOIN public.patients p ON p.id = er.patient_id
   WHERE er.id = _request_id AND p.owner_id = auth.uid() FOR UPDATE OF er;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF r.status <> 'pending' THEN RETURN jsonb_build_object('ok', false, 'reason', r.status); END IF;
  IF r.expires_at < now() THEN
    UPDATE public.emergency_access_requests SET status = 'expired' WHERE id = r.id;
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;
  UPDATE public.emergency_access_requests
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
         decided_at = now(), decided_by = auth.uid(),
         access_until = CASE WHEN _approve THEN now() + interval '15 minutes' END
   WHERE id = r.id;
  INSERT INTO public.audit_events (patient_id, actor_user_id, actor_role, action, resource_type, resource_id, access_method, metadata)
  VALUES (r.patient_id, auth.uid(), 'patient',
          CASE WHEN _approve THEN 'EMERGENCY_REQUEST_APPROVED' ELSE 'EMERGENCY_REQUEST_REJECTED' END,
          'emergency_access_request', r.id::text, 'patient_approval',
          jsonb_build_object('facility', r.facility_name, 'facility_verified', r.facility_verified));
  RETURN jsonb_build_object('ok', true, 'status', CASE WHEN _approve THEN 'approved' ELSE 'rejected' END);
END $$;
REVOKE EXECUTE ON FUNCTION public.decide_emergency_request(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_emergency_request(uuid, boolean) TO authenticated;