import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Crown, X } from 'lucide-react';
import { useState } from 'react';

interface UpgradeBannerProps {
  variant?: 'compact' | 'card';
  reason?: 'documents' | 'family' | 'generic';
  remaining?: number;
}

export function UpgradeBanner({ variant = 'compact', reason = 'generic', remaining }: UpgradeBannerProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const messages = {
    documents: remaining !== undefined && remaining <= 1
      ? `You have ${remaining} document slot left. Upgrade for unlimited storage.`
      : 'You’ve reached your free document limit. Upgrade to keep uploading.',
    family: 'Add up to 5 family profiles with the Family plan.',
    generic: 'Unlock unlimited documents and more with Medora Premium.',
  };

  if (variant === 'compact') {
    return (
      <div className="rounded-xl bg-gradient-to-r from-primary/10 to-accent/30 border border-primary/20 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <p className="text-sm text-foreground font-medium truncate">{messages[reason]}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={() => navigate('/pricing')}>
            Upgrade
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-section text-center p-6 md:p-8">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
        <Crown className="w-7 h-7" />
      </div>
      <h3 className="font-display text-lg font-semibold mb-2">{messages[reason]}</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
        Medora Premium gives you unlimited documents and full peace of mind. Family plan covers up to 5 profiles.
      </p>
      <Button className="btn-touch" onClick={() => navigate('/pricing')}>
        View plans
      </Button>
    </div>
  );
}
