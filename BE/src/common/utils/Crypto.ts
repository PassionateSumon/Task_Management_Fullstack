import crypto, { createHash, randomBytes } from "crypto";

export class CryptoUtil {
  static generateSalt(): string {
    return randomBytes(16).toString("hex");
  }
  static hashPassword(password: string, salt: string): string {
    return createHash("sha256")
      .update(password + salt)
      .digest("hex");
  }
  static verifyPassword(password: string, salt: string, hash: string): boolean {
    return this.hashPassword(password, salt) === hash;
  }

  static generateTempPassword = (): string => {
    return crypto.randomBytes(8).toString("hex");
  };
}