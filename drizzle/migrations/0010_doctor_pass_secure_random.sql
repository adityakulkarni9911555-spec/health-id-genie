CREATE OR REPLACE FUNCTION public.create_doctor_pass(_patient_id uuid, _minutes integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _code text; _exp timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM patients WHERE id = _patient_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF _minutes NOT IN (15, 60) THEN RAISE EXCEPTION 'invalid duration'; END IF;
  UPDATE doctor_passes SET revoked_at = now() WHERE patient_id = _patient_id AND revoked_at IS NULL AND expires_at > now();
  _code := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
  _exp := now() + make_interval(mins => _minutes);
  INSERT INTO doctor_passes(patient_id, code_hash, expires_at, created_by)
  VALUES (_patient_id, extensions.crypt(_code, extensions.gen_salt('bf')), _exp, auth.uid());
  INSERT INTO audit_events(patient_id, actor_user_id, actor_role, action, access_method, metadata)
  VALUES (_patient_id, auth.uid(), 'patient', 'DOCTOR_PASS_CREATED', 'doctor_pass', jsonb_build_object('minutes', _minutes));
  RETURN jsonb_build_object('code', _code, 'expires_at', _exp);
END $$;
REVOKE ALL ON FUNCTION public.create_doctor_pass(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_doctor_pass(uuid, integer) TO authenticated;