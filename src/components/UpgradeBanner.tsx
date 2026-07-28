interface UpgradeBannerProps {
  variant?: 'compact' | 'card';
  reason?: 'documents' | 'family' | 'generic';
  remaining?: number;
}

export function UpgradeBanner(_props: UpgradeBannerProps) {
  // Upgrade prompts are hidden until paid plans launch.
  return null;
}
