import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Register listener first so we never miss an auth event.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    // Then hydrate from the local session and re-verify the user with the
    // auth server so we don't trust a tampered/expired local JWT for gating.
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(sessionData.session);

      if (sessionData.session) {
        const { data: userData, error } = await supabase.auth.getUser();
        if (cancelled) return;
        if (error || !userData.user) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
        } else {
          setUser(userData.user);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading };
}

