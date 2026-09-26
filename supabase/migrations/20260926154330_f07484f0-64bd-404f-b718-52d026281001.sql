CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.patient_document_pins (
  patient_id uuid PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.patient_document_pins TO service_role;

ALTER TABLE public.patient_document_pins ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_patient_document_pins_updated_at
BEFORE UPDATE ON public.patient_document_pins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Set or replace the PIN for a patient the caller owns.
CREATE OR REPLACE FUNCTION public.set_document_pin(_patient_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = _patient_id AND p.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF _pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'invalid_pin';
  END IF;

  INSERT INTO public.patient_document_pins (patient_id, pin_hash, failed_attempts, locked_until)
  VALUES (_patient_id, extensions.crypt(_pin, extensions.gen_salt('bf')), 0, NULL)
  ON CONFLICT (patient_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = now();

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_document_pin(_patient_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = _patient_id AND p.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  DELETE FROM public.patient_document_pins WHERE patient_id = _patient_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_document_pin(_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patient_document_pins d
    JOIN public.patients p ON p.id = d.patient_id
    WHERE d.patient_id = _patient_id AND p.owner_id = auth.uid()
  );
$$;

-- Verification used only by the emergency edge function (service role).
CREATE OR REPLACE FUNCTION public.verify_document_pin(_patient_id uuid, _pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  rec public.patient_document_pins%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM public.patient_document_pins WHERE patient_id = _patient_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'no_pin');
  END IF;

  IF rec.locked_until IS NOT NULL AND rec.locked_until > now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'locked',
      'retry_after', GREATEST(1, CEIL(EXTRACT(EPOCH FROM (rec.locked_until - now())))::int));
  END IF;

  IF _pin IS NOT NULL AND rec.pin_hash = extensions.crypt(_pin, rec.pin_hash) THEN
    UPDATE public.patient_document_pins
      SET failed_attempts = 0, locked_until = NULL, updated_at = now()
      WHERE patient_id = _patient_id;
    RETURN jsonb_build_object('ok', true, 'reason', 'verified');
  END IF;

  IF _pin IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'pin_required');
  END IF;

  UPDATE public.patient_document_pins
    SET failed_attempts = rec.failed_attempts + 1,
        locked_until = CASE WHEN rec.failed_attempts + 1 >= 5
          THEN now() + interval '15 minutes' ELSE NULL END,
        updated_at = now()
    WHERE patient_id = _patient_id;

  IF rec.failed_attempts + 1 >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'locked', 'retry_after', 900);
  END IF;

  RETURN jsonb_build_object('ok', false, 'reason', 'wrong_pin',
    'attempts_left', 5 - (rec.failed_attempts + 1));
END;
$$;

REVOKE ALL ON FUNCTION public.verify_document_pin(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_document_pin(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_document_pin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_document_pin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_document_pin(uuid) TO authenticated;