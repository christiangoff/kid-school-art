import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { unseenTagCount } from "@/lib/sharing";
import { logoutAction } from "./actions";
import "./globals.css";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Kid School Art",
  description: "Our kids' school art, organized and ready to share.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const unseen = user ? unseenTagCount(user.id) : 0;
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <Icon name="crayon" className="size-5 text-brand" /> Kid School Art
            </Link>
            {user && (
              <form action={logoutAction} className="flex items-center gap-4 text-sm">
                <Link href="/for-you" className="flex items-center gap-1 font-semibold">
                  For you
                  {unseen > 0 && (
                    <span className="rounded-full bg-brand px-1.5 text-xs text-white" aria-label={`${unseen} new`}>
                      {unseen}
                    </span>
                  )}
                </Link>
                <span className="hidden text-muted sm:inline">{user.name}</span>
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
