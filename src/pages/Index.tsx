import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PatientRegistrationForm } from '@/components/PatientRegistrationForm';
import { HealthCardPreview } from '@/components/HealthCardPreview';
import { Logo } from '@/components/Logo';
import { SyncStatusBanner } from '@/components/SyncStatusBanner';
import { DeviceConditionBanner } from '@/components/DeviceConditionBanner';
import { UpgradeBanner } from '@/components/UpgradeBanner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Patient } from '@/types/patient';
import { Heart, ShieldCheck, Smartphone, Sparkles, Wifi, WifiOff, LogOut, Loader2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SiteFooter } from '@/components/SiteFooter';
import { supabase } from '@/integrations/supabase/client';
import { loadPatientForCurrentUser } from '@/lib/patientProfile';
import { useToast } from '@/hooks/use-toast';

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
    return <Navigate to="/auth" replace />;
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
    <div className="min-h-screen bg-background hero-surface">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-nav border-b border-border/60 no-print">
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

            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2">
                {isOnline ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm">
                    <Wifi className="w-3.5 h-3.5" />
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
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
              {/* Plan chip hidden until paid plans launch */}

              <ThemeToggle compact />
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-1.5"
                  title={user.email ?? 'Sign out'}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign out</span>
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

      {!subLoading && user && !isPaid && (
        <div className="container mx-auto px-4 pt-3 no-print">
          <UpgradeBanner variant="compact" reason="generic" />
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-10 md:py-16">
        {authLoading || loadingPatient ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm">Loading your health card…</p>
          </div>
        ) : registeredPatient ? (
          <HealthCardPreview patient={registeredPatient} onBack={handleEdit} />
        ) : (
          <>
            {/* Hero Section */}
            <div className="text-center mb-12 animate-fade-in max-w-3xl mx-auto">
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
    <h3 className="font-semibold text-foreground mb-1 text-sm">{title}</h3>
    <p className="text-xs text-muted-foreground">{description}</p>
  </div>
);

export default Index;
