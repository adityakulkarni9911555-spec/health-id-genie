import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const BodySchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  plan_slug: z.enum(['premium', 'family']),
});

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const getUserId = async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { persistSession: false }, global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return data.claims.sub as string;
};

const hmacSha256 = async (secret: string, message: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const userId = await getUserId(req);
    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return jsonResponse({ error: 'Invalid payload', details: parsed.error.flatten() }, 400);
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan_slug } = parsed.data;

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      return jsonResponse({ error: 'Payment provider not configured' }, 503);
    }

    const expectedSig = await hmacSha256(keySecret, `${razorpay_order_id}|${razorpay_payment_id}`);
    const isValid = expectedSig === razorpay_signature;

    if (!isValid) {
      return jsonResponse({ error: 'Invalid payment signature' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error: subError } = await admin
      .from('user_subscriptions')
      .upsert(
        {
          owner_id: userId,
          plan_slug,
          status: 'active',
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          razorpay_order_id,
          razorpay_payment_id,
        },
        { onConflict: 'owner_id,plan_slug' }
      );

    if (subError) {
      console.error('Subscription activation failed:', subError);
      return jsonResponse({ error: 'Could not activate subscription' }, 500);
    }

    const updatePayload: Record<string, unknown> = {
      plan_slug,
      subscription_expires_at: expiresAt.toISOString(),
    };

    if (plan_slug === 'family') {
      const { data: existingGroup } = await admin
        .from('family_groups')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle();

      if (!existingGroup) {
        const { data: newGroup, error: groupError } = await admin
          .from('family_groups')
          .insert({ owner_id: userId, plan_slug: 'family', max_members: 5 })
          .select('id')
          .single();

        if (groupError || !newGroup) {
          console.error('Family group creation failed:', groupError);
          return jsonResponse({ error: 'Could not create family group' }, 500);
        }

        updatePayload.family_group_id = newGroup.id;
      }
    }

    const { error: profileError } = await admin
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update failed:', profileError);
      return jsonResponse({ error: 'Could not update profile' }, 500);
    }

    return jsonResponse(
      {
        success: true,
        plan_slug,
        expires_at: expiresAt.toISOString(),
      },
      200
    );
  } catch (e) {
    console.error('razorpay-verify-payment error:', e);
    return jsonResponse({ error: 'server_error' }, 500);
  }
});
