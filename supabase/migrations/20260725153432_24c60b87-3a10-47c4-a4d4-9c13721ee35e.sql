CREATE TABLE public.phone_otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_phone_otp_codes_phone ON public.phone_otp_codes(phone_number, created_at DESC);

GRANT ALL ON public.phone_otp_codes TO service_role;

ALTER TABLE public.phone_otp_codes ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated => only service_role (edge functions) can touch it.

CREATE TRIGGER update_phone_otp_codes_updated_at
BEFORE UPDATE ON public.phone_otp_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();