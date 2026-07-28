import { Sun, Moon, Smartphone } from 'lucide-react';
import { useTheme, ThemeMode } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

const OPTIONS: { value: ThemeMode; label: string; action: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'light', label: 'Light', action: 'Switch to light theme', icon: Sun },
  { value: 'system', label: 'Auto', action: 'Match device theme', icon: Smartphone },
  { value: 'dark', label: 'Dark', action: 'Switch to dark theme', icon: Moon },
];

export function ThemeToggle({ className, compact = false }: ThemeToggleProps) {
  const { mode, setMode } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        'inline-flex items-center gap-0.5 p-1 rounded-full border border-border bg-card/70 backdrop-blur-sm shadow-sm',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setMode(value)}
            className={cn(
              'flex items-center justify-center rounded-full transition-all duration-200',
              compact ? 'w-8 h-8' : 'w-9 h-9 md:w-10 md:h-10',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            <Icon className={cn(compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
          </button>
        );
      })}
    </div>
  );
}
