import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientRegistrationForm } from '@/components/PatientRegistrationForm';
import PublicHome from '@/pages/PublicHome';
import { HealthCardPreview } from '@/components/HealthCardPreview';
import { Logo } from '@/components/Logo';
import { SyncStatusBanner } from '@/components/SyncStatusBanner';
import { DeviceConditionBanner } from '@/components/DeviceConditionBanner';
import { UpgradeBanner } from '@/components/UpgradeBanner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Patient } from '@/types/patient';
import { Heart, ShieldCheck, Smartphone, Sparkles, Wifi, WifiOff, LogOut, Crown, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { loadPatientForCurrentUser } from '@/lib/patientProfile';
import { useToast } from '@/hooks/use-toast';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const [registeredPatient, setRegisteredPatient] = useState<Patient | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { planSlug, isPaid, isFamily, loading: subLoading } = useSubscription();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoadingPatient(false);
      return;
    }
    let cancelled = false;
    setLoadingPatient(true);
    loadPatientForCurrentUser()
      .then((p) => {
        if (!cancelled) setRegisteredPatient(p);
      })
      .finally(() => {
        if (!cancelled) setLoadingPatient(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  // While an OAuth callback (hash tokens or ?code=) is still being processed by
  // the Supabase client, defer the redirect so we don't strip the hash and lose
  // the session.
  const hasPendingAuthCallback =
    typeof window !== "undefined" &&
    (window.location.hash.includes("access_token=") ||
      window.location.hash.includes("code=") ||
      window.location.search.includes("code="));

  if (!authLoading && !user && !hasPendingAuthCallback) {
    return <PublicHome />;
  }

  const handlePatientRegistered = (patient: Patient) => {
    setRegisteredPatient(patient);
  };

  const handleEdit = () => {
    setRegisteredPatient(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: 'Signed out', description: 'You can sign back in anytime.' });
  };

  return (
    <div className="min-h-screen bg-background wallet-surface">
      <Helmet>
        <title>Medora Health — Your Personal Health Wallet</title>
        <meta name="description" content="Medora is a personal health wallet app. The Medora Health app keeps your medical records, allergies, medications, and emergency info private and always with you." />
        <link rel="canonical" href="https://medorahealthwallet.lovable.app/" />
        <meta property="og:title" content="Medora Health — Your Personal Health Wallet" />
        <meta property="og:description" content="Medora is a personal health wallet app. Your medical records, allergies, and emergency info — private by design, always with you." />
        <meta property="og:url" content="https://medorahealthwallet.lovable.app/" />
      </Helmet>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border no-print">
        <div className="container mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Logo size={36} className="drop-shadow-sm shrink-0" />
              <div className="min-w-0">
                <p className="font-display text-lg font-bold text-foreground tracking-tight leading-none">
                  Medora
                  
                </p>
                <p className="hidden sm:block text-xs text-muted-foreground mt-0.5">Private by design</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="hidden md:flex items-center gap-2">
                {isOnline ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm">
                    <Wifi className="w-3.5 h-3.5" />
                    <span className="font-medium">Secure & Online</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-sm">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span className="font-medium">Offline — saving locally</span>
                  </div>
                )}
              </div>
              {!isOnline && (
                <div className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 text-warning text-xs">
                  <WifiOff className="w-3 h-3" />
                  <span className="font-medium">Offline</span>
                </div>
              )}

              {user && (
                <Button variant="ghost" size="sm" className="hidden md:inline-flex gap-1.5" onClick={() => navigate('/privacy')} title="Privacy & Security">
                  <ShieldCheck className="w-4 h-4" />
                  Privacy
                </Button>
              )}
              {user && !registeredPatient && (
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => navigate('/profile')} aria-label="Profile & settings">
                  <UserRound className="w-5 h-5" />
                </Button>
              )}
              {user && (
                <Button variant="ghost" size="sm" className="hidden md:inline-flex gap-1.5" onClick={() => navigate('/profile')} title="Profile & settings">
                  <UserRound className="w-4 h-4" />
                  Profile
                </Button>
              )}
              <div className="hidden md:block"><ThemeToggle compact /></div>
              {user && (
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden md:inline-flex gap-1.5" title={user.email ?? 'Sign out'}>
                  <LogOut className="w-4 h-4" />
                  Sign out
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 pt-3 space-y-2">
        <DeviceConditionBanner />
      </div>
      <SyncStatusBanner />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 md:py-8">
        {authLoading || loadingPatient ? (
          <div className="max-w-md mx-auto space-y-4" role="status" aria-label="Loading your health card">
            <div className="h-6 w-36 rounded bg-muted" />
            <div className="rounded-lg border border-border bg-card p-5 space-y-5">
              <div className="h-8 w-32 rounded bg-muted" />
              <div className="flex gap-3"><div className="h-14 w-12 rounded bg-muted" /><div className="flex-1 space-y-3"><div className="h-5 w-3/4 rounded bg-muted" /><div className="h-3 w-1/2 rounded bg-muted" /></div></div>
              <div className="h-32 rounded bg-muted/50" />
            </div>
            <span className="sr-only">Loading your health card…</span>
          </div>
        ) : registeredPatient ? (
          <HealthCardPreview patient={registeredPatient} onBack={handleEdit} />
        ) : (
          <>
            {/* Hero Section */}
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

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 mt-10 max-w-3xl mx-auto">
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
            </div>

            {/* Registration Form */}
            <PatientRegistrationForm onPatientRegistered={handlePatientRegistered} />
          </>
        )}
      </main>


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

export default Index;
