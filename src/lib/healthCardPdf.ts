import type { Patient } from '@/types/patient';
import { publicEmergencyUrl } from '@/lib/publicUrl';

// ID-card style PDF (CR80 card size, front + back on A4 with cut guides).
// Helvetica only supports ASCII well, so all text is kept ASCII.

const W = 85.6;
const H = 54;
const PRIMARY: [number, number, number] = [79, 70, 229];
const TEAL: [number, number, number] = [13, 148, 136];
const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [100, 116, 139];
const RED: [number, number, number] = [220, 38, 38];

const ascii = (s: string) => (s || '').replace(/[^\x20-\x7E]/g, '').trim();

const fmtDate = (d: string) => {
  const date = new Date(d);
  return isNaN(date.getTime())
    ? ascii(d)
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const idNumber = (id: string) => {
  const hex = id.replace(/-/g, '').toUpperCase().slice(0, 12).padEnd(12, '0');
  return `MED ${hex.slice(0, 4)} ${hex.slice(4, 8)} ${hex.slice(8, 12)}`;
};

export async function downloadHealthCardPdf(patient: Patient) {
  const [{ jsPDF }, QRCode] = await Promise.all([import('jspdf'), import('qrcode')]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;

  const qrValue = patient.shareToken ? publicEmergencyUrl(patient.shareToken) : patient.id;
  const qr = await QRCode.toDataURL(qrValue, { margin: 1, width: 600, errorCorrectionLevel: 'M' });

  // ---- Document header ----
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('MEDORA', 15, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Digital Health ID Card - e-Card', 15, 21);
  doc.setFontSize(8);
  doc.text(`Issued: ${new Date().toLocaleString('en-IN')}`, pageW - 15, 14, { align: 'right' });
  doc.text(idNumber(patient.id), pageW - 15, 21, { align: 'right' });

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(ascii(patient.fullName) || 'Patient', 15, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    'This is your Medora health card. Print, cut out, fold and keep it in your wallet.',
    15,
    46,
  );

  // ---- Card positions ----
  const gap = 6;
  const x1 = (pageW - (W * 2 + gap)) / 2;
  const x2 = x1 + W + gap;
  const y = 60;

  // Cut guide
  doc.setDrawColor(...MUTED);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.setLineWidth(0.25);
  doc.rect(x1 - 4, y - 4, W * 2 + gap + 8, H + 8);
  doc.line(x1 + W + gap / 2, y - 4, x1 + W + gap / 2, y + H + 4);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(7);
  doc.text('Cut along the dotted line  |  Fold along the centre line', pageW / 2, y - 6, {
    align: 'center',
  });
  doc.text('FRONT', x1 + W / 2, y + H + 9, { align: 'center' });
  doc.text('BACK', x2 + W / 2, y + H + 9, { align: 'center' });

  // ---- FRONT ----
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(x1, y, W, H, 3, 3, 'FD');
  // Header band
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(x1, y, W, 11, 3, 3, 'F');
  doc.rect(x1, y + 6, W, 5, 'F');
  doc.setFillColor(...TEAL);
  doc.rect(x1, y + 11, W, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('MEDORA HEALTH CARD', x1 + 4, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('Digital Health ID', x1 + 4, y + 9);
  doc.text('VERIFIED', x1 + W - 4, y + 7, { align: 'right' });

  // Photo / initials box
  const px = x1 + 4;
  const py = y + 15;
  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(...PRIMARY);
  doc.roundedRect(px, py, 18, 22, 1.5, 1.5, 'FD');
  const initials = ascii(patient.fullName)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(initials || 'M', px + 9, py + 13.5, { align: 'center' });

  // Fields
  const fx = px + 22;
  const field = (label: string, value: string, fy: number, color = INK) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), fx, fy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...color);
    doc.text(doc.splitTextToSize(value, W - (fx - x1) - 4)[0] ?? '', fx, fy + 3.2);
  };
  field('Name', ascii(patient.fullName), py + 2);
  field('Date of birth', fmtDate(patient.dateOfBirth), py + 9.5);
  doc.setFont('helvetica', 'normal');
  field('Gender', patient.gender ? patient.gender[0].toUpperCase() + patient.gender.slice(1) : '-', py + 17);
  // Blood badge
  if (patient.bloodGroup) {
    doc.setFillColor(...RED);
    doc.roundedRect(x1 + W - 18, py + 15, 14, 7, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(patient.bloodGroup, x1 + W - 11, py + 19.8, { align: 'center' });
  }

  // Footer: emergency + ID
  doc.setFillColor(248, 250, 252);
  doc.rect(x1 + 0.2, y + H - 12, W - 0.4, 11.8, 'F');
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text('EMERGENCY CONTACT', x1 + 4, y + H - 8);
  doc.text('HEALTH ID', x1 + W - 4, y + H - 8, { align: 'right' });
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(ascii(patient.emergencyContact) || '-', x1 + 4, y + H - 4);
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.text(idNumber(patient.id), x1 + W - 4, y + H - 4, { align: 'right' });

  // ---- BACK ----
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(x2, y, W, H, 3, 3, 'FD');
  doc.setFillColor(...TEAL);
  doc.rect(x2 + 0.2, y + 0.2, 1.5, H - 0.4, 'F');
  doc.addImage(qr, 'PNG', x2 + 4, y + 4, 30, 30);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text('Scan for emergency info', x2 + 19, y + 37, { align: 'center' });

  const bx = x2 + 37;
  const bw = W - 41;
  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('FOR DOCTORS & ER STAFF', bx, y + 7);
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text(
    doc.splitTextToSize(
      'Scan the QR code to see blood group, allergies, conditions and emergency contact instantly. Reports may need the patient PIN or emergency access, which is logged.',
      bw,
    ),
    bx,
    y + 11,
  );

  // Allergies / conditions box
  const alerts = [
    patient.allergies.length ? `Allergies: ${patient.allergies.map(ascii).join(', ')}` : '',
    patient.chronicConditions.length ? `Conditions: ${patient.chronicConditions.map(ascii).join(', ')}` : '',
  ].filter(Boolean);
  const ay = y + 30;
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(bx, ay, bw, 13, 1.2, 1.2, 'F');
  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text('MEDICAL ALERTS', bx + 1.5, ay + 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  const alertLines = doc.splitTextToSize(alerts.join('  |  ') || 'No known allergies', bw - 3).slice(0, 3);
  doc.text(alertLines, bx + 1.5, ay + 6);

  doc.setTextColor(...MUTED);
  doc.setFontSize(4.5);
  doc.text('medorahealthwallet.lovable.app  |  Emergency: 112', x2 + W / 2, y + H - 3, {
    align: 'center',
  });

  // ---- Instructions ----
  const iy = y + H + 22;
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('How to use your card', 15, iy);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  [
    '1. Print this page at 100% scale (do not "fit to page").',
    '2. Cut along the outer dotted line.',
    '3. Fold along the centre line so front and back face out.',
    '4. Laminate it or keep it in any standard card holder.',
  ].forEach((t, i) => doc.text(t, 15, iy + 8 + i * 6));

  doc.setFontSize(7.5);
  doc.text(
    doc.splitTextToSize(
      'Keep this card private. Anyone with the QR code can see your emergency details. If you lose it, open Medora and rotate your emergency link - the old QR code stops working immediately.',
      pageW - 30,
    ),
    15,
    iy + 38,
  );

  doc.setDrawColor(226, 232, 240);
  doc.line(15, 282, pageW - 15, 282);
  doc.setFontSize(7);
  doc.text('Generated by Medora - Digital Health Wallet', 15, 288);
  doc.text(idNumber(patient.id), pageW - 15, 288, { align: 'right' });

  doc.save(`Medora-Health-Card-${patient.id.slice(0, 8).toUpperCase()}.pdf`);
}
