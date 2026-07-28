
-- Trigger: enforce document quota on patients.documents
CREATE OR REPLACE FUNCTION public.enforce_patient_document_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count int;
  max_docs int;
BEGIN
  new_count := COALESCE(jsonb_array_length(NEW.documents), 0);

  IF TG_OP = 'UPDATE' AND new_count <= COALESCE(jsonb_array_length(OLD.documents), 0) THEN
    RETURN NEW;
  END IF;

  SELECT sp.max_documents INTO max_docs
  FROM public.subscription_plans sp
  WHERE sp.slug = public.effective_plan(NEW.owner_id);

  IF max_docs IS NOT NULL AND new_count > max_docs THEN
    RAISE EXCEPTION 'Document limit reached for current plan (% of %)', new_count, max_docs
      USING ERRCODE = '53400';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_patient_document_quota_trg ON public.patients;
CREATE TRIGGER enforce_patient_document_quota_trg
BEFORE INSERT OR UPDATE OF documents ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.enforce_patient_document_quota();

-- Trigger: enforce family member quota on family_members
CREATE OR REPLACE FUNCTION public.enforce_family_member_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count int;
  max_m int;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.group_id = OLD.group_id
     AND NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('active', 'pending') THEN
    RETURN NEW;
  END IF;

  SELECT max_members INTO max_m
  FROM public.family_groups
  WHERE id = NEW.group_id;

  SELECT COUNT(*)::int INTO active_count
  FROM public.family_members
  WHERE group_id = NEW.group_id
    AND status IN ('active', 'pending')
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF max_m IS NOT NULL AND (active_count + 1) > max_m THEN
    RAISE EXCEPTION 'Family member limit reached (% of %)', active_count + 1, max_m
      USING ERRCODE = '53400';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_family_member_quota_trg ON public.family_members;
CREATE TRIGGER enforce_family_member_quota_trg
BEFORE INSERT OR UPDATE ON public.family_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_family_member_quota();
