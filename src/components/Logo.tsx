interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo = ({ className = '', size = 40 }: LogoProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="hsl(258, 89%, 72%)" />
        <stop offset="100%" stopColor="hsl(174, 62%, 45%)" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#logoGrad)" />
    <path
      d="M8 26 L16 26 L19 20 L23 32 L26 24 L29 28 L40 28"
      fill="none"
      stroke="white"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M32 12 h4 v4 h4 v4 h-4 v4 h-4 v-4 h-4 v-4 h4 z"
      fill="white"
      opacity="0.95"
    />
  </svg>
);
