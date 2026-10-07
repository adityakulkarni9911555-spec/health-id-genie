-- 1) Subscriptions: clients may no longer grant themselves a plan.
DROP POLICY IF EXISTS "Users can create their own subscription records" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription records" ON public.user_subscriptions;
REVOKE INSERT, UPDATE, DELETE ON public.user_subscriptions FROM authenticated, anon;

-- 2) Profiles: plan / expiry / family link are server-controlled.
CREATE OR REPLACE FUNCTION public.guard_profile_entitlements()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.plan_slug := 'free';
    NEW.subscription_expires_at := NULL;
    NEW.family_group_id := NULL;
  ELSIF NEW.plan_slug IS DISTINCT FROM OLD.plan_slug
     OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
     OR NEW.family_group_id IS DISTINCT FROM OLD.family_group_id THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_profile_entitlements_trg BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_entitlements();

-- 3) Family groups: owners can read; creation and seat limits are server-side only.
DROP POLICY IF EXISTS "Owners can manage their family group" ON public.family_groups;
REVOKE INSERT, UPDATE, DELETE ON public.family_groups FROM authenticated, anon;
GRANT SELECT ON public.family_groups TO authenticated;
CREATE POLICY "Owners can view their family group" ON public.family_groups
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- 4) Card orders: price, status and payment fields cannot be edited by customers.
CREATE OR REPLACE FUNCTION public.guard_card_order_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.amount_inr := 0;
    NEW.status := 'pending';
    NEW.razorpay_order_id := NULL;
    NEW.razorpay_payment_id := NULL;
    NEW.tracking_note := NULL;
  ELSIF NEW.amount_inr IS DISTINCT FROM OLD.amount_inr
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.quantity IS DISTINCT FROM OLD.quantity
     OR NEW.pack_slug IS DISTINCT FROM OLD.pack_slug
     OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
     OR NEW.razorpay_order_id IS DISTINCT FROM OLD.razorpay_order_id
     OR NEW.razorpay_payment_id IS DISTINCT FROM OLD.razorpay_payment_id
     OR NEW.tracking_note IS DISTINCT FROM OLD.tracking_note THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_card_order_fields_trg BEFORE INSERT OR UPDATE ON public.card_orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_card_order_fields();

-- 5) Family permissions.
ALTER TABLE public.family_members ADD COLUMN IF NOT EXISTS relationship text NOT NULL DEFAULT 'other';
ALTER TABLE public.family_members ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL
  DEFAULT '{"emergency_only":true,"documents":false,"medications":false,"insurance":false,"full_history":false}'::jsonb;
ALTER TABLE public.family_members ADD CONSTRAINT family_members_relationship_chk
  CHECK (relationship IN ('parent','spouse','child','sibling','caregiver','other'));
ALTER TABLE public.family_members ADD CONSTRAINT family_members_permissions_chk CHECK (
  jsonb_typeof(permissions) = 'object'
  AND (permissions - ARRAY['emergency_only','documents','medications','insurance','full_history']) = '{}'::jsonb
  AND jsonb_typeof(COALESCE(permissions->'emergency_only','true'::jsonb)) = 'boolean'
  AND jsonb_typeof(COALESCE(permissions->'documents','false'::jsonb)) = 'boolean'
  AND jsonb_typeof(COALESCE(permissions->'medications','false'::jsonb)) = 'boolean'
  AND jsonb_typeof(COALESCE(permissions->'insurance','false'::jsonb)) = 'boolean'
  AND jsonb_typeof(COALESCE(permissions->'full_history','false'::jsonb)) = 'boolean'
);

CREATE OR REPLACE FUNCTION public.guard_family_member_changes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _patient uuid;
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    -- Owners invite by email; an account is linked only when the invitee accepts (server-side).
    NEW.user_id := NULL;
    NEW.status := 'pending';
  ELSE
    IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.group_id IS DISTINCT FROM OLD.group_id
       OR NEW.invited_email IS DISTINCT FROM OLD.invited_email THEN
      RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'removed' THEN
      RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
    END IF;
    IF NEW.permissions IS DISTINCT FROM OLD.permissions OR NEW.status IS DISTINCT FROM OLD.status THEN
      SELECT pr.patient_id INTO _patient FROM public.profiles pr WHERE pr.id = auth.uid();
      INSERT INTO public.audit_events (patient_id, actor_user_id, actor_role, action, resource_type, resource_id, access_method, metadata)
      VALUES (_patient, auth.uid(), 'owner',
        CASE WHEN NEW.status = 'removed' THEN 'FAMILY_ACCESS_REVOKED' ELSE 'FAMILY_PERMISSIONS_CHANGED' END,
        'family_member', NEW.id::text, 'owner_session',
        jsonb_build_object('permissions', NEW.permissions));
    END IF;
  END IF;
  RETURN NEW;
