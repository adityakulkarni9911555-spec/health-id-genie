import { supabase } from '@/integrations/supabase/client';

export interface RazorpayOrder {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  plan_slug: string;
  plan_name: string;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export async function createRazorpayOrder(planSlug: 'premium' | 'family'): Promise<RazorpayOrder> {
  const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
    body: { plan_slug: planSlug },
  });
  if (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(details);
  }
  return data as RazorpayOrder;
}

export async function verifyRazorpayPayment(payload: {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  plan_slug: string;
}): Promise<{ success: boolean; plan_slug: string; expires_at: string }> {
  const { data, error } = await supabase.functions.invoke('razorpay-verify-payment', {
    body: payload,
  });
  if (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(details);
  }
  return data as { success: boolean; plan_slug: string; expires_at: string };
}

export function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('razorpay-checkout')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay checkout'));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(
  order: RazorpayOrder,
  userEmail: string,
  userName: string,
  onSuccess: () => void,
  onError: (msg: string) => void
) {
  await loadRazorpayScript();

  const options = {
    key: order.key_id,
    amount: order.amount,
    currency: order.currency,
    name: 'Medora',
    description: `${order.plan_name} Plan`,
    order_id: order.order_id,
    prefill: {
      name: userName,
      email: userEmail,
    },
    theme: {
      color: '#7c3aed',
    },
    handler: async (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => {
      try {
        await verifyRazorpayPayment({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
          plan_slug: order.plan_slug,
        });
        onSuccess();
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Payment verification failed');
      }
    },
    modal: {
      ondismiss: () => {
        onError('Payment cancelled');
      },
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
}
