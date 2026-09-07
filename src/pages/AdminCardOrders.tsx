import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Package } from 'lucide-react';
import { CARD_ORDER_STATUS_LABEL } from '@/lib/cardOrders';

interface AdminOrder {
  id: string;
  quantity: number;
  amount_inr: number;
  status: string;
  tracking_note: string | null;
  created_at: string;
  card_data: Record<string, unknown>;
  delivery_name: string;
  delivery_phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
}

const NEXT_STATUS: Record<string, string> = {
  paid: 'printing',
  printing: 'shipped',
  shipped: 'delivered',
};

export default function AdminCardOrders() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from('card_orders')
      .select('*')
      .neq('status', 'pending')
      .order('created_at', { ascending: false });
    setOrders((data ?? []) as AdminOrder[]);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading || !user) return;
    supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' })
      .then(({ data }) => {
        setIsAdmin(Boolean(data));
        if (data) load();
        else setLoading(false);
      });
  }, [authLoading, user]);

  const advance = async (order: AdminOrder) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    const { error } = await supabase
      .from('card_orders')
      .update({ status: next })
      .eq('id', order.id);
    if (error) {
      toast({ title: 'Could not update order', variant: 'destructive' });
      return;
    }
    load();
  };

  const saveNote = async (order: AdminOrder, note: string) => {
    await supabase.from('card_orders').update({ tracking_note: note }).eq('id', order.id);
  };

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground p-6 text-center">
        This page is only for the Medora team.
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-10 max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <Package className="w-6 h-6 text-primary" /> Printed card orders
      </h1>

      {orders.length === 0 && <p className="text-muted-foreground">No paid orders yet.</p>}

      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">
                  {o.quantity} card{o.quantity > 1 ? 's' : ''} · ₹{Math.round(o.amount_inr / 100)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {CARD_ORDER_STATUS_LABEL[o.status] ?? o.status} ·{' '}
                  {new Date(o.created_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              {NEXT_STATUS[o.status] && (
                <Button size="sm" onClick={() => advance(o)}>
                  Mark {NEXT_STATUS[o.status]}
                </Button>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="text-foreground">{o.delivery_name} · {o.delivery_phone}</p>
              <p>
                {o.address_line1}
                {o.address_line2 ? `, ${o.address_line2}` : ''}, {o.city}, {o.state} — {o.pincode}
              </p>
            </div>

            <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(o.card_data, null, 2)}
            </pre>

            <Input
              placeholder="Tracking note"
              defaultValue={o.tracking_note ?? ''}
              onBlur={(e) => saveNote(o, e.target.value)}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
