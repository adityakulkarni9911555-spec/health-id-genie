import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

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
    const signature = req.headers.get('x-razorpay-signature');
    const body = await req.text();

    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      return jsonResponse({ error: 'Webhook secret not configured' }, 503);
    }

    if (!signature) {
      return jsonResponse({ error: 'Missing signature' }, 400);
    }

    const expectedSig = await hmacSha256(webhookSecret, body);
    if (signature !== expectedSig) {
      return jsonResponse({ error: 'Invalid signature' }, 401);
    }

    const event = JSON.parse(body);
    const eventType = event.event as string;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    if (eventType === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (!payment?.order_id) {
        return jsonResponse({ error: 'Invalid payload' }, 400);
      }

      const notes = payment.notes || {};
      const userId = notes.user_id;
      const planSlug = notes.plan_slug;

      if (!userId || !planSlug) {
        return jsonResponse({ error: 'Missing notes' }, 400);
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await admin
        .from('user_subscriptions')
        .upsert(
          {
            owner_id: userId,
            plan_slug: planSlug,
            status: 'active',
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            razorpay_order_id: payment.order_id,
            razorpay_payment_id: payment.id,
          },
          { onConflict: 'owner_id,plan_slug' }
        );

      const updatePayload: Record<string, unknown> = {
        plan_slug: planSlug,
        subscription_expires_at: expiresAt.toISOString(),
      };

      if (planSlug === 'family') {
        const { data: existingGroup } = await admin
          .from('family_groups')
          .select('id')
          .eq('owner_id', userId)
          .maybeSingle();

        if (!existingGroup) {
          const { data: newGroup } = await admin
            .from('family_groups')
            .insert({ owner_id: userId, plan_slug: 'family', max_members: 5 })
            .select('id')
            .single();
          if (newGroup) updatePayload.family_group_id = newGroup.id;
        }
      }

      await admin.from('profiles').update(updatePayload).eq('id', userId);
    }

    if (eventType === 'subscription.cancelled') {
      const subscription = event.payload?.subscription?.entity;
      if (subscription?.id) {
        await admin
          .from('user_subscriptions')
          .update({ status: 'cancelled' })
          .eq('razorpay_order_id', subscription.id);
      }
    }

    return jsonResponse({ received: true }, 200);
  } catch (e) {
    console.error('razorpay-webhook error:', e);
    return jsonResponse({ error: 'server_error' }, 500);
  }
});
