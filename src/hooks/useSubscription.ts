import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionPlan {
  slug: string;
  name: string;
  price_inr: number;
  max_profiles: number;
  max_documents: number | null;
  description: string;
}

export interface SubscriptionState {
  planSlug: string;
  expiresAt: string | null;
  familyGroupId: string | null;
  documentLimit: number;
  profileLimit: number;
  loading: boolean;
  error: string | null;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    planSlug: 'free',
    expiresAt: null,
    familyGroupId: null,
    documentLimit: 5,
    profileLimit: 1,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userRes.user) {
          if (!cancelled) {
            setState((s) => ({ ...s, loading: false }));
          }
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('plan_slug, subscription_expires_at, family_group_id')
          .eq('id', userRes.user.id)
          .maybeSingle();

        if (!cancelled) {
          if (profileError) {
            setState((s) => ({ ...s, loading: false, error: profileError.message }));
          } else {
            setState({
              planSlug: profile?.plan_slug || 'free',
              expiresAt: profile?.subscription_expires_at || null,
              familyGroupId: profile?.family_group_id || null,
              loading: false,
              error: null,
            });
          }
        }
      } catch (e) {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: String(e) }));
        }
      }
    };

    void load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isPaid = state.planSlug === 'premium' || state.planSlug === 'family';
  const isFamily = state.planSlug === 'family';
  const isFree = state.planSlug === 'free';

  return { ...state, isPaid, isFamily, isFree };
}

export async function loadPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('price_inr', { ascending: true });
  if (error) throw error;
  return data || [];
}
