import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>Page not found — Medora</title>
        <meta
          name="description"
          content="This Medora page doesn't exist. Return home to open your personal health wallet."
        />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://health-id-genie.lovable.app/404" />
        <meta property="og:title" content="Page not found — Medora" />
        <meta
          property="og:description"
          content="This Medora page doesn't exist. Return home to open your personal health wallet."
        />
        <meta property="og:url" content="https://health-id-genie.lovable.app/404" />
        <meta name="twitter:title" content="Page not found — Medora" />
        <meta
          name="twitter:description"
          content="This Medora page doesn't exist. Return home to open your personal health wallet."
        />
      </Helmet>
      <main className="flex min-h-screen items-center justify-center bg-background hero-surface px-4">
        <div className="text-center max-w-md">
          <div className="inline-flex mb-6">
            <Logo size={56} />
          </div>
          <h1 className="font-display mb-3 text-6xl font-bold tracking-tight text-foreground">404</h1>
          <p className="mb-6 text-lg text-muted-foreground">
            We couldn't find the page you're looking for.
          </p>
          <Button asChild className="btn-touch">
            <a href="/">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Return Home
            </a>
          </Button>
        </div>
      </main>
    </>
  );
};

export default NotFound;
