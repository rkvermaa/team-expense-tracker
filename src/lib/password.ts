import bcrypt from "bcryptjs";

const BCRYPT_COST = 10;

/** Hashes a plaintext password for storage. Shared by seed and auth. */
export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, BCRYPT_COST);
}

/** Verifies a plaintext password against a stored hash. */
export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}
