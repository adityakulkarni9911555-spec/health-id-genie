REVOKE ALL ON public.patient_document_pins FROM anon, authenticated, PUBLIC;

CREATE POLICY "Deny all client access to patient_document_pins"
ON public.patient_document_pins
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

REVOKE EXECUTE ON FUNCTION public.set_document_pin(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.clear_document_pin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_document_pin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_document_pin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_document_pin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_document_pin(uuid) TO authenticated;