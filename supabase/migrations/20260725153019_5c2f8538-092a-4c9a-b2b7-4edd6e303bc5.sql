ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS documents JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Storage policies for the patient-documents bucket (bucket itself is created via storage tool)
CREATE POLICY "Public read patient documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'patient-documents');

CREATE POLICY "Public upload patient documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'patient-documents');

CREATE POLICY "Public update patient documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'patient-documents');

CREATE POLICY "Public delete patient documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'patient-documents');
