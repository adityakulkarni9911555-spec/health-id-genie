CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  title text NOT NULL,
  mime_type text,
  size_bytes bigint,
  document_type text NOT NULL DEFAULT 'other'
    CHECK (document_type IN ('prescription','lab_report','imaging','discharge_summary','consultation','insurance','vaccination','other')),
  document_date date,
  provider_name text,
  summary text,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view their documents" ON public.documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = documents.patient_id AND p.owner_id = auth.uid()));
CREATE INDEX documents_patient_date_idx ON public.documents (patient_id, document_date DESC NULLS LAST, uploaded_at DESC);

CREATE TABLE public.patient_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  dosage text,
  frequency text,
  route text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('active','completed','stopped','unknown')),
  source_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  verification_status text NOT NULL DEFAULT 'AI_EXTRACTED'
    CHECK (verification_status IN ('AI_EXTRACTED','USER_VERIFIED','CLINICIAN_VERIFIED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.patient_medications TO authenticated;
GRANT UPDATE (status, verification_status, end_date, updated_at) ON public.patient_medications TO authenticated;
GRANT ALL ON public.patient_medications TO service_role;
ALTER TABLE public.patient_medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view medications" ON public.patient_medications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_medications.patient_id AND p.owner_id = auth.uid()));
CREATE POLICY "Owners update medication status" ON public.patient_medications FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_medications.patient_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_medications.patient_id AND p.owner_id = auth.uid())
    AND verification_status IN ('AI_EXTRACTED','USER_VERIFIED'));
CREATE INDEX patient_medications_patient_idx ON public.patient_medications (patient_id, status);

CREATE TABLE public.patient_lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  result_value text,
  unit text,
  reference_range text,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('normal','abnormal','unknown')),
  test_date date,
  source_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  source_page integer,
  verification_status text NOT NULL DEFAULT 'AI_EXTRACTED'
    CHECK (verification_status IN ('AI_EXTRACTED','USER_VERIFIED','CLINICIAN_VERIFIED')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.patient_lab_results TO authenticated;
GRANT ALL ON public.patient_lab_results TO service_role;
ALTER TABLE public.patient_lab_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view lab results" ON public.patient_lab_results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_lab_results.patient_id AND p.owner_id = auth.uid()));
CREATE INDEX patient_lab_results_patient_idx ON public.patient_lab_results (patient_id, test_date DESC NULLS LAST);

-- One-way sync: the legacy patients.documents list feeds the documents table (never the reverse).
CREATE OR REPLACE FUNCTION public.sync_documents_from_patient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d jsonb; paths text[] := '{}';
BEGIN
  FOR d IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.documents, '[]'::jsonb)) LOOP
    CONTINUE WHEN d->>'path' IS NULL;
    paths := paths || (d->>'path');
    INSERT INTO public.documents (patient_id, storage_path, title, mime_type, size_bytes, uploaded_by, uploaded_at,
      document_date, provider_name, summary, status)
    VALUES (NEW.id, d->>'path', COALESCE(d->>'name', 'Document'), d->>'type',
      NULLIF(d->>'size','')::bigint, NEW.owner_id,
      COALESCE(NULLIF(d->>'uploadedAt','')::timestamptz, now()),
      CASE WHEN d#>>'{extractedData,document_date}' ~ '^\d{4}-\d{2}-\d{2}$' THEN (d#>>'{extractedData,document_date}')::date END,
      d#>>'{extractedData,provider_name}', d#>>'{extractedData,summary}', 'active')
    ON CONFLICT (storage_path) DO UPDATE SET
      title = EXCLUDED.title,
      document_date = COALESCE(EXCLUDED.document_date, public.documents.document_date),
      provider_name = COALESCE(EXCLUDED.provider_name, public.documents.provider_name),
      summary = COALESCE(EXCLUDED.summary, public.documents.summary),
      status = 'active', updated_at = now()
    WHERE public.documents.patient_id = NEW.id;
  END LOOP;
  UPDATE public.documents SET status = 'removed', updated_at = now()
    WHERE patient_id = NEW.id AND status = 'active' AND NOT (storage_path = ANY(paths));
  RETURN NEW;
END $$;
CREATE TRIGGER sync_documents_from_patient_trg AFTER INSERT OR UPDATE OF documents ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.sync_documents_from_patient();

-- Backfill existing documents (no data is removed from patients.documents).
INSERT INTO public.documents (patient_id, storage_path, title, mime_type, size_bytes, uploaded_by, uploaded_at, document_date, provider_name, summary)
SELECT p.id, d->>'path', COALESCE(d->>'name','Document'), d->>'type', NULLIF(d->>'size','')::bigint, p.owner_id,
  COALESCE(NULLIF(d->>'uploadedAt','')::timestamptz, p.created_at),
  CASE WHEN d#>>'{extractedData,document_date}' ~ '^\d{4}-\d{2}-\d{2}$' THEN (d#>>'{extractedData,document_date}')::date END,
  d#>>'{extractedData,provider_name}', d#>>'{extractedData,summary}'
FROM public.patients p, jsonb_array_elements(COALESCE(p.documents,'[]'::jsonb)) d
WHERE d->>'path' IS NOT NULL
ON CONFLICT (storage_path) DO NOTHING;

COMMENT ON COLUMN public.patients.documents IS 'LEGACY: kept for backward compatibility; documents table is the canonical record and is synced one-way from this list.';