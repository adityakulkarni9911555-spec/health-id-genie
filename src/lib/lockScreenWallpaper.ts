import QRCode from 'qrcode';
import type { Patient } from '@/types/patient';

// Renders a 1080x2340 phone lock-screen image. Top ~30% left empty for the clock.
export async function createLockScreenWallpaper(p: Patient, url: string): Promise<Blob> {
  const W = 1080, H = 2340;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1e1b4b'); grad.addColorStop(1, '#0f766e');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);

  const card = { x: 90, y: 780, w: 900, h: 1380 };
  g.fillStyle = '#ffffff';
  g.beginPath(); g.roundRect(card.x, card.y, card.w, card.h, 56); g.fill();

  g.textAlign = 'center';
  g.fillStyle = '#dc2626';
  g.font = 'bold 44px sans-serif';
  g.fillText('EMERGENCY MEDICAL INFO', W / 2, card.y + 90);
  g.fillStyle = '#111827';
  g.font = '600 38px sans-serif';
  g.fillText('Scan if I am unable to respond', W / 2, card.y + 145);

  const qrUrl = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 2, width: 560 });
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = qrUrl; });
  g.drawImage(img, (W - 560) / 2, card.y + 185, 560, 560);

  let y = card.y + 830;
  g.font = 'bold 56px sans-serif';
  g.fillStyle = '#111827';
  g.fillText(p.fullName.slice(0, 28), W / 2, y);
  y += 90;
  if (p.bloodGroup) {
    g.fillStyle = '#fee2e2';
    g.beginPath(); g.roundRect(W / 2 - 260, y - 60, 520, 90, 45); g.fill();
    g.fillStyle = '#b91c1c'; g.font = 'bold 48px sans-serif';
    g.fillText(`Blood group  ${p.bloodGroup}`, W / 2, y);
    y += 100;
  }
  g.font = '36px sans-serif'; g.fillStyle = '#374151';
  if (p.allergies.length) { g.fillText(`Allergies: ${p.allergies.join(', ')}`.slice(0, 46), W / 2, y); y += 60; }
  if (p.emergencyContact) { g.font = 'bold 40px sans-serif'; g.fillStyle = '#111827'; g.fillText(`ICE: ${p.emergencyContact}`, W / 2, y); }

  g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = '32px sans-serif';
  g.fillText('Medora Health ID', W / 2, H - 120);

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Image failed'))), 'image/png'));
}
