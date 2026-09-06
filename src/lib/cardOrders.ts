import { supabase } from '@/integrations/supabase/client';
import { loadRazorpayScript } from '@/lib/razorpay';

export const CARD_PACKS = {
  single: { slug: 'single', label: '1 printed card', quantity: 1, priceInr: 299 },
  family3: { slug: 'family3', label: 'Family pack — 3 cards', quantity: 3, priceInr: 699 },
} as const;

export type CardPackSlug = keyof typeof CARD_PACKS;

export interface CardOrderCardData {
  full_name: string;
  blood_group?: string | null;
  emergency_contacts: string[];
  allergies: string[];
  conditions: string[];
  show_insurance: boolean;
}

export interface CardOrderDelivery {
  delivery_name: string;
  delivery_phone: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  pincode: string;
}

export interface CardOrder {
  id: string;
  pack_slug: string;
  quantity: number;
  amount_inr: number;
  status: string;
  tracking_note: string | null;
  created_at: string;
}

interface CreatedOrder {
  card_order_id: string;
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  pack_slug: string;
  pack_name: string;
}

export async function createCardOrder(payload: {
  pack_slug: CardPackSlug;
  patient_id: string;
  card_data: CardOrderCardData;
  delivery: CardOrderDelivery;
}): Promise<CreatedOrder> {
  const { data, error } = await supabase.functions.invoke('card-order-create', { body: payload });
  if (error) throw new Error(error instanceof Error ? error.message : String(error));
  return data as CreatedOrder;
}

export async function payForCardOrder(
  order: CreatedOrder,
  buyer: { name: string; email: string },
  onSuccess: () => void,
  onError: (msg: string) => void
) {
  await loadRazorpayScript();

  const rzp = new window.Razorpay({
    key: order.key_id,
    amount: order.amount,
    currency: order.currency,
    name: 'Medora',
    description: order.pack_name,
    order_id: order.order_id,
    prefill: { name: buyer.name, email: buyer.email },
    theme: { color: '#7c3aed' },
    handler: async (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => {
      const { error } = await supabase.functions.invoke('card-order-verify', {
        body: { ...response, card_order_id: order.card_order_id },
      });
      if (error) {
        onError('We could not confirm your payment. Please contact support.');
        return;
      }
      onSuccess();
    },
    modal: { ondismiss: () => onError('Payment cancelled') },
  });

  rzp.open();
}

export async function listCardOrders(): Promise<CardOrder[]> {
  const { data, error } = await supabase
    .from('card_orders')
    .select('id, pack_slug, quantity, amount_inr, status, tracking_note, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CardOrder[];
}

export async function cancelCardOrder(id: string): Promise<void> {
  const { error } = await supabase.from('card_orders').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw new Error(error.message);
}

export const CARD_ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting payment',
  paid: 'Paid — queued for printing',
  printing: 'Printing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
