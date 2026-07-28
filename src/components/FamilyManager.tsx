import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Trash2, Loader2, Mail, UserPlus } from 'lucide-react';

interface FamilyMember {
  id: string;
  user_id: string | null;
  invited_email: string | null;
  status: 'pending' | 'active' | 'removed';
}

interface FamilyManagerProps {
  groupId: string;
}

export function FamilyManager({ groupId }: FamilyManagerProps) {
  const { toast } = useToast();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from('family_members')
      .select('id, user_id, invited_email, status')
      .eq('group_id', groupId)
      .neq('status', 'removed')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Could not load family members', description: error.message, variant: 'destructive' });
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadMembers();
  }, [groupId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);

    const { error } = await supabase.from('family_members').insert({
      group_id: groupId,
      invited_email: email.trim(),
      status: 'pending',
    });

    if (error) {
      toast({ title: 'Could not invite member', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Invitation sent', description: `${email} can join your family plan.` });
      setEmail('');
      await loadMembers();
    }
    setBusy(false);
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remove this member from your family plan?')) return;
    setBusy(true);
    const { error } = await supabase.from('family_members').delete().eq('id', memberId);
    if (error) {
      toast({ title: 'Could not remove member', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Member removed' });
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
        <p className="text-sm text-muted-foreground">
          {activeCount + 1} of 5 profiles used. {pendingCount} pending invitation{pendingCount === 1 ? '' : 's'}.
        </p>

        <form onSubmit={handleInvite} className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="invite-email" className="sr-only">
              Email address
            </Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="family.member@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={busy || members.length >= 4}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            <span className="ml-2 hidden sm:inline">Invite</span>
          </Button>
        </form>

        <ul className="space-y-2">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between p-3 rounded-xl border border-border bg-card"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.invited_email || 'Family member'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{member.status}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(member.id)}
                disabled={busy}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
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
