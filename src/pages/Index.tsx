import { useState } from 'react';
import { PatientRegistrationForm } from '@/components/PatientRegistrationForm';
import { HealthCardPreview } from '@/components/HealthCardPreview';
import { Logo } from '@/components/Logo';
import { SyncStatusBanner } from '@/components/SyncStatusBanner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Patient } from '@/types/patient';
import { Heart, ShieldCheck, Smartphone, Sparkles, Wifi, WifiOff } from 'lucide-react';

const Index = () => {
  const [registeredPatient, setRegisteredPatient] = useState<Patient | null>(null);
  const isOnline = useOnlineStatus();

  const handlePatientRegistered = (patient: Patient) => {
    setRegisteredPatient(patient);
  };

  const handleBack = () => {
    setRegisteredPatient(null);
  };

  return (
    <div className="min-h-screen bg-background hero-surface">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-nav border-b border-border/60 no-print">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo size={40} className="drop-shadow-sm" />
              <div>
                <h1 className="font-display text-lg font-bold text-foreground tracking-tight leading-none">
                  Smart Health
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">Digital Patient ID</p>
              </div>
            </div>

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
          </div>
        </div>
      </header>

      <SyncStatusBanner />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-10 md:py-16">
        {!registeredPatient ? (
          <>
            {/* Hero Section */}
            <div className="text-center mb-12 animate-fade-in max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-5 border border-accent-foreground/10">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant digital health cards</span>
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
                Register a patient in{' '}
                <span className="bg-gradient-to-r from-primary to-[hsl(174,62%,45%)] bg-clip-text text-transparent">
                  seconds
                </span>
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                Create a modern digital health card with a scannable QR — accessible anywhere, anytime.
              </p>

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 mt-10 max-w-3xl mx-auto">
                <FeatureCard
                  icon={<ShieldCheck className="w-5 h-5" />}
                  title="Secure by design"
                  description="Encrypted storage & access"
                />
                <FeatureCard
                  icon={<Smartphone className="w-5 h-5" />}
                  title="Scan anywhere"
                  description="QR-ready on any device"
                />
                <FeatureCard
                  icon={<Heart className="w-5 h-5" />}
                  title="Complete records"
                  description="All medical info in one place"
                />
              </div>

            </div>

            {/* Registration Form */}
            <PatientRegistrationForm onPatientRegistered={handlePatientRegistered} />
          </>
        ) : (
          <HealthCardPreview patient={registeredPatient} onBack={handleBack} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-6 mt-12 no-print">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Logo size={20} />
          <p>Smart Health Card · Secure Patient Registration</p>
        </div>
      </footer>
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
