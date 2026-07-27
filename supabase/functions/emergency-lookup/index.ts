import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const InputSchema = z.object({
  token: z.string().uuid(),
});

const notFound = () =>
  new Response(JSON.stringify({ error: 'not_found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const hashIp = async (ip: string) => {
  const enc = new TextEncoder().encode(ip + '::medora-emergency');
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
      return new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { data: patient, error } = await admin
      .from('patients')
      .select(
        'id, full_name, date_of_birth, gender, blood_group, height, weight, allergies, chronic_conditions, emergency_contact, documents, share_revoked'
      )
      .eq('share_token', parsed.data.token)
      .maybeSingle();

    if (error || !patient || patient.share_revoked) return notFound();

    // Fresh signed URLs for every current document (5 min)
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
      })
    );

    // Audit log — hashed IP only
    const rawIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('cf-connecting-ip') ??
      '';
    const ip_hash = rawIp ? await hashIp(rawIp) : null;
    const user_agent = req.headers.get('user-agent')?.slice(0, 500) ?? null;

    admin
      .from('emergency_access_logs')
      .insert({ patient_id: patient.id, ip_hash, user_agent })
      .then(() => {})
      .catch(() => {});

    return new Response(
      JSON.stringify({
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
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
