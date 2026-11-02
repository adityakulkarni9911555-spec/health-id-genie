import { useId } from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

/** Medora emblem: rounded health shield with a pulse line and cross accent. */
export const Logo = ({ className = '', size = 40 }: LogoProps) => {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Medora logo"
    >
      <defs>
        <linearGradient id={`mg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(252, 83%, 66%)" />
          <stop offset="100%" stopColor="hsl(174, 62%, 42%)" />
        </linearGradient>
      </defs>
      <path
        d="M24 3.5 L40.5 9.5 C41.4 9.8 42 10.7 42 11.7 V22.5 C42 33 34.6 41.2 24.8 44.3 C24.3 44.5 23.7 44.5 23.2 44.3 C13.4 41.2 6 33 6 22.5 V11.7 C6 10.7 6.6 9.8 7.5 9.5 Z"
        fill={`url(#mg-${id})`}
      />
      <path
        d="M11 25 H17.5 L20.5 19 L25 31 L28.5 23 L30.5 25 H37"
        fill="none"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M30 11.5 h3 v3 h3 v3 h-3 v3 h-3 v-3 h-3 v-3 h3 z" fill="white" opacity="0.95" />
    </svg>
  );
};
