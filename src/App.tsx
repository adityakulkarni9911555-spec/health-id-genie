import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import OAuthConsent from "./pages/OAuthConsent";
import Emergency from "./pages/Emergency";
import Pricing from "./pages/Pricing";
import BlogBenefitsPHR from "./pages/BlogBenefitsPHR";
import BlogDigitalIdVsBracelets from "./pages/BlogDigitalIdVsBracelets";
import BlogRequestMedicalRecords from "./pages/BlogRequestMedicalRecords";
import { SplashScreen } from "./components/SplashScreen";

const queryClient = new QueryClient();

const App = () => {
  // Skip the splash for emergency scans — every second counts.
  const isEmergency =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/e/');
  const [splashDone, setSplashDone] = useState(isEmergency);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/index" element={<Navigate to="/" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/blog/benefits-of-personal-health-records" element={<BlogBenefitsPHR />} />
            <Route path="/blog/digital-medical-id-vs-bracelets" element={<BlogDigitalIdVsBracelets />} />

            <Route path="/e/:token" element={<Emergency />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
