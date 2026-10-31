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
      className="brand-badge h-14 shrink-0 gap-2.5 rounded-xl px-4 hover:bg-muted/60 [&_svg]:!size-7"
      aria-label="Medora — replay brand animation"
      title="Medora"
      onClick={() => setCycle((value) => value + 1)}
    >
      <span className="brand-perspective relative block h-7 w-7 shrink-0" aria-hidden="true">
        <span key={cycle} className={`brand-mark block h-7 w-7 ${animate ? 'brand-mark-enter' : ''}`}>
          <Logo size={28} />
        </span>
      </span>
      <span className="text-base font-semibold text-foreground">Medora</span>
    </Button>
  );
};