import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const InputSchema = z.object({
  token: z.string().uuid(),
  turnstile_token: z.string().min(10).max(4096).optional(),
});

const jsonResponse = (body: unknown, status: number, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });

const notFound = () => jsonResponse({ error: 'not_found' }, 404);

const hashIp = async (ip: string) => {
  const enc = new TextEncoder().encode(ip + '::medora-emergency');
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

// Cheap heuristic bot filter — blocks obvious scrapers/CLI clients.
// Real browsers always send a User-Agent with "Mozilla".
const looksLikeBot = (ua: string | null) => {
  if (!ua) return true;
  const s = ua.toLowerCase();
  if (!s.includes('mozilla')) return true;
  return /(bot|crawler|spider|scrape|curl|wget|python-requests|httpclient|okhttp|go-http|libwww|java\/)/.test(
    s,
  );
};

const verifyTurnstile = async (token: string | undefined, ip: string) => {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) return { ok: true, skipped: true }; // Turnstile not configured yet
  if (!token) return { ok: false, reason: 'missing_challenge' };
  try {
    const form = new URLSearchParams();
    form.set('secret', secret);
    form.set('response', token);
    if (ip) form.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const data = (await res.json()) as { success?: boolean };
    return { ok: !!data.success, reason: data.success ? undefined : 'challenge_failed' };
  } catch {
    return { ok: false, reason: 'challenge_error' };
  }
};

interface StoredDoc {
  path: string;
  name?: string;
  size?: number;
  type?: string;
  uploaded_at?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: 'invalid_token' }, 400);
    }

    const rawIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('cf-connecting-ip') ??
      '';
    const ua = req.headers.get('user-agent');

    // 1) Bot heuristic — block obvious non-browser clients up front.
    if (looksLikeBot(ua)) {
      return jsonResponse({ error: 'blocked' }, 403);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    // 2) Rate limit (per token + per IP, sliding windows).
    const ip_hash = rawIp ? await hashIp(rawIp) : 'unknown';
    const { data: rl, error: rlErr } = await admin.rpc('check_emergency_rate_limit', {
      _ip_hash: ip_hash,
      _token: parsed.data.token,
    });
    if (rlErr) {
      console.error('rate limit rpc failed', rlErr);
      return jsonResponse({ error: 'server_error' }, 500);
    }
    const rlResult = rl as { ok: boolean; reason?: string; retry_after?: number };
    if (!rlResult.ok) {
      return jsonResponse(
        { error: 'rate_limited', reason: rlResult.reason },
        429,
        { 'Retry-After': String(rlResult.retry_after ?? 60) },
      );
    }

    // 3) Turnstile check (only enforced if TURNSTILE_SECRET_KEY is set).
    const challenge = await verifyTurnstile(parsed.data.turnstile_token, rawIp);
    if (!challenge.ok) {
      return jsonResponse({ error: 'challenge_required', reason: challenge.reason }, 401);
    }

    // 4) Actual lookup.
    const { data: patient, error } = await admin
      .from('patients')
      .select(
        'id, full_name, date_of_birth, gender, blood_group, height, weight, allergies, chronic_conditions, emergency_contact, documents, share_revoked',
      )
      .eq('share_token', parsed.data.token)
      .maybeSingle();

    if (error || !patient || patient.share_revoked) return notFound();

    const docs: StoredDoc[] = Array.isArray(patient.documents)
      ? (patient.documents as StoredDoc[])
      : [];

    const signed = await Promise.all(
      docs.map(async (d) => {
        if (!d?.path) return null;
        const { data: s } = await admin.storage
          .from('patient-documents')
          .createSignedUrl(d.path, 60 * 5);
        if (!s?.signedUrl) return null;
        return {
          name: d.name ?? d.path.split('/').pop() ?? 'document',
          url: s.signedUrl,
          type: d.type ?? null,
          size: d.size ?? null,
          uploaded_at: d.uploaded_at ?? null,
        };
      }),
    );

    admin
      .from('emergency_access_logs')
      .insert({
        patient_id: patient.id,
        ip_hash: rawIp ? ip_hash : null,
        user_agent: ua?.slice(0, 500) ?? null,
      })
      .then(() => {})
      .catch(() => {});

    return jsonResponse(
      {
        patient: {
          full_name: patient.full_name,
          date_of_birth: patient.date_of_birth,
          gender: patient.gender,
          blood_group: patient.blood_group,
          height: patient.height,
          weight: patient.weight,
          allergies: patient.allergies ?? [],
          chronic_conditions: patient.chronic_conditions ?? [],
          emergency_contact: patient.emergency_contact,
        },
        documents: signed.filter(Boolean),
      },
      200,
    );
  } catch (e) {
    console.error('emergency-lookup error', e);
    return jsonResponse({ error: 'server_error' }, 500);
  }
});
