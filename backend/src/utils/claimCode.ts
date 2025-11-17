import { randomBytes } from 'crypto';

/**
 * Generate unique claim code
 * Format: XXXX-XXXX-XXXX (alphanumeric, uppercase)
 */
export function generateClaimCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = 3;
  const segmentLength = 4;

  const code = Array.from({ length: segments }, () => {
    return Array.from({ length: segmentLength }, () => {
      const randomIndex = randomBytes(1)[0] % chars.length;
      return chars[randomIndex];
    }).join('');
  }).join('-');

  return code;
}

/**
 * Validate claim code format
 */
export function isValidClaimCode(code: string): boolean {
  const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return pattern.test(code);
}
