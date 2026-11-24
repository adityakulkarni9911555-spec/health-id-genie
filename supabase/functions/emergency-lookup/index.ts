import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const InputSchema = z.object({
  token: z.string().uuid(),
  turnstile_token: z.string().min(10).max(4096).optional(),
  pin: z.string().regex(/^[0-9]{4}$/).optional(),
  // Temporary doctor pass: 6 digits, created by the patient, expires in 15/60 min.
  pass: z.string().regex(/^[0-9]{6}$/).optional(),
  override: z
    .object({
      clinician_phone: z.string().regex(/^[6-9][0-9]{9}$/),
      reason: z.string().trim().max(200).optional(),
    })
    .optional(),
  // Patient-approval flow: responder asks, patient approves in their app.
  access_request: z
    .object({
      phone: z.string().regex(/^[6-9][0-9]{9}$/),
      kind: z.enum(['hospital', 'clinic']),
      facility_name: z.string().trim().min(3).max(120),
      facility_id: z.string().uuid().optional(),
      reason: z.string().trim().min(5).max(200),
    })
    .optional(),
  poll: z.object({ request_id: z.string().uuid(), secret: z.string().min(32).max(128) }).optional(),
  facility_search: z.string().trim().min(2).max(60).optional(),
});

const sha256 = async (v: string) => {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

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

    // Facility registry search (no patient data). Token must still be valid.
    if (parsed.data.facility_search) {
      const { data: tp } = await admin.from('patients').select('id, share_revoked').eq('share_token', parsed.data.token).maybeSingle();
      if (!tp || tp.share_revoked) return notFound();
      const q = parsed.data.facility_search.replace(/[%_,()]/g, ' ');
      const { data: rows } = await admin
        .from('healthcare_facilities')
        .select('id, name, facility_type, ownership, city, state')
        .eq('verified', true)
        .ilike('name', `%${q}%`)
        .limit(8);
      return jsonResponse({ facilities: rows ?? [] }, 200);
    }

    // Poll a pending request (secret-protected, so it skips the lookup rate limit).
    let pollStatus: string | null = null;
    let pollAccessUntil: string | null = null;
    if (parsed.data.poll) {
      const { data: rq } = await admin
        .from('emergency_access_requests')
        .select('id, patient_id, status, expires_at, access_until, poll_secret_hash, patients!inner(share_token, share_revoked)')
        .eq('id', parsed.data.poll.request_id)
        .maybeSingle();
      const pt = (rq as any)?.patients;
      if (!rq || !pt || pt.share_token !== parsed.data.token || pt.share_revoked) return notFound();
      if (rq.poll_secret_hash !== (await sha256(parsed.data.poll.secret))) return notFound();
      let st = rq.status as string;
      if (st === 'pending' && new Date(rq.expires_at).getTime() < Date.now()) {
        await admin.from('emergency_access_requests').update({ status: 'expired' }).eq('id', rq.id).eq('status', 'pending');
        st = 'expired';
      }
      if (st === 'approved' && (!rq.access_until || new Date(rq.access_until).getTime() < Date.now())) st = 'access_ended';
      if (st !== 'approved') return jsonResponse({ request_status: st }, 200);
      pollStatus = 'approved';
      pollAccessUntil = rq.access_until;
    }

    // 2) Rate limit (per token + per IP, sliding windows).
    const ip_hash = rawIp ? await hashIp(rawIp) : 'unknown';
    const { data: rl, error: rlErr } = pollStatus ? { data: { ok: true }, error: null } : await admin.rpc('check_emergency_rate_limit', {
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
    const challenge = pollStatus ? { ok: true } as { ok: boolean; reason?: string } : await verifyTurnstile(parsed.data.turnstile_token, rawIp);
    if (!challenge.ok) {
      return jsonResponse({ error: 'challenge_required', reason: challenge.reason }, 401);
    }

    // 4) Actual lookup.
    const { data: patient, error } = await admin
      .from('patients')
      .select(
        'id, full_name, blood_group, allergies, chronic_conditions, emergency_contact, documents, share_revoked, abha_number, abha_address',
      )
      .eq('share_token', parsed.data.token)
      .maybeSingle();

    if (error || !patient || patient.share_revoked) return notFound();

    const docs: StoredDoc[] = Array.isArray(patient.documents)
      ? (patient.documents as StoredDoc[])
      : [];

    // 5) Tier 2 — documents may be protected by a 4-digit PIN set by the patient.
    const { data: pinCheck, error: pinErr } = await admin.rpc('verify_document_pin', {
      _patient_id: patient.id,
      _pin: parsed.data.pin ?? null,
    });
    if (pinErr) {
      console.error('pin rpc failed', pinErr);
      return jsonResponse({ error: 'server_error' }, 500);
    }
    const pinResult = (pinCheck ?? { ok: true, reason: 'no_pin' }) as {
      ok: boolean;
      reason?: string;
      retry_after?: number;
      attempts_left?: number;
    };
    // Documents are never public: they open only with a patient-set PIN entered correctly.
    let docsUnlocked = (pinResult.ok && pinResult.reason !== 'no_pin') || pollStatus === 'approved';
    if (pollStatus === 'approved') {
      await admin.from('audit_events').insert({
        patient_id: patient.id,
        actor_role: 'requesting_clinician',
        action: 'EMERGENCY_REQUEST_REPORTS_OPENED',
        access_method: 'patient_approval',
        resource_type: 'emergency_access_request',
        resource_id: parsed.data.poll!.request_id,
        ip_hash: rawIp ? ip_hash : null,
        user_agent: ua?.slice(0, 500) ?? null,
      });
    }

    // 5c) New approval request: the patient decides in their Medora app.
    let requestId: string | null = null;
    let requestSecret: string | null = null;
    let requestStatus: string | null = null;
    if (!docsUnlocked && parsed.data.access_request) {
      const ar = parsed.data.access_request;
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from('emergency_access_requests')
        .select('id', { count: 'exact', head: true })
        .eq('patient_id', patient.id)
        .gte('created_at', since);
      if ((count ?? 0) >= 3) {
        requestStatus = 'limit';
      } else {
        let verified = false;
        let facilityName = ar.facility_name;
        if (ar.facility_id) {
          const { data: f } = await admin
            .from('healthcare_facilities')
            .select('id, name, facility_type, verified')
            .eq('id', ar.facility_id)
            .maybeSingle();
          if (f?.verified && f.facility_type === ar.kind) {
            verified = true;
            facilityName = f.name;
          }
        }
        requestSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map((b) => b.toString(16).padStart(2, '0')).join('');
        const { data: ins, error: insErr } = await admin
          .from('emergency_access_requests')
          .insert({
            patient_id: patient.id,
            requester_phone: ar.phone,
            requester_kind: ar.kind,
            facility_name: facilityName,
            facility_id: verified ? ar.facility_id : null,
            facility_verified: verified,
            reason: ar.reason,
            poll_secret_hash: await sha256(requestSecret),
          })
          .select('id')
          .single();
        if (insErr || !ins) {
          console.error('request insert failed', insErr);
          return jsonResponse({ error: 'server_error' }, 500);
        }
        requestId = ins.id;
        requestStatus = 'pending';
        await admin.from('audit_events').insert({
          patient_id: patient.id,
          actor_role: 'requesting_clinician',
          action: 'EMERGENCY_REQUEST_SENT',
          access_method: verified ? 'verified_facility' : 'unverified_facility',
          resource_type: 'emergency_access_request',
          resource_id: ins.id,
          reason: ar.reason,
          ip_hash: rawIp ? ip_hash : null,
          user_agent: ua?.slice(0, 500) ?? null,
          metadata: { facility: facilityName, facility_verified: verified, kind: ar.kind },
        });
      }
    }
    let overrideStatus: string | null = null;

    // 5a) Temporary doctor pass — a short-lived alternative to the permanent PIN.
    let passStatus: string | null = null;
    let passExpiresAt: string | null = null;
    let passAttemptsLeft: number | null = null;
    if (!docsUnlocked && parsed.data.pass) {
      const { data: passCheck, error: passErr } = await admin.rpc('verify_doctor_pass', {
        _patient_id: patient.id,
        _code: parsed.data.pass,
      });
      if (passErr) {
        console.error('pass rpc failed', passErr);
        return jsonResponse({ error: 'server_error' }, 500);
      }
      const pr = (passCheck ?? {}) as { ok?: boolean; reason?: string; expires_at?: string; attempts_left?: number };
      passStatus = pr.reason ?? null;
      passExpiresAt = pr.expires_at ?? null;
      passAttemptsLeft = pr.attempts_left ?? null;
      if (pr.ok) docsUnlocked = true;
      await admin.from('audit_events').insert({
        patient_id: patient.id,
        actor_role: 'anonymous',
        action: pr.ok ? 'DOCTOR_PASS_SUCCESS' : 'DOCTOR_PASS_FAILURE',
        access_method: 'doctor_pass',
        ip_hash: rawIp ? ip_hash : null,
        user_agent: ua?.slice(0, 500) ?? null,
      });
    }

    // 5b) Break-glass request. A typed phone number is NOT proof of clinician
    // identity, so it never unlocks documents. The request is logged (rate-limited)
    // and the caller is told verified clinician access is required.
    if (!docsUnlocked && parsed.data.override) {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from('emergency_override_logs')
        .select('id', { count: 'exact', head: true })
        .eq('patient_id', patient.id)
        .gte('created_at', since);
      if ((count ?? 0) >= 3) {
        overrideStatus = 'limit';
      } else {
        await admin.from('emergency_override_logs').insert({
          patient_id: patient.id,
          clinician_phone: parsed.data.override.clinician_phone,
          reason: parsed.data.override.reason ?? null,
          ip_hash: rawIp ? ip_hash : null,
          user_agent: ua?.slice(0, 500) ?? null,
          granted: false,
          verification: 'unverified_phone',
        });
        await admin.from('audit_events').insert({
          patient_id: patient.id,
          actor_role: 'unverified_clinician',
          action: 'BREAK_GLASS_REQUESTED',
          access_method: 'unverified_phone',
          reason: parsed.data.override.reason ?? null,
          ip_hash: rawIp ? ip_hash : null,
          user_agent: ua?.slice(0, 500) ?? null,
          metadata: { granted: false },
        });
        overrideStatus = 'verification_required';
      }
    }

    if (parsed.data.pin) {
      await admin.from('audit_events').insert({
        patient_id: patient.id,
        actor_role: 'anonymous',
        action: pinResult.ok ? 'PIN_SUCCESS' : 'PIN_FAILURE',
        access_method: 'pin',
        ip_hash: rawIp ? ip_hash : null,
        user_agent: ua?.slice(0, 500) ?? null,
      });
    }

    // AI summaries come from the derived documents read model, only once unlocked.
    const meta = new Map<string, { summary: string | null; document_type: string | null; document_date: string | null; provider_name: string | null }>();
    if (docsUnlocked) {
      const { data: rows } = await admin
        .from('documents')
        .select('storage_path, summary, document_type, document_date, provider_name')
        .eq('patient_id', patient.id)
        .eq('status', 'active');
      for (const r of rows ?? []) meta.set(r.storage_path, r);
    }

    const signed = docsUnlocked
      ? await Promise.all(
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
              summary: meta.get(d.path)?.summary?.slice(0, 600) ?? null,
              document_type: meta.get(d.path)?.document_type ?? null,
              document_date: meta.get(d.path)?.document_date ?? null,
              provider_name: meta.get(d.path)?.provider_name ?? null,
            };
          }),
        )
      : [];

    admin
      .from('emergency_access_logs')
      .insert({
        patient_id: patient.id,
        ip_hash: rawIp ? ip_hash : null,
        user_agent: ua?.slice(0, 500) ?? null,
      })
      .then(() => {}, () => {});

    return jsonResponse(
      {
        patient: {
          full_name: patient.full_name,
          blood_group: patient.blood_group,
          allergies: patient.allergies ?? [],
          chronic_conditions: patient.chronic_conditions ?? [],
          emergency_contact: patient.emergency_contact,
          abha_number: patient.abha_number ?? null,
          abha_address: patient.abha_address ?? null,
        },
        documents: signed.filter(Boolean),
        documents_locked: !docsUnlocked,
        document_count: docs.length,
        pin_status: pinResult.reason ?? null,
        pin_retry_after: pinResult.retry_after ?? null,
        pin_attempts_left: pinResult.attempts_left ?? null,
        override_status: overrideStatus,
        pass_status: passStatus,
        pass_expires_at: passExpiresAt,
        pass_attempts_left: passAttemptsLeft,
        request_id: requestId,
        request_secret: requestSecret,
        request_status: pollStatus ?? requestStatus,
        access_until: pollAccessUntil,
      },
      200,
    );
  } catch (e) {
    console.error('emergency-lookup error', e);
    return jsonResponse({ error: 'server_error' }, 500);
  }
});
