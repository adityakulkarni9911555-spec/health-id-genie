import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const BodySchema = z.object({
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
      return jsonResponse({ error: 'Invalid plan', details: parsed.error.flatten() }, 400);
    }

    const { plan_slug } = parsed.data;

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      return jsonResponse({ error: 'Payment provider not configured' }, 503);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { data: plan, error: planError } = await admin
      .from('subscription_plans')
      .select('price_inr, name')
      .eq('slug', plan_slug)
      .single();

    if (planError || !plan) {
      return jsonResponse({ error: 'Plan not found' }, 404);
    }

    const receipt = `medora_${userId.slice(0, 16)}_${Date.now()}`;

    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({
        amount: plan.price_inr,
        currency: 'INR',
        receipt,
        notes: {
          user_id: userId,
          plan_slug,
          app: 'medora',
        },
      }),
    });

    const orderBody = await orderRes.json();
    if (!orderRes.ok) {
      console.error('Razorpay order creation failed:', orderBody);
      return jsonResponse({ error: 'Could not create order', details: orderBody }, 502);
    }

    const orderId = orderBody.id;

    const { error: upsertError } = await admin
      .from('user_subscriptions')
      .upsert(
        {
          owner_id: userId,
          plan_slug,
          status: 'pending',
          razorpay_order_id: orderId,
        },
        { onConflict: 'owner_id,plan_slug' }
      );

    if (upsertError) {
      console.error('Subscription upsert failed:', upsertError);
      return jsonResponse({ error: 'Could not store order' }, 500);
    }

    return jsonResponse(
      {
        order_id: orderId,
        amount: plan.price_inr,
        currency: 'INR',
        key_id: keyId,
        plan_slug,
        plan_name: plan.name,
      },
      200
    );
  } catch (e) {
    console.error('razorpay-create-order error:', e);
    return jsonResponse({ error: 'server_error' }, 500);
  }
});
