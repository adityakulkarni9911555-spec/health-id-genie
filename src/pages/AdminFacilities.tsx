import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, BadgeCheck, Plus, Trash2, ShieldQuestion } from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  facility_type: string;
  ownership: string;
  city: string | null;
  state: string;
  registration_id: string | null;
  verified: boolean;
}

const emptyForm = {
  name: '',
  facility_type: 'hospital' as 'hospital' | 'clinic',
  ownership: 'government' as 'government' | 'private',
  city: '',
  state: '',
  registration_id: '',
};

/** Medora team: manage the registry of verified hospitals and clinics. */
export default function AdminFacilities() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const { data } = await supabase
      .from('healthcare_facilities')
      .select('id, name, facility_type, ownership, city, state, registration_id, verified')
      .order('name', { ascending: true });
    setRows((data ?? []) as Facility[]);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading || !user) return;
    supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' })
      .then(({ data }) => {
        setIsAdmin(Boolean(data));
        if (data) load();
        else setLoading(false);
      });
  }, [authLoading, user]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((f) =>
      `${f.name} ${f.city ?? ''} ${f.state}`.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  const add = async () => {
    if (form.name.trim().length < 3) {
      toast({ title: 'Enter the full facility name', variant: 'destructive' });
      return;
    }
    if (form.state.trim().length < 2) {
      toast({ title: 'Enter the state', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('healthcare_facilities').insert({
      name: form.name.trim(),
      facility_type: form.facility_type,
      ownership: form.ownership,
      city: form.city.trim() || null,
      state: form.state.trim(),
      registration_id: form.registration_id.trim() || null,
      verified: true,
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Could not save the facility', variant: 'destructive' });
      return;
    }
    setForm(emptyForm);
    toast({ title: 'Facility added and marked verified' });
    load();
  };

  const toggleVerified = async (f: Facility) => {
    const { error } = await supabase
      .from('healthcare_facilities')
      .update({ verified: !f.verified })
      .eq('id', f.id);
    if (error) toast({ title: 'Could not update the facility', variant: 'destructive' });
    load();
  };

  const remove = async (f: Facility) => {
    const { error } = await supabase.from('healthcare_facilities').delete().eq('id', f.id);
    if (error) toast({ title: 'Could not delete the facility', variant: 'destructive' });
    load();
  };

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground p-6 text-center">
        This page is only for the Medora team.
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-10 max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
        <Building2 className="w-6 h-6 text-primary" /> Verified hospitals &amp; clinics
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Responders who type one of these names on the emergency page are shown as verified to the
        patient. Anything not listed is shown as &ldquo;not verified&rdquo;.
      </p>

      <div className="rounded-xl border border-border p-4 space-y-3 mb-6">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Add a facility
        </p>
        <Input
          placeholder="Facility name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value.slice(0, 120) })}
          className="min-h-[56px] text-base"
        />
        <div className="grid grid-cols-2 gap-2">
          {(['hospital', 'clinic'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setForm({ ...form, facility_type: k })}
              className={`min-h-[56px] rounded-xl border text-sm font-semibold capitalize ${
                form.facility_type === k
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-foreground'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['government', 'private'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setForm({ ...form, ownership: k })}
              className={`min-h-[56px] rounded-xl border text-sm font-semibold capitalize ${
                form.ownership === k
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-foreground'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value.slice(0, 60) })}
            className="min-h-[56px] text-base"
          />
          <Input
            placeholder="State"
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value.slice(0, 60) })}
            className="min-h-[56px] text-base"
          />
        </div>
        <Input
          placeholder="Registration / licence number (optional)"
          value={form.registration_id}
          onChange={(e) => setForm({ ...form, registration_id: e.target.value.slice(0, 80) })}
          className="min-h-[56px] text-base"
        />
        <Button onClick={add} disabled={busy} className="w-full min-h-[56px] text-base font-semibold">
          {busy && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
          Add as verified
        </Button>
      </div>

      <Input
        placeholder="Search by name, city or state"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="min-h-[56px] text-base mb-4"
      />

      {rows.length === 0 && (
        <p className="text-muted-foreground">
          No facilities yet. Every hospital will show as &ldquo;not verified&rdquo; until you add it.
        </p>
      )}

      <div className="space-y-3">
        {visible.map((f) => (
          <div key={f.id} className="rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{f.name}</p>
              <p className="text-xs text-muted-foreground">
                {f.facility_type === 'hospital' ? 'Hospital' : 'Clinic'} ·{' '}
                {f.ownership === 'government' ? 'Government' : 'Private'}
                {[f.city, f.state].filter(Boolean).length ? ` · ${[f.city, f.state].filter(Boolean).join(', ')}` : ''}
                {f.registration_id ? ` · ${f.registration_id}` : ''}
              </p>
            </div>
            <Button
              size="sm"
              variant={f.verified ? 'outline' : 'default'}
              onClick={() => toggleVerified(f)}
              className="min-h-[44px]"
            >
              {f.verified ? (
                <>
                  <BadgeCheck className="w-4 h-4 mr-1 text-primary" /> Verified
                </>
              ) : (
                <>
                  <ShieldQuestion className="w-4 h-4 mr-1" /> Not verified
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => remove(f)}
              aria-label={`Delete ${f.name}`}
              className="min-h-[44px] text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </main>
  );
}
