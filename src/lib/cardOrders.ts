import { supabase } from '@/integrations/supabase/client';

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
  amount_inr: number;
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
  pending: 'Order received — queued for printing',
  paid: 'Queued for printing',
  printing: 'Printing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
