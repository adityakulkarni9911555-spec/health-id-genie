-- Family groups
CREATE TABLE public.family_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_slug text NOT NULL DEFAULT 'family' REFERENCES public.subscription_plans(slug),
  max_members integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_groups TO authenticated;
GRANT ALL ON public.family_groups TO service_role;

ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their family group"
  ON public.family_groups FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Family members
CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id),
  UNIQUE (group_id, invited_email)
);

GRANT SELECT, INSERT, UPDATE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage family members"
  ON public.family_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.family_groups fg
      WHERE fg.id = family_members.group_id AND fg.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.family_groups fg
      WHERE fg.id = family_members.group_id AND fg.owner_id = auth.uid()
    )
  );

CREATE POLICY "Members can view their own membership"
  ON public.family_members FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Add FK from profiles to family_groups
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_family_group_id_fkey
  FOREIGN KEY (family_group_id) REFERENCES public.family_groups(id) ON DELETE SET NULL;

-- Helper: can this family group accept another member?
CREATE OR REPLACE FUNCTION public.can_add_family_member(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT fg.max_members
    FROM public.family_groups fg
    WHERE fg.id = _group_id
  ) > (
    SELECT COUNT(*)::int
    FROM public.family_members fm
    WHERE fm.group_id = _group_id AND fm.status = 'active'
  )
$$;

GRANT EXECUTE ON FUNCTION public.can_add_family_member(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_add_family_member(uuid) FROM PUBLIC, anon;

CREATE TRIGGER update_family_groups_updated_at
  BEFORE UPDATE ON public.family_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_family_members_updated_at
  BEFORE UPDATE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();