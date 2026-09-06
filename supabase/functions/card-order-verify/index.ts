import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const BodySchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  card_order_id: z.string().uuid(),
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
    if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return jsonResponse({ error: 'Invalid payload' }, 400);
    }
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, card_order_id } = parsed.data;

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) return jsonResponse({ error: 'Payment provider not configured' }, 503);

    const expectedSig = await hmacSha256(keySecret, `${razorpay_order_id}|${razorpay_payment_id}`);
    if (expectedSig !== razorpay_signature) {
      return jsonResponse({ error: 'Invalid payment signature' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { data: order, error: orderError } = await admin
      .from('card_orders')
      .select('id, owner_id, razorpay_order_id')
      .eq('id', card_order_id)
      .maybeSingle();

    if (orderError || !order || order.owner_id !== userId) {
      return jsonResponse({ error: 'Order not found' }, 404);
    }
    if (order.razorpay_order_id !== razorpay_order_id) {
      return jsonResponse({ error: 'Order mismatch' }, 400);
    }

    const { error: updateError } = await admin
      .from('card_orders')
      .update({ status: 'paid', razorpay_payment_id })
      .eq('id', card_order_id);

    if (updateError) {
      console.error('Card order update failed:', updateError);
      return jsonResponse({ error: 'Could not confirm order' }, 500);
    }

    return jsonResponse({ success: true, card_order_id }, 200);
  } catch (e) {
    console.error('card-order-verify error:', e);
    return jsonResponse({ error: 'server_error' }, 500);
  }
});
