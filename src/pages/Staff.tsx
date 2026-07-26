import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Logo } from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Search,
  ShieldCheck,
  Loader2,
  Save,
  History,
  AlertTriangle,
  Lock,
} from 'lucide-react';

type LogRow = {
  id: string;
  action: string;
  field: string | null;
  old_value: unknown;
  new_value: unknown;
  actor_email: string | null;
  created_at: string;
};

type PatientRow = {
  id: string;
  full_name: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  allergies: string[] | null;
  emergency_contact: string;
};

const Staff = () => {
  const { user, loading: authLoading } = useAuth();
  const { isStaff, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [patientId, setPatientId] = useState('');
  const [searching, setSearching] = useState(false);
  const [patient, setPatient] = useState<PatientRow | null>(null);

  const [allergies, setAllergies] = useState('');
  const [emergency, setEmergency] = useState('');
  const [saving, setSaving] = useState(false);

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadLogs = async (id: string) => {
    setLoadingLogs(true);
    const { data } = await supabase
      .from('patient_edit_logs')
      .select('id, action, field, old_value, new_value, actor_email, created_at')
      .eq('patient_id', id)
      .order('created_at', { ascending: false })
      .limit(30);
    setLogs((data as LogRow[]) ?? []);
    setLoadingLogs(false);
  };

  useEffect(() => {
    if (patient) loadLogs(patient.id);
  }, [patient?.id]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = patientId.trim();
    if (!id) return;
    setSearching(true);
    setPatient(null);
    const { data, error } = await supabase.rpc('staff_get_patient', {
      _patient_id: id,
    });
    setSearching(false);
    if (error || !data) {
      toast({
        title: 'Lookup failed',
        description: error?.message ?? 'Patient not found or you are not authorized.',
        variant: 'destructive',
      });
      return;
    }
    const row = data as unknown as PatientRow;
    setPatient(row);
    setAllergies((row.allergies ?? []).join(', '));
    setEmergency(row.emergency_contact ?? '');
  };

  const handleSave = async () => {
    if (!patient) return;
    setSaving(true);
    const parsedAllergies = allergies
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
    const { data, error } = await supabase.rpc('staff_update_patient_safe_fields', {
      _patient_id: patient.id,
      _allergies: parsedAllergies,
      _emergency_contact: emergency.trim(),
    });
    setSaving(false);
    if (error || !data) {
      toast({
        title: 'Update failed',
        description: error?.message ?? 'Could not update the record.',
        variant: 'destructive',
      });
      return;
    }
    const row = data as unknown as PatientRow;
    setPatient(row);
    setAllergies((row.allergies ?? []).join(', '));
    setEmergency(row.emergency_contact ?? '');
    toast({ title: 'Saved', description: 'Changes recorded to the audit log.' });
    loadLogs(row.id);
  };

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background hero-surface">
      <header className="sticky top-0 z-50 glass-nav border-b border-border/60">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <h1 className="font-display text-lg font-bold leading-none">Staff Console</h1>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Scoped edit access
              </p>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
        {roleLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : !isStaff ? (
          <div className="form-section text-center py-14">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-warning/10 text-warning mb-4">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Staff access required</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              This area is limited to authorized clinical staff. Ask an admin to grant your
              account the <code className="px-1 py-0.5 rounded bg-muted text-xs">staff</code> role.
            </p>
          </div>
        ) : (
          <>
            <div className="form-section">
              <h2 className="font-display text-lg font-semibold mb-1">Look up a patient</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Enter a Patient ID (UUID). You can only view one record at a time — every lookup is
                logged.
              </p>
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                  className="input-large flex-1 font-mono text-sm"
                />
                <Button type="submit" className="btn-touch" disabled={searching}>
                  {searching ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" /> Find
                    </>
                  )}
                </Button>
              </form>
            </div>

            {patient && (
              <>
                <div className="form-section mt-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-display text-lg font-semibold">{patient.full_name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{patient.id}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {patient.phone_number} · {patient.gender} · DOB {patient.date_of_birth}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      <ShieldCheck className="w-3 h-3" /> Edit mode
                    </span>
                  </div>

                  <div className="rounded-lg bg-warning/5 border border-warning/20 p-3 mb-5 flex items-start gap-2 text-xs text-warning-foreground">
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      You can only modify <strong>allergies</strong> and{' '}
                      <strong>emergency contact</strong>. All other fields are read-only. Every
                      change is written to the audit log.
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="allergies">Allergies (comma separated)</Label>
                      <Textarea
                        id="allergies"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        placeholder="Penicillin, Peanuts, Latex"
                        className="mt-1.5"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergency">Emergency contact</Label>
                      <Input
                        id="emergency"
                        value={emergency}
                        onChange={(e) => setEmergency(e.target.value)}
                        placeholder="Name and phone number"
                        className="input-large mt-1.5"
                      />
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="btn-touch w-full sm:w-auto">
                      {saving ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving…
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-2" /> Save changes
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="form-section mt-6">
                  <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" /> Recent activity
                  </h3>
                  {loadingLogs ? (
                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {logs.map((log) => (
                        <li
                          key={log.id}
                          className="text-sm border border-border rounded-lg p-3 bg-card"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">
                              {log.action === 'view' ? 'Viewed record' : `Updated ${log.field}`}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            by {log.actor_email ?? 'unknown'}
                          </p>
                          {log.action === 'update' && (
                            <div className="mt-2 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="p-2 rounded bg-muted/50">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                                  Before
                                </div>
                                <div className="break-words">{formatVal(log.old_value)}</div>
                              </div>
                              <div className="p-2 rounded bg-primary/5">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                                  After
                                </div>
                                <div className="break-words">{formatVal(log.new_value)}</div>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

function formatVal(v: unknown): string {
  if (v == null) return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  return String(v);
}

export default Staff;
