import { Link } from 'react-router-dom';
import { Crown, ArrowRight } from 'lucide-react';

interface UpgradeBannerProps {
  variant?: 'compact' | 'card';
  reason?: 'documents' | 'family' | 'generic';
  remaining?: number;
}

export function UpgradeBanner({ variant = 'compact', reason = 'generic', remaining }: UpgradeBannerProps) {
  const message =
    reason === 'documents'
      ? remaining !== undefined
        ? `${remaining} free document ${remaining === 1 ? 'slot' : 'slots'} left`
        : 'Free plan includes 5 documents'
      : reason === 'family'
      ? 'Add family members with the Family plan'
      : 'Unlock unlimited documents & family sharing';

  if (variant === 'card') {
    return (
      <Link
        to="/pricing"
        className="no-print block rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-[hsl(174,62%,45%)]/5 p-5 hover:border-primary/40 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-[hsl(174,62%,45%)] flex items-center justify-center text-white shadow-sm">
            <Crown className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">Go Premium</p>
            <p className="text-xs text-muted-foreground truncate">{message}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-primary" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      to="/pricing"
      className="no-print flex items-center gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-[hsl(174,62%,45%)]/5 px-4 py-2.5 hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(174,62%,45%)] flex items-center justify-center text-white flex-shrink-0">
        <Crown className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          <span className="text-primary">Coming soon:</span> {message}
        </p>
      </div>
      <span className="hidden sm:inline text-xs font-medium text-primary flex items-center gap-1">
        See plans <ArrowRight className="w-3 h-3 inline" />
      </span>
    </Link>
  );
}
