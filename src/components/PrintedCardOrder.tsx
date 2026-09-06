import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Patient } from '@/types/patient';
import { publicEmergencyUrl } from '@/lib/publicUrl';
import {
  CARD_PACKS,
  CARD_ORDER_STATUS_LABEL,
  type CardPackSlug,
  type CardOrder,
  createCardOrder,
  payForCardOrder,
  listCardOrders,
  cancelCardOrder,
} from '@/lib/cardOrders';
import { CreditCard, Loader2, Truck, ShieldCheck, Droplets, AlertTriangle } from 'lucide-react';

interface Props {
  patient: Patient;
}

export const PrintedCardOrder = ({ patient }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [pack, setPack] = useState<CardPackSlug>('single');
  const [allergies, setAllergies] = useState<string[]>(patient.allergies ?? []);
  const [conditions, setConditions] = useState<string[]>(patient.chronicConditions ?? []);
  const [showInsurance, setShowInsurance] = useState(Boolean(patient.insuranceProvider));
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<CardOrder[]>([]);
  const [delivery, setDelivery] = useState({
    delivery_name: patient.fullName,
    delivery_phone: patient.phoneNumber,
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  const refresh = () => {
    listCardOrders()
      .then(setOrders)
      .catch(() => setOrders([]));
  };

  useEffect(() => {
    refresh();
  }, []);

  const shareUrl = patient.shareToken ? publicEmergencyUrl(patient.shareToken) : patient.id;
  const selected = CARD_PACKS[pack];

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const canSubmit = useMemo(
    () =>
      delivery.delivery_name.trim().length > 1 &&
      /^\d{10}$/.test(delivery.delivery_phone.replace(/\D/g, '')) &&
      delivery.address_line1.trim().length > 2 &&
      delivery.city.trim().length > 1 &&
      delivery.state.trim().length > 1 &&
      /^\d{6}$/.test(delivery.pincode),
    [delivery]
  );

  const handleOrder = async () => {
    if (!canSubmit) {
      toast({ title: 'Please complete the delivery address', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const order = await createCardOrder({
        pack_slug: pack,
        patient_id: patient.id,
        card_data: {
          full_name: patient.fullName,
          blood_group: patient.bloodGroup || null,
          emergency_contacts: [patient.emergencyContact].filter(Boolean),
          allergies,
          conditions,
          show_insurance: showInsurance,
        },
        delivery: {
          ...delivery,
          delivery_phone: delivery.delivery_phone.replace(/\D/g, ''),
          address_line2: delivery.address_line2 || null,
        },
      });

      await payForCardOrder(
        order,
        { name: patient.fullName, email: user?.email ?? '' },
        () => {
          setBusy(false);
          setOpen(false);
          refresh();
          toast({
            title: 'Card ordered',
            description: 'We will print and post it within 5–7 working days.',
          });
        },
        (msg) => {
          setBusy(false);
          refresh();
          toast({ title: msg, variant: 'destructive' });
        }
      );
    } catch (e) {
      setBusy(false);
      toast({
        title: 'Could not start the order',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelCardOrder(id);
      refresh();
      toast({ title: 'Order cancelled' });
    } catch {
      toast({ title: 'Could not cancel this order', variant: 'destructive' });
    }
  };

  return (
    <div className="form-section no-print">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground">
            Want this on a real card?
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            A wallet-size plastic card with your blood group, emergency numbers, highlighted
            conditions and the same QR code. Delivered in 5–7 working days.
          </p>
        </div>
      </div>

      {/* Physical card preview */}
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm aspect-[85.6/54] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                Medora Card
              </p>
              <p className="font-display font-bold text-foreground text-sm truncate">
                {patient.fullName}
              </p>
            </div>
            {patient.bloodGroup && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-[10px] font-bold">
                <Droplets className="w-3 h-3" />
                {patient.bloodGroup}
              </span>
            )}
          </div>
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">
                Emergency
              </p>
              <p className="text-xs font-medium text-foreground truncate">
                {patient.emergencyContact}
              </p>
              {allergies.length > 0 && (
                <p className="text-[10px] text-warning font-semibold truncate flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {allergies.join(', ')}
                </p>
              )}
            </div>
            <div className="bg-white p-1 rounded">
              <QRCodeSVG value={shareUrl} size={44} level="M" includeMargin={false} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4 aspect-[85.6/54] flex flex-col justify-center gap-1 text-xs text-muted-foreground">
          <p className="text-[9px] uppercase tracking-[0.2em] font-semibold text-foreground">
            Back of card
          </p>
          {conditions.length > 0 && <p>Conditions: {conditions.join(', ')}</p>}
          {showInsurance && patient.insuranceProvider && (
            <p>
              Insurance: {patient.insuranceProvider}
              {patient.policyNumber ? ` · ${patient.policyNumber}` : ''}
            </p>
          )}
          <p className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Scan the QR for up-to-date records
          </p>
        </div>
      </div>

      {!open ? (
        <Button className="btn-touch w-full sm:w-auto" onClick={() => setOpen(true)}>
          <CreditCard className="w-5 h-5 mr-2" />
          Order printed card — ₹{CARD_PACKS.single.priceInr}
        </Button>
      ) : (
        <div className="space-y-5">
          {/* Pack */}
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(CARD_PACKS) as CardPackSlug[]).map((slug) => {
              const p = CARD_PACKS[slug];
              const active = pack === slug;
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => setPack(slug)}
                  className={`text-left rounded-xl border p-4 min-h-[56px] transition-colors ${
                    active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <p className="font-medium text-foreground text-sm">{p.label}</p>
                  <p className="text-sm text-muted-foreground">₹{p.priceInr} · delivery included</p>
                </button>
              );
            })}
          </div>

          {/* Highlights */}
          {(patient.allergies?.length > 0 || patient.chronicConditions?.length > 0 ||
            patient.insuranceProvider) && (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">What should we print?</p>
              {patient.allergies?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Allergies</p>
                  {patient.allergies.map((a) => (
                    <label key={a} className="flex items-center gap-3 text-sm min-h-[40px]">
                      <Checkbox
                        checked={allergies.includes(a)}
                        onCheckedChange={() => toggle(allergies, setAllergies, a)}
                      />
                      <span>{a}</span>
                    </label>
                  ))}
                </div>
              )}
              {patient.chronicConditions?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Conditions
                  </p>
                  {patient.chronicConditions.map((c) => (
                    <label key={c} className="flex items-center gap-3 text-sm min-h-[40px]">
                      <Checkbox
                        checked={conditions.includes(c)}
                        onCheckedChange={() => toggle(conditions, setConditions, c)}
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              )}
              {patient.insuranceProvider && (
                <label className="flex items-center gap-3 text-sm min-h-[40px]">
                  <Checkbox
                    checked={showInsurance}
                    onCheckedChange={(v) => setShowInsurance(Boolean(v))}
                  />
                  <span>Print insurance / policy details</span>
                </label>
              )}
            </div>
          )}

          {/* Delivery */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="co-name">Full name</Label>
              <Input
                id="co-name"
                value={delivery.delivery_name}
                onChange={(e) => setDelivery({ ...delivery, delivery_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-phone">Contact number</Label>
              <Input
                id="co-phone"
                inputMode="numeric"
                value={delivery.delivery_phone}
                onChange={(e) => setDelivery({ ...delivery, delivery_phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="co-addr1">Address</Label>
              <Input
                id="co-addr1"
                placeholder="House / flat, street"
                value={delivery.address_line1}
                onChange={(e) => setDelivery({ ...delivery, address_line1: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="co-addr2">Landmark (optional)</Label>
              <Input
                id="co-addr2"
                value={delivery.address_line2}
                onChange={(e) => setDelivery({ ...delivery, address_line2: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-city">City</Label>
              <Input
                id="co-city"
                value={delivery.city}
                onChange={(e) => setDelivery({ ...delivery, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-state">State</Label>
              <Input
                id="co-state"
                value={delivery.state}
                onChange={(e) => setDelivery({ ...delivery, state: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-pin">Pincode</Label>
              <Input
                id="co-pin"
                inputMode="numeric"
                maxLength={6}
                value={delivery.pincode}
                onChange={(e) => setDelivery({ ...delivery, pincode: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="btn-touch flex-1" onClick={handleOrder} disabled={busy}>
              {busy ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Truck className="w-5 h-5 mr-2" />
              )}
              Pay ₹{selected.priceInr} and order
            </Button>
            <Button variant="outline" className="btn-touch" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Existing orders */}
      {orders.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-sm font-medium text-foreground">Your card orders</p>
          {orders.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm text-foreground">
                  {o.quantity} card{o.quantity > 1 ? 's' : ''} · ₹{Math.round(o.amount_inr / 100)}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {CARD_ORDER_STATUS_LABEL[o.status] ?? o.status}
                  {o.tracking_note ? ` · ${o.tracking_note}` : ''}
                </p>
              </div>
              {(o.status === 'pending' || o.status === 'paid') && (
                <Button size="sm" variant="ghost" onClick={() => handleCancel(o.id)}>
                  Cancel
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
