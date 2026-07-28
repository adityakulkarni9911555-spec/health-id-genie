import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";

const NEXT_STORAGE_KEY = "medora:postAuthNext";

function sanitizeNext(raw: string | null): string {
  if (!raw) return "/";
  // Only allow same-origin relative paths.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw === "/index") return "/";
  return raw;
}

function consumeStoredNext(): string {
  try {
    const stored = sessionStorage.getItem(NEXT_STORAGE_KEY);
    if (stored) sessionStorage.removeItem(NEXT_STORAGE_KEY);
    return sanitizeNext(stored);
  } catch {
    return "/";
  }
}

export default function Auth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const next = sanitizeNext(params.get("next"));

  const initialMode = params.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const focusEmail = () => {
    // Give the mobile viewport a beat to reorder/render before scrolling.
    setTimeout(() => {
      emailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      emailRef.current?.focus({ preventScroll: true });
    }, 50);
  };

  const startSignup = () => {
    setMode("signup");
    focusEmail();
  };
  const startSignin = () => {
    setMode("signin");
    focusEmail();
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const target = consumeStoredNext() || next;
        navigate(target, { replace: true });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
        const target = consumeStoredNext() || next;
        navigate(target, { replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, next]);

  const withNextRedirect = (path: string) =>
    `${window.location.origin}${path}`;



  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: withNextRedirect(next) },
        });
        if (error) throw error;
        // Auto-confirm is enabled, so session is set immediately.
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          // Fallback: sign in with the same credentials.
          const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
          if (siErr) throw siErr;
        }
        toast({ title: "Welcome!", description: "Your account is ready." });
        navigate(next, { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(next, { replace: true });
      }
    } catch (err) {
      toast({
        title: mode === "signup" ? "Sign-up failed" : "Sign-in failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Sign In — Medora Personal Health Wallet</title>
        <meta name="description" content="Sign in or create your Medora account to access your private personal health wallet — medical records, allergies, and emergency info in one place." />
        <link rel="canonical" href="https://health-id-genie.lovable.app/auth" />
        <meta property="og:title" content="Sign In — Medora Personal Health Wallet" />
        <meta property="og:description" content="Access your Medora health wallet. Private by design." />
        <meta property="og:url" content="https://health-id-genie.lovable.app/auth" />
      </Helmet>
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30">
        <div className="container mx-auto px-5 py-8">
          <div className="flex justify-between items-center mb-10">
            <Link to="/" aria-label="Medora home"><Logo /></Link>
            <ThemeToggle compact />
          </div>

          <div className="grid gap-10 lg:grid-cols-2 lg:items-center max-w-6xl mx-auto">
            {/* Hero */}
            <section className="space-y-6 order-2 lg:order-1">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
                Your health record, ready when it matters most.
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Medora is a private, personal health wallet. Store medical records, allergies, and
                emergency info — and let any doctor scan a secure QR to see it in seconds.
              </p>
              <ul className="space-y-3 text-base">
                <li className="flex gap-3"><span aria-hidden className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" /> Emergency QR access — read-only and time-limited</li>
                <li className="flex gap-3"><span aria-hidden className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" /> Encrypted document vault — owner-only, always in sync</li>
                <li className="flex gap-3"><span aria-hidden className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" /> Family plan — manage records for kids and parents</li>
              </ul>
              <div className="flex flex-wrap gap-4 text-sm">
                <Link to="/blog/benefits-of-personal-health-records" className="text-primary font-medium hover:underline">
                  Read the guide →
                </Link>
                <Link to="/pricing" className="text-primary font-medium hover:underline">
                  See pricing →
                </Link>
              </div>
            </section>

            {/* Sign-in card */}
            <div className="order-1 lg:order-2 w-full max-w-md lg:justify-self-end">
              <div className="form-section p-7 sm:p-8 space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">
                    {mode === "signup" ? "Create your Medora wallet" : "Your Medora wallet"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mode === "signup"
                      ? "Set up your personal Medora health card in under a minute."
                      : "Sign in to open your Medora card, or create one in under a minute."}
                  </p>
                </div>

                <form onSubmit={handleEmail} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                  </div>
                  <Button type="submit" className="btn-touch w-full" disabled={busy}>
                    {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {mode === "signup" ? "Create account" : "Sign in"}
                  </Button>
                </form>

                <p className="text-sm text-center text-muted-foreground">
                  {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
                  <button type="button" className="text-primary font-medium hover:underline" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
                    {mode === "signup" ? "Sign in" : "Sign up"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
        <SiteFooter />
      </main>
    </>
  );
}
