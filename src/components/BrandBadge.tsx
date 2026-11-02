import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { useDeviceConditions } from '@/hooks/useDeviceConditions';

export const BrandBadge = () => {
  const [cycle, setCycle] = useState(0);
  const { reducedMotion, powerSaver } = useDeviceConditions();
  const animate = !reducedMotion && !powerSaver;

  return (
    <Button
      variant="ghost"
      className="brand-badge h-14 shrink-0 gap-2.5 rounded-xl px-4 hover:bg-muted/60 [&_svg]:!size-8"
      aria-label="Medora — replay brand animation"
      title="Medora"
      onClick={() => setCycle((value) => value + 1)}
    >
      <span className="brand-perspective relative block h-8 w-8 shrink-0" aria-hidden="true">
        <span key={cycle} className={`brand-mark block h-8 w-8 ${animate ? 'brand-mark-enter' : ''}`}>
          <Logo size={32} />
        </span>
      </span>
      <span className="flex flex-col items-start leading-none">
        <span className="font-display text-[17px] font-bold tracking-tight text-foreground">Medora</span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Health ID</span>
      </span>
    </Button>
  );
};