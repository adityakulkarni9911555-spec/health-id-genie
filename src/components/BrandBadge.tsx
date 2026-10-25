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
      className="brand-badge h-14 shrink-0 gap-3 rounded-full px-5 hover:bg-accent/40 [&_svg]:!size-9"
      aria-label="Medora — replay brand animation"
      title="Medora"
      onClick={() => setCycle((value) => value + 1)}
    >
      <span className="brand-perspective relative block h-9 w-9 shrink-0" aria-hidden="true">
        <span key={cycle} className={`brand-mark block h-9 w-9 ${animate ? 'brand-mark-enter' : ''}`}>
          <Logo size={36} />
        </span>
      </span>
      <span className="text-lg font-bold text-foreground">Medora</span>
    </Button>
  );
};