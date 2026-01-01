import { useState } from 'react';
import { PatientRegistrationForm } from '@/components/PatientRegistrationForm';
import { HealthCardPreview } from '@/components/HealthCardPreview';
import { Patient } from '@/types/patient';
import { Heart, ShieldCheck, Smartphone } from 'lucide-react';

const Index = () => {
  const [registeredPatient, setRegisteredPatient] = useState<Patient | null>(null);

  const handlePatientRegistered = (patient: Patient) => {
    setRegisteredPatient(patient);
  };

  const handleBack = () => {
    setRegisteredPatient(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border no-print">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">
                  Smart Health Card
                </h1>
                <p className="text-sm text-muted-foreground">Patient Registration System</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse-soft" />
                <span className="font-medium">Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-12">
        {!registeredPatient ? (
          <>
            {/* Hero Section */}
            <div className="text-center mb-10 animate-fade-in">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Register New Patient
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Create a digital health card with QR code for quick access to patient information.
              </p>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-3xl mx-auto">
                <FeatureCard
                  icon={<ShieldCheck className="w-6 h-6" />}
                  title="Secure Storage"
                  description="Data encrypted and stored safely"
                />
                <FeatureCard
                  icon={<Smartphone className="w-6 h-6" />}
                  title="QR Code Access"
                  description="Instant access via QR scan"
                />
                <FeatureCard
                  icon={<Heart className="w-6 h-6" />}
                  title="Complete Records"
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
      <footer className="border-t border-border py-6 mt-12 no-print">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Smart Health Card System • Secure Patient Registration</p>
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
  <div className="flex flex-col items-center p-4 rounded-xl bg-card border border-border">
    <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-accent-foreground mb-3">
      {icon}
    </div>
    <h3 className="font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default Index;
