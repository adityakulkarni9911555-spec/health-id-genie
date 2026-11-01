import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ShieldCheck,
  Smartphone,
  LogIn,
  ArrowRight,
  QrCode,
  FileText,
  Lock,
  KeyRound,
  EyeOff,
  UserPlus,
  Upload,
  HeartPulse,
  Check,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/SiteFooter';

const CANONICAL = 'https://medorahealthwallet.lovable.app/';

/**
 * Public homepage shown to signed-out visitors at "/".
 * Keeps the visible "Your personal health wallet" heading for search engines.
 */
const PublicHome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background hero-surface overflow-x-clip">
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

      <header className="sticky top-0 z-50 glass-nav border-b border-border/60 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2.5" aria-label="Medora home">
            <Logo size={34} />
            <span className="font-display text-lg font-bold tracking-tight text-foreground">Medora</span>
          </a>
          <nav className="flex items-center gap-1 sm:gap-2">
            <a
              href="/pricing"
              className="hidden sm:inline-flex px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Plans
            </a>
            <a
              href="/medical-id-card"
              className="hidden md:inline-flex px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Medical ID card
            </a>
            <Button variant="outline" size="sm" className="gap-1.5 h-10" onClick={() => navigate('/auth')}>
              <LogIn className="w-4 h-4" />
              Sign in
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 pt-10 pb-14 md:pt-20 md:pb-24 grid md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold mb-5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Private by design
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.05]">
              Your personal <span className="text-primary">health wallet</span>
            </h1>
            <p className="mt-5 text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto md:mx-0">
              Keep records, allergies and emergency contacts in one secure place — with a QR health card
              that helps responders when it matters.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center md:justify-start">
              <Button size="lg" className="min-h-14 px-7 text-base font-semibold" onClick={() => navigate('/auth')}>
                Create your free health card
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-h-14 px-6 text-base font-semibold"
                onClick={() => navigate('/medical-id-card')}
              >
                <QrCode className="w-5 h-5 mr-2" />
                Printable medical ID
              </Button>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 justify-center md:justify-start text-sm text-muted-foreground">
              {['Free to start', 'Works on any phone', 'PIN-protected reports'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <CardMockup />
        </section>

        {/* Trust */}
        <section className="border-y border-border/60 bg-card/60">
          <div className="container mx-auto px-4 py-14 md:py-20">
            <div className="max-w-2xl mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Security</p>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Built so only you control your records
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <TrustItem icon={<Lock />} title="Owner-only access" text="Your documents are never visible to another account." />
              <TrustItem icon={<KeyRound />} title="PIN for reports" text="A QR scan shows only vital info. Reports need your 4-digit PIN." />
              <TrustItem icon={<EyeOff />} title="Protected viewer" text="Shared reports are watermarked and cleared when the tab closes." />
              <TrustItem icon={<Smartphone />} title="Works offline" text="Your card stays available and syncs when you're back online." />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="container mx-auto px-4 py-14 md:py-20">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">How it works</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Ready in three steps
            </h2>
          </div>
          <ol className="grid md:grid-cols-3 gap-4">
            <Step n={1} icon={<UserPlus />} title="Create your account" text="Sign up with email and password — no codes to wait for." />
            <Step n={2} icon={<Upload />} title="Add your records" text="Upload prescriptions, test results and hospital summaries." />
            <Step n={3} icon={<HeartPulse />} title="Carry your card" text="Save your health card to your phone or print it for your wallet." />
          </ol>
        </section>

        {/* Guides */}
        <section className="container mx-auto px-4 pb-16">
          <div className="grid sm:grid-cols-2 gap-3 max-w-4xl">
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

        {/* Final CTA */}
        <section className="container mx-auto px-4 pb-20">
          <div className="rounded-3xl bg-primary text-primary-foreground px-6 py-12 md:px-12 text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
              Your health information, ready when you need it
            </h2>
            <p className="mt-3 opacity-85 max-w-xl mx-auto">Start free. Upgrade only if you need more space or family members.</p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-7 min-h-14 px-8 text-base font-semibold"
              onClick={() => navigate('/auth')}
            >
              Get started free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

/** Illustrative card preview — sample data only, no real patient. */
const CardMockup = () => (
  <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
    <div className="absolute -inset-6 rounded-[2rem] bg-primary/10 blur-2xl" />
    <div className="relative wallet-id-card rounded-3xl border border-border bg-card p-6 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Logo size={30} />
          <div>
            <p className="font-semibold text-sm text-foreground leading-none">Medora Health ID</p>
            <p className="text-[11px] text-muted-foreground mt-1">SAMPLE · MD-0000</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-primary">
          <ShieldCheck className="w-3.5 h-3.5" /> Active
        </span>
      </div>
      <div className="flex gap-5 pt-5">
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center font-display text-xl font-bold text-primary">
              S
            </div>
            <div>
              <p className="font-display font-bold text-lg text-foreground leading-tight">Sample Name</p>
              <p className="text-xs text-muted-foreground">Born 01 Jan 1990</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">O+</span>
            <span className="px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">Allergy: none</span>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Emergency contact</p>
            <p className="font-semibold text-foreground">+91 •••••• ••••</p>
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-center gap-1.5">
          <div className="w-24 h-24 rounded-2xl border border-border bg-background flex items-center justify-center">
            <QrCode className="w-16 h-16 text-foreground" strokeWidth={1.25} />
          </div>
          <p className="text-[10px] text-muted-foreground">Emergency QR</p>
        </div>
      </div>
    </div>
  </div>
);

const TrustItem = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <div className="rounded-2xl border border-border bg-background p-5">
    <div className="w-10 h-10 rounded-xl bg-accent text-primary flex items-center justify-center mb-4 [&>svg]:w-5 [&>svg]:h-5">
      {icon}
    </div>
    <h3 className="font-semibold text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{text}</p>
  </div>
);

const Step = ({ n, icon, title, text }: { n: number; icon: React.ReactNode; title: string; text: string }) => (
  <li className="rounded-2xl border border-border bg-card p-6">
    <div className="flex items-center justify-between mb-5">
      <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">
        {icon}
      </div>
      <span className="font-display text-3xl font-bold text-muted-foreground/30">0{n}</span>
    </div>
    <h3 className="font-semibold text-lg text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{text}</p>
  </li>
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
    className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors"
  >
    <div className="w-10 h-10 shrink-0 rounded-xl bg-accent flex items-center justify-center">{icon}</div>
    <div>
      <p className="font-semibold text-sm text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
    </div>
  </a>
);

export default PublicHome;
