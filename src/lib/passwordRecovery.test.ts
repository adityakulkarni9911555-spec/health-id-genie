import { describe, it, expect } from 'bun:test';
import { recoveryStep } from './passwordRecovery';

describe('Recovery PIN gate', () => {
  it('requires the PIN when one is set', () => {
    expect(recoveryStep(true, { locked: false }, false)).toBe('pin');
  });
  it('blocks password entry during the account PIN lock', () => {
    expect(recoveryStep(true, { locked: true }, false)).toBe('locked');
  });
  it('does not treat failed checks as no PIN', () => {
    expect(recoveryStep(false, null, true)).toBe('error');
    expect(recoveryStep(null, null, false)).toBe('error');
    expect(recoveryStep(true, null, false)).toBe('error');
  });
  it('allows email recovery only after a confirmed no-PIN result', () => {
    expect(recoveryStep(false, null, false)).toBe('password');
  });
});