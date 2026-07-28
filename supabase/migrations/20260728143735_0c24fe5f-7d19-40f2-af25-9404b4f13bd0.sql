REVOKE ALL ON public.emergency_rate_limits FROM anon, authenticated;
ALTER TABLE public.emergency_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny all client access to emergency_rate_limits" ON public.emergency_rate_limits;
CREATE POLICY "Deny all client access to emergency_rate_limits"
  ON public.emergency_rate_limits
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);