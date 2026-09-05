-- Roles infrastructure
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
ON public.user_roles FOR SELECT TO authenticated
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

-- Printed card orders
CREATE TABLE public.card_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  pack_slug text NOT NULL DEFAULT 'single',
  card_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivery_name text NOT NULL,
  delivery_phone text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  amount_inr integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  razorpay_order_id text,
  razorpay_payment_id text,
  tracking_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.card_orders TO authenticated;
GRANT ALL ON public.card_orders TO service_role;

ALTER TABLE public.card_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own card orders"
ON public.card_orders FOR SELECT TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Users can create their own card orders"
ON public.card_orders FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.owner_id = auth.uid()));

CREATE POLICY "Users can update their own pending card orders"
ON public.card_orders FOR UPDATE TO authenticated
USING (owner_id = auth.uid() AND status IN ('pending', 'paid'))
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins can view all card orders"
ON public.card_orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all card orders"
ON public.card_orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_card_orders_updated_at
BEFORE UPDATE ON public.card_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX card_orders_owner_idx ON public.card_orders (owner_id, created_at DESC);
CREATE INDEX card_orders_status_idx ON public.card_orders (status, created_at DESC);
