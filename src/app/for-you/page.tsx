import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { markTagsSeen, tagsFor } from "@/lib/sharing";

export const dynamic = "force-dynamic";

function when(date: string): string {
  return new Date(`${date.replace(" ", "T")}Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function ForYou() {
  const user = await requireUser("/for-you");
  const items = tagsFor(user.id);
  // Read first, so new items stay highlighted on this visit.
  markTagsSeen(user.id);

  return (
    <>
      <PageHeader title="For you" subtitle="Art and collections someone in the family tagged you in." />
      {items.length === 0 ? (
        <Card className="py-10 text-center text-muted">Nothing yet. When someone tags you on a piece of art, it shows up here.</Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <li key={t.id}>
              <Link href={t.artId ? `/art/${t.artId}` : `/collections/${t.collectionId}`} className="group block">
                <Card className={`h-full p-3 transition group-hover:shadow-md ${t.seen ? "" : "ring-2 ring-brand"}`}>
                  {t.previewArtId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/art-files/${t.previewArtId}/thumb`} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-paper text-4xl" aria-hidden>🎨</div>
                  )}
                  <div className="mt-2 px-1">
                    <p className="font-semibold">
                      {!t.seen && <span className="mr-1 rounded-full bg-brand px-2 py-0.5 text-xs text-white">New</span>}
                      {t.title}
                    </p>
                    <p className="text-sm text-muted">
                      {t.collectionId ? "Collection" : "Art"} by {t.kidName} · {t.taggedBy ? `from ${t.taggedBy}, ` : ""}{when(t.createdAt)}
                    </p>
                    {t.message && <p className="mt-1 text-sm italic">“{t.message}”</p>}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
