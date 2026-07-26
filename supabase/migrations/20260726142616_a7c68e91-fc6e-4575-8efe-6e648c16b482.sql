
-- profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- add ownership to patients
ALTER TABLE public.patients
  ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX patients_owner_id_idx ON public.patients(owner_id);

-- replace public policies with per-owner policies
DROP POLICY IF EXISTS "Allow public insert access to patients" ON public.patients;
DROP POLICY IF EXISTS "Allow public read access to patients" ON public.patients;
DROP POLICY IF EXISTS "Allow public update access to patients" ON public.patients;

REVOKE ALL ON public.patients FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;

CREATE POLICY "Users can view their own patient record"
  ON public.patients FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own patient record"
  ON public.patients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own patient record"
  ON public.patients FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- storage policies for patient-documents (path prefix = owner user id)
CREATE POLICY "Users can view their own documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
