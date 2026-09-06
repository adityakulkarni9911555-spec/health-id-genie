import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const PACKS: Record<string, { name: string; quantity: number; price_inr: number }> = {
  single: { name: 'Medora printed card', quantity: 1, price_inr: 29900 },
  family3: { name: 'Medora printed cards (family pack of 3)', quantity: 3, price_inr: 69900 },
};

const BodySchema = z.object({
  pack_slug: z.enum(['single', 'family3']),
  patient_id: z.string().uuid(),
  card_data: z.object({
    full_name: z.string().min(1).max(120),
    blood_group: z.string().max(5).optional().nullable(),
    emergency_contacts: z.array(z.string().max(20)).max(3),
    allergies: z.array(z.string().max(80)).max(10),
    conditions: z.array(z.string().max(80)).max(10),
    show_insurance: z.boolean(),
  }),
  delivery: z.object({
    delivery_name: z.string().min(2).max(120),
    delivery_phone: z.string().min(10).max(15),
    address_line1: z.string().min(3).max(200),
    address_line2: z.string().max(200).optional().nullable(),
    city: z.string().min(2).max(80),
    state: z.string().min(2).max(80),
    pincode: z.string().regex(/^\d{6}$/),
  }),
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
    if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return jsonResponse({ error: 'Invalid order', details: parsed.error.flatten() }, 400);
    }
    const { pack_slug, patient_id, card_data, delivery } = parsed.data;
    const pack = PACKS[pack_slug];

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

    const { data: patient, error: patientError } = await admin
      .from('patients')
      .select('id, owner_id')
      .eq('id', patient_id)
      .maybeSingle();

    if (patientError || !patient || patient.owner_id !== userId) {
      return jsonResponse({ error: 'Patient not found' }, 404);
    }

    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({
        amount: pack.price_inr,
        currency: 'INR',
        receipt: `card_${userId.slice(0, 12)}_${Date.now()}`,
        notes: { user_id: userId, pack_slug, app: 'medora', kind: 'card_order' },
      }),
    });

    const orderBody = await orderRes.json();
    if (!orderRes.ok) {
      console.error('Razorpay card order creation failed:', orderBody);
      return jsonResponse({ error: 'Could not create order' }, 502);
    }

    const { data: inserted, error: insertError } = await admin
      .from('card_orders')
      .insert({
        owner_id: userId,
        patient_id,
        pack_slug,
        quantity: pack.quantity,
        card_data,
        amount_inr: pack.price_inr,
        status: 'pending',
        razorpay_order_id: orderBody.id,
        ...delivery,
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      console.error('Card order insert failed:', insertError);
      return jsonResponse({ error: 'Could not store order' }, 500);
    }

    return jsonResponse(
      {
        card_order_id: inserted.id,
        order_id: orderBody.id,
        amount: pack.price_inr,
        currency: 'INR',
        key_id: keyId,
        pack_slug,
        pack_name: pack.name,
      },
      200
    );
  } catch (e) {
    console.error('card-order-create error:', e);
    return jsonResponse({ error: 'server_error' }, 500);
  }
});
