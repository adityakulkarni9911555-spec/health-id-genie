CREATE OR REPLACE FUNCTION public.cleanup_ai_rows_for_removed_document()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'removed' AND OLD.status IS DISTINCT FROM 'removed' THEN
    DELETE FROM public.patient_medications WHERE source_document_id = NEW.id AND verification_status = 'AI_EXTRACTED';
    DELETE FROM public.patient_lab_results WHERE source_document_id = NEW.id AND verification_status = 'AI_EXTRACTED';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.cleanup_ai_rows_for_removed_document() FROM public, anon, authenticated;
CREATE TRIGGER cleanup_ai_rows_on_doc_removed AFTER UPDATE OF status ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_ai_rows_for_removed_document();