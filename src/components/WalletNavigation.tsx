import { Link } from 'react-router-dom';
import { CreditCard, FolderOpen, History, Settings2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type WalletSection = 'card' | 'records' | 'timeline' | 'manage' | 'profile';
const sections = [
  { id: 'card', label: 'Card', Icon: CreditCard },
  { id: 'records', label: 'Records', Icon: FolderOpen },
  { id: 'timeline', label: 'Timeline', Icon: History },
  { id: 'manage', label: 'Manage', Icon: Settings2 },
  { id: 'profile', label: 'Profile', Icon: UserRound },
] as const;

export function WalletNavigation({ active }: { active: WalletSection }) {
  return (
    <nav aria-label="Health card sections" className="wallet-navigation no-print fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:static md:mb-6 md:border md:rounded-lg md:pb-0">
      <ul className="grid grid-cols-5 max-w-2xl mx-auto">
        {sections.map(({ id, label, Icon }) => (
          <li key={id}>
            <Button asChild variant="ghost" className={`w-full h-16 rounded-none flex-col gap-1 px-1 text-[11px] ${active === id ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}>
              <Link to={id === 'profile' ? '/profile' : `/?section=${id}`} aria-current={active === id ? 'page' : undefined} preventScrollReset onClick={(event) => {
                if (active === id) { event.preventDefault(); return; }
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}>
                <Icon className="!w-5 !h-5" />
                {label}
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );
}