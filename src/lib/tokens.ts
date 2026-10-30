import crypto from "node:crypto";

export function newToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** Tokens are stored hashed, so a leaked database can't be used to sign in. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** SQLite datetime('now') format, so stored times compare as strings. */
export function sqlTime(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 19);
}
