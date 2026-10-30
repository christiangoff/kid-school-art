import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, deleteSession, userForSession, type User } from "./accounts";

const COOKIE = "ksa_session";

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? userForSession(token) : null;
}

/** For pages and actions that need a signed-in user. */
export async function requireUser(next?: string): Promise<User> {
  const user = await currentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export async function signIn(userId: number) {
  const { token, expires } = createSession(userId);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // HTTPS-only cookies when the app is served over HTTPS; plain http works on a home network.
    secure: process.env.APP_URL?.startsWith("https://") ?? false,
    path: "/",
    expires,
  });
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) deleteSession(token);
  jar.delete(COOKIE);
}

/** Only allow redirects back into this app. */
export function safeNext(value: FormDataEntryValue | string | null | undefined): string {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}
