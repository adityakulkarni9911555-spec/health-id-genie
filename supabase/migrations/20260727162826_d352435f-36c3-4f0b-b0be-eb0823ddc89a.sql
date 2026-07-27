
CREATE TABLE public.emergency_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  bucket_kind TEXT NOT NULL CHECK (bucket_kind IN ('ip','token')),
  bucket_key TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX emergency_rate_limits_lookup_idx
  ON public.emergency_rate_limits (bucket_kind, bucket_key, occurred_at DESC);

GRANT ALL ON public.emergency_rate_limits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.emergency_rate_limits_id_seq TO service_role;

ALTER TABLE public.emergency_rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: table is service-role only.

CREATE OR REPLACE FUNCTION public.check_emergency_rate_limit(
  _ip_hash TEXT,
  _token TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_last_min INT;
  ip_last_min INT;
  ip_last_hour INT;
BEGIN
  -- Opportunistic cleanup of old rows (keeps table small).
  DELETE FROM public.emergency_rate_limits
  WHERE occurred_at < now() - INTERVAL '2 hours';

  SELECT COUNT(*) INTO token_last_min
  FROM public.emergency_rate_limits
  WHERE bucket_kind = 'token'
    AND bucket_key = _token
    AND occurred_at > now() - INTERVAL '1 minute';

  SELECT COUNT(*) INTO ip_last_min
  FROM public.emergency_rate_limits
  WHERE bucket_kind = 'ip'
    AND bucket_key = _ip_hash
    AND occurred_at > now() - INTERVAL '1 minute';

  SELECT COUNT(*) INTO ip_last_hour
  FROM public.emergency_rate_limits
  WHERE bucket_kind = 'ip'
    AND bucket_key = _ip_hash
    AND occurred_at > now() - INTERVAL '1 hour';

  IF token_last_min >= 10 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'token_burst', 'retry_after', 60);
  END IF;
  IF ip_last_min >= 30 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ip_burst', 'retry_after', 60);
  END IF;
  IF ip_last_hour >= 200 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ip_hour', 'retry_after', 3600);
  END IF;

  INSERT INTO public.emergency_rate_limits (bucket_kind, bucket_key) VALUES ('token', _token);
  INSERT INTO public.emergency_rate_limits (bucket_kind, bucket_key) VALUES ('ip', _ip_hash);

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.check_emergency_rate_limit(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_emergency_rate_limit(TEXT, TEXT) TO service_role;
