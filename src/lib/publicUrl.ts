// Always resolve emergency/share links against the public published domain so
// QR codes remain scannable even when the card was generated from the Lovable
// preview URL (which sits behind a project auth gate).
const DEFAULT_PUBLIC_ORIGIN = 'https://health-id-genie.lovable.app';

export function publicOrigin(): string {
  const override = (import.meta as { env?: Record<string, string | undefined> }).env
    ?.VITE_PUBLIC_SITE_URL;
  const value = (override && override.trim()) || DEFAULT_PUBLIC_ORIGIN;
  return value.replace(/\/+$/, '');
}

export function publicEmergencyUrl(token: string): string {
  return `${publicOrigin()}/e/${token}`;
}
