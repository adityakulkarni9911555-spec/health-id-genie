import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthClient = { name?: string; redirect_uri?: string; scope?: string };
type AuthorizationDetails = {
  client?: OAuthClient;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};
const authOauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      setAccount(sess.session.user.email ?? sess.session.user.id);
      const { data, error } = await authOauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await authOauth.approveAuthorization(authorizationId)
      : await authOauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10 bg-gradient-to-br from-background via-background to-accent/30">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        <div className="form-section p-7 sm:p-8 space-y-6">
          {error ? (
            <>
              <h1 className="font-display text-xl font-semibold text-destructive">
                Authorization error
              </h1>
              <p className="text-sm text-muted-foreground">{error}</p>
            </>
          ) : !details ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading authorization…
            </div>
          ) : (
            <>
              <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight">
                  Connect {details.client?.name ?? "an app"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  This lets {details.client?.name ?? "the client"} use Smart Health Card
                  tools as you.
                </p>
              </div>

              <dl className="text-sm space-y-2 rounded-xl border border-border bg-muted/40 p-4">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Signed in as</dt>
                  <dd className="font-medium truncate">{account}</dd>
                </div>
                {details.client?.redirect_uri && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Redirects to</dt>
                    <dd className="font-mono text-xs truncate max-w-[60%]">
                      {details.client.redirect_uri}
                    </dd>
                  </div>
                )}
                {(details.scope ?? details.client?.scope) && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Scope</dt>
                    <dd className="font-mono text-xs truncate max-w-[60%]">
                      {details.scope ?? details.client?.scope}
                    </dd>
                  </div>
                )}
              </dl>

              <p className="text-xs text-muted-foreground">
                This does not bypass Smart Health Card permissions or backend policies.
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="btn-touch flex-1"
                  onClick={() => decide(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button
                  className="btn-touch flex-1"
                  onClick={() => decide(true)}
                  disabled={busy}
                >
                  {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Approve
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
