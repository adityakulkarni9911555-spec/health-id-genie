import { describe, it, expect } from 'vitest';
import { validateAbha, formatAbhaNumber } from './abha';

describe('ABHA rules', () => {
  it('requires exactly 14 digits', () => {
    expect(validateAbha('1234567890123', '').ok).toBe(false);
    expect(validateAbha('12-3456-7890-1234', '')).toEqual({ ok: true, number: '12345678901234', address: null });
  });
  it('requires address like name@abdm', () => {
    expect(validateAbha('', 'aryan@gmail.com').ok).toBe(false);
    expect(validateAbha('', 'Aryan.S@abdm')).toEqual({ ok: true, number: null, address: 'aryan.s@abdm' });
  });
  it('formats as 2-4-4-4', () => {
    expect(formatAbhaNumber('12345678901234999')).toBe('12-3456-7890-1234');
  });
});
