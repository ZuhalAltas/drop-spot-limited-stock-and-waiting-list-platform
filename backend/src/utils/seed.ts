import { createHash } from 'crypto';
import { execSync } from 'child_process';

/**
 * Generate unique seed for priority score calculation
 * Based on project metadata (git remote, first commit, start time)
 */
export class SeedGenerator {
  private static seed: string | null = null;

  /**
   * Get or generate the project seed
   */
  static getSeed(): string {
    if (this.seed) {
      return this.seed;
    }

    try {
      // Get git remote URL
      const remote = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();

      // Get first commit timestamp
      const firstCommit = execSync('git log --reverse --format=%ct', { encoding: 'utf8' })
        .split('\n')[0]
        .trim();

      // Project start time (from README or current time)
      const startTime = '202501171430'; // YYYYMMDDHHmm format

      // Combine all data
      const rawSeed = `${remote}|${firstCommit}|${startTime}`;

      // Generate SHA256 hash and take first 12 characters
      this.seed = createHash('sha256').update(rawSeed).digest('hex').substring(0, 12);

      console.log('✅ Seed generated:', this.seed);
      console.log('   Remote:', remote);
      console.log('   First Commit:', firstCommit);
      console.log('   Start Time:', startTime);

      return this.seed;
    } catch (error) {
      console.warn('⚠️  Could not generate seed from git, using fallback');
      // Fallback seed if git is not available
      this.seed = createHash('sha256').update('dropspot-fallback-seed').digest('hex').substring(0, 12);
      return this.seed;
    }
  }

  /**
   * Get coefficients derived from seed
   * These are used in priority score calculation
   */
  static getCoefficients(): { A: number; B: number; C: number } {
    const seed = this.getSeed();

    const A = 7 + (parseInt(seed.substring(0, 2), 16) % 5);
    const B = 13 + (parseInt(seed.substring(2, 4), 16) % 7);
    const C = 3 + (parseInt(seed.substring(4, 6), 16) % 3);

    return { A, B, C };
  }
}

/**
 * Calculate priority score for waitlist entry
 *
 * Formula: base + (signup_latency_ms % A) + (account_age_days % B) - (rapid_actions % C)
 *
 * - Higher score = higher priority in waitlist
 * - Rewards: faster signup, older accounts
 * - Penalizes: rapid multiple actions (anti-bot)
 */
export function calculatePriorityScore(params: {
  signupLatencyMs: number;
  accountAgeDays: number;
  rapidActions: number;
}): number {
  const { signupLatencyMs, accountAgeDays, rapidActions } = params;
  const { A, B, C } = SeedGenerator.getCoefficients();

  const base = 1000;
  const score =
    base +
    (signupLatencyMs % A) +
    (accountAgeDays % B) -
    (rapidActions % C);

  return Math.max(0, score); // Ensure non-negative
}

/**
 * Get account age in days
 */
export function getAccountAgeDays(createdAt: string | Date): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
