import bcrypt from "bcryptjs";
import { db } from "./db";
import { hashToken, newToken, sqlTime } from "./tokens";

export type User = { id: number; email: string; name: string };

const SESSION_DAYS = 30;

export class AccountError extends Error {}

export function userCount(): number {
  return (db().prepare("SELECT count(*) AS n FROM users").get() as { n: number }).n;
}

/**
 * Anyone may sign up while the app has no users, so the first person can set
 * it up. After that, new people join through an invite unless ALLOW_SIGNUP=true.
 */
export function openSignupAllowed(): boolean {
  return userCount() === 0 || process.env.ALLOW_SIGNUP === "true";
}

export function createUser(input: { email: string; name: string; password: string }): User {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!name) throw new AccountError("Please enter your name.");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AccountError("Please enter a valid email address.");
  if (input.password.length < 8) throw new AccountError("Passwords need at least 8 characters.");
  if (db().prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
    throw new AccountError("An account with that email already exists. Try signing in.");
  }
  const hash = bcrypt.hashSync(input.password, 10);
  const { lastInsertRowid } = db()
    .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)")
    .run(email, name, hash);
  return { id: Number(lastInsertRowid), email, name };
}

export function verifyPassword(email: string, password: string): User | null {
  const row = db()
    .prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?")
    .get(email.trim().toLowerCase()) as (User & { password_hash: string }) | undefined;
  if (!row || !bcrypt.compareSync(password, row.password_hash)) return null;
  return { id: row.id, email: row.email, name: row.name };
}

export function createSession(userId: number): { token: string; expires: Date } {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db()
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(hashToken(token), userId, sqlTime(expires));
  return { token, expires };
}

export function userForSession(token: string): User | null {
  const row = db()
    .prepare(
      `SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > datetime('now')`,
    )
    .get(hashToken(token)) as User | undefined;
  return row ?? null;
}

export function deleteSession(token: string) {
  db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}
