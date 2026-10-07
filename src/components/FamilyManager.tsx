import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Trash2, Loader2, Mail, UserPlus } from 'lucide-react';

const SCOPES = [
  { key: 'emergency_only', label: 'Emergency information' },
  { key: 'documents', label: 'Documents' },
  { key: 'medications', label: 'Medications' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'full_history', label: 'Full history' },
] as const;
type ScopeKey = (typeof SCOPES)[number]['key'];
type Permissions = Record<ScopeKey, boolean>;

const RELATIONSHIPS = ['parent', 'spouse', 'child', 'sibling', 'caregiver', 'other'] as const;
type Relationship = (typeof RELATIONSHIPS)[number];

const DEFAULT_PERMISSIONS: Permissions = {
  emergency_only: true,
  documents: false,
  medications: false,
  insurance: false,
  full_history: false,
};

interface FamilyMember {
  id: string;
  user_id: string | null;
  invited_email: string | null;
  status: 'pending' | 'active' | 'removed';
  relationship: Relationship;
  permissions: Permissions;
}

interface FamilyManagerProps {
  groupId: string;
}

const SAFE_ERROR = "We couldn't complete that request. Please try again.";

export function FamilyManager({ groupId }: FamilyManagerProps) {
  const { toast } = useToast();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState<Relationship>('parent');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from('family_members')
      .select('id, user_id, invited_email, status, relationship, permissions')
      .eq('group_id', groupId)
      .neq('status', 'removed')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Could not load family members', description: SAFE_ERROR, variant: 'destructive' });
    } else {
      setMembers(
        (data || []).map((m) => ({
          id: m.id,
          user_id: m.user_id,
          invited_email: m.invited_email,
          status: m.status as FamilyMember['status'],
          relationship: (m.relationship as Relationship) || 'other',
          permissions: { ...DEFAULT_PERMISSIONS, ...((m.permissions as Partial<Permissions>) || {}) },
        })),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    setBusy(true);
    const { error } = await supabase.from('family_members').insert({
      group_id: groupId,
      invited_email: clean,
      relationship,
      permissions: DEFAULT_PERMISSIONS,
    });
    if (error) {
      toast({ title: 'Could not invite member', description: SAFE_ERROR, variant: 'destructive' });
    } else {
      toast({
        title: 'Invitation saved',
        description: `${clean} starts with emergency information only. Add more access below.`,
      });
      setEmail('');
      await loadMembers();
    }
    setBusy(false);
  };

  const togglePermission = async (member: FamilyMember, key: ScopeKey, value: boolean) => {
    const next = { ...member.permissions, [key]: value };
    setMembers((list) => list.map((m) => (m.id === member.id ? { ...m, permissions: next } : m)));
    const { error } = await supabase.from('family_members').update({ permissions: next }).eq('id', member.id);
    if (error) {
      setMembers((list) => list.map((m) => (m.id === member.id ? member : m)));
      toast({ title: 'Could not update access', description: SAFE_ERROR, variant: 'destructive' });
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remove this member and revoke all their access?')) return;
    setBusy(true);
    const { error } = await supabase
      .from('family_members')
      .update({ status: 'removed' })
      .eq('id', memberId);
    if (error) {
      toast({ title: 'Could not remove member', description: SAFE_ERROR, variant: 'destructive' });
    } else {
      toast({ title: 'Access revoked' });
      await loadMembers();
    }
    setBusy(false);
  };

  const activeCount = members.filter((m) => m.status === 'active').length;
  const pendingCount = members.filter((m) => m.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Family members
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm space-y-1">
          <p className="font-medium text-foreground">
            {activeCount + 1} of 5 profiles used ({pendingCount} pending)
          </p>
          <p className="text-muted-foreground">
            Being in your family plan doesn't share your records. You choose exactly what each person can see.
          </p>
        </div>

        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Label htmlFor="invite-email" className="sr-only">
              Email address
            </Label>
            <Input
              id="invite-email"
              type="email"
              maxLength={254}
              placeholder="family.member@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="min-h-[48px]"
            />
          </div>
          <Label htmlFor="invite-relationship" className="sr-only">
            Relationship
          </Label>
          <select
            id="invite-relationship"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value as Relationship)}
            className="min-h-[48px] rounded-md border border-input bg-background px-3 text-sm capitalize"
          >
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r} className="capitalize">
                {r}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={busy || members.length >= 4} className="min-h-[48px]">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            <span className="ml-2">Invite</span>
          </Button>
        </form>

        <ul className="space-y-3">
          {members.map((member) => (
            <li key={member.id} className="p-4 rounded-xl border border-border bg-card space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{member.invited_email || 'Family member'}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {member.relationship} · {member.status}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(member.id)}
                  disabled={busy}
                  className="text-destructive hover:text-destructive"
                  aria-label="Remove member"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {SCOPES.map((s) => (
                  <label
                    key={s.key}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 min-h-[44px] text-sm"
                  >
                    <span>{s.label}</span>
                    <Switch
                      checked={member.permissions[s.key]}
                      onCheckedChange={(v) => togglePermission(member, s.key, v)}
                      aria-label={`${s.label} access for ${member.invited_email ?? 'member'}`}
                    />
                  </label>
                ))}
              </div>
            </li>
          ))}
          {members.length === 0 && (
            <li className="text-sm text-muted-foreground text-center py-4">
              No family members yet. Invite someone above.
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
