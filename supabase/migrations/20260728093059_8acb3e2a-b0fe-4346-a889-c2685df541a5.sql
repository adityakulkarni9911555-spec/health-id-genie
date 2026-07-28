GRANT SELECT ON public.subscription_plans TO anon;

CREATE POLICY "Anonymous users can read subscription plans"
  ON public.subscription_plans FOR SELECT TO anon USING (true);