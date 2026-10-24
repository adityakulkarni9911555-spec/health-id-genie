export function recoveryStep(hasPin: unknown, status: { locked?: boolean } | null, failed: boolean): 'error' | 'password' | 'locked' | 'pin' {
  if (failed || typeof hasPin !== 'boolean') return 'error';
  if (!hasPin) return 'password';
  if (!status || typeof status.locked !== 'boolean') return 'error';
  return status.locked ? 'locked' : 'pin';
}