import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const NEXT_STORAGE_KEY = "medora:postAuthNext";

function sanitizeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw === "/index") return "/";
  return raw;
}

function consumeNext(): string {
  try {
    const stored = sessionStorage.getItem(NEXT_STORAGE_KEY);
    if (stored) sessionStorage.removeItem(NEXT_STORAGE_KEY);
    return sanitizeNext(stored);
  } catch {
    return "/";
  }
}

function getOAuthError(): string | null {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return (
    search.get("error_description") ||
    search.get("error") ||
    hash.get("error_description") ||
    hash.get("error")
  );
}

async function completeUrlSession(): Promise<void> {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  const code = new URLSearchParams(window.location.search).get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      try {
        const urlError = getOAuthError();
        if (urlError) throw new Error(urlError);

        await completeUrlSession();

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error("The sign-in session was not saved. Please try again.");
        }

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          throw userError ?? new Error("Could not verify your account. Please try again.");
        }

        if (!cancelled) navigate(consumeNext(), { replace: true });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    finishSignIn();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-10 bg-gradient-to-br from-background via-background to-accent/30">
      <div className="w-full max-w-md form-section p-7 sm:p-8 text-center space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        {error ? (
          <>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                Sign-in could not finish
              </h1>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button className="btn-touch w-full" onClick={() => navigate("/auth", { replace: true })}>
              Try again
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center py-4 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <h1 className="font-display text-xl font-semibold text-foreground">Finishing sign-in…</h1>
            <p className="text-sm mt-1">Opening your Medora wallet securely.</p>
          </div>
        )}
      </div>
    </div>
  );
}