import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Heart, ShieldCheck, Smartphone, Sparkles, LogIn, ArrowRight, QrCode, FileText } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/SiteFooter';

const CANONICAL = 'https://medorahealthwallet.lovable.app/';

/**
 * Public homepage shown to signed-out visitors at "/".
 * Gives search engines and first-time visitors a real landing page with a
 * clear main heading instead of an immediate redirect to the sign-in screen.
 */
const PublicHome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background hero-surface">
      <Helmet>
        <title>Medora Health — Your Personal Health Wallet</title>
        <meta
          name="description"
          content="Medora is a personal health wallet. Keep your medical records, allergies, medications, and emergency info private and always with you — plus a free printable medical ID card with a QR code."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="Medora Health — Your Personal Health Wallet" />
        <meta
          property="og:description"
          content="Your medical records, allergies, and emergency info — private by design, always with you."
        />
        <meta property="og:url" content={CANONICAL} />
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-nav border-b border-border/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Logo size={40} className="drop-shadow-sm" />
              <div>
                <p className="font-display text-lg font-bold text-foreground tracking-tight leading-none">
                  Medora — Your Digital Health Wallet
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Private by design</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/auth')}>
              <LogIn className="w-4 h-4" />
              Sign in
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 md:py-16">
        {/* Hero */}
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-5 border border-accent-foreground/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Your health, in your pocket</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Your personal{' '}
            <span className="bg-gradient-to-r from-primary to-[hsl(174,62%,45%)] bg-clip-text text-transparent">
              health wallet
            </span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Carry your medical essentials, allergies, and emergency info with you —
            anywhere, anytime. Just for you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Button
              size="lg"
              className="w-full sm:w-auto min-h-[56px] text-base font-semibold"
              onClick={() => navigate('/auth')}
            >
              Create your free health card
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto min-h-[56px] text-base font-semibold"
              onClick={() => navigate('/medical-id-card')}
            >
              <QrCode className="w-5 h-5 mr-2" />
              Free printable medical ID card
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 max-w-3xl mx-auto">
          <FeatureCard
            icon={<Smartphone className="w-5 h-5" />}
            title="Always with you"
            description="Open on any device you sign in with"
          />
          <FeatureCard
            icon={<ShieldCheck className="w-5 h-5" />}
            title="Yours alone"
            description="Private by design — only you can see it"
          />
          <FeatureCard
            icon={<Heart className="w-5 h-5" />}
            title="Ready in emergencies"
            description="Critical info one tap away"
          />
        </div>

        {/* Guides */}
        <section className="max-w-3xl mx-auto mt-12">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground text-center mb-4">
            Learn more
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GuideLink
              to="/medical-id-card"
              icon={<QrCode className="w-5 h-5 text-primary" />}
              title="Free medical ID card with QR code"
              description="Create, print, and share a wallet card paramedics can scan."
            />
            <GuideLink
              to="/blog/benefits-of-personal-health-records"
              icon={<FileText className="w-5 h-5 text-primary" />}
              title="Benefits of a personal health record"
              description="Why keeping your medical history in one place protects you."
            />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="group flex flex-col items-center p-5 rounded-2xl bg-card/70 backdrop-blur-sm border border-border/60 hover:border-primary/40 hover:shadow-md transition-all duration-300">
    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/10 to-[hsl(174,62%,45%)]/10 flex items-center justify-center text-primary mb-3 group-hover:scale-105 transition-transform">
      {icon}
    </div>
    <h2 className="font-semibold text-foreground mb-1 text-sm">{title}</h2>
    <p className="text-xs text-muted-foreground">{description}</p>
  </div>
);

const GuideLink = ({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <a
    href={to}
    className="flex items-start gap-3 p-4 rounded-2xl bg-card/70 border border-border/60 hover:border-primary/40 hover:shadow-md transition-all duration-300"
  >
    <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
      {icon}
    </div>
    <div>
      <p className="font-semibold text-sm text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
    </div>
  </a>
);

export default PublicHome;
