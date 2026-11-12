/** Format digits as the official ABHA layout: 12-3456-7890-1234. */
export const formatAbhaNumber = (raw: string): string => {
  const d = raw.replace(/\D/g, '').slice(0, 14);
  const parts = [d.slice(0, 2), d.slice(2, 6), d.slice(6, 10), d.slice(10, 14)].filter(Boolean);
  return parts.join('-');
};

export type AbhaCheck =
  | { ok: true; number: string | null; address: string | null }
  | { ok: false; error: string };

/** Mirrors the database trigger: 14-digit number, address like name@abdm. Both optional. */
export const validateAbha = (number: string, address: string): AbhaCheck => {
  const digits = number.replace(/\D/g, '');
  if (digits && digits.length !== 14) return { ok: false, error: 'ABHA number must have 14 digits' };
  const addr = address.trim().toLowerCase();
  if (addr && !/^[a-z0-9._]{3,32}@(abdm|sbx)$/.test(addr)) {
    return { ok: false, error: 'ABHA address must look like name@abdm' };
  }
  return { ok: true, number: digits || null, address: addr || null };
};

/** Official Ayushman Bharat Health Account portal (NHA / ABDM). */
export const ABHA_PORTAL_URL = 'https://abha.abdm.gov.in/abha/v3/';
export const ABHA_LOGIN_URL = 'https://abha.abdm.gov.in/abha/v3/login';
export const ABHA_UPDATED_EVENT = 'medora:abha-updated';
