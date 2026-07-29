import { lazy, Suspense, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import { SplashScreen } from "./components/SplashScreen";
import { RouteLoader } from "./components/RouteLoader";


// Code-split every non-auth route. /auth is the landing page and stays eager.
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const Emergency = lazy(() => import("./pages/Emergency"));
const Pricing = lazy(() => import("./pages/Pricing"));
const BlogBenefitsPHR = lazy(() => import("./pages/BlogBenefitsPHR"));
const BlogDigitalIdVsBracelets = lazy(() => import("./pages/BlogDigitalIdVsBracelets"));
const BlogRequestMedicalRecords = lazy(() => import("./pages/BlogRequestMedicalRecords"));
const BlogSmartphoneEmergencyId = lazy(() => import("./pages/BlogSmartphoneEmergencyId"));

const queryClient = new QueryClient();

const SPLASH_SESSION_KEY = 'medora:splash-shown';

function shouldSkipSplash(): boolean {
  if (typeof window === 'undefined') return true;
  const path = window.location.pathname || '';
  // Skip splash on emergency scans, SEO landing routes, and repeat visits
  // in the same session — the splash must never delay LCP on these pages.
  if (path.startsWith('/e/')) return true;
  if (path === '/auth' || path.startsWith('/auth/')) return true;
  if (path === '/pricing') return true;
  if (path.startsWith('/blog/')) return true;
  if (path.startsWith('/.lovable/')) return true;
  try {
    if (sessionStorage.getItem(SPLASH_SESSION_KEY) === '1') return true;
  } catch {
    // ignore
  }
  return false;
}

const App = () => {
  const [splashDone, setSplashDone] = useState(shouldSkipSplash);

  const handleSplashDone = () => {
    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    } catch {
      // ignore
    }
    setSplashDone(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {!splashDone && <SplashScreen onDone={handleSplashDone} />}
        <BrowserRouter>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/index" element={<Navigate to="/" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/blog/benefits-of-personal-health-records" element={<BlogBenefitsPHR />} />
              <Route path="/blog/digital-medical-id-vs-bracelets" element={<BlogDigitalIdVsBracelets />} />
              <Route path="/blog/how-to-request-medical-records" element={<BlogRequestMedicalRecords />} />
              <Route path="/blog/smartphone-emergency-medical-id-guide" element={<BlogSmartphoneEmergencyId />} />

              <Route path="/e/:token" element={<Emergency />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
