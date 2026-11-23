CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT (_user_id = auth.uid() OR auth.role() = 'service_role')
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    )
$function$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "Anonymous users can read subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Authenticated users can read subscription plans" ON public.subscription_plans;

CREATE POLICY "Anyone can read published plan catalog"
ON public.subscription_plans
FOR SELECT
TO anon, authenticated
USING (price_inr >= 0 AND max_profiles > 0);