
CREATE OR REPLACE FUNCTION public.can_add_document(_patient_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.patients WHERE id = _patient_id AND owner_id = auth.uid()) THEN
    RETURN false;
  END IF;
  RETURN (
    SELECT COALESCE(sp.max_documents, 999999)
    FROM public.patients pat
    JOIN public.profiles p ON p.id = pat.owner_id
    JOIN public.subscription_plans sp ON sp.slug = public.effective_plan(p.id)
    WHERE pat.id = _patient_id
  ) > COALESCE(
    (SELECT jsonb_array_length(documents) FROM public.patients WHERE id = _patient_id),
    0
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.remaining_document_slots(_patient_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.patients WHERE id = _patient_id AND owner_id = auth.uid()) THEN
    RETURN 0;
  END IF;
  RETURN GREATEST(0,
    (SELECT COALESCE(sp.max_documents, 999999)
     FROM public.patients pat
     JOIN public.profiles p ON p.id = pat.owner_id
     JOIN public.subscription_plans sp ON sp.slug = public.effective_plan(p.id)
     WHERE pat.id = _patient_id)
    - COALESCE((SELECT jsonb_array_length(documents) FROM public.patients WHERE id = _patient_id), 0)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_add_family_member(_group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.family_groups WHERE id = _group_id AND owner_id = auth.uid()) THEN
    RETURN false;
  END IF;
  RETURN (
    SELECT fg.max_members
    FROM public.family_groups fg
    WHERE fg.id = _group_id
  ) > (
    SELECT COUNT(*)::int
    FROM public.family_members fm
    WHERE fm.group_id = _group_id AND fm.status = 'active'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.effective_plan(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow self-lookup, or callers that own a patient/family group tied to this user
  -- (needed for can_add_document / remaining_document_slots joins).
  IF auth.uid() IS NULL THEN
    RETURN 'free';
  END IF;
  IF _user_id <> auth.uid() THEN
    RETURN 'free';
  END IF;
  RETURN COALESCE(
    (SELECT us.plan_slug
     FROM public.user_subscriptions us
     WHERE us.owner_id = _user_id
       AND us.status = 'active'
       AND us.expires_at > now()
     ORDER BY
       CASE us.plan_slug WHEN 'family' THEN 0 WHEN 'premium' THEN 1 ELSE 2 END
     LIMIT 1),
    (SELECT p.plan_slug
     FROM public.profiles p
     WHERE p.id = _user_id
     LIMIT 1),
    'free'
  );
END;
$function$;
