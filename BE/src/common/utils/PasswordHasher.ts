import bcrypt from "bcryptjs";
import { CryptoUtil } from "./Crypto.js";

/**
 * Single entry point for password hashing and verification.
 *
 * WHY THIS EXISTS
 * ---------------
 * The historical implementation (`CryptoUtil.hashPassword`) is
 * `sha256(password + "10")`: a hard-coded, non-secret, unsalted fast hash. It
 * is trivially rainbow-table attacked and offers no work factor, so it is not
 * adequate for a production system. Replacing it outright would lock out every
 * existing user, because their stored hashes are already in that format.
 *
 * The approach taken here is a transparent, self-healing upgrade:
 *   - All NEW passwords are hashed with bcrypt (cost configurable, default 10).
 *   - Verification accepts EITHER format, so existing users keep working.
 *   - `needsRehash()` reports legacy hashes so the caller can silently upgrade
 *     the stored value on the next successful login.
 *
 * This is additive: `CryptoUtil` is left untouched and remains the definition of
 * the legacy algorithm.
 */

/** Matches the legacy `sha256(password + "10")` digest exactly. */
const LEGACY_SALT = "10";

const BCRYPT_PREFIXES = ["$2a$", "$2b$", "$2y$"];

const resolveRounds = (): number => {
  const parsed = Number(process.env.BCRYPT_ROUNDS);
  if (Number.isInteger(parsed) && parsed >= 10 && parsed <= 15) return parsed;
  return 10;
};

const isBcryptHash = (stored: string): boolean =>
  BCRYPT_PREFIXES.some((prefix) => stored.startsWith(prefix));

export class PasswordHasher {
  /** Hashes a plaintext password for storage. Always returns a bcrypt digest. */
  static async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, resolveRounds());
  }

  /**
   * Verifies a plaintext password against a stored digest of unknown format.
   * Returns false for null/undefined/blank stored values so that a missing hash
   * can never be satisfied by an empty password.
   */
  static async verify(
    plainPassword: string,
    storedHash: string | null | undefined
  ): Promise<boolean> {
    if (!storedHash) return false;

    if (isBcryptHash(storedHash)) {
      try {
        return await bcrypt.compare(plainPassword, storedHash);
      } catch {
        return false;
      }
    }

    // Legacy path. Constant-time comparison is not meaningful here (the value
    // is a hex digest of a public algorithm, not a secret), but we avoid
    // returning early so the response shape cannot be used as an oracle.
    return CryptoUtil.hashPassword(plainPassword, LEGACY_SALT) === storedHash;
  }

  /**
   * True when the stored digest should be replaced with a fresh bcrypt hash
   * (legacy format, or a bcrypt cost below the configured target).
   */
  static needsRehash(storedHash: string | null | undefined): boolean {
    if (!storedHash) return true;
    if (!isBcryptHash(storedHash)) return true;
    try {
      return bcrypt.getRounds(storedHash) < resolveRounds();
    } catch {
      return true;
    }
  }

  /** Test seam: confirms whether a stored digest is in the legacy format. */
  static isLegacyHash(storedHash: string | null | undefined): boolean {
    return Boolean(storedHash) && !isBcryptHash(storedHash as string);
  }
}
