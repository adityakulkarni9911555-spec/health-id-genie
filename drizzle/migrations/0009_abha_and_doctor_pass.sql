ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS abha_number text, ADD COLUMN IF NOT EXISTS abha_address text;

CREATE OR REPLACE FUNCTION public.validate_patient_abha()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.abha_number IS NOT NULL AND NEW.abha_number <> '' THEN
    NEW.abha_number := regexp_replace(NEW.abha_number, '[^0-9]', '', 'g');
    IF length(NEW.abha_number) <> 14 THEN
      RAISE EXCEPTION 'ABHA number must have 14 digits';
    END IF;
  ELSE
    NEW.abha_number := NULL;
  END IF;
  IF NEW.abha_address IS NOT NULL AND btrim(NEW.abha_address) <> '' THEN
    NEW.abha_address := lower(btrim(NEW.abha_address));
    IF NEW.abha_address !~ '^[a-z0-9._]{3,32}@(abdm|sbx)$' THEN
      RAISE EXCEPTION 'ABHA address must look like name@abdm';
    END IF;
  ELSE
    NEW.abha_address := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_patient_abha ON public.patients;
CREATE TRIGGER trg_validate_patient_abha BEFORE INSERT OR UPDATE OF abha_number, abha_address ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.validate_patient_abha();

CREATE TABLE public.doctor_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  revoked_at timestamptz,
  used_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.doctor_passes TO service_role;
ALTER TABLE public.doctor_passes ENABLE ROW LEVEL SECURITY;
CREATE INDEX doctor_passes_patient_idx ON public.doctor_passes(patient_id, expires_at);

CREATE OR REPLACE FUNCTION public.create_doctor_pass(_patient_id uuid, _minutes integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _code text; _exp timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM patients WHERE id = _patient_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF _minutes NOT IN (15, 60) THEN RAISE EXCEPTION 'invalid duration'; END IF;
  UPDATE doctor_passes SET revoked_at = now() WHERE patient_id = _patient_id AND revoked_at IS NULL AND expires_at > now();
  _code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  _exp := now() + make_interval(mins => _minutes);
  INSERT INTO doctor_passes(patient_id, code_hash, expires_at, created_by)
  VALUES (_patient_id, extensions.crypt(_code, extensions.gen_salt('bf')), _exp, auth.uid());
  INSERT INTO audit_events(patient_id, actor_user_id, actor_role, action, access_method, metadata)
  VALUES (_patient_id, auth.uid(), 'patient', 'DOCTOR_PASS_CREATED', 'doctor_pass', jsonb_build_object('minutes', _minutes));
  RETURN jsonb_build_object('code', _code, 'expires_at', _exp);
END $$;

CREATE OR REPLACE FUNCTION public.doctor_pass_status(_patient_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _exp timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM patients WHERE id = _patient_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  SELECT max(expires_at) INTO _exp FROM doctor_passes
   WHERE patient_id = _patient_id AND revoked_at IS NULL AND expires_at > now() AND failed_attempts < 5;
  RETURN jsonb_build_object('active', _exp IS NOT NULL, 'expires_at', _exp);
END $$;

CREATE OR REPLACE FUNCTION public.revoke_doctor_pass(_patient_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM patients WHERE id = _patient_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  UPDATE doctor_passes SET revoked_at = now() WHERE patient_id = _patient_id AND revoked_at IS NULL;
  INSERT INTO audit_events(patient_id, actor_user_id, actor_role, action, access_method)
  VALUES (_patient_id, auth.uid(), 'patient', 'DOCTOR_PASS_REVOKED', 'doctor_pass');
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.verify_doctor_pass(_patient_id uuid, _code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE rec doctor_passes%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM doctor_passes
   WHERE patient_id = _patient_id AND revoked_at IS NULL AND expires_at > now() AND failed_attempts < 5
   ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_pass'); END IF;
  IF rec.code_hash = extensions.crypt(_code, rec.code_hash) THEN
    UPDATE doctor_passes SET used_at = coalesce(used_at, now()) WHERE id = rec.id;
    RETURN jsonb_build_object('ok', true, 'reason', 'verified', 'expires_at', rec.expires_at);
  END IF;
  UPDATE doctor_passes SET failed_attempts = failed_attempts + 1 WHERE id = rec.id;
  RETURN jsonb_build_object('ok', false, 'reason', 'wrong_pass', 'attempts_left', GREATEST(0, 4 - rec.failed_attempts));
END $$;

REVOKE ALL ON FUNCTION public.create_doctor_pass(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.doctor_pass_status(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_doctor_pass(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.verify_doctor_pass(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_doctor_pass(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.doctor_pass_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_doctor_pass(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_doctor_pass(uuid, text) TO service_role;