END $$;
-- audit_events has no client INSERT grant, so the audit write runs via a definer helper.
CREATE OR REPLACE FUNCTION public.log_family_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _patient uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.permissions IS DISTINCT FROM OLD.permissions OR NEW.status IS DISTINCT FROM OLD.status) THEN
    SELECT pr.patient_id INTO _patient FROM public.profiles pr
      JOIN public.family_groups fg ON fg.owner_id = pr.id WHERE fg.id = NEW.group_id;
    INSERT INTO public.audit_events (patient_id, actor_user_id, actor_role, action, resource_type, resource_id, access_method, metadata)
    VALUES (_patient, auth.uid(), 'owner',
      CASE WHEN NEW.status = 'removed' THEN 'FAMILY_ACCESS_REVOKED' ELSE 'FAMILY_PERMISSIONS_CHANGED' END,
      'family_member', NEW.id::text, 'owner_session', jsonb_build_object('permissions', NEW.permissions));
  ELSIF TG_OP = 'INSERT' THEN
    SELECT pr.patient_id INTO _patient FROM public.profiles pr
      JOIN public.family_groups fg ON fg.owner_id = pr.id WHERE fg.id = NEW.group_id;
    INSERT INTO public.audit_events (patient_id, actor_user_id, actor_role, action, resource_type, resource_id, access_method, metadata)
    VALUES (_patient, auth.uid(), 'owner', 'FAMILY_ACCESS_GRANTED', 'family_member', NEW.id::text, 'owner_session',
      jsonb_build_object('permissions', NEW.permissions));
  END IF;
  RETURN NEW;
END $$;
-- Keep the guard free of audit writes (it runs as the caller).
CREATE OR REPLACE FUNCTION public.guard_family_member_changes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.user_id := NULL;
    NEW.status := 'pending';
  ELSE
    IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.group_id IS DISTINCT FROM OLD.group_id
       OR NEW.invited_email IS DISTINCT FROM OLD.invited_email THEN
      RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'removed' THEN
      RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_family_member_changes_trg BEFORE INSERT OR UPDATE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_family_member_changes();
CREATE TRIGGER log_family_audit_trg AFTER INSERT OR UPDATE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.log_family_audit();

-- Server-side permission check for future family data access.
CREATE OR REPLACE FUNCTION public.family_can_access(_patient_id uuid, _scope text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.family_groups fg ON fg.owner_id = p.owner_id
    JOIN public.family_members fm ON fm.group_id = fg.id
    WHERE p.id = _patient_id AND fm.user_id = auth.uid() AND fm.status = 'active'
      AND _scope IN ('emergency_only','documents','medications','insurance','full_history')
      AND (fm.permissions->>_scope)::boolean IS TRUE
  )
$$;
REVOKE ALL ON FUNCTION public.family_can_access(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.family_can_access(uuid, text) TO authenticated;

-- 6) Explicit, expiring clinician access grants.
CREATE TABLE public.patient_clinician_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinician_id uuid NOT NULL REFERENCES public.clinician_profiles(id) ON DELETE CASCADE,
  access_scope text NOT NULL DEFAULT 'emergency'
    CHECK (access_scope IN ('emergency','documents','medications','full_history')),
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','approved','active','expired','revoked')),
  reason text,
  granted_by uuid,
  granted_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.patient_clinician_access TO authenticated;
GRANT ALL ON public.patient_clinician_access TO service_role;
ALTER TABLE public.patient_clinician_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients view clinician access to their records" ON public.patient_clinician_access
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_clinician_access.patient_id AND p.owner_id = auth.uid()));
CREATE POLICY "Clinicians view their own grants" ON public.patient_clinician_access
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clinician_profiles c WHERE c.id = patient_clinician_access.clinician_id AND c.user_id = auth.uid()));
CREATE INDEX patient_clinician_access_patient_idx ON public.patient_clinician_access (patient_id, status);

CREATE OR REPLACE FUNCTION public.revoke_clinician_access(_access_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pid uuid;
BEGIN
  UPDATE public.patient_clinician_access a SET status = 'revoked', revoked_at = now()
  FROM public.patients p
  WHERE a.id = _access_id AND p.id = a.patient_id AND p.owner_id = auth.uid() AND a.status <> 'revoked'
  RETURNING a.patient_id INTO _pid;
  IF _pid IS NULL THEN RETURN false; END IF;
  INSERT INTO public.audit_events (patient_id, actor_user_id, actor_role, action, resource_type, resource_id, access_method)
  VALUES (_pid, auth.uid(), 'owner', 'CLINICIAN_ACCESS_REVOKED', 'clinician_access', _access_id::text, 'owner_session');
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.revoke_clinician_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_clinician_access(uuid) TO authenticated;