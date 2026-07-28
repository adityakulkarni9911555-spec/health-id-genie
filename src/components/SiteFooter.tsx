import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-8 mt-12 no-print">
      <div className="container mx-auto px-4 grid gap-6 sm:grid-cols-2 md:grid-cols-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Logo size={20} />
          <span>Medora · Secure Health Wallet</span>
        </div>
        <nav aria-label="Product" className="space-y-2">
          <p className="font-semibold text-foreground">Product</p>
          <Link to="/" className="block text-muted-foreground hover:text-foreground">Home</Link>
          <Link to="/pricing" className="block text-muted-foreground hover:text-foreground">Pricing</Link>
          <Link to="/auth" className="block text-muted-foreground hover:text-foreground">Sign in</Link>
        </nav>
        <nav aria-label="Guides" className="space-y-2">
          <p className="font-semibold text-foreground">Guides</p>
          <Link to="/blog/benefits-of-personal-health-records" className="block text-muted-foreground hover:text-foreground">
            Benefits of a personal health record
          </Link>
          <Link to="/blog/digital-medical-id-vs-bracelets" className="block text-muted-foreground hover:text-foreground">
            Digital medical ID vs. bracelets
          </Link>
          <Link to="/blog/how-to-request-medical-records" className="block text-muted-foreground hover:text-foreground">
            How to request medical records
          </Link>
        </nav>
        <div className="space-y-2 text-muted-foreground">
          <p className="font-semibold text-foreground">Private by design</p>
          <p>Your records are owner-only. Emergency access is read-only and time-limited.</p>
        </div>
      </div>
    </footer>
  );
}
