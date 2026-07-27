import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let authEventVersion = 0;

    const applyVerifiedSession = async (s: Session | null, version: number) => {
      if (!s) {
        if (cancelled || version !== authEventVersion) return;
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      const { data: userData, error } = await supabase.auth.getUser();
      if (cancelled || version !== authEventVersion) return;

      if (error || !userData.user) {
        setSession(null);
        setUser(null);
      } else {
        setSession(s);
        setUser(userData.user);
      }
      setLoading(false);
    };

    // Register listener first so we never miss an auth event.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      authEventVersion += 1;
      const version = authEventVersion;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);

      if (s) {
        window.setTimeout(() => {
          void applyVerifiedSession(s, version);
        }, 0);
      }
    });

    // Then hydrate from the local session and re-verify the user with the
    // auth server so we don't trust a tampered/expired local JWT for gating.
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      authEventVersion += 1;
      const version = authEventVersion;
      void applyVerifiedSession(sessionData.session, version);
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading };
}

