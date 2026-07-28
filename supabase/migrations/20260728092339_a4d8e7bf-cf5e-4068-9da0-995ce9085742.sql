-- Subscription plan catalog
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  price_inr integer NOT NULL,
  max_profiles integer NOT NULL DEFAULT 1,
  max_documents integer, -- null means unlimited
  description text,
  razorpay_plan_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read subscription plans"
  ON public.subscription_plans FOR SELECT TO authenticated USING (true);

-- Seed default plans BEFORE adding the FK column
INSERT INTO public.subscription_plans (slug, name, price_inr, max_profiles, max_documents, description)
VALUES
  ('free', 'Free', 0, 1, 5, '1 profile and up to 5 documents'),
  ('premium', 'Premium', 9900, 1, NULL, '1 profile with unlimited documents'),
  ('family', 'Family', 19900, 5, NULL, 'Up to 5 family profiles with unlimited documents')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_inr = EXCLUDED.price_inr,
  max_profiles = EXCLUDED.max_profiles,
  max_documents = EXCLUDED.max_documents,
  description = EXCLUDED.description;

-- User subscriptions
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_slug text NOT NULL REFERENCES public.subscription_plans(slug),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'past_due')),
  started_at timestamptz,
  expires_at timestamptz,
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, plan_slug)
);

GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_subscriptions TO service_role;

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON public.user_subscriptions FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "Users can create their own subscription records"
  ON public.user_subscriptions FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own subscription records"
  ON public.user_subscriptions FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Extend profiles with plan info
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_slug text NOT NULL DEFAULT 'free' REFERENCES public.subscription_plans(slug),
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS family_group_id uuid;

-- Helper: effective plan for a user (personal or family)
CREATE OR REPLACE FUNCTION public.effective_plan(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
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
  )
$$;

-- Helper: can this patient record accept another document?
CREATE OR REPLACE FUNCTION public.can_add_document(_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT COALESCE(sp.max_documents, 999999)
    FROM public.patients pat
    JOIN public.profiles p ON p.id = pat.owner_id
    JOIN public.subscription_plans sp ON sp.slug = public.effective_plan(p.id)
    WHERE pat.id = _patient_id
  ) > COALESCE(
    (SELECT jsonb_array_length(documents) FROM public.patients WHERE id = _patient_id),
    0
  )
$$;

-- Helper: remaining document slots for a patient
CREATE OR REPLACE FUNCTION public.remaining_document_slots(_patient_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(0,
    (SELECT COALESCE(sp.max_documents, 999999)
     FROM public.patients pat
     JOIN public.profiles p ON p.id = pat.owner_id
     JOIN public.subscription_plans sp ON sp.slug = public.effective_plan(p.id)
     WHERE pat.id = _patient_id)
    - COALESCE((SELECT jsonb_array_length(documents) FROM public.patients WHERE id = _patient_id), 0)
  )
$$;

GRANT EXECUTE ON FUNCTION public.effective_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_document(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remaining_document_slots(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.effective_plan(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_add_document(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remaining_document_slots(uuid) FROM PUBLIC, anon;

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();