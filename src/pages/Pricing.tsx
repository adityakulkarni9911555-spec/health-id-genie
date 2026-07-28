import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription, loadPlans, type SubscriptionPlan } from '@/hooks/useSubscription';
import { openRazorpayCheckout, createRazorpayOrder } from '@/lib/razorpay';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Check, Loader2, Sparkles, Users, Zap } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const planIcons: Record<string, React.ReactNode> = {
  free: <Sparkles className="w-5 h-5" />,
  premium: <Zap className="w-5 h-5" />,
  family: <Users className="w-5 h-5" />,
};

export default function Pricing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
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

  const paidPlansEnabled = true;

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (plan.slug === 'free') {
      navigate('/');
      return;
    }
    if (!paidPlansEnabled) {
      toast({
        title: 'Paid plans coming soon',
        description: 'We’re finalising payments. Enjoy the free plan in the meantime.',
      });
      return;
    }
    if (!user) {
      navigate('/auth?next=/pricing');
      return;
    }
    setBusyPlan(plan.slug);
    try {
      const order = await createRazorpayOrder(plan.slug as 'premium' | 'family');
      await openRazorpayCheckout(
        order,
        user.email || '',
        user.user_metadata?.full_name || 'Medora User',
        () => {
          toast({ title: 'Welcome to Medora Premium!', description: 'Your plan is now active.' });
          navigate('/');
        },
        (msg) => {
          if (msg !== 'Payment cancelled') {
            toast({ title: 'Payment failed', description: msg, variant: 'destructive' });
          }
          setBusyPlan(null);
        }
      );
    } catch (e) {
      toast({
        title: 'Could not start checkout',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
      setBusyPlan(null);
    }
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
        <link rel="canonical" href="https://health-id-genie.lovable.app/pricing" />
        <meta property="og:title" content="Pricing — Medora Health Wallet Plans" />
        <meta property="og:description" content="Free, Premium, and Family plans for your Medora personal health wallet." />
        <meta property="og:url" content="https://health-id-genie.lovable.app/pricing" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Medora Personal Health Wallet",
          description: "Private digital health wallet with Free, Premium, and Family subscription tiers.",
          brand: { "@type": "Brand", name: "Medora" },
          offers: [
            { "@type": "Offer", name: "Free", price: "0", priceCurrency: "INR", url: "https://health-id-genie.lovable.app/pricing", availability: "https://schema.org/InStock" },
            { "@type": "Offer", name: "Premium", price: "99", priceCurrency: "INR", url: "https://health-id-genie.lovable.app/pricing", availability: "https://schema.org/InStock", priceSpecification: { "@type": "UnitPriceSpecification", price: "99", priceCurrency: "INR", billingIncrement: 1, unitCode: "MON" } },
            { "@type": "Offer", name: "Family", price: "199", priceCurrency: "INR", url: "https://health-id-genie.lovable.app/pricing", availability: "https://schema.org/InStock", priceSpecification: { "@type": "UnitPriceSpecification", price: "199", priceCurrency: "INR", billingIncrement: 1, unitCode: "MON" } },
          ],
        })}</script>
      </Helmet>
      <header className="sticky top-0 z-50 glass-nav border-b border-border/60">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <h1 className="font-display text-lg font-bold text-foreground tracking-tight">Medora Pricing</h1>
              <p className="text-xs text-muted-foreground">Choose your plan</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              Back to app
            </Button>
            <ThemeToggle compact />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simple pricing for your health
          </h2>
          <p className="text-muted-foreground text-lg">
            Start free. Upgrade when you need more space for your family’s records.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const isCurrent = plan.slug === planSlug;
            const isDisabled = isPaid && plan.slug === 'free';
            return (
              <Card
                key={plan.slug}
                className={`relative flex flex-col ${
                  plan.slug === 'family'
                    ? 'border-primary/50 shadow-lg shadow-primary/10'
                    : 'border-border'
                }`}
              >
                {plan.slug === 'family' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    Best value
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {planIcons[plan.slug]}
                    </div>
                    <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-3xl font-bold">{formatPrice(plan.price_inr)}</span>
                    {plan.price_inr > 0 && <span className="text-muted-foreground">/month</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-6 flex-1">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>
                        {plan.max_profiles} profile{plan.max_profiles > 1 ? 's' : ''}
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>
                        {plan.max_documents === null
                          ? 'Unlimited documents'
                          : `Up to ${plan.max_documents} documents`}
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>QR emergency access</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>Sync across devices</span>
                    </li>
                  </ul>
                  <Button
                    className="w-full btn-touch"
                    variant={plan.slug === 'free' ? 'outline' : 'default'}
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
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10 max-w-xl mx-auto">
          All plans keep your data private and encrypted. Paid plans launch soon — for now, enjoy Medora free.
        </p>

      </main>
    </div>
  );
}
