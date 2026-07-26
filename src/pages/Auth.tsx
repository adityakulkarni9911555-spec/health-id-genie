import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";

function sanitizeNext(raw: string | null): string {
  if (!raw) return "/";
  // Only allow same-origin relative paths.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default function Auth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const next = sanitizeNext(params.get("next"));

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate(next, { replace: true });
    });
  }, [navigate, next]);

  const withNextRedirect = (path: string) =>
    `${window.location.origin}${path}`;

  async function handleGoogle() {
    setBusy(true);
    const target = withNextRedirect(next);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: target,
    });
    if (result.error) {
      toast({ title: "Google sign-in failed", description: result.error.message, variant: "destructive" });
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate(next, { replace: true });
  }

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
        toast({ title: "Check your email", description: "Confirm your address to finish signing up." });
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
    <div className="min-h-screen flex items-center justify-center px-5 py-10 bg-gradient-to-br from-background via-background to-accent/30">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        <div className="form-section p-7 sm:p-8 space-y-6">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {mode === "signup" ? "Create your account" : "Sign in"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signup"
                ? "Register to manage patient health cards."
                : "Access the Smart Health Card dashboard."}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="btn-touch w-full"
            onClick={handleGoogle}
            disabled={busy}
          >
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
            <Button type="submit" className="btn-touch w-full" disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
            <button
              type="button"
              className="text-primary font-medium hover:underline"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
