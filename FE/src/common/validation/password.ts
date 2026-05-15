const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;

/** Client-side mirror of backend strict password rules (plain text before hashing). */
export function getStrictPasswordError(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 10) {
    return "Password must be at least 10 characters.";
  }
  if (!PASSWORD_PATTERN.test(password)) {
    return "Password must include uppercase, lowercase, a number, and a special character.";
  }
  return null;
}
