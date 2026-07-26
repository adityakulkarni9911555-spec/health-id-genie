
-- Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('staff','admin')
  )
$$;

-- Audit log
CREATE TABLE IF NOT EXISTS public.patient_edit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_email text,
  action text NOT NULL, -- 'view' | 'update'
  field text,           -- e.g. 'allergies', 'emergency_contact'
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_edit_logs_patient_idx ON public.patient_edit_logs(patient_id, created_at DESC);

GRANT SELECT ON public.patient_edit_logs TO authenticated;
GRANT ALL ON public.patient_edit_logs TO service_role;

ALTER TABLE public.patient_edit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view logs on their record"
  ON public.patient_edit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_edit_logs.patient_id AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all logs"
  ON public.patient_edit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view logs they created"
  ON public.patient_edit_logs FOR SELECT
  TO authenticated
  USING (actor_id = auth.uid() AND public.is_staff(auth.uid()));

-- Secure lookup: staff can fetch ONE patient by exact ID (never a list). Logged.
CREATE OR REPLACE FUNCTION public.staff_get_patient(_patient_id uuid)
RETURNS public.patients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.patients;
  _email text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _row FROM public.patients WHERE id = _patient_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Patient not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.patient_edit_logs (patient_id, actor_id, actor_email, action)
  VALUES (_patient_id, auth.uid(), _email, 'view');

  RETURN _row;
END;
$$;

-- Secure update: staff can ONLY change allergies and emergency_contact. Logged per field.
CREATE OR REPLACE FUNCTION public.staff_update_patient_safe_fields(
  _patient_id uuid,
  _allergies text[],
  _emergency_contact text
)
RETURNS public.patients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old public.patients;
  _new public.patients;
  _email text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _old FROM public.patients WHERE id = _patient_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Patient not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();

  UPDATE public.patients
     SET allergies = COALESCE(_allergies, allergies),
         emergency_contact = COALESCE(NULLIF(_emergency_contact, ''), emergency_contact),
         updated_at = now()
   WHERE id = _patient_id
   RETURNING * INTO _new;

  IF _allergies IS NOT NULL AND _old.allergies IS DISTINCT FROM _new.allergies THEN
    INSERT INTO public.patient_edit_logs (patient_id, actor_id, actor_email, action, field, old_value, new_value)
    VALUES (_patient_id, auth.uid(), _email, 'update', 'allergies', to_jsonb(_old.allergies), to_jsonb(_new.allergies));
  END IF;

  IF _emergency_contact IS NOT NULL AND _emergency_contact <> '' AND _old.emergency_contact IS DISTINCT FROM _new.emergency_contact THEN
    INSERT INTO public.patient_edit_logs (patient_id, actor_id, actor_email, action, field, old_value, new_value)
    VALUES (_patient_id, auth.uid(), _email, 'update', 'emergency_contact', to_jsonb(_old.emergency_contact), to_jsonb(_new.emergency_contact));
  END IF;

  RETURN _new;
END;
$$;

REVOKE ALL ON FUNCTION public.staff_get_patient(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_update_patient_safe_fields(uuid, text[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_get_patient(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_update_patient_safe_fields(uuid, text[], text) TO authenticated;
