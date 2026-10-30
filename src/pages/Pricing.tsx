import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

import { useSubscription, loadPlans, type SubscriptionPlan } from '@/hooks/useSubscription';

import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowLeft, Check, Loader2, Lock, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const planIcons: Record<string, React.ReactNode> = {
  free: <Sparkles className="w-5 h-5" />,
  premium: <Zap className="w-5 h-5" />,
  family: <Users className="w-5 h-5" />,
};

export default function Pricing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { planSlug, isPaid, loading: subLoading } = useSubscription();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  useEffect(() => {
    loadPlans()
      .then(setPlans)
      .catch((e) => {
        toast({ title: 'Could not load plans', description: String(e), variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const paidPlansEnabled = false;

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (plan.slug === 'free') {
      navigate('/');
      return;
    }
    toast({
      title: 'Paid plans coming soon',
      description: 'Medora is completely free to use right now.',
    });
  };

  const formatPrice = (paise: number) => {
    if (paise === 0) return 'Free';
    return `₹${(paise / 100).toFixed(0)}`;
  };

  if (loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background hero-surface">
      <Helmet>
        <title>Pricing — Medora Health Wallet Plans</title>
        <meta name="description" content="Compare Medora subscription plans. Free personal wallet, Premium ₹99/mo for unlimited documents, and Family ₹199/mo for up to 6 members." />
        <link rel="canonical" href="https://medorahealthwallet.lovable.app/pricing" />
        <meta property="og:title" content="Pricing — Medora Health Wallet Plans" />
        <meta property="og:description" content="Free, Premium, and Family plans for your Medora personal health wallet." />
        <meta property="og:url" content="https://medorahealthwallet.lovable.app/pricing" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Medora Personal Health Wallet",
          description: "Private digital health wallet with Free, Premium, and Family subscription tiers.",
          brand: { "@type": "Brand", name: "Medora" },
          offers: [
            { "@type": "Offer", name: "Free", price: "0", priceCurrency: "INR", url: "https://medorahealthwallet.lovable.app/pricing", availability: "https://schema.org/InStock" },
            { "@type": "Offer", name: "Premium", price: "99", priceCurrency: "INR", url: "https://medorahealthwallet.lovable.app/pricing", availability: "https://schema.org/InStock", priceSpecification: { "@type": "UnitPriceSpecification", price: "99", priceCurrency: "INR", billingIncrement: 1, unitCode: "MON" } },
            { "@type": "Offer", name: "Family", price: "199", priceCurrency: "INR", url: "https://medorahealthwallet.lovable.app/pricing", availability: "https://schema.org/InStock", priceSpecification: { "@type": "UnitPriceSpecification", price: "199", priceCurrency: "INR", billingIncrement: 1, unitCode: "MON" } },
          ],
        })}</script>
      </Helmet>
      <header className="sticky top-0 z-50 glass-nav border-b border-border/60">
        <div className="container mx-auto px-3 h-16 flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full" onClick={() => navigate('/')} aria-label="Back to Medora wallet">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <p className="font-display text-base font-bold text-foreground tracking-tight">Medora Plans</p>
          </div>
          <ThemeToggle compact />
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 pb-16 md:py-16 max-w-5xl">
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success px-3 py-1 text-xs font-semibold mb-4">
            <ShieldCheck className="w-3.5 h-3.5" /> Medora is free right now
          </span>
          <h1 className="font-display text-[1.75rem] leading-tight md:text-4xl font-bold text-foreground mb-3">
            Choose the plan that fits you
          </h1>
          <p className="text-muted-foreground text-[0.95rem]">
            Start free. Upgrade later for more space and your whole family.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {plans.map((plan) => {
            const isCurrent = plan.slug === planSlug;
            const isDisabled = isPaid && plan.slug === 'free';
            const featured = plan.slug === 'family';
            const features = [
              `${plan.max_profiles} profile${plan.max_profiles > 1 ? 's' : ''}`,
              plan.max_documents === null ? 'Unlimited documents' : `Up to ${plan.max_documents} documents`,
              'Emergency QR access',
              'Sync across devices',
            ];
            return (
              <section
                key={plan.slug}
                className={`relative flex flex-col rounded-3xl border bg-card p-5 md:p-6 ${
                  featured ? 'border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/30' : 'border-border shadow-sm'
                } ${isCurrent ? 'ring-2 ring-success/50' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${featured ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                      {planIcons[plan.slug]}
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold leading-tight">{plan.name}</h2>
                      <p className="text-xs text-muted-foreground line-clamp-1">{plan.description}</p>
                    </div>
                  </div>
                  {isCurrent ? (
                    <span className="shrink-0 rounded-full bg-success/10 text-success px-2.5 py-1 text-[11px] font-semibold">Your plan</span>
                  ) : featured ? (
                    <span className="shrink-0 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold">Best value</span>
                  ) : null}
                </div>

                <div className="flex items-baseline gap-1 mt-5">
                  <span className="font-display text-4xl font-extrabold tracking-tight">{formatPrice(plan.price_inr)}</span>
                  {plan.price_inr > 0 && <span className="text-sm text-muted-foreground">/month</span>}
                </div>

                <ul className="mt-5 space-y-2.5 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <span className="w-5 h-5 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                  {featured && (
                    <li className="flex items-center gap-3 text-sm">
                      <span className="w-5 h-5 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                      <span className="text-foreground">Each member keeps private records</span>
                    </li>
                  )}
                </ul>

                <Button
                  className="w-full min-h-14 rounded-2xl mt-6 text-base font-semibold"
                  variant={featured && !isCurrent ? 'default' : 'outline'}
                  disabled={isCurrent || isDisabled || busyPlan === plan.slug || (!paidPlansEnabled && plan.price_inr > 0)}
                  onClick={() => handleUpgrade(plan)}
                >
                  {busyPlan === plan.slug && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isCurrent
                    ? 'Current plan'
                    : isDisabled
                    ? 'Downgrade in settings'
                    : plan.price_inr === 0
                    ? 'Continue free'
                    : !paidPlansEnabled
                    ? 'Coming soon'
                    : 'Upgrade'}
                </Button>
              </section>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-muted/40 p-4 flex gap-3 items-start max-w-xl mx-auto">
          <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Every plan keeps your records private — only you decide who sees them. Printed wallet cards are coming soon.
          </p>
        </div>
      </main>
    </div>
  );
}
