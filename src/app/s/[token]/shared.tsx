import Link from "next/link";
import type { Artwork } from "@/lib/gallery";
import { kidName } from "@/lib/shared-view";
import type { ShareLink } from "@/lib/sharing";

export function ExpiredShare() {
  return (
    <div className="py-16 text-center">
      <p className="text-4xl" aria-hidden>🔒</p>
      <h1 className="mt-2 text-2xl font-bold">This link isn't working anymore</h1>
      <p className="mt-2 text-muted">It may have expired or been turned off. Ask the person who sent it for a new one.</p>
    </div>
  );
}

/** One piece, shown to someone with a share link. */
export function SharedPiece({ token, link, art, prev, next }: {
  token: string;
  link: ShareLink;
  art: Artwork;
  prev?: number | null;
  next?: number | null;
}) {
  const base = `/s/${token}`;
  return (
    <div className="mx-auto max-w-4xl">
      {!link.artId && (
        <div className="mb-3 flex items-center justify-between text-sm">
          <Link href={base} className="text-muted hover:text-ink">← All art</Link>
          <span className="flex gap-3">
            {prev ? <Link href={`${base}/art/${prev}`} className="font-semibold">‹ Newer</Link> : <span className="text-muted">‹ Newer</span>}
            {next ? <Link href={`${base}/art/${next}`} className="font-semibold">Older ›</Link> : <span className="text-muted">Older ›</span>}
          </span>
        </div>
      )}
      <div className="flex justify-center rounded-2xl border border-line bg-white p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${base}/img/${art.id}/display`} width={art.width} height={art.height} alt={art.title ?? "Artwork"} className="h-auto max-h-[75vh] w-auto max-w-full rounded-lg" />
      </div>
      <div className="mt-4 text-center">
        <h1 className="text-2xl font-bold">{art.title ?? "Untitled"}</h1>
        <p className="text-sm text-muted">By {kidName(art.kidId)}{art.madeOn && ` · ${new Date(`${art.madeOn}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}</p>
        {art.note && <p className="mt-2 italic">“{art.note}”</p>}
        {link.allowDownload && (
          <a href={`${base}/img/${art.id}/original?download`} className="mt-3 inline-block text-sm font-semibold text-brand">Download original</a>
        )}
      </div>
    </div>
  );
}
