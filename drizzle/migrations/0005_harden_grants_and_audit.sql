-- Defense in depth: clients never write audit/log tables or AI-derived records directly.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_events, public.qr_rotation_logs, public.emergency_override_logs, public.emergency_access_logs, public.documents, public.patient_lab_results FROM anon, authenticated;
REVOKE INSERT, DELETE, TRUNCATE ON public.patient_medications FROM anon, authenticated;
REVOKE UPDATE ON public.patient_medications FROM anon, authenticated;
GRANT UPDATE (status, verification_status, end_date, updated_at) ON public.patient_medications TO authenticated;
REVOKE ALL ON public.audit_events, public.qr_rotation_logs, public.emergency_override_logs, public.emergency_access_logs, public.documents, public.patient_lab_results, public.patient_medications FROM anon;

-- Sync trigger: only accept storage paths inside <owner>/<patient>/.
CREATE OR REPLACE FUNCTION public.sync_documents_from_patient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d jsonb; paths text[] := '{}'; prefix text := NEW.owner_id::text || '/' || NEW.id::text || '/';
BEGIN
  FOR d IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.documents, '[]'::jsonb)) LOOP
    CONTINUE WHEN d->>'path' IS NULL OR left(d->>'path', length(prefix)) <> prefix OR position('..' in d->>'path') > 0;
    paths := paths || (d->>'path');
    INSERT INTO public.documents (patient_id, storage_path, title, mime_type, size_bytes, uploaded_by, uploaded_at,
      document_date, provider_name, summary, status)
    VALUES (NEW.id, d->>'path', COALESCE(d->>'name', 'Document'), d->>'type',
      CASE WHEN d->>'size' ~ '^\d+$' THEN (d->>'size')::bigint END, NEW.owner_id,
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

-- Owner-checked audit entry for conflict-review decisions.
CREATE OR REPLACE FUNCTION public.log_conflict_decision(_patient_id uuid, _document_path text, _field text, _decision text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM patients WHERE id = _patient_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF _field NOT IN ('blood_group','allergy') OR _decision NOT IN ('kept_profile','accepted_document') THEN
    RAISE EXCEPTION 'invalid';
  END IF;
  INSERT INTO audit_events (patient_id, actor_user_id, actor_role, action, resource_type, resource_id, metadata)
  VALUES (_patient_id, auth.uid(), 'patient', 'AI_CONFLICT_RESOLVED', 'document', left(_document_path, 300),
    jsonb_build_object('field', _field, 'decision', _decision));
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_conflict_decision(uuid, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.log_conflict_decision(uuid, text, text, text) TO authenticated;