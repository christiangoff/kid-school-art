import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { logoutAction } from "./actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kid School Art",
  description: "Our kids' school art, organized and ready to share.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <header className="border-b border-line bg-white/70 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <span aria-hidden>🖍️</span> Kid School Art
            </Link>
            {user && (
              <form action={logoutAction} className="flex items-center gap-3 text-sm">
                <span className="text-muted">{user.name}</span>
                <button className="font-semibold text-brand hover:text-brand-dark">Sign out</button>
              </form>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
