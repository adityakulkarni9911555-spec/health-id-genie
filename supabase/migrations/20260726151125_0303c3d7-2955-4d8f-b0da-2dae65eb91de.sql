
CREATE OR REPLACE FUNCTION public.enforce_patient_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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

REVOKE ALL ON FUNCTION public.enforce_patient_owner() FROM PUBLIC, anon, authenticated;
